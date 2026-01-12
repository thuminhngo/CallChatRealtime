import { LoaderIcon } from "lucide-react";
import { useEffect, useMemo, useRef, forwardRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import { useSocket } from "../../context/SocketContext";
import MessageBubble from "./MessageBubble";

function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TypingIndicator({ avatar }) {
  return (
    <div className="flex items-end mb-2 gap-2">
      <img
        src={avatar}
        alt="Avatar"
        className="w-8 h-8 rounded-full border border-gray-100 object-cover mb-1"
      />
      <div className="bg-white border border-gray-100 rounded-[20px] rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
        </div>
      </div>
    </div>
  );
}

const MessageList = forwardRef(function MessageList({ chat, highlightMessageId }, ref) {
  const messagesEndRef = useRef(null);
  
  // 1. Lấy thêm isBlockedByPartner từ Context
  const { messages, getMessagesByUserId, isMessagesLoading, isBlockedByPartner } = useChat();
  const { authUser } = useAuth();
  const { typingUsers } = useSocket();

  const chatId = chat?.id || chat?._id;

  // 2. Kiểm tra xem mình có chặn họ không
  const isBlockedByMe = authUser?.blockedUsers?.includes(chatId);

  // 3. Logic hiển thị Typing: Chỉ hiện khi KHÔNG ai chặn ai
  const isPartnerTyping = typingUsers && typingUsers[chatId] && !isBlockedByMe && !isBlockedByPartner;

  const partnerAvatar = chat?.profilePic ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(chat?.fullName || "U")}&background=random`;

  useEffect(() => {
    if (chatId) getMessagesByUserId(chatId);
  }, [chat, getMessagesByUserId]);

  useEffect(() => {
    // Don't auto-scroll if we're navigating to a specific message
    if (!highlightMessageId) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isPartnerTyping, highlightMessageId]);

  const groupedMessages = useMemo(() => {
    const groups = {};
    if (!messages) return groups;
    messages.forEach((msg) => {
      const dateKey = new Date(msg.createdAt).toDateString();
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(msg);
    });
    return groups;
  }, [messages]);

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoaderIcon className="w-8 h-8 animate-spin text-pink-300" />
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-300 text-sm">
        No messages yet.
        {isPartnerTyping && (
          <div className="absolute bottom-4 left-4">
            <TypingIndicator avatar={partnerAvatar} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className="flex-1 overflow-y-auto p-4 space-y-6 bg-[#FAFAFA] custom-scrollbar">
      {Object.entries(groupedMessages).map(([dateKey, msgs]) => (
        <div key={dateKey}>
          <div className="flex justify-center mb-6 sticky top-0 z-0">
            <span className="text-[10px] font-bold text-gray-500 bg-gray-200/50 backdrop-blur-sm px-3 py-1 rounded-full uppercase tracking-wide border border-gray-100">
              {formatDate(msgs[0].createdAt)}
            </span>
          </div>
          <div className="space-y-1">
            {msgs.map((msg, index) => {
              const msgId = msg._id || msg.id;
              
              const senderId = msg.senderId?._id || msg.senderId;
              const isMe = String(senderId) === String(authUser?._id);

              const getFallbackAvatar = (name) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "U")}&background=random`;

              const messageAvatar = isMe
                ? (authUser?.profilePic || getFallbackAvatar(authUser?.fullName))
                : (msg.senderId?.profilePic || chat.profilePic || getFallbackAvatar(chat.fullName));

              const nextMsg = msgs[index + 1];
              const nextSenderId = nextMsg ? (nextMsg.senderId?._id || nextMsg.senderId) : null;
              const isLastInGroup = !nextMsg || String(nextSenderId) !== String(senderId);

              const isHighlighted = highlightMessageId === msgId;

              return (
                <div
                  key={msgId}
                  id={`message-${msgId}`}
                  className={`transition-all duration-300 rounded-lg ${isHighlighted ? "bg-yellow-100/50 -mx-2 px-2 py-1" : ""
                    }`}
                >
                  <MessageBubble
                    message={{ ...msg, displayTime: formatTime(msg.createdAt) }}
                    isMe={isMe}
                    avatar={messageAvatar}
                    isLastInGroup={isLastInGroup}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {isPartnerTyping && (
        <TypingIndicator avatar={partnerAvatar} />
      )}

      <div ref={messagesEndRef} />
    </div>
  );
});

export default MessageList;