import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { axiosInstance } from "../lib/axios";
import { useSocket } from "./SocketContext";
import { useAuth } from "./AuthContext"; 
import toast from "react-hot-toast";
import { useMemo } from "react";

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  // --- STATE QUẢN LÝ DỮ LIỆU ---
  const { authUser, setAuthUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [homeStats, setHomeStats] = useState({ chats: [], calls: [] });
  const [selectedUser, setSelectedUser] = useState(null);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [isPartnersLoading, setIsPartnersLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [isBlockedByPartner, setIsBlockedByPartner] = useState(false);

  const { socket } = useSocket();

  /* Lấy danh sách người dùng ở Sidebar */
  const getHomeStats = useCallback(async () => {
    setIsPartnersLoading(true);
    try {
      const res = await axiosInstance.get("/messages/users");
      setHomeStats({ 
        chats: Array.isArray(res.data) ? res.data : [], 
        calls: [] 
      }); 
    } catch (error) {
      console.error("Lỗi lấy stats:", error);
      setHomeStats({ chats: [], calls: [] });
    } finally {
      setIsPartnersLoading(false);
    }
  }, []);

  
  const getMessagesByUserId = useCallback(async (userId) => {
    setIsMessagesLoading(true);
    setIsBlockedByPartner(false);

    setHomeStats((prev) => {
      // Nếu chưa có danh sách chat thì bỏ qua
      if (!prev || !prev.chats) return prev;
      
      return {
        ...prev,
        chats: prev.chats.map((chat) => {
          // Tìm đúng người đang click và ép unreadCount = 0 ngay lập tức
          if (chat._id === userId) {
            return { ...chat, unreadCount: 0 };
          }
          return chat;
        }),
      };
    });

    try {
      // Sau khi giao diện đã cập nhật xong (số đỏ biến mất), mới âm thầm gọi API
      const res = await axiosInstance.get(`/messages/${userId}`);

      const { messages = [], isBlockedByPartner } = res.data || {};

      setMessages(Array.isArray(messages) ? messages : []);
      setIsBlockedByPartner(!!isBlockedByPartner);

    } catch (error) {
      if (error.response?.status === 403) {
        setIsBlockedByPartner(true);
        toast.error("Bạn không thể nhắn tin cho người này.");
      } else {
        toast.error("Không thể tải tin nhắn");
      }
      setMessages([]);
    } finally {
      setIsMessagesLoading(false);
    }
  }, []); // Kết thúc getMessagesByUserId

  
  /* Gửi tin nhắn */
  const sendMessage = async (messageData) => {
    if (!selectedUser) return;
    try {
      const formData = new FormData();
      if (messageData.text) formData.append("text", messageData.text);
      if (messageData.image) formData.append("image", messageData.image);
      if (messageData.audio) formData.append("audio", messageData.audio);

      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`, 
        formData
      );

      setMessages((prev) => [...prev, res.data]);
      
      // Cập nhật lại list chat để đưa tin nhắn mới lên đầu
      setHomeStats((prev) => {
          const updatedChats = prev.chats.map(chat => 
             chat._id === selectedUser._id 
             ? { ...chat, lastMessage: messageData.text || "Sent a message", lastMessageTime: new Date() }
             : chat
          );
          // Sắp xếp lại
          updatedChats.sort((a,b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
          return { ...prev, chats: updatedChats };
      });
      
    } catch (error) {
      console.error("Lỗi gửi tin nhắn:", error);
      toast.error("Gửi tin nhắn thất bại");
    }
  };

  const totalUnreadMessages = useMemo(() => {
    if (!homeStats.chats || !Array.isArray(homeStats.chats)) return 0;
    return homeStats.chats.reduce((total, chat) => total + (chat.unreadCount || 0), 0);
  }, [homeStats.chats]);

  /* Lấy media đã chia sẻ */
  const getSharedMedia = useCallback(async () => {
    try {
      if (!Array.isArray(messages)) return []; 
      return messages.filter(msg => msg.image);
    } catch (error) {
      return [];
    }
  }, [messages]);

  /* Thả tim */
  const reactToMessage = async (messageId, emoji) => {
    try {
      const res = await axiosInstance.post(`/messages/react/${messageId}`, { emoji });
      setMessages((prev) =>
        prev.map((msg) => (msg._id === messageId ? res.data : msg))
      );
    } catch (error) {
        console.error("Lỗi reaction:", error);
    }
  };

  /* Đánh dấu đã đọc */
  const markAsRead = async (partnerId) => {
    try {
      // Cập nhật UI trước
      setHomeStats(prev => ({
        ...prev,
        chats: Array.isArray(prev.chats) 
          ? prev.chats.map(p => p._id === partnerId ? { ...p, unreadCount: 0 } : p)
          : []
      }));
      // Gọi API sau
      await axiosInstance.put(`/messages/read/${partnerId}`);
    } catch (error) {
        console.error("Lỗi markAsRead:", error);
    }
  };

  /* Typing */
  const sendTypingStatus = (isTyping) => {
    if (!socket || !selectedUser) return;
    socket.emit(isTyping ? "user:typing" : "user:stop-typing", { receiverId: selectedUser._id });
  };

  /* Xoá cuộc trò chuyện */
  const deleteConversation = async (partnerId) => {
    try {
      await axiosInstance.delete(`/messages/conversation/${partnerId}`);
      
      setHomeStats((prev) => ({
        ...prev,
        chats: prev.chats.filter((chat) => chat._id !== partnerId),
      }));

      if (selectedUser?._id === partnerId) {
        setSelectedUser(null);
        setMessages([]);
      }
      toast.success("Đã xoá cuộc trò chuyện");
    } catch (error) {
      toast.error("Không thể xoá cuộc trò chuyện");
    }
  };

  /* Chặn user */
  const blockUser = async (userId) => {
    try {
      await axiosInstance.put(`/users/block/${userId}`);
      setAuthUser((prev) => ({
        ...prev,
        blockedUsers: [...(prev.blockedUsers || []), userId],
      }));
      toast.success("Đã chặn người dùng");
    } catch (error) {
      toast.error("Lỗi khi chặn");
    }
  };

  /* Bỏ chặn */
  const unblockUser = async (userId) => {
    try {
      await axiosInstance.put(`/users/unblock/${userId}`);
      setAuthUser((prev) => ({
        ...prev,
        blockedUsers: prev.blockedUsers.filter((id) => id !== userId),
      }));
      toast.success("Đã bỏ chặn");
    } catch (error) {
      toast.error("Lỗi khi bỏ chặn");
    }
  };

  // --- SOCKET LISTENERS ---
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMessage) => {
      // 1. Nếu đang mở chat với người này -> Thêm tin nhắn + Đánh dấu đã đọc
      if (selectedUser && newMessage.senderId === selectedUser._id) {
        setMessages((prev) => [...prev, newMessage]);
        markAsRead(selectedUser._id);
      }

      // 2. Cập nhật Sidebar Realtime (Không gọi API getHomeStats để tránh lag)
      setHomeStats((prev) => {
          const chats = prev.chats || [];
          const existingChatIndex = chats.findIndex(c => c._id === newMessage.senderId);
          
          let updatedChats = [...chats];
          
          if (existingChatIndex !== -1) {
              // Cập nhật chat cũ
              updatedChats[existingChatIndex] = {
                  ...updatedChats[existingChatIndex],
                  lastMessage: newMessage.text || (newMessage.image ? "Image" : "Voice"),
                  lastMessageTime: new Date().toISOString(),
                  // Nếu không đang chat với người này thì tăng unread lên
                  unreadCount: (selectedUser?._id === newMessage.senderId) 
                      ? 0 
                      : (updatedChats[existingChatIndex].unreadCount || 0) + 1
              };
          } else {
              // Nếu chat chưa có trong list thì reload lại API cho chắc
              getHomeStats();
              return prev;
          }
          
          // Đưa lên đầu
          updatedChats.sort((a,b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
          return { ...prev, chats: updatedChats };
      });
    };

    const handleReaction = (updatedMessage) => {
      setMessages((prev) => prev.map((msg) => (msg._id === updatedMessage._id ? updatedMessage : msg)));
    };

    const handleTyping = ({ senderId }) => setTypingUsers((prev) => ({ ...prev, [senderId]: true }));
    const handleStopTyping = ({ senderId }) => setTypingUsers((prev) => ({ ...prev, [senderId]: false }));

    const handleBlocked = ({ senderId }) => {
      if (selectedUser && senderId === selectedUser._id) {
        setIsBlockedByPartner(true);
        toast.error("Bạn vừa bị người dùng này chặn.");
      }
    };

    const handleUnblocked = ({ senderId }) => {
      if (selectedUser && senderId === selectedUser._id) {
        setIsBlockedByPartner(false);
        toast.success("Người dùng này đã bỏ chặn bạn.");
      }
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("messageReaction", handleReaction);
    socket.on("user:typing", handleTyping);
    socket.on("user:stop-typing", handleStopTyping);
    socket.on("user:blocked", handleBlocked);
    socket.on("user:unblocked", handleUnblocked);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("messageReaction", handleReaction);
      socket.off("user:typing", handleTyping);
      socket.off("user:stop-typing", handleStopTyping);
      socket.off("user:blocked", handleBlocked);
      socket.off("user:unblocked", handleUnblocked);
    };
  }, [socket, selectedUser, getHomeStats]); 

  return (
    <ChatContext.Provider
      value={{
        messages,
        homeStats,
        selectedUser,
        setSelectedUser,
        isMessagesLoading,
        isPartnersLoading,
        typingUsers,
        isBlockedByPartner,
        getHomeStats,
        getMessagesByUserId,
        getSharedMedia,
        sendMessage,
        reactToMessage,
        markAsRead,
        sendTypingStatus,
        deleteConversation,
        blockUser,
        unblockUser,
        totalUnreadMessages,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};