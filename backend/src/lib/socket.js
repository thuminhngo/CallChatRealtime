// // import { Server } from "socket.io";
// // import http from "http";
// // import express from "express";
// // import { ENV } from "./env.js";

// // const app = express();
// // const server = http.createServer(app);

// // const io = new Server(server, {
// //   cors: {
// //     origin: [ENV.CLIENT_URL, "http://localhost:5173"],
// //     methods: ["GET", "POST"],
// //     credentials: true,
// //   },
// // });

// // // { userId: Set(socketId) }
// // const userSocketsMap = Object.create(null);

// // /* ===================== */
// // /*      HELPERS          */
// // /* ===================== */

// // const normalizeUserId = (userId) => {
// //   if (!userId || userId === "undefined" || userId === "null") return null;
// //   return userId.toString();
// // };

// // /**
// //  * Lấy tất cả socketId của user
// //  */
// // export const getReceiverSocketIds = (userId) => {
// //   const id = normalizeUserId(userId);
// //   if (!id || !userSocketsMap[id]) return [];
// //   return Array.from(userSocketsMap[id]);
// // };

// // /**
// //  * Lấy 1 socketId (backward compatibility)
// //  */
// // export const getReceiverSocketId = (userId) => {
// //   const sockets = getReceiverSocketIds(userId);
// //   return sockets.length ? sockets[sockets.length - 1] : null;
// // };

// // /**
// //  * User online?
// //  */
// // export const isUserOnline = (userId) => {
// //   const id = normalizeUserId(userId);
// //   return !!(id && userSocketsMap[id]?.size);
// // };

// // /**
// //  * Emit event cho toàn bộ tab / device của user
// //  */
// // export const emitToUser = (userId, event, data) => {
// //   const socketIds = getReceiverSocketIds(userId);
// //   socketIds.forEach(socketId => {
// //     io.to(socketId).emit(event, data);
// //   });
// // };

// // /**
// //  * Lấy danh sách user online thực sự
// //  */
// // const getOnlineUserIds = () =>
// //   Object.entries(userSocketsMap)
// //     .filter(([, sockets]) => sockets.size > 0)
// //     .map(([userId]) => userId);

// // /* ===================== */
// // /*      SOCKET.IO        */
// // /* ===================== */

// // io.on("connection", (socket) => {
// //   const rawUserId = socket.handshake.query.userId;
// //   const userId = normalizeUserId(rawUserId);

// //   if (!userId) {
// //     console.warn("Socket connected without valid userId:", socket.id);
// //     socket.disconnect();
// //     return;
// //   }

// //   // Init user socket set
// //   if (!userSocketsMap[userId]) {
// //     userSocketsMap[userId] = new Set();
// //   }

// //   userSocketsMap[userId].add(socket.id);
// //   socket.join(userId); // optional room

// //   console.log(`✅ User ${userId} connected (${socket.id})`);

// //   // Broadcast online users
// //   io.emit("getOnlineUsers", getOnlineUserIds());

// //   /* -------- Typing -------- */
// //   socket.on("user:typing", ({ receiverId }) => {
// //     if (!receiverId) return;
// //     emitToUser(receiverId, "user:typing", { senderId: userId });
// //   });

// //   socket.on("user:stop-typing", ({ receiverId }) => {
// //     if (!receiverId) return;
// //     emitToUser(receiverId, "user:stop-typing", { senderId: userId });
// //   });

// //   /* -------- Disconnect -------- */
// //   socket.on("disconnect", () => {
// //     if (userSocketsMap[userId]) {
// //       userSocketsMap[userId].delete(socket.id);

// //       if (userSocketsMap[userId].size === 0) {
// //         delete userSocketsMap[userId];
// //       }
// //     }

// //     console.log(`❌ User ${userId} disconnected (${socket.id})`);
// //     io.emit("getOnlineUsers", getOnlineUserIds());
// //   });
// // });



// // /* ===================== */
// // /*      CALL EVENTS       */
// // /* ===================== */

// // const activeCalls = new Map(); // lưu tạm channelName => {callerId, receiverId, isVideo}

// // io.on("connection", (socket) => {
// //   const rawUserId = socket.handshake.query.userId;
// //   const userId = normalizeUserId(rawUserId);

// //   if (!userId) {
// //     socket.disconnect();
// //     return;
// //   }

// //   if (!userSocketsMap[userId]) userSocketsMap[userId] = new Set();
// //   userSocketsMap[userId].add(socket.id);

// //   // --- Gọi đi ---
// //   socket.on("call:request", ({ receiverId, isVideo, name, avatar }) => {
// //     if (!receiverId) return;

// //     const channelName = `call_${userId}_${receiverId}_${Date.now()}`;
// //     activeCalls.set(channelName, { callerId: userId, receiverId, isVideo });

// //     // Emit incomingCall tới người nhận
// //     emitToUser(receiverId, "incomingCall", {
// //       callerInfo: { id: userId, name, avatar },
// //       isVideo,
// //       channelName,
// //     });
// //   });

// //   // --- Từ chối call ---
// //   socket.on("call:rejected", ({ channelName }) => {
// //     const call = activeCalls.get(channelName);
// //     if (!call) return;

// //     emitToUser(call.callerId, "callCancelled", {});
// //     activeCalls.delete(channelName);
// //   });

// //   // --- Kết thúc call ---
// //   socket.on("call:end", async ({ channelName, status, duration }) => {
// //     const call = activeCalls.get(channelName);
// //     if (!call) return;

// //     // Lưu log call
// //     try {
// //       const { saveCallLog } = await import("../controllers/call.controller.js");
// //       await saveCallLog({
// //         user: { _id: call.callerId },
// //         body: {
// //           receiverId: call.receiverId,
// //           callType: call.isVideo ? "video" : "voice",
// //           status,
// //           duration,
// //         },
// //       }, { status: () => {}, json: () => {} });
// //     } catch (err) {
// //       console.error("Lưu log call lỗi:", err);
// //     }

// //     emitToUser(call.callerId, "call:ended", {});
// //     emitToUser(call.receiverId, "call:ended", {});
// //     emitToUser(call.receiverId, "call:history_updated", {});
// //     emitToUser(call.callerId, "call:history_updated", {});

// //     activeCalls.delete(channelName);
// //   });
// // });


// // export { io, app, server, userSocketsMap };

// import { Server } from "socket.io";
// import http from "http";
// import express from "express";
// import { ENV } from "./env.js";

// const app = express();
// const server = http.createServer(app);

// const io = new Server(server, {
//   cors: {
//     origin: [ENV.CLIENT_URL, "http://localhost:5173"],
//     methods: ["GET", "POST"],
//     credentials: true,
//   },
// });

// const userSocketsMap = Object.create(null);
// const activeCalls = new Map(); // channelName => { callerId, receiverId }

// export const getReceiverSocketIds = (userId) => {
//   if (!userId || !userSocketsMap[userId]) return [];
//   return Array.from(userSocketsMap[userId]);
// };

// export const emitToUser = (userId, event, data) => {
//   const socketIds = getReceiverSocketIds(userId);
//   socketIds.forEach((socketId) => io.to(socketId).emit(event, data));
// };

// io.on("connection", (socket) => {
//   const userId = socket.handshake.query.userId;
//   if (userId) {
//     if (!userSocketsMap[userId]) userSocketsMap[userId] = new Set();
//     userSocketsMap[userId].add(socket.id);
//     socket.join(userId);
//     io.emit("getOnlineUsers", Object.keys(userSocketsMap));
//   }

//   // --- 1. NGƯỜI GỌI: Bắt đầu cuộc gọi ---
//   // Client (người gọi) đã tự sinh channelName và gửi lên
//   socket.on("call:request", ({ receiverId, channelName, isVideo, name, avatar }) => {
//     // Lưu thông tin cuộc gọi
//     activeCalls.set(channelName, { callerId: userId, receiverId, isVideo });

//     // Báo cho người nhận biết có cuộc gọi đến
//     emitToUser(receiverId, "incomingCall", {
//       callerInfo: { id: userId, name, avatar },
//       channelName,
//       isVideo,
//     });
//   });

//   // --- 2. NGƯỜI NHẬN: Từ chối cuộc gọi ---
//   socket.on("call:rejected", ({ channelName, receiverId }) => { // receiverId optional if mapped
//      const call = activeCalls.get(channelName);
//      if (call) {
//         emitToUser(call.callerId, "callCancelled", { reason: "rejected" });
//         activeCalls.delete(channelName);
//      } else if (receiverId) {
//         // Fallback nếu không tìm thấy call trong map (ví dụ caller id)
//         // Trong thực tế nên gửi kèm callerId từ client để chắc chắn
//      }
//   });

//   // --- 3. KẾT THÚC CUỘC GỌI ---
//   socket.on("call:end", async ({ channelName, status, duration }) => {
//     const call = activeCalls.get(channelName);
//     if (!call) return;

//     // Lưu log vào database
//     try {
//       const { saveCallLog } = await import("../controllers/call.controller.js");
//       // Giả lập req, res để tái sử dụng controller (hoặc tách logic service riêng)
//       await saveCallLog(
//         {
//           user: { _id: call.callerId },
//           body: {
//             receiverId: call.receiverId,
//             callType: call.isVideo ? "video" : "voice",
//             status,
//             duration,
//           },
//         },
//         { status: () => ({ json: () => {} }) } // Mock res
//       );
//     } catch (err) {
//       console.error("Lỗi lưu log:", err);
//     }

//     // Thông báo cho cả 2 phía tắt màn hình gọi
//     emitToUser(call.callerId, "call:ended", {});
//     emitToUser(call.receiverId, "call:ended", {});
    
//     // Cập nhật lịch sử
//     emitToUser(call.callerId, "call:history_updated", {});
//     emitToUser(call.receiverId, "call:history_updated", {});

//     activeCalls.delete(channelName);
//   });

//   socket.on("disconnect", () => {
//     if (userId && userSocketsMap[userId]) {
//       userSocketsMap[userId].delete(socket.id);
//       if (userSocketsMap[userId].size === 0) delete userSocketsMap[userId];
//       io.emit("getOnlineUsers", Object.keys(userSocketsMap));
//     }
//   });
// });

// export { io, app, server };


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

// Map lưu trữ cuộc gọi đang diễn ra: { channelName: { callerId, receiverId, isVideo } }
const activeCalls = new Map();

/* ===================== */
/* HELPERS          */
/* ===================== */

const normalizeUserId = (userId) => {
  if (!userId || userId === "undefined" || userId === "null") return null;
  return userId.toString();
};

/**
 * 1. Lấy TẤT CẢ socketId của user (Logic mới hỗ trợ đa thiết bị)
 */
export const getReceiverSocketIds = (userId) => {
  const id = normalizeUserId(userId);
  if (!id || !userSocketsMap[id]) return [];
  return Array.from(userSocketsMap[id]);
};

/**
 * 2. Lấy 1 socketId đại diện (QUAN TRỌNG: Fix lỗi message.controller.js)
 */
export const getReceiverSocketId = (userId) => {
  const sockets = getReceiverSocketIds(userId);
  return sockets.length ? sockets[sockets.length - 1] : null;
};

/**
 * 3. Kiểm tra User có Online không (QUAN TRỌNG: Fix lỗi controller)
 */
export const isUserOnline = (userId) => {
  const id = normalizeUserId(userId);
  return !!(id && userSocketsMap[id]?.size);
};

/**
 * 4. Emit event tới user (bất kể họ dùng bao nhiêu tab)
 */
export const emitToUser = (userId, event, data) => {
  const socketIds = getReceiverSocketIds(userId);
  socketIds.forEach((socketId) => {
    io.to(socketId).emit(event, data);
  });
};

/* ===================== */
/* SOCKET LOGIC     */
/* ===================== */

io.on("connection", (socket) => {
  const rawUserId = socket.handshake.query.userId;
  const userId = normalizeUserId(rawUserId);

  // --- 1. XỬ LÝ KẾT NỐI ---
  if (userId) {
    if (!userSocketsMap[userId]) {
      userSocketsMap[userId] = new Set();
    }
    userSocketsMap[userId].add(socket.id);
    socket.join(userId);

    // Broadcast online users
    io.emit("getOnlineUsers", Object.keys(userSocketsMap));
  }
  
  console.log(`✅ User connected: ${userId || "Anon"} (${socket.id})`);

  // --- 2. LOGIC CHAT (Typing) ---
  // (Đã thêm lại phần này từ code cũ để chat hiển thị "đang soạn tin...")
  socket.on("user:typing", ({ receiverId }) => {
    if (!receiverId) return;
    emitToUser(receiverId, "user:typing", { senderId: userId });
  });

  socket.on("user:stop-typing", ({ receiverId }) => {
    if (!receiverId) return;
    emitToUser(receiverId, "user:stop-typing", { senderId: userId });
  });

  // --- 3. LOGIC CALL (MỚI - Đồng bộ với Frontend) ---
  
  // A. Người gọi yêu cầu gọi (channelName được tạo từ Client)
  socket.on("call:request", ({ receiverId, channelName, isVideo, name, avatar }) => {
    // Lưu session cuộc gọi
    activeCalls.set(channelName, { callerId: userId, receiverId, isVideo });

    // Báo người nhận
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
      activeCalls.delete(channelName);
    }
  });

  // C. Kết thúc cuộc gọi
  socket.on("call:end", async ({ channelName, status, duration }) => {
    const call = activeCalls.get(channelName);
    if (!call) return;

    // Lưu log (Mock Controller Call)
    try {
      // Import động để tránh circular dependency nếu cần thiết
      const { saveCallLog } = await import("../controllers/call.controller.js");
      
      await saveCallLog(
        {
          user: { _id: call.callerId },
          body: {
            receiverId: call.receiverId,
            callType: call.isVideo ? "video" : "voice",
            status,
            duration,
          },
        },
        { status: () => ({ json: () => {} }) } // Mock response object
      );
    } catch (err) {
      console.error("Lỗi lưu log cuộc gọi:", err);
    }

    // Báo cả 2 phía tắt màn hình
    emitToUser(call.callerId, "call:ended", {});
    emitToUser(call.receiverId, "call:ended", {});
    
    // Cập nhật lịch sử real-time
    emitToUser(call.callerId, "call:history_updated", {});
    emitToUser(call.receiverId, "call:history_updated", {});

    activeCalls.delete(channelName);
  });

  // --- 4. NGẮT KẾT NỐI ---
  socket.on("disconnect", () => {
    if (userId && userSocketsMap[userId]) {
      userSocketsMap[userId].delete(socket.id);
      
      if (userSocketsMap[userId].size === 0) {
        delete userSocketsMap[userId];
      }
    }
    
    io.emit("getOnlineUsers", Object.keys(userSocketsMap));
    console.log(`❌ User disconnected: ${userId} (${socket.id})`);
  });
});

export { io, app, server, userSocketsMap };