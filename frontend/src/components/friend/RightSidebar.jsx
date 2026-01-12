import { useFriend } from "../../context/FriendContext";
import { useSocket } from "../../context/SocketContext";
import { useEffect } from "react";

export default function RightSidebar({ onStartChat }) {
  const { friends, getFriends, friendRequests, acceptFriendRequest, rejectFriendRequest } = useFriend();
  const { onlineUsers } = useSocket();

  useEffect(() => {
    getFriends();
  }, [getFriends]);

  const safeFriends = Array.isArray(friends) ? friends : [];
  // Lọc bạn bè đang online
  const onlineUserIdsString = (onlineUsers || []).map(id => String(id));

  const onlineFriends = safeFriends.filter((friend) => 
    friend._id && onlineUserIdsString.includes(String(friend._id))
  );

  //
  const renderFriendItem = (data, isRequest = false) => {
    const user = data;
    if (!user) return null;

    const avatar = user.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || "U")}&background=random`;

    return (
      <div key={user._id} className="flex items-center gap-3 p-2 rounded-xl transition-colors hover:bg-gray-50 group">
        <div className="relative shrink-0">
          <img src={avatar} alt={user.fullName} className="w-10 h-10 rounded-full object-cover" />
          {!isRequest && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-700 truncate group-hover:text-pink-500 transition-colors">{user.fullName}</h4>
          {isRequest && (
            <div className="flex gap-2 mt-1">
              {/* SỬA: Truyền requestId vào hàm accept/delete */}
              <button 
                onClick={() => acceptFriendRequest(data.requestId)} 
                className="flex-1 text-[10px] bg-pink-500 hover:bg-pink-600 text-white py-1 rounded-md transition-colors"
              >
                Accept
              </button>
              <button 
                onClick={() => rejectFriendRequest(data.requestId)} 
                className="flex-1 text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-600 py-1 rounded-md transition-colors"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white p-5 overflow-y-auto custom-scrollbar">
      {/* Requests Section */}
      {Array.isArray(friendRequests) && friendRequests.length > 0 && (
        <div className="mb-6 pb-6 border-b border-gray-100">
          <h3 className="text-xs font-bold text-gray-400 uppercase mb-4 tracking-wider">Requests</h3>
          <div className="flex flex-col gap-3">
            {friendRequests.map((req) => renderFriendItem(req, true))}
          </div>
        </div>
      )}

      {/* Online Section */}
      <div>
        <h3 className="text-xs font-bold text-gray-400 uppercase mb-4 tracking-wider">Active Now</h3>
        <div className="flex flex-col gap-2">
          {onlineFriends.length > 0 ? (
            onlineFriends.map((user) => (
              <div key={user._id} onClick={() => onStartChat(user)} className="cursor-pointer">
                {renderFriendItem(user, false)}
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-400 italic">No friends online</p>
          )}
        </div>
      </div>
    </div>
  );
}