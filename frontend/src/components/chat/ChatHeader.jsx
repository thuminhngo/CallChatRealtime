import { ChevronLeft, Cloud, Phone, Search, Sidebar, Video, Users } from "lucide-react";
import { startCall } from "../../utils/callHandler"; 
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import { useFriend } from "../../context/FriendContext";
import { useSocket } from "../../context/SocketContext";
import { useGroup } from "../../context/GroupContext"; // 👈 1. Import thêm

export default function ChatHeader({
  chat,
  isGroup,
  onToggleInfoSidebar,
  isInfoSidebarOpen,
  onToggleSearch,
  isSearchOpen,
}) {
  const { onlineUsers, socket } = useSocket();
  const { authUser } = useAuth();
  const { setSelectedUser } = useChat();
  const { setSelectedGroup } = useGroup(); // 👈 2. Lấy hàm này
  const { friends } = useFriend();

  if (!chat) return null;

  // --- LOGIC HIỂN THỊ ---
  let chatName, avatarUrl, subText;

  if (isGroup) {
    chatName = chat.name;
    avatarUrl = chat.avatar || null;
    const memberCount = chat.members?.length || 0;
    subText = (
      <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
        <Users size={12} /> {memberCount} members
      </p>
    );
  } else {
    chatName = chat.isSelfChat ? "My Cloud" : chat.fullName;
    avatarUrl = chat.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(chatName)}&background=random`;
    
    const isFriend = friends.some(f => f._id === chat._id);
    const isSelfChat = chat.isSelfChat || chat._id === authUser?._id;
    const isOnline = isSelfChat || (Array.isArray(onlineUsers) && onlineUsers.includes(String(chat._id)));
    
    subText = !isSelfChat && (
      <p className={`text-xs flex items-center gap-1 ${isOnline ? "text-green-500" : "text-gray-400"}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-green-500" : "bg-gray-300"}`}></span>
        {isOnline ? "Online" : "Offline"}
      </p>
    );
  }

  const handleStartCall = (isVideo) => {
    if (!socket) return;
    if (!isGroup) {
        startCall(authUser, chat, isVideo);
    } else {
        console.log("Tính năng gọi nhóm đang phát triển");
    }
  }

  // 👇 3. Hàm xử lý nút Back: Xóa cả User và Group đang chọn
  const handleBack = () => {
    setSelectedUser(null);
    setSelectedGroup(null);
  };

  const isFriend = !isGroup && friends.some(f => f._id === chat?._id);
  const isSelfChat = !isGroup && (chat.isSelfChat || chat._id === authUser?._id);

  return (
    <div className="flex items-center justify-between p-4 border-b bg-white sticky top-0 z-10">
      <div className="flex items-center gap-2">
        {/* 👇 Cập nhật onClick tại đây */}
        <button onClick={handleBack} className="md:hidden p-1 text-gray-500 hover:bg-gray-100 rounded-full">
          <ChevronLeft size={24} />
        </button>

        {/* Avatar */}
        <div className="relative">
            {isGroup && !avatarUrl ? (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-400 flex items-center justify-center border shadow-sm text-white">
                    <Users size={20} />
                </div>
            ) : (!isGroup && isSelfChat) ? (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center border shadow-sm">
                    <Cloud size={20} className="text-white" />
                </div>
            ) : (
                <img src={avatarUrl} alt={chatName} className="w-10 h-10 rounded-full border object-cover" />
            )}
        </div>

        <div>
          <h3 className="font-bold text-sm text-gray-800">{chatName}</h3>
          {subText}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button onClick={onToggleSearch} className={`p-2 rounded-xl transition-colors ${isSearchOpen ? "bg-pink-50 text-pink-500" : "text-gray-400 hover:text-pink-500"}`}>
          <Search size={20} />
        </button>

        {!isGroup && !isSelfChat && isFriend && (
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