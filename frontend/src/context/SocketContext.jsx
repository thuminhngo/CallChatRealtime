import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext();

// 1. CẤU HÌNH URL:
// Tự động lấy từ file .env, nếu không có thì mới dùng localhost:3000
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  
  const { authUser } = useAuth();
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    // 2. KIỂM TRA NGHIÊM NGẶT:
    // Nếu chưa đăng nhập hoặc không có ID, ngắt kết nối cũ (nếu có) và thoát.
    if (!authUser || !authUser._id) {
      if (socket) {
        socket.close();
        setSocket(null);
        setIsConnected(false);
        setOnlineUsers([]);
      }
      return;
    }

    console.log("🔄 Đang kết nối Socket tới:", BASE_URL);

    // 3. KHỞI TẠO SOCKET
    const newSocket = io(BASE_URL, {
      query: {
        userId: authUser._id,
      },
      withCredentials: true,
      transports: ["websocket", "polling"], // Ưu tiên websocket
      reconnectionAttempts: 5, // Giới hạn số lần thử kết nối lại
    });

    // --- LẮNG NGHE SỰ KIỆN ---

    newSocket.on("connect", () => {
      console.log("✅ Socket đã kết nối! ID:", newSocket.id);
      setIsConnected(true);
    });

    newSocket.on("connect_error", (err) => {
      console.error("❌ Lỗi kết nối Socket:", err.message);
      if (err.message === "xhr poll error") {
        console.warn("⚠️ Gợi ý: Kiểm tra CORS bên Backend (file socket.js).");
      }
      setIsConnected(false);
    });

    newSocket.on("disconnect", (reason) => {
      console.log("❌ Socket mất kết nối:", reason);
      setIsConnected(false);
      // Nếu server chủ động ngắt, set socket về null
      if (reason === "io server disconnect") {
        setSocket(null);
      }
    });

    newSocket.on("getOnlineUsers", (userIds) => {
      setOnlineUsers(userIds);
    });

    newSocket.on("user:typing", ({ senderId }) => {
      setTypingUsers((prev) => ({ ...prev, [senderId]: true }));
    });

    newSocket.on("user:stop-typing", ({ senderId }) => {
      setTypingUsers((prev) => {
        const updated = { ...prev };
        delete updated[senderId];
        return updated;
      });
    });

    setSocket(newSocket);

    // 4. HÀM DỌN DẸP (CLEANUP FUNCTION) QUAN TRỌNG
    return () => {
      console.log("🛑 Đang dọn dẹp socket cũ...");
      // Gỡ bỏ listeners để tránh rò rỉ bộ nhớ hoặc nhận sự kiện trùng lặp
      newSocket.off("connect");
      newSocket.off("connect_error");
      newSocket.off("getOnlineUsers");
      newSocket.off("user:typing");
      newSocket.off("user:stop-typing");
      
      newSocket.close();
      setSocket(null);
    };
  }, [authUser?._id]); // Chỉ chạy lại khi ID người dùng thực sự thay đổi

  // --- XỬ LÝ TYPING ---

  const emitTyping = useCallback(
    (receiverId) => {
      // Kiểm tra socket còn sống không trước khi gửi
      if (!socket || !socket.connected) return;

      socket.emit("user:typing", { receiverId });

      // Debounce: Xóa timeout cũ nếu người dùng vẫn đang gõ
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      
      // Set timeout mới để gửi stop-typing sau 2s ngừng gõ
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("user:stop-typing", { receiverId });
      }, 2000);
    },
    [socket]
  );

  const stopTyping = useCallback(
    (receiverId) => {
      if (!socket || !socket.connected) return;
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      socket.emit("user:stop-typing", { receiverId });
    },
    [socket]
  );

  // 5. MEMOIZE GIÁ TRỊ CONTEXT
  // Giúp tránh render lại không cần thiết cho các component con
  const value = useMemo(
    () => ({
      socket,
      onlineUsers,
      isConnected,
      typingUsers,
      emitTyping,
      stopTyping,
    }),
    [socket, onlineUsers, isConnected, typingUsers, emitTyping, stopTyping]
  );

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocket phải được dùng bên trong SocketProvider");
  }
  return context;
};