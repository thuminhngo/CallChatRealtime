import { ChevronLeft, Cloud, Phone, Search, Sidebar, Video } from "lucide-react";
// SỬA: Import hàm startCall thay vì OpenCallWindow trực tiếp
import { startCall } from "../../utils/callHandler"; 
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import { useFriend } from "../../context/FriendContext";
import { useSocket } from "../../context/SocketContext";

export default function ChatHeader({
  chat,
  onToggleInfoSidebar,
  isInfoSidebarOpen,
  onToggleSearch,
  isSearchOpen,
}) {
  const { onlineUsers, socket } = useSocket();
  const { authUser } = useAuth();
  const { setSelectedUser } = useChat();
  const { friends } = useFriend();

  if (!chat) return null;

  const isFriend = friends.some(f => f._id === chat?._id);
  const isSelfChat = chat.isSelfChat || chat._id === authUser?._id;
  const isOnline = isSelfChat || (Array.isArray(onlineUsers) && (onlineUsers.includes(String(chat._id))));
  const avatarUrl = chat.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.fullName || "U")}&background=random`;

  const handleStartCall = (isVideo) => {
    // SỬA: Dùng hàm startCall chung để đảm bảo ID phòng chuẩn
    // Hàm này đã bao gồm việc check socket, authUser và tạo channelName ngắn gọn
    if (!socket) return;
    startCall(authUser, chat, isVideo);
  }

  return (
    <div className="flex items-center justify-between p-4 border-b bg-white sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <button onClick={() => setSelectedUser(null)} className="md:hidden p-1 text-gray-500 hover:bg-gray-100 rounded-full">
          <ChevronLeft size={24} />
        </button>

        {isSelfChat ? (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center border shadow-sm">
            <Cloud size={20} className="text-white" />
          </div>
        ) : (
          <img src={avatarUrl} alt={chat.fullName} className="w-10 h-10 rounded-full border object-cover" />
        )}

        <div>
          <h3 className="font-bold text-sm text-gray-800">{isSelfChat ? "My Cloud" : chat.fullName}</h3>
          {!isSelfChat && (
            <p className={`text-xs flex items-center gap-1 ${isOnline ? "text-green-500" : "text-gray-400"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-green-500" : "bg-gray-300"}`}></span>
              {isOnline ? "Online" : "Offline"}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button onClick={onToggleSearch} className={`p-2 rounded-xl transition-colors ${isSearchOpen ? "bg-pink-50 text-pink-500" : "text-gray-400 hover:text-pink-500"}`}>
          <Search size={20} />
        </button>

        {/* Chỉ hiện nút gọi nếu là bạn bè và không phải chat với chính mình */}
        {!isSelfChat && isFriend && (
          <>
            <button onClick={() => handleStartCall(false)} className="p-2 text-gray-400 hover:text-pink-500 hover:bg-pink-50 rounded-xl" title="Voice Call">
              <Phone size={20} />
            </button>
            <button onClick={() => handleStartCall(true)} className="p-2 text-gray-400 hover:text-pink-500 hover:bg-pink-50 rounded-xl" title="Video Call">
              <Video size={20} />
            </button>
          </>
        )}

        <div className="w-px h-6 bg-gray-200 mx-1"></div>
        <button onClick={onToggleInfoSidebar} className={`p-2 rounded-xl ${isInfoSidebarOpen ? "bg-pink-50 text-pink-500" : "text-gray-400 hover:bg-gray-100"}`}>
          <Sidebar size={20} />
        </button>
      </div>
    </div>
  );
}