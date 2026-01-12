import { useState, useEffect, useCallback, useMemo } from "react";
import { UserPlus } from "lucide-react";
import { useChat } from "../../context/ChatContext";
import { useFriend } from "../../context/FriendContext";
import SidebarHeader from "./SidebarHeader";
import ConversationItem from "./ConversationItem";

export default function ConversationSidebar({
  selectedChat,
  onChatSelect,
  onHighlightMessage,
}) {
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [localChats, setLocalChats] = useState([]);

  const { homeStats, getHomeStats, setSelectedUser } = useChat();
  const { friends } = useFriend();

  const chats = homeStats?.chats || [];

  useEffect(() => {
    getHomeStats();
  }, [getHomeStats]);

  useEffect(() => {
  if (homeStats?.chats) {
    const updatedChats = homeStats.chats.map((chat) => {
      if (selectedChat && chat._id === selectedChat._id) {
        return { ...chat, unreadCount: 0 };
      }
      return chat;
    });
    setLocalChats(updatedChats);
  }
}, [homeStats, selectedChat]);

  const handleSelectChat = useCallback(
    (user) => {
      const normalizedUser = {
        _id: user._id,
        fullName: user.fullName || user.name,
        profilePic: user.profilePic || user.avatar,
        email: user.email,
        isOnline: user.isOnline,
      };

      setSelectedUser(normalizedUser);
      if (onChatSelect) {
        onChatSelect(normalizedUser);
      }
    },
    [setSelectedUser, onChatSelect]
  );

  const handleSelectMessage = useCallback(
    (messageId) => {
      if (onHighlightMessage) {
        setTimeout(() => {
          onHighlightMessage(messageId);
        }, 300);
      }
    },
    [onHighlightMessage]
  );

  // Phân loại chat: Bạn bè và Yêu cầu tin nhắn
  const { allChats, messageRequests } = useMemo(() => {
    const friendChats = [];
    const nonFriendChats = [];
    const messageRequests = [];

    chats.forEach((chat) => {
      const isFriend = friends.some(f => f._id === chat._id) || chat.isSelfChat;
      
      if (isFriend) {
        friendChats.push(chat);
      } else if (chat.lastMessage) {
        // Nếu chưa là bạn nhưng đã có tin nhắn, phân loại vào Yêu cầu nếu đang lọc tin chưa đọc
        if (filter === "unread" && chat.unreadCount > 0) {
          messageRequests.push(chat);
        } else {
          nonFriendChats.push(chat);
        }
      }
    });

    return { allChats: [...friendChats, ...nonFriendChats], messageRequests };
  }, [chats, friends, filter]);

  // Lọc theo thanh tìm kiếm
  const filterBySearch = (list) => list.filter((chat) => {
    const matchesFilter = filter === "unread" ? chat.unreadCount > 0 : true;
    const searchLow = searchQuery.toLowerCase();
    const matchesName = (chat.fullName || chat.name || "").toLowerCase().includes(searchLow);
    const matchesEmail = (chat.email || "").toLowerCase().includes(searchLow);
    return matchesFilter && (matchesName || matchesEmail);
  });

  const filteredChats = filterBySearch(allChats);
  const filteredMessageRequests = filterBySearch(messageRequests);

  return (
    <div className="flex flex-col h-full w-full bg-white">
      <SidebarHeader
        filter={filter}
        setFilter={setFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSelectChat={handleSelectChat}
        onSelectMessage={handleSelectMessage}
      />

      <div className="flex-1 overflow-y-auto pt-2 pb-4 custom-scrollbar">
        {/* Mục Yêu cầu tin nhắn (Message Requests) */}
        {filteredMessageRequests.length > 0 && (
          <div className="mb-3">
            <div className="px-3 py-2 flex items-center gap-2">
              <UserPlus size={16} className="text-purple-600" />
              <h3 className="text-xs font-semibold text-purple-700 uppercase tracking-wider">
                Message Requests ({filteredMessageRequests.length})
              </h3>
            </div>
            {filteredMessageRequests.map((chat) => (
              <div key={chat._id} className="relative">
                <ConversationItem
                  chat={chat}
                  isActive={selectedChat?._id === chat._id}
                  onClick={() => {
                    onChatSelect(chat);
                    setSearchQuery("");
                  }}
                />
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500 rounded-r-full"></div>
              </div>
            ))}
            <div className="border-b border-gray-200 mx-3 mt-2"></div>
          </div>
        )}

        {/* Danh sách Chat chính */}
        {filteredChats.length > 0 ? (
          <>
            {filteredMessageRequests.length > 0 && (
              <div className="px-3 py-2">
                <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Chats</h3>
              </div>
            )}
            {filteredChats.map((chat) => (
              <ConversationItem
                key={chat._id}
                chat={chat}
                isActive={selectedChat?._id === chat._id}
                onClick={() => {
                  onChatSelect(chat);
                  setSearchQuery("");
                }}
              />
            ))}
          </>
        ) : (
          filteredMessageRequests.length === 0 && (
            <div className="text-center text-gray-400 text-xs mt-10">
              {searchQuery ? "Not found" : "No messages yet"}
            </div>
          )
        )}
      </div>
    </div>
  );
}