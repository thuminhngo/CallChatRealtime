import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { UserMinus, Search, Loader } from "lucide-react";
import { useFriend } from "../../context/FriendContext";

export default function SentRequests() {
    const { searchQuery, viewMode } = useOutletContext();
    const { sentRequests, getSentRequests, cancelFriendRequest } = useFriend();
    const [cancelingId, setCancelingId] = useState(null);

    useEffect(() => {
        getSentRequests();
    }, [getSentRequests]);

    const handleCancel = async (userId) => {
        setCancelingId(userId);
        try {
            await cancelFriendRequest(userId);
        } catch (error) {
            console.error(error);
        } finally {
            setCancelingId(null);
        }
    };

    const safeSentRequests = Array.isArray(sentRequests) ? sentRequests : [];

    const filteredList = safeSentRequests.filter(user =>
        (user.fullName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.email || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (filteredList.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center h-full py-20 text-gray-400">
                <Search size={48} className="opacity-20 mb-4" />
                <p className="text-sm italic text-center px-4">
                    {searchQuery ? "No results found." : "No pending requests sent."}
                </p>
            </div>
        );
    }

    // Bọc trong div h-full để quản lý scroll
    return (
        <div className="h-full flex flex-col">
             <div className="flex items-center justify-between mb-4 px-1 shrink-0">
                <p className="text-gray-400 text-xs">
                    {filteredList.length} sent {filteredList.length === 1 ? 'request' : 'requests'}
                </p>
            </div>
            
            <div className={`flex-1 overflow-y-auto custom-scrollbar p-1 ${
                viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-4 content-start" 
                : "flex flex-col gap-3 pb-4"
            }`}>
                {filteredList.map((user) => (
                    <div key={user._id} className={`bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 p-3 ${viewMode === 'grid' ? 'flex-col text-center sm:flex-row sm:text-left' : ''}`}>
                        
                        <img
                            src={user.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || "U")}`}
                            alt={user.fullName}
                            className="w-12 h-12 rounded-full object-cover border border-gray-100 shrink-0"
                        />

                        <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-800 text-sm truncate">{user.fullName}</h4>
                            <p className="text-xs text-gray-400 truncate">{user.email}</p>
                        </div>

                        <button
                            onClick={() => handleCancel(user._id)}
                            disabled={cancelingId === user._id}
                            className="p-2 bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors shrink-0"
                        >
                            {cancelingId === user._id ? <Loader size={18} className="animate-spin" /> : <UserMinus size={18} />}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}