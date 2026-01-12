import { Search, X, ChevronDown, ChevronUp, Loader } from "lucide-react";
import { useState, useCallback, useEffect, useRef } from "react";
import { axiosInstance } from "../../lib/axios";

export default function MessageSearch({ chat, onClose, onNavigateToMessage }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const inputRef = useRef(null);
    const debounceRef = useRef(null);

    const chatId = chat?.id || chat?._id;

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Debounced search
    const handleSearch = useCallback(
        async (query) => {
            if (!query.trim() || !chatId) {
                setSearchResults([]);
                return;
            }

            setIsSearching(true);
            try {
                const res = await axiosInstance.get(`/messages/search/${chatId}`, {
                    params: { q: query },
                });
                setSearchResults(Array.isArray(res.data) ? res.data : []);
                setCurrentIndex(0);
            } catch (error) {
                console.error("Search error:", error);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        },
        [chatId]
    );

    // Debounce input
    const handleInputChange = (e) => {
        const value = e.target.value;
        setSearchQuery(value);

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            handleSearch(value);
        }, 300);
    };

    // Navigate to specific message
    const navigateToMessage = (index) => {
        if (searchResults.length === 0) return;
        const message = searchResults[index];
        if (message && onNavigateToMessage) {
            onNavigateToMessage(message._id);
        }
    };

    // Navigate to previous result
    const goToPrevious = () => {
        if (searchResults.length === 0) return;
        const newIndex =
            currentIndex === 0 ? searchResults.length - 1 : currentIndex - 1;
        setCurrentIndex(newIndex);
        navigateToMessage(newIndex);
    };

    // Navigate to next result
    const goToNext = () => {
        if (searchResults.length === 0) return;
        const newIndex =
            currentIndex === searchResults.length - 1 ? 0 : currentIndex + 1;
        setCurrentIndex(newIndex);
        navigateToMessage(newIndex);
    };

    // Keyboard navigation
    const handleKeyDown = (e) => {
        if (e.key === "Escape") {
            onClose?.();
        } else if (e.key === "Enter") {
            if (e.shiftKey) {
                goToPrevious();
            } else {
                goToNext();
            }
        }
    };

    // Highlight search term in text
    const highlightText = (text, query) => {
        if (!query.trim()) return text;
        const regex = new RegExp(`(${query.trim()})`, "gi");
        const parts = text.split(regex);
        return parts.map((part, i) =>
            regex.test(part) ? (
                <span key={i} className="bg-yellow-300 text-gray-900 font-medium px-0.5 rounded">
                    {part}
                </span>
            ) : (
                part
            )
        );
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return "";
        return new Date(dateStr).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <div className="absolute top-0 left-0 right-0 bg-white shadow-lg border-b z-20 animate-slideDown">
            {/* Search Input Bar */}
            <div className="flex items-center gap-2 p-3 border-b bg-gradient-to-r from-pink-50 to-purple-50">
                <div className="flex-1 flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-gray-200 focus-within:border-pink-400 focus-within:ring-2 focus-within:ring-pink-100 transition-all">
                    <Search size={18} className="text-gray-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchQuery}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Search messages..."
                        className="flex-1 outline-none text-sm text-gray-700 placeholder:text-gray-400"
                    />
                    {isSearching && (
                        <Loader size={16} className="text-pink-500 animate-spin" />
                    )}
                </div>

                {/* Result Counter & Navigation */}
                {searchResults.length > 0 && (
                    <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500 min-w-[60px] text-center">
                            {currentIndex + 1} of {searchResults.length}
                        </span>
                        <button
                            onClick={goToPrevious}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Previous (Shift+Enter)"
                        >
                            <ChevronUp size={18} className="text-gray-600" />
                        </button>
                        <button
                            onClick={goToNext}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Next (Enter)"
                        >
                            <ChevronDown size={18} className="text-gray-600" />
                        </button>
                    </div>
                )}

                <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                    title="Close (Esc)"
                >
                    <X size={18} className="text-gray-500" />
                </button>
            </div>

            {/* Search Results Preview */}
            {searchQuery.trim() && (
                <div className="max-h-64 overflow-y-auto custom-scrollbar">
                    {isSearching ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader size={24} className="text-pink-500 animate-spin" />
                            <span className="ml-2 text-gray-500 text-sm">Searching...</span>
                        </div>
                    ) : searchResults.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                            <Search size={32} className="mb-2 opacity-50" />
                            <span className="text-sm">No messages found</span>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {searchResults.map((msg, index) => {
                                const senderId = msg.senderId?._id || msg.senderId;
                                const senderName = msg.senderId?.fullName || "Unknown";
                                const isSelected = index === currentIndex;

                                return (
                                    <button
                                        key={msg._id}
                                        onClick={() => {
                                            setCurrentIndex(index);
                                            navigateToMessage(index);
                                        }}
                                        className={`w-full flex items-start gap-3 p-3 text-left transition-all hover:bg-pink-50 ${isSelected ? "bg-pink-50 border-l-4 border-pink-500" : ""
                                            }`}
                                    >
                                        <img
                                            src={
                                                msg.senderId?.profilePic ||
                                                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                                    senderName
                                                )}&background=random`
                                            }
                                            alt={senderName}
                                            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2 mb-0.5">
                                                <span className="text-xs font-medium text-gray-700 truncate">
                                                    {senderName}
                                                </span>
                                                <span className="text-[10px] text-gray-400 flex-shrink-0">
                                                    {formatTime(msg.createdAt)}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 line-clamp-2">
                                                {highlightText(msg.text || "", searchQuery)}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes slideDown {
                  from {
                    opacity: 0;
                    transform: translateY(-10px);
                  }
                  to {
                    opacity: 1;
                    transform: translateY(0);
                  }
                }
                .animate-slideDown {
                  animation: slideDown 0.2s ease-out;
                }
            ` }} />
        </div>
    );
}
 

