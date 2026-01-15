import express from "express";
import http from "http";
import { Server } from "socket.io";
import { ENV } from "./env.js";

import { socketAuthMiddleware } from "../middleware/socket.auth.middleware.js"; 

/* =========================================================
 * APP & SOCKET.IO INIT
 * ======================================================= */
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [ENV.CLIENT_URL, "http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

/* =========================================================
 * GLOBAL STATE
 * ======================================================= */

// Map userId -> Set(socketId)
const userSocketsMap = Object.create(null);

// Map channelName -> call info
const activeCalls = new Map();

/* =========================================================
 * HELPER FUNCTIONS
 * ======================================================= */

// Chuẩn hoá userId 
const normalizeUserId = (userId) => {
  if (!userId || userId === "undefined" || userId === "null") return null;
  return userId.toString();
};

// Lấy toàn bộ socketId của 1 user
export const getReceiverSocketIds = (userId) => {
  const id = normalizeUserId(userId);
  if (!id || !userSocketsMap[id]) return [];
  return Array.from(userSocketsMap[id]);
};

// Lấy socketId cuối cùng (socket mới nhất)
export const getReceiverSocketId = (userId) => {
  const sockets = getReceiverSocketIds(userId);
  return sockets.length ? sockets[sockets.length - 1] : null;
};

// Kiểm tra user online
export const isUserOnline = (userId) => {
  const id = normalizeUserId(userId);
  return !!(id && userSocketsMap[id]?.size);
};

// Emit event tới toàn bộ socket của user
export const emitToUser = (userId, event, data) => {
  const socketIds = getReceiverSocketIds(userId);
  socketIds.forEach((socketId) => {
    io.to(socketId).emit(event, data);
  });
};

// Emit event tới toàn bộ member trong group
export const emitToGroup = (groupId, event, data) => {
  if (!groupId) return;
  io.to(`group:${groupId}`).emit(event, data);
};

// Kích hoạt xác thực: Chỉ user có Token hợp lệ mới được kết nối
io.use(socketAuthMiddleware);

/* =========================================================
 * SOCKET CONNECTION HANDLER
 * ======================================================= */
io.on("connection", (socket) => {
  const userId = socket.userId;

  console.log(`User connected: ${socket.user?.fullName} (${userId})`);
  if (userId) {
    if (!userSocketsMap[userId]) {
      userSocketsMap[userId] = new Set();
    }
    userSocketsMap[userId].add(socket.id);

    socket.join(userId);
    io.emit("getOnlineUsers", Object.keys(userSocketsMap));
  }

  /* =======================================================
   * CHAT 1-1 (TYPING)
   * ===================================================== */
  socket.on("user:typing", ({ receiverId }) => {
    if (!receiverId) return;
    emitToUser(receiverId, "user:typing", { senderId: userId });
  });

  socket.on("user:stop-typing", ({ receiverId }) => {
    if (!receiverId) return;
    emitToUser(receiverId, "user:stop-typing", { senderId: userId });
  });

  /* =======================================================
   * GROUP CHAT
   * ===================================================== */

  // Join group room
  socket.on("group:join", ({ groupId }) => {
    if (!groupId) return;
    socket.join(`group:${groupId}`);
    socket
      .to(`group:${groupId}`)
      .emit("group:member:joined", { groupId, userId });
  });

  // Leave group room
  socket.on("group:leave", ({ groupId }) => {
    if (!groupId) return;
    socket.leave(`group:${groupId}`);
    socket
      .to(`group:${groupId}`)
      .emit("group:member:left", { groupId, userId });
  });

  // Group message broadcast
  socket.on("group:message", ({ groupId, message }) => {
    if (!groupId || !message) return;
    io.to(`group:${groupId}`).emit("group:message", { groupId, message });
  });

  /* -------------------------
   * GROUP TYPING
   * ----------------------- */
  socket.on("group:typing", ({ groupId }) => {
    if (!groupId) return;
    socket.to(`group:${groupId}`).emit("group:typing", {
      groupId,
      senderId: userId,
    });
  });

  socket.on("group:stop-typing", ({ groupId }) => {
    if (!groupId) return;
    socket.to(`group:${groupId}`).emit("group:stop-typing", {
      groupId,
      senderId: userId,
    });
  });

  /* =======================================================
   * GROUP CALL SIGNALING
   * ===================================================== */
  socket.on("group:call:offer", ({ callId, toUserId, offer }) => {
    if (!toUserId) return;
    emitToUser(toUserId, "group:call:offer", {
      callId,
      from: userId,
      offer,
    });
  });

  socket.on("group:call:answer", ({ callId, toUserId, answer }) => {
    if (!toUserId) return;
    emitToUser(toUserId, "group:call:answer", {
      callId,
      from: userId,
      answer,
    });
  });

  socket.on("group:call:ice", ({ callId, toUserId, candidate }) => {
    if (!toUserId) return;
    emitToUser(toUserId, "group:call:ice", {
      callId,
      from: userId,
      candidate,
    });
  });

  // Đồng bộ trạng thái join / reject call
  socket.on("group:call:status_change", ({ groupId, callId, status }) => {
    if (!groupId) return;
    socket.to(`group:${groupId}`).emit("group:call:status_update", {
      callId,
      userId,
      status, // connected | rejected
    });
  });

  /* =======================================================
   * CALL 1-1
   * ===================================================== */

  // Gửi yêu cầu gọi
  socket.on("call:request", ({ receiverId, channelName, isVideo, name, avatar }) => {
    activeCalls.set(channelName, {
      callerId: userId,
      receiverId,
      isVideo,
      status: "pending",
    });

    emitToUser(receiverId, "incomingCall", {
      callerInfo: { id: userId, name, avatar },
      channelName,
      isVideo,
    });
  });

  // Người nhận chấp nhận
  socket.on("call:accepted", ({ channelName }) => {
    const call = activeCalls.get(channelName);
    if (!call) return;

    call.status = "ongoing";
    emitToUser(call.callerId, "call:accepted", {
      channelName,
      acceptAt: new Date(),
    });
  });

  // Người nhận từ chối
  socket.on("call:rejected", ({ channelName }) => {
    const call = activeCalls.get(channelName);
    if (!call) return;

    emitToUser(call.callerId, "callCancelled", { reason: "rejected" });
    saveCallLogHandler(
      call.callerId,
      call.receiverId,
      call.isVideo,
      "rejected",
      0
    );
    activeCalls.delete(channelName);
  });

  // Kết thúc cuộc gọi
  socket.on("call:end", async ({ channelName, status, duration }) => {
    const call = activeCalls.get(channelName);
    if (!call) return;

    const finalStatus =
      status || (call.status === "pending" ? "missed" : "ended");

    await saveCallLogHandler(
      call.callerId,
      call.receiverId,
      call.isVideo,
      finalStatus,
      duration || 0
    );

    emitToUser(call.callerId, "call:ended", {});
    emitToUser(call.receiverId, "call:ended", {});
    emitToUser(call.callerId, "call:history_updated", {});
    emitToUser(call.receiverId, "call:history_updated", {});

    activeCalls.delete(channelName);
  });

  // Timeout không bắt máy
  socket.on("call:timeout", async ({ channelName }) => {
    const call = activeCalls.get(channelName);
    if (!call) return;

    await saveCallLogHandler(
      call.callerId,
      call.receiverId,
      call.isVideo,
      "missed",
      0
    );

    emitToUser(call.callerId, "call:ended", { reason: "timeout" });
    emitToUser(call.receiverId, "call:ended", { reason: "timeout" });

    activeCalls.delete(channelName);
  });

  /* =======================================================
   * DISCONNECT CLEANUP
   * ===================================================== */
  socket.on("disconnect", async () => {
    // Xử lý cuộc gọi đang diễn ra
    for (const [channelName, call] of activeCalls.entries()) {
      if (call.callerId === userId || call.receiverId === userId) {
        const otherUserId =
          call.callerId === userId ? call.receiverId : call.callerId;

        const logStatus = call.status === "pending" ? "missed" : "ended";

        await saveCallLogHandler(
          call.callerId,
          call.receiverId,
          call.isVideo,
          logStatus,
          0
        );

        emitToUser(otherUserId, "call:ended", {
          reason: "peer_disconnected",
        });

        activeCalls.delete(channelName);
        break;
      }
    }

    // Dọn user online
    if (userId && userSocketsMap[userId]) {
      userSocketsMap[userId].delete(socket.id);
      if (userSocketsMap[userId].size === 0) {
        delete userSocketsMap[userId];
      }
    }

    io.emit("getOnlineUsers", Object.keys(userSocketsMap));
  });
});

/* =========================================================
 * CALL LOG HELPER
 * ======================================================= */
async function saveCallLogHandler(
  callerId,
  receiverId,
  isVideo,
  status,
  duration
) {
  try {
    const { saveCallLog } = await import(
      "../controllers/call.controller.js"
    );

    await saveCallLog(
      {
        user: { _id: callerId },
        body: {
          receiverId,
          callType: isVideo ? "video" : "voice",
          status: status || "missed",
          duration: duration || 0,
        },
      },
      { status: () => ({ json: () => {} }) }
    );
  } catch (err) {
    console.error("Lỗi lưu log cuộc gọi:", err);
  }
}

export { io, app, server, userSocketsMap };