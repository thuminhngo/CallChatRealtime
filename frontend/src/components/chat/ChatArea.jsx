import { useState, useCallback, useEffect, useRef, forwardRef } from "react";
import toast from "react-hot-toast";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import MessageSearch from "./MessageSearch";
import { MessageCircleMore, Lock } from "lucide-react"; 
import { useFriend } from "../../context/FriendContext";
import { useChat } from "../../context/ChatContext"; 
import { useAuth } from "../../context/AuthContext"; 
import { useGroup } from "../../context/GroupContext";

const ChatArea = forwardRef(function ChatArea({
  chat,
  isGroup,
  onToggleInfoSidebar,
  isInfoSidebarOpen,
  externalHighlightMessageId,
  onHighlightProcessed,
}, ref) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightMessageId, setHighlightMessageId] = useState(null);
  const messageListRef = useRef(null);
  
  const { friends, sendFriendRequest, sentRequests } = useFriend();
  const { isBlockedByPartner } = useChat(); 
  const { authUser } = useAuth(); 

  const { getGroupMessages, groupMessages, isGroupMessagesLoading } = useGroup();
  const { getMessagesByUserId, messages, isMessagesLoading } = useChat();

  useEffect(() => {
    if(!chat?._id) return;
    if (isGroup) {
      getGroupMessages(chat._id); 
    } else {
      getMessagesByUserId(chat._id); 
    }
  }, [chat?._id, isGroup, getGroupMessages, getMessagesByUserId]);

  const currentMessages = isGroup ? groupMessages : messages;
  const isLoading = isGroup ? isGroupMessagesLoading : isMessagesLoading;

  const isFriend = friends.some(f => String(f._id) === String(chat?._id)) ;
  const hasSentRequest = sentRequests && sentRequests.some(req => req._id === chat?._id);

  const isBlockedByMe = authUser?.blockedUsers?.some(id => String(id) === String(chat?._id));
  
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
        isGroup={isGroup} // 🔥 QUAN TRỌNG: Truyền isGroup xuống ChatHeader
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

      {/* Banner kết bạn - Chỉ hiện cho Chat 1-1 */}
      {!isGroup && !isFriend && !isBlockedByMe && !isBlockedByPartner && (
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

      <MessageList 
        ref={messageListRef} 
        chat={chat} 
        messages={currentMessages} 
        isGroup={isGroup}
        isLoading={isLoading}
        highlightMessageId={highlightMessageId} 
      />
      
      {isGroup ? (
        <ChatInput chat={chat} isGroup={true} />
      ) : isBlockedByMe ? (
        <div className="p-4 bg-gray-100 text-center text-red-500 font-medium border-t flex flex-col items-center gap-2">
            <p>Bạn đã chặn người dùng này.</p>
        </div>
      ) : isBlockedByPartner ? (
        <div className="p-6 bg-gray-50 text-center text-gray-500 border-t flex flex-col items-center justify-center gap-2">
            <Lock className="w-6 h-6 text-gray-400" />
            <p className="font-medium">Người này hiện không thể nhận tin nhắn.</p>
            <span className="text-xs text-gray-400">Bạn không thể gửi tin nhắn cho cuộc trò chuyện này.</span>
        </div>
      ) : (
        <ChatInput chat={chat} isGroup={false} />
      )}
      
    </div>
  );
});

export default ChatArea;