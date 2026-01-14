import { Search, X, Users, MessageSquare, Loader, User } from "lucide-react";
import { useState, useCallback, useRef, useEffect } from "react";
import { axiosInstance } from "../../lib/axios";
import { useAuth } from "../../context/AuthContext";
import { useGroup } from "../../context/GroupContext";
import { useChat } from "../../context/ChatContext"; // 🔥 IMPORT

export default function SidebarHeader({ filter, setFilter, searchQuery, setSearchQuery, onSelectChat }) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState({ users: [], groups: [], messages: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const dropdownRef = useRef(null);

  const { authUser } = useAuth();
  const { myGroups } = useGroup();
  const { setMessageIdToScroll } = useChat(); // 🔥 LẤY HÀM TỪ CONTEXT

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const performSearch = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchResults({ users: [], groups: [], messages: [] });
      return;
    }

    setIsSearching(true);
    try {
      const [usersRes, messagesRes] = await Promise.all([
        axiosInstance.get("/friends/search-friends", { params: { q: query } }),
        axiosInstance.get("/messages/search/global", { params: { q: query } }),
      ]);

      let friends = Array.isArray(usersRes.data) ? usersRes.data : [];
      const queryLower = query.toLowerCase().trim();

      const matchedGroups = myGroups.filter(group =>
        group.name?.toLowerCase().includes(queryLower)
      );

      setSearchResults({
        users: friends.slice(0, 5),
        groups: matchedGroups.slice(0, 5),
        messages: Array.isArray(messagesRes.data) ? messagesRes.data.slice(0, 20) : [],
      });
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  }, [myGroups]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim()) {
      debounceRef.current = setTimeout(() => performSearch(value), 300);
    } else {
      setSearchResults({ users: [], groups: [], messages: [] });
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults({ users: [], groups: [], messages: [] });
    inputRef.current?.focus();
  };

  const handleUserSelect = (user) => {
    if (onSelectChat) onSelectChat(user);
    resetSearch();
  };

  const handleGroupSelect = (group) => {
    if (onSelectChat) onSelectChat({ ...group, isGroup: true });
    resetSearch();
  };

  const handleMessageSelect = (message) => {
    // 1. Điều hướng đến đoạn chat
    if (message.type === 'group') {
      const targetGroup = myGroups.find(g => g._id === message.chatId);
      if (targetGroup) {
        onSelectChat({ ...targetGroup, isGroup: true });
      } else {
        onSelectChat({ _id: message.chatId, name: message.group?.name, avatar: message.group?.avatar, isGroup: true });
      }
    } else {
      let targetUser = message.partner;
      if (!targetUser) {
        const isSenderMe = message.sender?._id === authUser._id || message.sender === authUser._id;
        targetUser = isSenderMe ? message.receiver : message.sender;
      }
      if (targetUser) {
        onSelectChat(targetUser);
      }
    }

    // 2. 🔥 Gửi ID tin nhắn vào Context để MessageList biết mà cuộn tới
    setMessageIdToScroll(message._id);
    
    resetSearch();
  };

  const resetSearch = () => {
    setSearchQuery("");
    setSearchResults({ users: [], groups: [], messages: [] });
    setIsSearchFocused(false);
  };

  const highlightText = (text, query) => {
    if (!query.trim() || !text) return text;
    const regex = new RegExp(`(${query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <span key={i} className="bg-yellow-200 text-gray-900 font-medium rounded px-0.5">{part}</span>
      ) : (part)
    );
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m`;
    if (Math.floor(diffMs / 3600000) < 24) return `${Math.floor(diffMs / 3600000)}h`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getAvatar = (pic, name) => {
    return pic || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "User")}&background=random`;
  };

  const showUsers = (activeTab === "all" || activeTab === "users") && searchResults.users.length > 0;
  const showGroups = (activeTab === "all" || activeTab === "groups") && searchResults.groups.length > 0;
  const showMessages = (activeTab === "all" || activeTab === "messages") && searchResults.messages.length > 0;
  const hasResults = showUsers || showGroups || showMessages;
  const showDropdown = isSearchFocused && searchQuery.trim();

  return (
    <div className="flex flex-col gap-3 p-4 pb-2 border-b border-gray-50 relative bg-white z-20" ref={dropdownRef}>
      <div className={`flex items-center bg-gray-100 rounded-xl p-3 shadow-sm transition-all border ${isSearchFocused ? "bg-white border-pink-300 ring-2 ring-pink-50" : "border-transparent"}`}>
        <Search className={`w-5 h-5 flex-shrink-0 transition-colors ${isSearchFocused ? "text-pink-500" : "text-gray-400"}`} />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search friends, groups, messages..."
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => setIsSearchFocused(true)}
          className="flex-1 ml-2 bg-transparent text-sm focus:outline-none text-gray-700 placeholder:text-gray-400"
        />
        {isSearching && <Loader className="w-4 h-4 text-pink-500 animate-spin mr-1" />}
        {searchQuery && (
          <button onClick={handleClearSearch} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 mx-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animate-fadeIn flex flex-col max-h-[75vh]">
          <div className="flex gap-1 p-2 border-b border-gray-100 bg-gray-50/80 overflow-x-auto custom-scrollbar flex-shrink-0">
            {[
              { key: "all", label: "All", icon: null },
              { key: "users", label: "Friends", icon: User },
              { key: "groups", label: "Groups", icon: Users },
              { key: "messages", label: "Messages", icon: MessageSquare }
            ].map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setActiveTab(key)} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${activeTab === key ? "bg-pink-100 text-pink-600 shadow-sm" : "text-gray-500 hover:bg-gray-100"}`}>
                {Icon && <Icon size={14} />} {label}
              </button>
            ))}
          </div>

          <div className="overflow-y-auto custom-scrollbar flex-1 p-1">
            {isSearching ? (
              <div className="flex items-center justify-center py-10"><Loader className="w-6 h-6 text-pink-500 animate-spin" /></div>
            ) : !hasResults ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <Search className="w-8 h-8 mb-2 opacity-30" /><span className="text-sm">No results found for "{searchQuery}"</span>
              </div>
            ) : (
              <div className="space-y-1">
                {showUsers && (
                  <div className="p-2">
                    <div className="flex items-center gap-2 px-2 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider"><User size={12} />Friends</div>
                    <div className="space-y-1">
                      {searchResults.users.map((user) => (
                        <button key={user._id} onClick={() => handleUserSelect(user)} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-pink-50 transition-all text-left group">
                          <img src={getAvatar(user.profilePic, user.fullName)} className="w-10 h-10 rounded-full object-cover border border-gray-100 flex-shrink-0" alt="" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate group-hover:text-pink-600">{highlightText(user.fullName, searchQuery)}</p>
                            <p className="text-xs text-gray-400 truncate">{highlightText(user.email || "", searchQuery)}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {showGroups && (
                  <div className="p-2 border-t border-gray-100">
                    <div className="flex items-center gap-2 px-2 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider"><Users size={12} />Groups</div>
                    <div className="space-y-1">
                      {searchResults.groups.map((group) => (
                        <button key={group._id} onClick={() => handleGroupSelect(group)} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-purple-50 transition-all text-left group">
                          <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shadow-sm flex-shrink-0 overflow-hidden">
                             {group.avatar ? <img src={group.avatar} className="w-full h-full object-cover" alt="" /> : <img src={getAvatar(null, group.name)} className="w-full h-full object-cover opacity-80" alt="" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate group-hover:text-purple-600">{highlightText(group.name, searchQuery)}</p>
                            <p className="text-xs text-gray-400 truncate">{group.members?.length || 0} members</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {showMessages && (
                  <div className="p-2 border-t border-gray-100">
                    <div className="flex items-center gap-2 px-2 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider"><MessageSquare size={12} />Messages</div>
                    <div className="space-y-1">
                      {searchResults.messages.map((msg) => {
                        const isGroupMsg = msg.type === 'group';
                        const senderObj = msg.sender || msg.senderId;
                        const isSentByMe = senderObj?._id === authUser?._id || senderObj === authUser?._id;
                        let title = isGroupMsg ? (msg.group?.name || "Unknown Group") : (msg.partner?.fullName || "Unknown User");
                        let avatar = isGroupMsg ? msg.group?.avatar : msg.partner?.profilePic;
                        const displayAvatar = getAvatar(avatar, title);
                        const senderNameDisplay = isSentByMe ? "You" : (senderObj?.fullName || "Unknown");

                        return (
                          <button key={msg._id} onClick={() => handleMessageSelect(msg)} className="w-full flex items-start gap-3 p-2 rounded-lg hover:bg-blue-50 transition-all text-left group">
                            <div className="relative flex-shrink-0">
                                <img src={displayAvatar} className="w-10 h-10 rounded-full object-cover border border-gray-100" alt="" />
                                {isGroupMsg && <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 border border-gray-100"><Users size={10} className="text-purple-500"/></div>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-0.5">
                                <span className="text-sm font-semibold text-gray-800 truncate">{title}</span>
                                <span className="text-[10px] text-gray-400 flex-shrink-0">{formatTimeAgo(msg.createdAt)}</span>
                              </div>
                              <p className="text-xs text-gray-600 line-clamp-2">
                                <span className={`font-semibold mr-1 ${isSentByMe ? "text-pink-500" : "text-gray-700"}`}>{senderNameDisplay}:</span>
                                {highlightText(msg.text || "[File]", searchQuery)}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      <div className="flex gap-2">
        {['all', 'unread'].map((type) => (
          <button key={type} onClick={() => setFilter(type)} className={`px-4 py-1.5 text-xs font-bold rounded-xl capitalize transition-colors border ${filter === type ? "bg-pink-100 text-pink-600 border-pink-200" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}>{type}</button>
        ))}
      </div>
      <style>{` @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } } .animate-fadeIn { animation: fadeIn 0.2s ease-out; } `}</style>
    </div>
  );
}