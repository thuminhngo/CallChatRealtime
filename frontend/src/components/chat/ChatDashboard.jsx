// import { useState, useCallback, useRef } from "react";
// import { useChat } from "../../context/ChatContext";
// import { useGroup } from "../../context/GroupContext"; // 1. Import GroupContext
// import ConversationSidebar from "./ConversationSidebar";
// import ChatArea from "./ChatArea";
// import InfoSidebar from "./InfoSidebar";
// import GroupInfoSidebar from "./GroupInfoSidebar";

// export default function ChatDashboard() {
//   const { selectedUser, setSelectedUser } = useChat();
//   const { selectedGroup, setSelectedGroup } = useGroup(); // 2. Lấy state Group

//   const [isInfoSidebarOpen, setIsInfoSidebarOpen] = useState(false);
//   const [pendingHighlightMessageId, setPendingHighlightMessageId] = useState(null);

//   const chatAreaRef = useRef(null);

//   // 3. Xác định object đang active (Ưu tiên Group nếu có)
//   const activeChat = selectedGroup || selectedUser;
//   // 🔥 Biến cờ quan trọng để ChatArea biết gọi API nào
//   const isGroupChat = !!selectedGroup; 

//   const handleHighlightMessage = useCallback((messageId) => {
//     setPendingHighlightMessageId(messageId);
//   }, []);

//   const handleHighlightProcessed = useCallback(() => {
//     setPendingHighlightMessageId(null);
//   }, []);

//   // ⚠️ QUAN TRỌNG: Hàm này phải để rỗng hoặc chỉ log!
//   // Sidebar đã tự gọi setSelectedUser/setSelectedGroup rồi.
//   // Nếu bạn để setSelectedUser(item) ở đây, nó sẽ ghi đè Group thành User -> Gây lỗi 404
//   const handleChatSelect = useCallback((item) => {
//      // Không làm gì cả
//   }, []);

//   return (
//     <div className="flex h-full w-full overflow-hidden rounded-3xl bg-white shadow-sm relative">
//       {/* Sidebar */}
//       <div
//         className={`${
//           activeChat ? "hidden" : "flex"
//         } md:flex w-full md:w-80 h-full flex-shrink-0 border-r border-gray-50`}
//       >
//         <ConversationSidebar
//           selectedChat={activeChat}
//           onChatSelect={handleChatSelect}
//           onHighlightMessage={handleHighlightMessage}
//         />
//       </div>

//       {/* Chat Area */}
//       <div
//         className={`${
//           activeChat ? "flex" : "hidden"
//         } md:flex flex-1 h-full min-w-0`}
//       >
//         <ChatArea
//           ref={chatAreaRef}
//           chat={activeChat}
//           isGroup={isGroupChat} // 4. Truyền cờ này xuống
//           onToggleInfoSidebar={() => setIsInfoSidebarOpen(!isInfoSidebarOpen)}
//           isInfoSidebarOpen={isInfoSidebarOpen}
//           externalHighlightMessageId={pendingHighlightMessageId}
//           onHighlightProcessed={handleHighlightProcessed}
//         />
//       </div>

//       {/* Info Sidebar */}
//       {isInfoSidebarOpen && activeChat && (
//         <>
//           <div
//             className="fixed inset-0 bg-black/20 z-40 xl:hidden"
//             onClick={() => setIsInfoSidebarOpen(false)}
//           />
//           <div className="fixed right-0 top-0 bottom-0 w-[280px] z-50 xl:relative xl:w-80 h-full flex-shrink-0 border-l border-gray-50 bg-white shadow-xl xl:shadow-none">
//             {/* Chỉ hiện Info Sidebar cho User (Chat 1-1) */}
//             {!isGroupChat ? (
//               <InfoSidebar
//                 chat={selectedUser}
//                 onClose={() => setIsInfoSidebarOpen(false)}
//               />
//             ) : (
//               <div className="p-4 flex flex-col items-center justify-center h-full text-gray-400 text-sm">
//                  <p>Group Info coming soon...</p>
//                  <button onClick={() => setIsInfoSidebarOpen(false)} className="mt-4 text-pink-500 hover:underline">Close</button>
//               </div>
//             )}
//           </div>
//         </>
//       )}
//     </div>
//   );
// }


import { useState, useCallback, useRef } from "react";
import { useChat } from "../../context/ChatContext";
import { useGroup } from "../../context/GroupContext"; 
import ConversationSidebar from "./ConversationSidebar";
import ChatArea from "./ChatArea";
import InfoSidebar from "./InfoSidebar";
import GroupInfoSidebar from "./GroupInfoSidebar"; // 👈 Import Component mới

export default function ChatDashboard() {
  const { selectedUser, setSelectedUser } = useChat();
  const { selectedGroup, setSelectedGroup } = useGroup();

  const [isInfoSidebarOpen, setIsInfoSidebarOpen] = useState(false);
  const [pendingHighlightMessageId, setPendingHighlightMessageId] = useState(null);

  const chatAreaRef = useRef(null);

  const activeChat = selectedGroup || selectedUser;
  const isGroupChat = !!selectedGroup; 

  const handleHighlightMessage = useCallback((messageId) => {
    setPendingHighlightMessageId(messageId);
  }, []);

  const handleHighlightProcessed = useCallback(() => {
    setPendingHighlightMessageId(null);
  }, []);

  const handleChatSelect = useCallback((item) => {
     // Empty
  }, []);

  return (
    <div className="flex h-full w-full overflow-hidden rounded-3xl bg-white shadow-sm relative">
      {/* Sidebar */}
      <div
        className={`${
          activeChat ? "hidden" : "flex"
        } md:flex w-full md:w-80 h-full flex-shrink-0 border-r border-gray-50`}
      >
        <ConversationSidebar
          selectedChat={activeChat}
          onChatSelect={handleChatSelect}
          onHighlightMessage={handleHighlightMessage}
        />
      </div>

      {/* Chat Area */}
      <div
        className={`${
          activeChat ? "flex" : "hidden"
        } md:flex flex-1 h-full min-w-0`}
      >
        <ChatArea
          ref={chatAreaRef}
          chat={activeChat}
          isGroup={isGroupChat} 
          onToggleInfoSidebar={() => setIsInfoSidebarOpen(!isInfoSidebarOpen)}
          isInfoSidebarOpen={isInfoSidebarOpen}
          externalHighlightMessageId={pendingHighlightMessageId}
          onHighlightProcessed={handleHighlightProcessed}
        />
      </div>

      {/* Info Sidebar (Dynamic: User or Group) */}
      {isInfoSidebarOpen && activeChat && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40 xl:hidden"
            onClick={() => setIsInfoSidebarOpen(false)}
          />
          <div className="fixed right-0 top-0 bottom-0 w-[280px] z-50 xl:relative xl:w-80 h-full flex-shrink-0 border-l border-gray-50 bg-white shadow-xl xl:shadow-none">
            
            {/* 👇 Logic hiển thị Sidebar tuỳ theo loại chat */}
            {isGroupChat ? (
              <GroupInfoSidebar onClose={() => setIsInfoSidebarOpen(false)} />
            ) : (
              <InfoSidebar
                chat={selectedUser}
                onClose={() => setIsInfoSidebarOpen(false)}
              />
            )}

          </div>
        </>
      )}
    </div>
  );
}