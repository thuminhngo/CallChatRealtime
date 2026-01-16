import { Server } from "socket.io";
import http from "http";
import express from "express";
import { ENV } from "./env.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [ENV.CLIENT_URL, "http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Map lưu trữ: { userId: Set(socketId) }
const userSocketsMap = Object.create(null);

// Map lưu trữ cuộc gọi đang diễn ra
const activeCalls = new Map();

/* ===================== */
/* HELPERS (GIỮ NGUYÊN)  */
/* ===================== */

const normalizeUserId = (userId) => {
  if (!userId || userId === "undefined" || userId === "null") return null;
  return userId.toString();
};

export const getReceiverSocketIds = (userId) => {
  const id = normalizeUserId(userId);
  if (!id || !userSocketsMap[id]) return [];
  return Array.from(userSocketsMap[id]);
};

export const getReceiverSocketId = (userId) => {
  const sockets = getReceiverSocketIds(userId);
  return sockets.length ? sockets[sockets.length - 1] : null;
};

export const isUserOnline = (userId) => {
  const id = normalizeUserId(userId);
  return !!(id && userSocketsMap[id]?.size);
};

export const emitToUser = (userId, event, data) => {
  const socketIds = getReceiverSocketIds(userId);
  socketIds.forEach((socketId) => {
    io.to(socketId).emit(event, data);
  });
};

/* ===================== */
/* SOCKET LOGIC          */
/* ===================== */

io.on("connection", (socket) => {
  const rawUserId = socket.handshake.query.userId;
  const userId = normalizeUserId(rawUserId);

  if (userId) {
    if (!userSocketsMap[userId]) {
      userSocketsMap[userId] = new Set();
    }
    userSocketsMap[userId].add(socket.id);
    socket.join(userId);
    io.emit("getOnlineUsers", Object.keys(userSocketsMap));
  }

  /* ===================== */
  /* CHAT LOGIC (GIỮ NGUYÊN) */
  /* ===================== */

  socket.on("user:typing", ({ receiverId }) => {
    if (!receiverId) return;
    emitToUser(receiverId, "user:typing", { senderId: userId });
  });

  socket.on("user:stop-typing", ({ receiverId }) => {
    if (!receiverId) return;
    emitToUser(receiverId, "user:stop-typing", { senderId: userId });
  });

  /* ===================== */
  /* CALL LOGIC (CHUẨN HOÁ) */
  /* ===================== */

  // 1. Caller gửi yêu cầu gọi
  socket.on("call:request", ({ receiverId, channelName, isVideo, name, avatar }) => {
    activeCalls.set(channelName, {
      callerId: userId,
      receiverId,
      isVideo,
    });

    emitToUser(receiverId, "incomingCall", {
      callerInfo: { id: userId, name, avatar },
      channelName,
      isVideo,
    });
  });

  // 2. Receiver từ chối cuộc gọi (CHỈ notify UI – KHÔNG LOG)
  socket.on("call:rejected", ({ channelName }) => {
    const call = activeCalls.get(channelName);
    if (!call) return;

    emitToUser(call.callerId, "callCancelled", { reason: "rejected" });
    // ❌ KHÔNG lưu log ở đây
    // ❌ KHÔNG xoá activeCalls ở đây
  });

  // 3. Kết thúc cuộc gọi (ANSWERED / MISSED / CANCELLED)
  socket.on("call:end", async ({ channelName, status, duration }) => {
    const call = activeCalls.get(channelName);
    if (!call) return;

    // Lưu log DUY NHẤT tại đây
    await saveCallLogHandler(
      call.callerId,
      call.receiverId,
      call.isVideo,
      status,
      duration
    );

    // Tắt UI 2 phía
    emitToUser(call.callerId, "call:ended", {});
    emitToUser(call.receiverId, "call:ended", {});

    // Cập nhật lịch sử
    emitToUser(call.callerId, "call:history_updated", {});
    emitToUser(call.receiverId, "call:history_updated", {});

    activeCalls.delete(channelName);
  });

  // 4. Người dùng mất kết nối (KHÔNG LOG)
  socket.on("disconnect", () => {
    for (const [channelName, call] of activeCalls.entries()) {
      if (call.callerId === userId || call.receiverId === userId) {
        const otherUserId =
          call.callerId === userId ? call.receiverId : call.callerId;

        // Chỉ tắt UI người còn lại
        emitToUser(otherUserId, "call:ended", {});
        activeCalls.delete(channelName);
        break;
      }
    }

    if (userId && userSocketsMap[userId]) {
      userSocketsMap[userId].delete(socket.id);
      if (userSocketsMap[userId].size === 0) {
        delete userSocketsMap[userId];
      }
    }

    io.emit("getOnlineUsers", Object.keys(userSocketsMap));
  });
});

/* ===================== */
/* HELPER SAVE CALL LOG  */
/* ===================== */

async function saveCallLogHandler(callerId, receiverId, isVideo, status, duration) {
  try {
    const { saveCallLog } = await import("../controllers/call.controller.js");

    await saveCallLog(
      {
        user: { _id: callerId },
        body: {
          receiverId,
          callType: isVideo ? "video" : "audio",
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
