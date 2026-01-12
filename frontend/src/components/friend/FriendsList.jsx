import { useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Search } from "lucide-react";
import { useFriend } from "../../context/FriendContext";
import { useSocket } from "../../context/SocketContext";
import FriendCard from "./FriendCard";

export default function FriendsList({ type }) {
  const { searchQuery = "", viewMode = "grid", onStartChat } = useOutletContext() || {};
  const { getFriendRequests, friendRequests, friends, getFriends } = useFriend();
  const { onlineUsers } = useSocket();

  useEffect(() => {
    getFriends();
    getFriendRequests();
  }, [getFriends, getFriendRequests]);

  const safeFriends = Array.isArray(friends) ? friends : [];
  const safeOnlineUsers = (onlineUsers || []).map(id => String(id)); // Ép mảng online về String

  const friendsWithStatus = safeFriends.map(friend => {
    const friendId = friend._id ? String(friend._id) : null; // Ép ID bạn bè về String
    
    // So sánh String với String
    const isOnline = friendId && safeOnlineUsers.includes(friendId);

    return {
      ...friend,
      status: isOnline ? 'online' : 'offline'
    };
  });

  const getData = () => {
    let rawData = [];
    switch (type) {
      case "requests":
        rawData = Array.isArray(friendRequests) ? friendRequests : [];
        break;
      case "online":
        rawData = friendsWithStatus.filter(c => c.status === 'online');
        break;
      case "all":
      default:
        rawData = friendsWithStatus;
        break;
    }

    if (!Array.isArray(rawData)) return [];

    return rawData.filter(item => {
      const search = searchQuery.toLowerCase();
      // SỬA: Data đã phẳng, tìm kiếm trực tiếp trên item
      const name = (item?.fullName || "").toLowerCase();
      const email = (item?.email || "").toLowerCase();
      return name.includes(search) || email.includes(search);
    });
  };

  const data = getData();

  if (data.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full py-20 text-gray-400">
        <Search size={48} className="opacity-20 mb-4" />
        <p className="text-sm italic text-center px-4">
          {searchQuery 
            ? `No results found for "${searchQuery}"`
            : type === 'online' ? "No friends are online right now." : "List is empty."}
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 px-1">
        <p className="text-gray-400 text-xs">
          {data.length} {data.length === 1 ? 'contact' : 'contacts'}
          {type === 'online' && ' online'}
        </p>
      </div>
      <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5" : "flex flex-col gap-2"}>
        {data.map(user => (
          <FriendCard
            key={user?._id || Math.random()}
            user={user}
            type={type}
            onStartChat={onStartChat}
            viewMode={viewMode}
          />
        ))}
      </div>
    </div>
  );
}