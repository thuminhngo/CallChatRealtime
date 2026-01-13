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
  
  // --- CHAT LOGIC (GIỮ NGUYÊN) ---
  socket.on("user:typing", ({ receiverId }) => {
    if (!receiverId) return;
    emitToUser(receiverId, "user:typing", { senderId: userId });
  });

  socket.on("user:stop-typing", ({ receiverId }) => {
    if (!receiverId) return;
    emitToUser(receiverId, "user:stop-typing", { senderId: userId });
  });

  // --- CALL LOGIC (CẬP NHẬT) ---
  
  // A. Người gọi yêu cầu gọi
  socket.on("call:request", ({ receiverId, channelName, isVideo, name, avatar }) => {
    activeCalls.set(channelName, { callerId: userId, receiverId, isVideo });

    emitToUser(receiverId, "incomingCall", {
      callerInfo: { id: userId, name, avatar },
      channelName,
      isVideo,
    });
  });

  // B. Người nhận từ chối
  socket.on("call:rejected", ({ channelName }) => {
    const call = activeCalls.get(channelName);
    if (call) {
      emitToUser(call.callerId, "callCancelled", { reason: "rejected" });
      
      // Lưu log cuộc gọi nhỡ (từ chối)
      saveCallLogHandler(call.callerId, call.receiverId, call.isVideo, "rejected", 0);
      
      activeCalls.delete(channelName);
    }
  });

  // C. Kết thúc cuộc gọi (Dùng cho cả 2 phía: Ngắt khi đang gọi HOẶC Ngắt khi chưa nghe máy)
  socket.on("call:end", async ({ channelName, status, duration }) => {
    const call = activeCalls.get(channelName);
    if (!call) return;

    // 1. Lưu log
    // Nếu client gửi status là "missed" (người gọi tắt trước khi nghe), ta lưu missed
    await saveCallLogHandler(call.callerId, call.receiverId, call.isVideo, status, duration);

    // 2. Quan trọng: Báo cho cả 2 phía là call đã ended
    // Người gọi: Đóng cửa sổ
    // Người nhận: Nếu đang hiện Modal -> Tắt Modal. Nếu đang trong cuộc gọi -> Tắt cửa sổ.
    emitToUser(call.callerId, "call:ended", {});
    emitToUser(call.receiverId, "call:ended", {});
    
    // 3. Cập nhật lịch sử Realtime
    emitToUser(call.callerId, "call:history_updated", {});
    emitToUser(call.receiverId, "call:history_updated", {});

    activeCalls.delete(channelName);
  });

  socket.on("disconnect", () => {
    if (userId && userSocketsMap[userId]) {
      userSocketsMap[userId].delete(socket.id);
      if (userSocketsMap[userId].size === 0) {
        delete userSocketsMap[userId];
      }
    }
    io.emit("getOnlineUsers", Object.keys(userSocketsMap));
  });
});

// Helper Function để gọi Controller (Tránh duplicate code trong socket handler)
async function saveCallLogHandler(callerId, receiverId, isVideo, status, duration) {
    try {
      const { saveCallLog } = await import("../controllers/call.controller.js");
      await saveCallLog(
        {
          user: { _id: callerId },
          body: {
            receiverId: receiverId,
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