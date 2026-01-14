import { useState } from "react";
import { X, Users, Check, Loader2 } from "lucide-react";
import { useGroup } from "../../context/GroupContext";
import { useFriend } from "../../context/FriendContext";
import { useAuth } from "../../context/AuthContext";

export default function CreateGroupModal({ onClose }) {
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const { createGroup } = useGroup();
  const { friends } = useFriend(); // Lấy danh sách bạn bè
  const { authUser } = useAuth();

  // Toggle chọn thành viên
  const toggleMember = (userId) => {
    setSelectedMembers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    
    setIsLoading(true);
    // Gọi API tạo nhóm
    const success = await createGroup({
      name: groupName,
      description,
      members: selectedMembers,
      isPrivate: false 
    });
    setIsLoading(false);

    if (success) {
      onClose(); // Đóng modal nếu tạo thành công
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
            <Users size={20} className="text-pink-500"/> 
            Create New Group
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar">
          {/* Group Name */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Group Name</label>
            <input 
              type="text" 
              className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all"
              placeholder="e.g. Project Team, Family..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Description (Optional)</label>
            <input 
              type="text" 
              className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all"
              placeholder="What is this group for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Select Members */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">
              Add Members ({selectedMembers.length})
            </label>
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-2 space-y-1 custom-scrollbar">
              {friends && friends.length > 0 ? (
                friends.map(friend => (
                  <div 
                    key={friend._id} 
                    onClick={() => toggleMember(friend._id)}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all border ${
                      selectedMembers.includes(friend._id) 
                        ? "bg-pink-50 border-pink-200" 
                        : "hover:bg-gray-50 border-transparent"
                    }`}
                  >
                    {/* Checkbox UI */}
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                      selectedMembers.includes(friend._id) 
                        ? "bg-pink-500 border-pink-500" 
                        : "border-gray-300 bg-white"
                    }`}>
                      {selectedMembers.includes(friend._id) && <Check size={14} className="text-white" />}
                    </div>

                    {/* Avatar & Name */}
                    <img 
                      src={friend.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.fullName)}&background=random`} 
                      className="w-8 h-8 rounded-full object-cover" 
                      alt="avatar"
                    />
                    <span className={`text-sm font-medium ${selectedMembers.includes(friend._id) ? "text-pink-700" : "text-gray-700"}`}>
                      {friend.fullName}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-center text-xs text-gray-400 py-4">Add friends to create a group.</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={!groupName.trim() || isLoading}
            className="px-6 py-2 text-sm font-bold text-white bg-pink-500 hover:bg-pink-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all flex items-center gap-2"
          >
            {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Users size={18} />}
            Create Group
          </button>
        </div>
      </div>
    </div>
  );
}