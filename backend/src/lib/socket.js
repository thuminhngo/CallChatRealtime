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

// userId -> Set(socketId)
const userSocketsMap = Object.create(null);

// channelName -> call info
const activeCalls = new Map();

/* =========================================================
 * HELPERS
 * ======================================================= */

const normalizeUserId = (userId) => {
  if (!userId || userId === "undefined" || userId === "null") return null;
  return userId.toString();
};

export const getReceiverSocketIds = (userId) => {
  const id = normalizeUserId(userId);
  if (!id || !userSocketsMap[id]) return [];
  return Array.from(userSocketsMap[id]);
};

export const isUserOnline = (userId) => {
  const id = normalizeUserId(userId);
  return !!(id && userSocketsMap[id]?.size);
};

export const emitToUser = (userId, event, data) => {
  getReceiverSocketIds(userId).forEach((sid) => {
    io.to(sid).emit(event, data);
  });
};

export const emitToGroup = (groupId, event, data) => {
  if (groupId) io.to(`group:${groupId}`).emit(event, data);
};

io.use(socketAuthMiddleware);

/* =========================================================
 * SOCKET HANDLER
 * ======================================================= */
io.on("connection", (socket) => {
  const userId = socket.userId;

  if (userId) {
    if (!userSocketsMap[userId]) userSocketsMap[userId] = new Set();
    userSocketsMap[userId].add(socket.id);
    socket.join(userId);
    io.emit("getOnlineUsers", Object.keys(userSocketsMap));
  }

  /* ================= CHAT TYPING ================= */
  socket.on("user:typing", ({ receiverId }) => {
    if (receiverId) emitToUser(receiverId, "user:typing", { senderId: userId });
  });

  socket.on("user:stop-typing", ({ receiverId }) => {
    if (receiverId)
      emitToUser(receiverId, "user:stop-typing", { senderId: userId });
  });

  /* ================= GROUP ================= */
  socket.on("group:join", ({ groupId }) => {
    if (!groupId) return;
    socket.join(`group:${groupId}`);
    socket.to(`group:${groupId}`).emit("group:member:joined", { groupId, userId });
  });

  socket.on("group:leave", ({ groupId }) => {
    if (!groupId) return;
    socket.leave(`group:${groupId}`);
    socket.to(`group:${groupId}`).emit("group:member:left", { groupId, userId });
  });

  socket.on("group:message", ({ groupId, message }) => {
    if (groupId && message)
      io.to(`group:${groupId}`).emit("group:message", { groupId, message });
  });

  socket.on("group:typing", ({ groupId }) => {
    if (groupId)
      socket.to(`group:${groupId}`).emit("group:typing", {
        groupId,
        senderId: userId,
      });
  });

  socket.on("group:stop-typing", ({ groupId }) => {
    if (groupId)
      socket.to(`group:${groupId}`).emit("group:stop-typing", {
        groupId,
        senderId: userId,
      });
  });

  /* ================= 1-1 CALL ================= */

  socket.on("call:request", ({ receiverId, channelName, isVideo, name, avatar }) => {
    if (!receiverId || !channelName) return;

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

  socket.on("call:accepted", ({ channelName }) => {
    const call = activeCalls.get(channelName);
    if (!call) return;

    call.status = "ongoing";
    emitToUser(call.callerId, "call:accepted", { channelName });
  });

  socket.on("call:rejected", async ({ channelName }) => {
    const call = activeCalls.get(channelName);
    if (!call) return;

    await saveCallLogHandler(
      call.callerId,
      call.receiverId,
      call.isVideo,
      "rejected",
      0
    );

    emitToUser(call.callerId, "call:ended", { reason: "rejected" });
    emitToUser(call.receiverId, "call:ended", { reason: "rejected" });

    activeCalls.delete(channelName);
  });

  socket.on("call:end", async ({ channelName, reason, duration }) => {
    const call = activeCalls.get(channelName);
    if (!call) return;

    await saveCallLogHandler(
      call.callerId,
      call.receiverId,
      call.isVideo,
      reason || "completed",
      duration || 0
    );

    emitToUser(call.callerId, "call:ended", {});
    emitToUser(call.receiverId, "call:ended", {});
    emitToUser(call.callerId, "call:history_updated");
    emitToUser(call.receiverId, "call:history_updated");

    activeCalls.delete(channelName);
  });

  socket.on("call:timeout", async ({ channelName }) => {
    const call = activeCalls.get(channelName);
    if (!call) return;

    await saveCallLogHandler(
      call.callerId,
      call.receiverId,
      call.isVideo,
      "timeout",
      0
    );

    emitToUser(call.callerId, "call:ended", { reason: "timeout" });
    emitToUser(call.receiverId, "call:ended", { reason: "timeout" });

    activeCalls.delete(channelName);
  });

  /* ================= DISCONNECT ================= */
  socket.on("disconnect", async () => {
    for (const [channelName, call] of activeCalls.entries()) {
      if (call.callerId === userId || call.receiverId === userId) {
        const reason = call.status === "pending" ? "timeout" : "completed";

        await saveCallLogHandler(
          call.callerId,
          call.receiverId,
          call.isVideo,
          reason,
          0
        );

        const other =
          call.callerId === userId ? call.receiverId : call.callerId;

        emitToUser(other, "call:ended", { reason: "peer_disconnected" });
        activeCalls.delete(channelName);
        break;
      }
    }

    if (userId && userSocketsMap[userId]) {
      userSocketsMap[userId].delete(socket.id);
      if (!userSocketsMap[userId].size) delete userSocketsMap[userId];
    }

    io.emit("getOnlineUsers", Object.keys(userSocketsMap));
  });
});

/* =========================================================
 * CALL LOG HELPER (FIX CHUẨN CONTROLLER)
 * ======================================================= */
async function saveCallLogHandler(
  callerId,
  receiverId,
  isVideo,
  reason,
  duration
) {
  try {
    const { saveCallLog } = await import("../controllers/call.controller.js");

    await saveCallLog(
      {
        user: { _id: callerId },
        body: {
          receiverId,
          callType: isVideo ? "video" : "voice",
          reason,
          duration,
        },
      },
      { status: () => ({ json: () => {} }) }
    );
  } catch (err) {
    console.error("saveCallLogHandler error:", err);
  }
}

export { io, app, server, userSocketsMap };
