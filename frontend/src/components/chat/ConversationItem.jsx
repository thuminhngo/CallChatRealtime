import { useSocket } from "../../context/SocketContext";
import { Cloud, Users } from "lucide-react"; 

export default function ConversationItem({ chat, isActive, onClick, isGroup }) {
  const { onlineUsers } = useSocket();

  // Hàm format thời gian thông minh
  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    
    // Nếu là hôm nay -> Hiện giờ
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    // Nếu khác ngày -> Hiện ngày/tháng
    return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
  };

  // --- LOGIC GROUP ---
  if (isGroup) {
    return (
      <div
        onClick={onClick}
        className={`flex items-center p-3 cursor-pointer transition-all rounded-xl mx-2 mb-1 ${isActive
          ? "bg-purple-50 border border-purple-100" 
          : "hover:bg-gray-50 border border-transparent"
        }`}
      >
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-indigo-400 flex items-center justify-center border border-purple-200 text-white shadow-sm">
             {chat.avatar ? <img src={chat.avatar} className="w-full h-full rounded-full object-cover"/> : <Users size={24} />}
          </div>
        </div>

        <div className="flex-1 min-w-0 ml-3">
          <div className="flex justify-between items-baseline">
            <p className={`font-semibold text-sm truncate ${isActive ? "text-purple-700" : "text-gray-800"}`}>
              {chat.name}
            </p>
            {/* 🔥 THỜI GIAN TIN NHẮN MỚI NHẤT */}
            <span className="text-[10px] text-gray-400 font-medium">
                {formatTime(chat.lastMessageTime || chat.updatedAt)}
            </span>
          </div>
          <div className="flex justify-between items-center mt-0.5">
            <p className={`text-xs truncate max-w-[140px] ${isActive ? "text-purple-400 font-medium" : "text-gray-500"} ${chat.unreadCount > 0 ? "font-bold text-gray-800" : ""}`}>
               {chat.lastMessage || "Chưa có tin nhắn"}
            </p>
            
            {/* 🔥 BADGE SỐ TIN NHẮN CHƯA ĐỌC */}
            {chat.unreadCount > 0 && (
              <span className="flex items-center justify-center text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 bg-purple-500 shadow-sm">
                {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- LOGIC 1-1 (Áp dụng tương tự cho Chat cá nhân) ---
  const isSelfChat = chat.isSelfChat;
  const isOnline = isSelfChat || onlineUsers.includes(chat._id) || chat.isOnline;
  const avatarUrl = chat.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.fullName || 'U')}&background=random`;

  return (
    <div
      onClick={onClick}
      className={`flex items-center p-3 cursor-pointer transition-all rounded-xl mx-2 mb-1 ${isActive
        ? isSelfChat ? "bg-blue-50 border border-blue-100" : "bg-pink-50 border border-pink-100"
        : "hover:bg-gray-50 border border-transparent"
        }`}
    >
        <div className="relative">
        {isSelfChat ? (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center border border-blue-200">
            <Cloud size={24} className="text-white" />
          </div>
        ) : (
          <img src={avatarUrl} alt={chat.fullName} className="w-12 h-12 rounded-full object-cover border border-gray-100" />
        )}
        {isOnline && !isSelfChat && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
        )}
      </div>

      <div className="flex-1 min-w-0 ml-3">
        <div className="flex justify-between items-baseline">
           <p className={`font-semibold text-sm truncate ${isActive ? isSelfChat ? "text-blue-700" : "text-pink-700" : "text-gray-800"}`}>
            {isSelfChat ? "Cloud" : chat.fullName}
          </p>
          {/* 🔥 DÙNG CHUNG HÀM FORMAT TIME */}
          <span className="text-[10px] text-gray-400 font-medium">{formatTime(chat.lastMessageTime)}</span>
        </div>
         <div className="flex justify-between items-center mt-0.5">
          <p className={`text-xs truncate max-w-[140px] ${isActive ? isSelfChat ? "text-blue-400 font-medium" : "text-pink-400 font-medium" : "text-gray-500"} ${chat.unreadCount > 0 ? "font-bold text-gray-800" : ""}`}>
            {isSelfChat ? (chat.lastMessage || "Save notes & files here") : chat.lastMessage}
          </p>
           {chat.unreadCount > 0 && (
            <span className={`flex items-center justify-center text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 ${isSelfChat ? "bg-blue-500" : "bg-pink-500"} shadow-sm`}>
              {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}