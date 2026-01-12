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

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const { authUser } = useAuth();
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (!authUser?._id) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
        setOnlineUsers([]);
      }
      return;
    }

    // BASE_URL: localhost dev / production cùng domain
    let BASE_URL =
      import.meta.env.MODE === "development" ? "http://localhost:3000" : "/";

    // Nếu frontend đang HTTPS, WebSocket sẽ tự động chuyển sang WSS
    if (typeof window !== "undefined" && window.location.protocol === "https:") {
      if (BASE_URL.startsWith("http")) BASE_URL = BASE_URL.replace(/^http/, "wss");
      else if (BASE_URL.startsWith("/")) BASE_URL = `wss://${window.location.host}`;
    } else if (BASE_URL.startsWith("/")) {
      BASE_URL = `ws://${window.location.host}`;
    }

    const newSocket = io(BASE_URL, {
      query: { userId: authUser._id },
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
    });

    // --- Listeners ---
    newSocket.on("connect", () => {
      console.log("✅ Socket connected:", newSocket.id);
      setIsConnected(true);
    });

    newSocket.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected:", reason);
      setIsConnected(false);
    });

    newSocket.on("getOnlineUsers", (userIds) => setOnlineUsers(userIds));

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

    return () => {
      console.log("🛑 Cleanup old socket...");
      newSocket.off("connect");
      newSocket.off("disconnect");
      newSocket.off("getOnlineUsers");
      newSocket.off("user:typing");
      newSocket.off("user:stop-typing");
      newSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [authUser?._id]);

  // --- Typing handlers ---
  const emitTyping = useCallback(
    (receiverId) => {
      if (!socket?.connected) return;
      socket.emit("user:typing", { receiverId });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("user:stop-typing", { receiverId });
      }, 2000);
    },
    [socket]
  );

  const stopTyping = useCallback(
    (receiverId) => {
      if (!socket?.connected) return;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      socket.emit("user:stop-typing", { receiverId });
    },
    [socket]
  );

  const value = useMemo(
    () => ({ socket, onlineUsers, isConnected, typingUsers, emitTyping, stopTyping }),
    [socket, onlineUsers, isConnected, typingUsers, emitTyping, stopTyping]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error("useSocket must be used within SocketProvider");
  return context;
};
