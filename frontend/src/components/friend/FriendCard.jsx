import { useState } from "react";
import { MessageCircle, Loader, UserMinus, Check, X } from "lucide-react";
import { useFriend } from "../../context/FriendContext";

export default function FriendCard({ user, type, onStartChat, viewMode }) {
  const { acceptFriendRequest, rejectFriendRequest, removeFriend } = useFriend();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  // SỬA: Data đã phẳng, không cần check sender/receiver
  const targetUser = user; 
  
  const avatarUrl = targetUser.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(targetUser.fullName || 'U')}&background=random`;
  const displayName = targetUser.fullName || "Unknown";

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      // SỬA: Dùng requestId từ user object
      await acceptFriendRequest(targetUser.requestId);
    } catch (error) {
    } finally {
      setIsAccepting(false);
    }
  };

  const handleReject = async () => {
    setIsRejecting(true);
    try {
      // SỬA: Dùng requestId từ user object
      await rejectFriendRequest(targetUser.requestId);
    } catch (error) {
    } finally {
      setIsRejecting(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm("Are you sure you want to remove this friend?")) return;
    setIsRemoving(true);
    try {
      await removeFriend(targetUser._id);
    } catch (error) {
    } finally {
      setIsRemoving(false);
    }
  };

  // --- 1. REQUESTS TAB ---
  if (type === 'requests') {
    const isList = viewMode === 'list';
    return (
      <div className={`bg-white border border-gray-100 shadow-sm transition-all active:scale-[0.99] md:hover:shadow-md ${
        isList
          ? 'p-3 rounded-xl flex items-center justify-between gap-3'
          : 'p-4 rounded-2xl flex flex-col gap-4'
      }`}>
        <div className={`flex items-center gap-3 ${!isList ? 'flex-col text-center' : 'min-w-0'}`}>
          <div className="relative shrink-0">
            <img 
              src={avatarUrl} 
              alt={displayName} 
              className={`${isList ? 'w-10 h-10' : 'w-16 h-16'} rounded-full object-cover`} 
            />
            {/* Requests thường ko check online, nhưng nếu muốn thì giữ logic cũ */}
          </div>

          <div className="min-w-0">
            <h4 className="font-bold text-gray-800 text-sm truncate">{displayName}</h4>
            <p className="text-[11px] text-gray-400 truncate">{targetUser.email || "Sent a request"}</p>
          </div>
        </div>

        <div className={`flex gap-2 ${isList ? 'shrink-0' : 'w-full'}`}>
          <button
            onClick={handleAccept}
            disabled={isAccepting || isRejecting}
            className={`flex-1 ${isList ? 'px-3 py-2' : 'py-2.5'} bg-pink-500 text-white rounded-lg text-xs font-bold active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-1`}
          >
            {isAccepting ? <Loader size={14} className="animate-spin" /> : <Check size={14} />}
            Confirm
          </button>
          <button
            onClick={handleReject}
            disabled={isAccepting || isRejecting}
            className={`flex-1 ${isList ? 'px-3 py-2' : 'py-2.5'} bg-gray-100 text-gray-600 rounded-lg text-xs font-bold active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-1`}
          >
            {isRejecting ? <Loader size={14} className="animate-spin" /> : <X size={14} />}
            Delete
          </button>
        </div>
      </div>
    );
  }

  // --- 2. FRIENDS / ONLINE TAB ---
  if (viewMode === 'list') {
    return (
      <div className="bg-white p-3 px-4 rounded-xl border border-gray-100 shadow-sm transition-all flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative shrink-0">
            <img src={avatarUrl} alt={displayName} className="w-10 h-10 rounded-full object-cover border border-gray-50" />
            {targetUser.status === 'online' && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-gray-800 text-sm truncate">{displayName}</h3>
            <p className="text-[11px] text-gray-400 truncate">{targetUser.email || "Active now"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => onStartChat(targetUser)} className="p-2.5 bg-pink-50 text-pink-500 rounded-lg"><MessageCircle size={18} /></button>
          <button onClick={handleRemove} disabled={isRemoving} className="p-2.5 text-gray-300 rounded-lg">
            {isRemoving ? <Loader size={18} className="animate-spin" /> : <UserMinus size={18} />}
          </button>
        </div>
      </div>
    );
  }

  // Grid View Default
  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center text-center relative group">
      <div className="relative mb-3 shrink-0">
        <img src={avatarUrl} alt={displayName} className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border-4 border-gray-50" />
        {targetUser.status === 'online' && (
          <span className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></span>
        )}
      </div>
      <div className="mb-4 w-full">
        <h3 className="font-bold text-gray-800 text-sm md:text-base line-clamp-1">{displayName}</h3>
        <p className="text-gray-400 text-[11px] truncate px-2">{targetUser.email || "Friend"}</p>
      </div>
      <button onClick={() => onStartChat(targetUser)} className="w-full py-2.5 bg-white border border-pink-200 text-pink-500 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm">
        <MessageCircle size={16} /> Message
      </button>
    </div>
  );
}