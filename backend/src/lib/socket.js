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
  // A. Người gọi yêu cầu gọi -> Lưu trạng thái status: 'pending'
  socket.on("call:request", ({ receiverId, channelName, isVideo, name, avatar }) => {
    activeCalls.set(channelName, { 
        callerId: userId, 
        receiverId, 
        isVideo, 
        status: "pending" // Đánh dấu là đang chờ bắt máy
    });

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
      saveCallLogHandler(call.callerId, call.receiverId, call.isVideo, "rejected", 0);
      activeCalls.delete(channelName);
    }
  });

  // C. Kết thúc cuộc gọi (Nút End hoặc Đóng tab chủ động)
  socket.on("call:end", async ({ channelName, status, duration }) => {
    const call = activeCalls.get(channelName);
    if (!call) return;

    // Nếu client không gửi status, tự suy luận:
    // Nếu status cũ là 'pending' (chưa bắt máy) -> missed
    // Nếu status cũ là 'active' -> ended
    const finalStatus = status || (call.status === "pending" ? "missed" : "ended");

    await saveCallLogHandler(call.callerId, call.receiverId, call.isVideo, finalStatus, duration || 0);

    // Báo cho cả 2 phía tắt
    emitToUser(call.callerId, "call:ended", {});
    emitToUser(call.receiverId, "call:ended", {}); 
    
    // Update lịch sử
    emitToUser(call.callerId, "call:history_updated", {});
    emitToUser(call.receiverId, "call:history_updated", {});

    activeCalls.delete(channelName);
  });

  // D. [MỚI] Xử lý Timeout (30s không ai nghe)
  socket.on("call:timeout", async ({ channelName }) => {
    const call = activeCalls.get(channelName);
    if (call) {
        // Lưu log cuộc gọi nhỡ
        await saveCallLogHandler(call.callerId, call.receiverId, call.isVideo, "missed", 0);
        
        // Báo người gọi (để đóng cửa sổ) và người nhận (để tắt modal Incoming)
        emitToUser(call.callerId, "call:ended", { reason: "timeout" });
        emitToUser(call.receiverId, "call:ended", { reason: "timeout" }); 
        
        activeCalls.delete(channelName);
    }
  });

  // E. [MỚI] Xử lý ngắt kết nối đột ngột (Đóng tab/Mất mạng)
  socket.on("disconnect", async () => {
    // 1. Tìm xem user này có đang trong cuộc gọi nào không
    for (const [channelName, call] of activeCalls.entries()) {
        if (call.callerId === userId || call.receiverId === userId) {
            
            // Xác định người còn lại
            const otherUserId = call.callerId === userId ? call.receiverId : call.callerId;
            
            // Nếu đang chờ (pending) mà người gọi thoát -> Missed
            // Nếu đang gọi (active) mà thoát -> Ended
            const logStatus = call.status === "pending" ? "missed" : "ended";
            
            // Lưu log
            await saveCallLogHandler(call.callerId, call.receiverId, call.isVideo, logStatus, 0);

            // Báo cho người kia biết để tắt màn hình
            emitToUser(otherUserId, "call:ended", { reason: "peer_disconnected" });
            
            activeCalls.delete(channelName);
            break; // Giả sử mỗi user chỉ gọi 1 cuộc 1 lúc
        }
    }

    // 2. Logic dọn dẹp user online cũ (GIỮ NGUYÊN)
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