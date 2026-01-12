import { useState, useCallback, useEffect, useRef, forwardRef } from "react";
import toast from "react-hot-toast";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import MessageSearch from "./MessageSearch";
import { MessageCircleMore, Lock } from "lucide-react"; // Thêm icon Lock
import { useFriend } from "../../context/FriendContext";
import { useChat } from "../../context/ChatContext"; // Thêm context Chat
import { useAuth } from "../../context/AuthContext"; // Thêm context Auth

const ChatArea = forwardRef(function ChatArea({
  chat,
  onToggleInfoSidebar,
  isInfoSidebarOpen,
  externalHighlightMessageId,
  onHighlightProcessed,
}, ref) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightMessageId, setHighlightMessageId] = useState(null);
  const messageListRef = useRef(null);
  
  const { friends, sendFriendRequest, sentRequests } = useFriend();
  const { isBlockedByPartner } = useChat(); // Lấy trạng thái bị chặn từ Context (Real-time)
  const { authUser } = useAuth(); // Lấy thông tin user hiện tại

  const isFriend = friends.some(f => String(f._id) === String(chat?._id)) ;
  const hasSentRequest = sentRequests && sentRequests.some(req => req._id === chat?._id);

  // Kiểm tra xem mình có đang chặn họ không
  const isBlockedByMe = authUser?.blockedUsers?.some(id => String(id) === String(chat?._id));
  const canAddFriend = !isFriend && !isBlockedByMe && !isBlockedByPartner;
  
  const handleToggleSearch = useCallback(() => {
    setIsSearchOpen((prev) => !prev);
    if (isSearchOpen) setHighlightMessageId(null);
  }, [isSearchOpen]);

  useEffect(() => {
    setIsSearchOpen(false);
    setHighlightMessageId(null);
  }, [chat?._id]);

  useEffect(() => {
    if (externalHighlightMessageId) {
      setHighlightMessageId(externalHighlightMessageId);
      setTimeout(() => {
        const el = document.getElementById(`message-${externalHighlightMessageId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("highlight-message");
          setTimeout(() => el.classList.remove("highlight-message"), 2000);
        }
      }, 500);
      if (onHighlightProcessed) onHighlightProcessed();
    }
  }, [externalHighlightMessageId, onHighlightProcessed]);

  const handleAddFriend = async () => {
    if (!chat?._id) return;
    try {
      await sendFriendRequest(chat._id);
      toast.success('Friend request sent!');
    } catch (error) {}
  };

  if (!chat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-[#FAFAFA]">
        <div className="w-40 h-40 bg-gray-100 rounded-full mb-4 flex items-center justify-center">
          <MessageCircleMore size={64} className="text-gray-300" />
        </div>
        <p className="text-gray-400 font-medium text-sm">Select a conversation to start chatting</p>
      </div>
    );
  }

  return (
    <div ref={ref} className="flex-1 flex flex-col h-full bg-white relative">
      <ChatHeader
        chat={chat}
        onToggleInfoSidebar={onToggleInfoSidebar}
        isInfoSidebarOpen={isInfoSidebarOpen}
        onToggleSearch={handleToggleSearch}
        isSearchOpen={isSearchOpen}
      />

      {isSearchOpen && (
        <MessageSearch
          chat={chat}
          onClose={() => setIsSearchOpen(false)}
          onNavigateToMessage={(id) => setHighlightMessageId(id)}
        />
      )}

      {/* Banner kết bạn cho người lạ 
          Logic: Chỉ hiện khi chưa là bạn bè VÀ không ai chặn ai */}
      {!isFriend && !isBlockedByMe && !isBlockedByPartner && (
        <div className="px-4 py-2.5 bg-gradient-to-r from-amber-50 to-orange-50 border-y border-amber-200">
          <div className="flex items-center justify-center gap-2 flex-wrap text-sm text-amber-800">
            <span>Not friends yet. Add <b>{chat.fullName}</b> to stay connected!</span>
            {!hasSentRequest ? (
              <button onClick={handleAddFriend} className="px-3 py-1 bg-amber-600 text-white font-semibold rounded-lg">Add Friend</button>
            ) : (
              <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg">Request Sent</span>
            )}
          </div>
        </div>
      )}

      <MessageList ref={messageListRef} chat={chat} highlightMessageId={highlightMessageId} />
      
      {/* --- LOGIC HIỂN THỊ KHUNG CHAT HOẶC THÔNG BÁO CHẶN --- */}
      {isBlockedByMe ? (
        // Trường hợp 1: Mình chặn họ
        <div className="p-4 bg-gray-100 text-center text-red-500 font-medium border-t flex flex-col items-center gap-2">
            <p>Bạn đã chặn người dùng này.</p>
            {/* Bạn có thể thêm nút Bỏ chặn nhanh ở đây nếu muốn gọi unblockUser từ context */}
        </div>
      ) : isBlockedByPartner ? (
        // Trường hợp 2: Họ chặn mình (Cập nhật Real-time)
        <div className="p-6 bg-gray-50 text-center text-gray-500 border-t flex flex-col items-center justify-center gap-2">
            <Lock className="w-6 h-6 text-gray-400" />
            <p className="font-medium">Người này hiện không thể nhận tin nhắn.</p>
            <span className="text-xs text-gray-400">Bạn không thể gửi tin nhắn cho cuộc trò chuyện này.</span>
        </div>
      ) : (
        // Trường hợp 3: Bình thường -> Hiện Input
        <ChatInput chat={chat} />
      )}
      
    </div>
  );
});

export default ChatArea;