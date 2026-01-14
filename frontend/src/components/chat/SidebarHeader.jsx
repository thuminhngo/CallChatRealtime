import { Search, X, Users, MessageSquare, Loader, Cloud, User } from "lucide-react";
import { useState, useCallback, useRef, useEffect } from "react";
import { axiosInstance } from "../../lib/axios";
import { useAuth } from "../../context/AuthContext";
import { useGroup } from "../../context/GroupContext"; 

export default function SidebarHeader({ filter, setFilter, searchQuery, setSearchQuery, onSelectChat, onSelectMessage }) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState({ users: [], groups: [], messages: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); 
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const dropdownRef = useRef(null);
  const { authUser } = useAuth();
  
  const { myGroups } = useGroup();

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
        axiosInstance.get("/friends/search-friends", { params: { q: query } }).catch(() => ({ data: [] })),
        axiosInstance.get("/messages/search", { params: { q: query } }).catch(() => ({ data: [] })),
      ]);

      let friends = Array.isArray(usersRes.data) ? usersRes.data : [];
      const queryLower = query.toLowerCase().trim();

      const isSearchingSelf = 
        "my cloud".includes(queryLower) || 
        "me".includes(queryLower) ||
        "cloud".includes(queryLower) ||
        authUser?.fullName.toLowerCase().includes(queryLower);

      if (isSearchingSelf && authUser) {
        friends = friends.filter(u => u._id !== authUser._id);
        friends = [{
          ...authUser,
          isSelfChat: true,
        }, ...friends];
      }

      // Lọc nhóm theo tên (Client-side)
      const matchedGroups = myGroups.filter(group => 
        group.name.toLowerCase().includes(queryLower)
      );

      setSearchResults({
        users: friends.slice(0, 5),
        groups: matchedGroups.slice(0, 5),
        messages: Array.isArray(messagesRes.data) ? messagesRes.data.slice(0, 10) : [],
      });
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  }, [authUser, myGroups]); 

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
    // onSelectChat sẽ gọi handleSelectChat bên ConversationSidebar
    // Bên đó đã có logic check (item.name && !item.fullName) nên sẽ nhận diện được đây là group
    if (onSelectChat) onSelectChat(group); 
    resetSearch();
  };

  const handleMessageSelect = (message) => {
    const isMyCloudMessage = message.senderId?._id === authUser?._id && message.receiverId?._id === authUser?._id;
    const isSentByMe = message.senderId?._id === authUser?._id;
    const partner = isSentByMe ? message.receiverId : message.senderId;

    const partnerData = {
      ...partner,
      _id: isMyCloudMessage ? authUser._id : partner?._id,
      fullName: isMyCloudMessage ? authUser.fullName : (partner?.fullName || "Unknown"),
      profilePic: isMyCloudMessage ? authUser.profilePic : partner?.profilePic,
      isSelfChat: isMyCloudMessage
    };

    if (onSelectChat) onSelectChat(partnerData);
    if (onSelectMessage) onSelectMessage(message._id);
    resetSearch();
  };

  const resetSearch = () => {
    setSearchQuery("");
    setSearchResults({ users: [], groups: [], messages: [] });
    setIsSearchFocused(false);
  };

  const highlightText = (text, query) => {
    if (!query.trim() || !text) return text;
    const regex = new RegExp(`(${query.trim()})`, "gi");
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

  const hasResults = searchResults.users.length > 0 || searchResults.groups.length > 0 || searchResults.messages.length > 0;
  const showDropdown = isSearchFocused && searchQuery.trim();
  
  const filteredUsers = activeTab === "messages" || activeTab === "groups" ? [] : searchResults.users;
  const filteredGroups = activeTab === "messages" || activeTab === "users" ? [] : searchResults.groups;
  const filteredMessages = activeTab === "users" || activeTab === "groups" ? [] : searchResults.messages;

  return (
    <div className="flex flex-col gap-3 p-4 pb-2 border-b border-gray-50 relative" ref={dropdownRef}>
      <div className={`flex items-center bg-gray-100 rounded-xl p-3 shadow-sm transition-all ${isSearchFocused ? "bg-white ring-2 ring-pink-200" : ""}`}>
        <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => setIsSearchFocused(true)}
          className="flex-1 ml-2 bg-transparent text-sm focus:outline-none text-gray-700 placeholder:text-gray-400"
        />
        {isSearching && <Loader className="w-4 h-4 text-pink-500 animate-spin mr-1" />}
        {searchQuery && (
          <button onClick={handleClearSearch} className="p-1 hover:bg-gray-200 rounded-full">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 mx-2 bg-white rounded-xl shadow-xl border border-gray-100 z-50 max-h-[70vh] overflow-hidden animate-fadeIn">
          <div className="flex gap-1 p-2 border-b border-gray-100 bg-gray-50/50 overflow-x-auto custom-scrollbar">
            {[
              { key: "all", label: "All", icon: null },
              { key: "users", label: "Friends", icon: User },
              { key: "groups", label: "Groups", icon: Users },
              { key: "messages", label: "Messages", icon: MessageSquare }
            ].map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setActiveTab(key)} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${activeTab === key ? "bg-pink-100 text-pink-600" : "text-gray-500 hover:bg-gray-100"}`}>
                {Icon && <Icon size={14} />} {label}
              </button>
            ))}
          </div>

          <div className="overflow-y-auto max-h-[calc(70vh-52px)] custom-scrollbar">
            {isSearching ? (
              <div className="flex items-center justify-center py-8"><Loader className="w-6 h-6 text-pink-500 animate-spin" /></div>
            ) : !hasResults ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <Search className="w-8 h-8 mb-2 opacity-50" /><span className="text-sm">No results found</span>
              </div>
            ) : (
              <>
                {filteredUsers.length > 0 && (
                  <div className="p-2">
                    <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide"><User size={14} />Friends</div>
                    <div className="space-y-0.5">
                      {filteredUsers.map((user) => (
                        <button key={user._id} onClick={() => handleUserSelect(user)} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-pink-50 transition-all text-left group">
                          {user.isSelfChat ? (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center shadow-sm flex-shrink-0">
                              <Cloud size={20} className="text-white" />
                            </div>
                          ) : (
                            <img src={user.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=ramdom`} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate group-hover:text-pink-600 flex items-center gap-1.5">
                              {highlightText(user.fullName, searchQuery)}
                              {user.isSelfChat && <span className="text-[9px] bg-blue-100 text-blue-600 px-1 py-0.5 rounded font-bold uppercase">Me</span>}
                            </p>
                            <p className="text-xs text-gray-400 truncate">{highlightText(user.email || "", searchQuery)}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {filteredGroups.length > 0 && (
                  <div className="p-2 border-t border-gray-100">
                    <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide"><Users size={14} />Groups</div>
                    <div className="space-y-0.5">
                      {filteredGroups.map((group) => (
                        <button key={group._id} onClick={() => handleGroupSelect(group)} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-purple-50 transition-all text-left group">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-400 flex items-center justify-center shadow-sm flex-shrink-0 text-white">
                             {group.avatar ? <img src={group.avatar} className="w-full h-full rounded-full object-cover"/> : <Users size={18} />}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate group-hover:text-purple-600">
                              {highlightText(group.name, searchQuery)}
                            </p>
                            <p className="text-xs text-gray-400 truncate">
                              {group.members?.length || 0} members
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {filteredMessages.length > 0 && (
                  <div className="p-2 border-t border-gray-100">
                    <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide"><MessageSquare size={14} />Messages</div>
                    <div className="space-y-0.5">
                      {filteredMessages.map((msg) => {
                        const isSentByMe = msg.senderId?._id === authUser?._id;
                        const isMyCloud = isSentByMe && msg.receiverId?._id === authUser?._id;
                        const partner = isSentByMe ? msg.receiverId : msg.senderId;
                        const conversationName = isMyCloud ? authUser?.fullName : (partner?.fullName || "Unknown");

                        return (
                          <button key={msg._id} onClick={() => handleMessageSelect(msg)} className="w-full flex items-start gap-3 p-2 rounded-lg hover:bg-pink-50 transition-all text-left group">
                            <div className="relative flex-shrink-0">
                              {isMyCloud ? (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center shadow-sm">
                                  <Cloud size={20} className="text-white" />
                                </div>
                              ) : (
                                <img src={partner?.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(conversationName)}&background=ramdom`} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm flex-shrink-0" />
                              )}
                              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center border border-white text-[8px] text-white font-bold ${isSentByMe ? "bg-blue-500" : "bg-green-500"}`}>
                                {isSentByMe ? "↑" : "↓"}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-0.5">
                                <span className="text-sm font-bold text-gray-800 truncate group-hover:text-pink-600 flex items-center gap-1">
                                  {conversationName} {isMyCloud && <span className="text-[9px] bg-blue-100 text-blue-500 px-1 rounded">Me</span>}
                                </span>
                                <span className="text-[10px] text-gray-400 flex-shrink-0">{formatTimeAgo(msg.createdAt)}</span>
                              </div>
                              <p className="text-xs text-gray-600 line-clamp-2">
                                {isSentByMe && !isMyCloud && <span className="font-bold text-pink-500 mr-1 italic">You:</span>}
                                {isMyCloud && <span className="text-blue-400 mr-1 italic">Note:</span>}
                                {highlightText(msg.text || "", searchQuery)}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {['all', 'unread'].map((type) => (
          <button key={type} onClick={() => setFilter(type)} className={`px-4 py-1.5 text-xs font-bold rounded-xl capitalize transition-colors ${filter === type ? "bg-pink-100 text-pink-600" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}>{type}</button>
        ))}
      </div>
      <style jsx>{` @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } } .animate-fadeIn { animation: fadeIn 0.2s ease-out; } `}</style>
    </div>
  );
}