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

const userSocketsMap = Object.create(null);
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

  socket.on("group:join", ({ groupId }) => {
    socket.join(groupId);
  });

  socket.on("group:leave", ({ groupId }) => {
    socket.leave(groupId);
  });

  socket.on("group:typing", ({ groupId }) => {
    socket.to(groupId).emit("group:typing", { groupId, senderId: userId });
  });

  socket.on("group:stop-typing", ({ groupId }) => {
    socket.to(groupId).emit("group:stop-typing", { groupId, senderId: userId });
  });

  /* ===================== */
  /* CALL LOGIC (CHUẨN HOÁ) */
  /* ===================== */

  socket.on("call:request", ({ receiverId, channelName, isVideo, name, avatar }) => {
    // Lưu receiverId đã chuẩn hóa để tránh lỗi mismatch
    const normalizedReceiverId = normalizeUserId(receiverId);
    
    activeCalls.set(channelName, {
      callerId: userId,
      receiverId: normalizedReceiverId,
      isVideo,
    });

    emitToUser(normalizedReceiverId, "incomingCall", {
      callerInfo: { id: userId, name, avatar },
      channelName,
      isVideo,
    });
  });

  socket.on("call:rejected", async ({ channelName }) => {
    const call = activeCalls.get(channelName);
    if (!call) return;

    emitToUser(call.callerId, "callCancelled", { reason: "rejected" });

    await saveCallLogHandler(
        call.callerId,
        userId,
        call.isVideo,
        "rejected",
        0
    );

    activeCalls.delete(channelName);
  });

  socket.on("call:end", async ({ channelName, status, duration }) => {
    const call = activeCalls.get(channelName);
    if (!call) return;

    await saveCallLogHandler(
      call.callerId,
      call.receiverId,
      call.isVideo,
      status,
      duration
    );

    emitToUser(call.callerId, "call:ended", {});
    emitToUser(call.receiverId, "call:ended", {});
    emitToUser(call.callerId, "call:history_updated", {});
    emitToUser(call.receiverId, "call:history_updated", {});

    activeCalls.delete(channelName);
  });

  socket.on("disconnect", () => {
    for (const [channelName, call] of activeCalls.entries()) {
      if (call.callerId === userId || call.receiverId === userId) {
        const otherUserId = call.callerId === userId ? call.receiverId : call.callerId;
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