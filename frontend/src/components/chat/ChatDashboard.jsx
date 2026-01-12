import { useState, useCallback, useRef } from "react";
import { useChat } from "../../context/ChatContext";
import ConversationSidebar from "./ConversationSidebar";
import ChatArea from "./ChatArea";
import InfoSidebar from "./InfoSidebar";

export default function ChatDashboard() {
  const { selectedUser, setSelectedUser } = useChat();
  const [isInfoSidebarOpen, setIsInfoSidebarOpen] = useState(false);
  const [pendingHighlightMessageId, setPendingHighlightMessageId] = useState(null);

  const chatAreaRef = useRef(null);

  // Xử lý highlight tin nhắn từ tìm kiếm sidebar
  const handleHighlightMessage = useCallback((messageId) => {
    setPendingHighlightMessageId(messageId);
  }, []);

  // Xóa highlight sau khi ChatArea đã xử lý xong
  const handleHighlightProcessed = useCallback(() => {
    setPendingHighlightMessageId(null);
  }, []);

  // Xử lý chọn chat
  const handleChatSelect = useCallback(
    (user) => {
      setSelectedUser(user);
    },
    [setSelectedUser]
  );

  return (
    <div className="flex h-full w-full overflow-hidden rounded-3xl bg-white shadow-sm relative">
      {/* Sidebar */}
      <div
        className={`${
          selectedUser ? "hidden" : "flex"
        } md:flex w-full md:w-80 h-full flex-shrink-0 border-r border-gray-50`}
      >
        <ConversationSidebar
          selectedChat={selectedUser}
          onChatSelect={handleChatSelect}
          onHighlightMessage={handleHighlightMessage}
        />
      </div>

      {/* Chat Area */}
      <div
        className={`${
          selectedUser ? "flex" : "hidden"
        } md:flex flex-1 h-full min-w-0`}
      >
        <ChatArea
          ref={chatAreaRef}
          chat={selectedUser}
          onToggleInfoSidebar={() => setIsInfoSidebarOpen(!isInfoSidebarOpen)}
          isInfoSidebarOpen={isInfoSidebarOpen}
          externalHighlightMessageId={pendingHighlightMessageId}
          onHighlightProcessed={handleHighlightProcessed}
        />
      </div>

      {/* Info Sidebar (Chỉ dành cho chat cá nhân) */}
      {isInfoSidebarOpen && selectedUser && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40 xl:hidden"
            onClick={() => setIsInfoSidebarOpen(false)}
          />
          <div className="fixed right-0 top-0 bottom-0 w-[280px] z-50 xl:relative xl:w-80 h-full flex-shrink-0 border-l border-gray-50 bg-white shadow-xl xl:shadow-none">
            <InfoSidebar
              chat={selectedUser}
              onClose={() => setIsInfoSidebarOpen(false)}
            />
          </div>
        </>
      )}
    </div>
  );
}