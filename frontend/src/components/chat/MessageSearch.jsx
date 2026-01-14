import { Search, X, ChevronDown, ChevronUp, Loader } from "lucide-react";
import { useState, useCallback, useEffect, useRef } from "react";
import { axiosInstance } from "../../lib/axios";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext"; // 🔥 IMPORT

export default function MessageSearch({ chat, onClose }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const inputRef = useRef(null);
    const debounceRef = useRef(null);

    const { authUser } = useAuth();
    const { setMessageIdToScroll } = useChat(); // 🔥 LẤY HÀM
    const chatId = chat?.id || chat?._id;

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSearch = useCallback(async (query) => {
        if (!query.trim() || !chatId) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const endpoint = chat.isGroup 
                ? `/groups/${chatId}/search` 
                : `/messages/search/${chatId}`;

            const res = await axiosInstance.get(endpoint, { params: { q: query } });
            setSearchResults(Array.isArray(res.data) ? res.data : []);
            setCurrentIndex(0);
        } catch (error) {
            console.error("Search error:", error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    }, [chatId, chat.isGroup]);

    const handleInputChange = (e) => {
        const value = e.target.value;
        setSearchQuery(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => handleSearch(value), 400);
    };

    const navigateToMessage = (index) => {
        if (searchResults.length === 0) return;
        // 🔥 Trigger cuộn tới tin nhắn
        setMessageIdToScroll(searchResults[index]._id);
    };

    const goToPrevious = () => {
        if (searchResults.length === 0) return;
        const newIndex = currentIndex === 0 ? searchResults.length - 1 : currentIndex - 1;
        setCurrentIndex(newIndex);
        navigateToMessage(newIndex);
    };

    const goToNext = () => {
        if (searchResults.length === 0) return;
        const newIndex = currentIndex === searchResults.length - 1 ? 0 : currentIndex + 1;
        setCurrentIndex(newIndex);
        navigateToMessage(newIndex);
    };

    const handleKeyDown = (e) => {
        if (e.key === "Escape") onClose?.();
        else if (e.key === "Enter") {
            e.preventDefault();
            e.shiftKey ? goToPrevious() : goToNext();
        }
    };

    const highlightText = (text, query) => {
        if (!query.trim() || !text) return text;
        const escapedQuery = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedQuery})`, "gi");
        return text.split(regex).map((part, i) =>
            regex.test(part) ? <mark key={i} className="bg-yellow-300 text-black px-0 rounded">{part}</mark> : part
        );
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return "";
        return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    };

    return (
        <div className="absolute top-0 left-0 right-0 bg-white shadow-lg border-b z-20 animate-slideDown">
            <div className="flex items-center gap-2 p-3 border-b bg-white">
                <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 border border-transparent focus-within:border-pink-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-pink-50 transition-all">
                    <Search size={16} className="text-gray-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchQuery}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Search in conversation..."
                        className="flex-1 bg-transparent outline-none text-sm text-gray-700 placeholder:text-gray-400"
                    />
                    {isSearching && <Loader size={14} className="text-pink-500 animate-spin" />}
                </div>

                {searchResults.length > 0 && (
                    <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1 border border-gray-100">
                        <span className="text-xs text-gray-500 px-2 font-medium">{currentIndex + 1}/{searchResults.length}</span>
                        <div className="w-px h-4 bg-gray-200 mx-1"></div>
                        <button onClick={goToPrevious} className="p-1 hover:bg-white hover:shadow-sm rounded transition-all"><ChevronUp size={16} className="text-gray-600" /></button>
                        <button onClick={goToNext} className="p-1 hover:bg-white hover:shadow-sm rounded transition-all"><ChevronDown size={16} className="text-gray-600" /></button>
                    </div>
                )}
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={18} className="text-gray-500" /></button>
            </div>

            {searchQuery.trim() && (
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                    {isSearching ? (
                        <div className="py-8 text-center text-xs text-gray-400">Searching...</div>
                    ) : searchResults.length === 0 ? (
                        <div className="py-8 text-center text-gray-400 flex flex-col items-center"><Search size={24} className="mb-2 opacity-20"/><span className="text-xs">No matches found</span></div>
                    ) : (
                        <div>
                            {searchResults.map((msg, index) => {
                                const sender = msg.sender || msg.senderId;
                                const senderName = sender?.fullName || "Unknown";
                                const senderAvatar = sender?.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=random`;
                                const isSelected = index === currentIndex;
                                const isSentByMe = sender?._id === authUser?._id || sender === authUser?._id;
                                const displayName = isSentByMe ? "You" : senderName;

                                return (
                                    <button
                                        key={msg._id}
                                        onClick={() => { setCurrentIndex(index); navigateToMessage(index); }}
                                        className={`w-full flex items-start gap-3 p-3 text-left border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-all ${isSelected ? "bg-pink-50/60" : ""}`}
                                    >
                                        <img src={senderAvatar} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <span className={`text-xs font-bold truncate ${isSentByMe ? "text-pink-600" : "text-gray-700"}`}>{displayName}</span>
                                                <span className="text-[10px] text-gray-400">{formatTime(msg.createdAt)}</span>
                                            </div>
                                            <p className="text-sm text-gray-600 line-clamp-2">{highlightText(msg.text || "[Media]", searchQuery)}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
             <style>{` @keyframes slideDown { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } } .animate-slideDown { animation: slideDown 0.15s ease-out; } `}</style>
        </div>
    );
}