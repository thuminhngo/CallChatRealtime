import { useState } from "react";
import { X, Check, Search } from "lucide-react";
import { useFriend } from "../../context/FriendContext";
import { useGroup } from "../../context/GroupContext";

export default function AddMemberModal({ onClose }) {
  const { friends } = useFriend();
  const { selectedGroup, addMember } = useGroup();
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Lọc ra những bạn bè CHƯA có trong nhóm
  const availableFriends = friends.filter(friend => 
    !selectedGroup.members.some(m => m.user._id === friend._id || m.user === friend._id)
  ).filter(friend => 
    friend.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelect = (id) => {
    setSelectedUsers(prev => 
      prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    // Gọi API addMember cho từng user (Backend hiện tại add từng người)
    for (const userId of selectedUsers) {
        await addMember(selectedGroup._id, userId);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl flex flex-col max-h-[80vh]">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-bold text-gray-800">Add Members</h3>
          <button onClick={onClose}><X size={20} className="text-gray-500 hover:text-gray-700" /></button>
        </div>
        
        <div className="p-3 border-b">
            <div className="flex items-center bg-gray-100 rounded-lg px-3 py-2">
                <Search size={16} className="text-gray-400 mr-2"/>
                <input 
                    className="bg-transparent outline-none text-sm w-full"
                    placeholder="Search friends..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                />
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
          {availableFriends.length > 0 ? availableFriends.map(friend => (
            <div 
              key={friend._id} 
              onClick={() => toggleSelect(friend._id)}
              className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
            >
              <div className={`w-5 h-5 border rounded flex items-center justify-center transition-all ${selectedUsers.includes(friend._id) ? "bg-pink-500 border-pink-500" : "border-gray-300"}`}>
                 {selectedUsers.includes(friend._id) && <Check size={14} className="text-white"/>}
              </div>
              <img src={friend.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.fullName)}&background=random`} className="w-10 h-10 rounded-full object-cover border" />
              <span className="text-sm font-medium text-gray-700">{friend.fullName}</span>
            </div>
          )) : (
            <p className="text-center text-xs text-gray-400 py-8">No new friends available to add.</p>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50 rounded-b-2xl">
          <button 
            onClick={handleSubmit}
            disabled={selectedUsers.length === 0}
            className="w-full py-2.5 bg-pink-500 text-white rounded-xl font-semibold hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Add {selectedUsers.length > 0 ? `(${selectedUsers.length})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}