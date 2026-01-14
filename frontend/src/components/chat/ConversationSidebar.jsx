// import { useState, useEffect, useCallback, useMemo } from "react";
// import { UserPlus, Plus } from "lucide-react"; 
// import { useChat } from "../../context/ChatContext";
// import { useFriend } from "../../context/FriendContext";
// import { useGroup } from "../../context/GroupContext"; 
// import SidebarHeader from "./SidebarHeader";
// import ConversationItem from "./ConversationItem";
// import CreateGroupModal from "./CreateGroupModal"; 

// export default function ConversationSidebar({
//   selectedChat,
//   onChatSelect,
//   onHighlightMessage,
// }) {
//   const [filter, setFilter] = useState("all");
//   const [searchQuery, setSearchQuery] = useState("");
//   const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);

//   const { homeStats, getHomeStats, setSelectedUser } = useChat();
//   const { friends } = useFriend();
  
//   const { 
//     myGroups, 
//     fetchMyGroups, 
//     setSelectedGroup, 
//     selectedGroup 
//   } = useGroup();

//   const chats = homeStats?.chats || [];

//   useEffect(() => {
//     getHomeStats();
//     fetchMyGroups();
//   }, [getHomeStats, fetchMyGroups]);

//   // --- 🔥 LOGIC CHỌN CHAT (Đã cập nhật mạnh mẽ hơn) ---
//   const handleSelectChat = useCallback(
//     (item) => {
//       // Logic nhận diện Group:
//       // 1. Có cờ 'isGroup' (do ta tự thêm bên dưới) HOẶC
//       // 2. Có mảng 'members' HOẶC
//       // 3. Có 'owner' HOẶC
//       // 4. Có 'name' (Tên nhóm) nhưng KHÔNG CÓ 'fullName' (Tên user)
//       const isGroupItem = item.isGroup === true || item.members || item.owner || (item.name && !item.fullName);

//       if (isGroupItem) {
//         console.log("🟢 Selected GROUP:", item.name);
//         setSelectedUser(null); // Xóa user đang chọn
//         setSelectedGroup(item); // Set group
//         if (onChatSelect) onChatSelect(item);
//       } else {
//         console.log("🔵 Selected USER:", item.fullName);
//         const normalizedUser = {
//           _id: item._id,
//           fullName: item.fullName || item.name,
//           profilePic: item.profilePic || item.avatar,
//           email: item.email,
//           isOnline: item.isOnline,
//         };
//         setSelectedGroup(null); // Xóa group đang chọn
//         setSelectedUser(normalizedUser); // Set user
//         if (onChatSelect) onChatSelect(normalizedUser);
//       }
//     },
//     [setSelectedUser, setSelectedGroup, onChatSelect]
//   );

//   const handleSelectMessage = useCallback((messageId) => {
//       if (onHighlightMessage) {
//         setTimeout(() => onHighlightMessage(messageId), 300);
//       }
//     }, [onHighlightMessage]);

//   const { mainChats, messageRequests } = useMemo(() => {
//     const friendChats = [];
//     const nonFriendChats = [];
//     const requests = [];

//     chats.forEach((chat) => {
//       const isFriend = friends.some(f => f._id === chat._id) || chat.isSelfChat;
//       if (isFriend) {
//         friendChats.push(chat);
//       } else if (chat.lastMessage) {
//         if (filter === "unread" && chat.unreadCount > 0) requests.push(chat);
//         else nonFriendChats.push(chat);
//       }
//     });

//     // 🔥 Gắn thêm cờ isGroup: true để dễ nhận diện
//     const formattedGroups = myGroups.map(g => ({ ...g, isGroup: true }));

//     // Gộp tất cả lại
//     const combinedMain = [...friendChats, ...formattedGroups, ...nonFriendChats];

//     // Sắp xếp theo thời gian tin nhắn mới nhất
//     combinedMain.sort((a, b) => {
//       const timeA = new Date(a.lastMessageTime || a.updatedAt || 0);
//       const timeB = new Date(b.lastMessageTime || b.updatedAt || 0);
//       return timeB - timeA; 
//     });

//     return { mainChats: combinedMain, messageRequests: requests };
//   }, [chats, myGroups, friends, filter]);

//   const filterBySearch = (list) => list.filter((item) => {
//     const matchesFilter = filter === "unread" ? (item.unreadCount > 0) : true;
//     const searchLow = searchQuery.toLowerCase();
    
//     // User dùng fullName, Group dùng name
//     const name = item.fullName || item.name || "";
//     return matchesFilter && name.toLowerCase().includes(searchLow);
//   });

//   const filteredMainChats = filterBySearch(mainChats);
//   const filteredMessageRequests = filterBySearch(messageRequests);
  
//   // Xác định ID đang active (User hoặc Group)
//   const activeId = selectedChat?._id || selectedGroup?._id;

//   return (
//     <div className="flex flex-col h-full w-full bg-white relative">
//       <SidebarHeader
//         filter={filter}
//         setFilter={setFilter}
//         searchQuery={searchQuery}
//         setSearchQuery={setSearchQuery}
//         onSelectChat={handleSelectChat}
//         onSelectMessage={handleSelectMessage}
//       />

//       {/* Nút Tạo Nhóm */}
//       <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
//         <button
//           onClick={() => setIsCreateGroupOpen(true)}
//           className="
//             px-4 py-2
//             w-full
//             bg-pink-500 text-white font-medium
//             rounded-lg
//             shadow-md
//             hover:bg-pink-600
//             hover:shadow-lg
//             transition-all duration-200
//             flex items-center justify-center
//             gap-2
//           "
//           title="Create Group"
//         >
//           <Plus size={16} /> Create Group
//         </button>
//       </div>

//       <div className="flex-1 overflow-y-auto pt-2 pb-4 custom-scrollbar">
//         {filteredMessageRequests.length > 0 && (
//           <div className="mb-3">
//             <div className="px-3 py-2 flex items-center gap-2">
//               <UserPlus size={16} className="text-purple-600" />
//               <h3 className="text-xs font-semibold text-purple-700 uppercase tracking-wider">
//                 Message Requests ({filteredMessageRequests.length})
//               </h3>
//             </div>
//             {filteredMessageRequests.map((chat) => (
//               <ConversationItem
//                 key={chat._id}
//                 chat={chat}
//                 isActive={activeId === chat._id}
//                 onClick={() => handleSelectChat(chat)}
//               />
//             ))}
//             <div className="border-b border-gray-200 mx-3 mt-2"></div>
//           </div>
//         )}

//         {filteredMainChats.length > 0 ? (
//           filteredMainChats.map((item) => {
//             // Logic hiển thị icon: Cũng dùng điều kiện mạnh hơn
//             const isGroup = item.isGroup === true || item.members || item.owner || (item.name && !item.fullName);
//             return (
//               <ConversationItem
//                 key={item._id}
//                 chat={item}
//                 isGroup={!!isGroup} // Truyền bool xuống ConversationItem
//                 isActive={activeId === item._id}
//                 onClick={() => handleSelectChat(item)}
//               />
//             );
//           })
//         ) : (
//           filteredMessageRequests.length === 0 && (
//             <div className="text-center text-gray-400 text-xs mt-10">
//               {searchQuery ? "Not found" : "No conversations yet"}
//             </div>
//           )
//         )}
//       </div>

//       {isCreateGroupOpen && (
//         <CreateGroupModal onClose={() => setIsCreateGroupOpen(false)} />
//       )}
//     </div>
//   );
// }


import { useState, useEffect, useCallback, useMemo } from "react";
import { UserPlus, Plus, MessageSquare, Users } from "lucide-react"; // Import thêm icon
import { useChat } from "../../context/ChatContext";
import { useFriend } from "../../context/FriendContext";
import { useGroup } from "../../context/GroupContext"; 
import SidebarHeader from "./SidebarHeader";
import ConversationItem from "./ConversationItem";
import CreateGroupModal from "./CreateGroupModal"; 

export default function ConversationSidebar({
  selectedChat,
  onChatSelect,
  onHighlightMessage,
}) {
  const [filter, setFilter] = useState("all"); // Filter: All / Unread (Nằm trong SidebarHeader)
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  
  // 🔥 STATE MỚI: Quản lý Tab Messages / Groups
  const [activeTab, setActiveTab] = useState("messages"); 

  const { homeStats, getHomeStats, setSelectedUser } = useChat();
  const { friends } = useFriend();
  
  const { 
    myGroups, 
    fetchMyGroups, 
    setSelectedGroup, 
    selectedGroup 
  } = useGroup();

  const chats = homeStats?.chats || [];

  useEffect(() => {
    getHomeStats();
    fetchMyGroups();
  }, [getHomeStats, fetchMyGroups]);

  // --- LOGIC CHỌN CHAT ---
  const handleSelectChat = useCallback(
    (item) => {
      // Logic nhận diện Group
      const isGroupItem = item.isGroup === true || item.members || item.owner || (item.name && !item.fullName);

      if (isGroupItem) {
        setSelectedUser(null);
        setSelectedGroup(item);
        if (onChatSelect) onChatSelect(item);
      } else {
        const normalizedUser = {
          _id: item._id,
          fullName: item.fullName || item.name,
          profilePic: item.profilePic || item.avatar,
          email: item.email,
          isOnline: item.isOnline,
        };
        setSelectedGroup(null);
        setSelectedUser(normalizedUser);
        if (onChatSelect) onChatSelect(normalizedUser);
      }
    },
    [setSelectedUser, setSelectedGroup, onChatSelect]
  );

  const handleSelectMessage = useCallback((messageId) => {
      if (onHighlightMessage) {
        setTimeout(() => onHighlightMessage(messageId), 300);
      }
    }, [onHighlightMessage]);

  // --- CHUẨN BỊ DỮ LIỆU ---
  const { mainChats, messageRequests } = useMemo(() => {
    const friendChats = [];
    const nonFriendChats = [];
    const requests = [];

    chats.forEach((chat) => {
      const isFriend = friends.some(f => f._id === chat._id) || chat.isSelfChat;
      if (isFriend) {
        friendChats.push(chat);
      } else if (chat.lastMessage) {
        if (filter === "unread" && chat.unreadCount > 0) requests.push(chat);
        else nonFriendChats.push(chat);
      }
    });

    // Gắn cờ isGroup cho nhóm
    const formattedGroups = myGroups.map(g => ({ ...g, isGroup: true }));

    // Gộp tất cả
    const combinedMain = [...friendChats, ...formattedGroups, ...nonFriendChats];

    // Sắp xếp
    combinedMain.sort((a, b) => {
      const timeA = new Date(a.lastMessageTime || a.updatedAt || 0);
      const timeB = new Date(b.lastMessageTime || b.updatedAt || 0);
      return timeB - timeA; 
    });

    return { mainChats: combinedMain, messageRequests: requests };
  }, [chats, myGroups, friends, filter]);

  // --- LỌC THEO SEARCH & FILTER CŨ ---
  const filterBySearch = (list) => list.filter((item) => {
    const matchesFilter = filter === "unread" ? (item.unreadCount > 0) : true;
    const searchLow = searchQuery.toLowerCase();
    const name = item.fullName || item.name || "";
    return matchesFilter && name.toLowerCase().includes(searchLow);
  });

  const filteredMainChats = filterBySearch(mainChats);
  const filteredMessageRequests = filterBySearch(messageRequests);

  // 🔥 LỌC THEO TAB (MESSAGES vs GROUPS)
  // - Messages: Hiển thị tất cả (Private + Group)
  // - Groups: Chỉ hiển thị Group
  const chatsToRender = filteredMainChats.filter(chat => {
    if (activeTab === "groups") {
      // Chỉ lấy item nào là Group
      return chat.isGroup === true || chat.members || chat.owner; 
    }
    // Tab "messages" hiển thị tất cả
    return true; 
  });
  
  const activeId = selectedChat?._id || selectedGroup?._id;

  return (
    <div className="flex flex-col h-full w-full bg-white relative">
      {/* 1. Sidebar Header (Search + All/Unread Filter) */}
      <SidebarHeader
        filter={filter}
        setFilter={setFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSelectChat={handleSelectChat}
        onSelectMessage={handleSelectMessage}
      />

      {/* 2. 🔥 NEW: TABS (Messages / Groups) - GIỐNG HÌNH ẢNH */}
      <div className="flex items-center bg-white border-b border-gray-100">
        <button
          onClick={() => setActiveTab("messages")}
          className={`
            flex-1 py-3 text-sm font-semibold flex justify-center items-center gap-2 relative transition-colors
            ${activeTab === "messages" ? "text-pink-600" : "text-gray-500 hover:bg-gray-50"}
          `}
        >
          <MessageSquare size={16} />
          Messages
          {/* Active Indicator Line */}
          {activeTab === "messages" && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-pink-600 rounded-t-full mx-4" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("groups")}
          className={`
            flex-1 py-3 text-sm font-semibold flex justify-center items-center gap-2 relative transition-colors
            ${activeTab === "groups" ? "text-pink-600" : "text-gray-500 hover:bg-gray-50"}
          `}
        >
          <Users size={16} />
          Groups
          {/* Active Indicator Line */}
          {activeTab === "groups" && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-pink-600 rounded-t-full mx-4" />
          )}
        </button>
      </div>

      {/* 3. Nút Tạo Nhóm (Chỉ hiện khi ở tab Groups hoặc Messages) */}
      <div className="px-4 py-2 border-b border-gray-50 flex justify-center bg-gray-50/30">
        <button
          onClick={() => setIsCreateGroupOpen(true)}
          className="
            w-full py-2 bg-pink-50 text-pink-600 text-xs font-bold uppercase tracking-wide
            rounded-lg border border-pink-100 hover:bg-pink-100 hover:border-pink-200 transition-all
            flex items-center justify-center gap-2
          "
        >
          <Plus size={14} /> Create New Group
        </button>
      </div>

      {/* 4. Danh sách Chat */}
      <div className="flex-1 overflow-y-auto pt-2 pb-4 custom-scrollbar">
        
        {/* Message Requests (Chỉ hiện ở tab Messages) */}
        {activeTab === "messages" && filteredMessageRequests.length > 0 && (
          <div className="mb-3">
            <div className="px-3 py-2 flex items-center gap-2">
              <UserPlus size={16} className="text-purple-600" />
              <h3 className="text-xs font-semibold text-purple-700 uppercase tracking-wider">
                Message Requests ({filteredMessageRequests.length})
              </h3>
            </div>
            {filteredMessageRequests.map((chat) => (
              <ConversationItem
                key={chat._id}
                chat={chat}
                isActive={activeId === chat._id}
                onClick={() => handleSelectChat(chat)}
              />
            ))}
            <div className="border-b border-gray-200 mx-3 mt-2"></div>
          </div>
        )}

        {/* Main List */}
        {chatsToRender.length > 0 ? (
          chatsToRender.map((item) => {
            const isGroup = item.isGroup === true || item.members || item.owner || (item.name && !item.fullName);
            return (
              <ConversationItem
                key={item._id}
                chat={item}
                isGroup={!!isGroup}
                isActive={activeId === item._id}
                onClick={() => handleSelectChat(item)}
              />
            );
          })
        ) : (
          <div className="text-center text-gray-400 text-xs mt-10">
            {searchQuery 
              ? "Not found" 
              : activeTab === "groups" 
                ? "No groups joined" 
                : "No conversations yet"}
          </div>
        )}
      </div>

      {isCreateGroupOpen && (
        <CreateGroupModal onClose={() => setIsCreateGroupOpen(false)} />
      )}
    </div>
  );
}