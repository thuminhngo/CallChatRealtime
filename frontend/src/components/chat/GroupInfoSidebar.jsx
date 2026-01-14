import { useState, useRef, useEffect } from "react";
import {
  X, Users, LogOut, Trash2, Shield, User,
  ChevronDown, ChevronRight, Image as ImageIcon, Plus, Crown, MoreVertical,
  Edit2, Camera, Check as CheckIcon, Info, ArrowRightLeft
} from "lucide-react";
import { useGroup } from "../../context/GroupContext";
import { useAuth } from "../../context/AuthContext";
import AddMemberModal from "./AddMemberModal";
import toast from "react-hot-toast";

export default function GroupInfoSidebar({ onClose }) {
  const {
    selectedGroup, removeMember, leaveGroup, deleteGroup, updateMemberRole,
    transferOwnership, getGroupSharedMedia, updateGroupInfo
  } = useGroup();
  const { authUser } = useAuth();

  const [isMembersOpen, setIsMembersOpen] = useState(true);
  const [isMediaOpen, setIsMediaOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Edit Mode States
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [previewAvatar, setPreviewAvatar] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const fileInputRef = useRef(null);

  // Sync state with selectedGroup
  useEffect(() => {
    if (selectedGroup) {
      setEditName(selectedGroup.name);
      setEditDesc(selectedGroup.description || "");
      setAvatarFile(null);
      setPreviewAvatar(null);
      setIsEditing(false);
    }
  }, [selectedGroup]);

  if (!selectedGroup) return null;

  const myMemberInfo = selectedGroup.members.find(m => (m.user._id || m.user) === authUser._id);
  const myRole = myMemberInfo?.role || "member";
  const isOwner = myRole === "owner";
  const isAdmin = myRole === "admin";
  const canManage = isOwner || isAdmin;

  const sharedMedia = getGroupSharedMedia();

  // Handlers
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setPreviewAvatar(URL.createObjectURL(file));
    }
  };

  const handleSaveChanges = async () => {
    if (!editName.trim()) return toast.error("Group name cannot be empty");

    setIsUpdating(true);
    const success = await updateGroupInfo(selectedGroup._id, {
      name: editName,
      description: editDesc,
      image: avatarFile,
    });

    setIsUpdating(false);
    if (success) {
      setIsEditing(false);
      setAvatarFile(null);
      setPreviewAvatar(null);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditName(selectedGroup.name);
    setEditDesc(selectedGroup.description || "");
    setPreviewAvatar(null);
    setAvatarFile(null);
  };

  const handleRemoveMember = (userId, userName) => {
    if (window.confirm(`Remove ${userName} from group?`)) {
      removeMember(selectedGroup._id, userId);
      setActiveMenuId(null);
    }
  };

  const handleUpdateRole = (userId, newRole) => {
    updateMemberRole(selectedGroup._id, userId, newRole);
    setActiveMenuId(null);
  };

  const handleTransferOwnership = async (userId, userName) => {
    if (window.confirm(`Bạn có chắc muốn chuyển quyền Chủ nhóm cho ${userName}? Bạn sẽ trở thành Admin.`)) {
        await transferOwnership(selectedGroup._id, userId);
        setActiveMenuId(null);
    }
  };

  const handleDeleteGroup = async () => {
    if (window.confirm("Hành động này không thể hoàn tác. Bạn có chắc chắn muốn giải tán nhóm và xóa toàn bộ tin nhắn không?")) {
      const success = await deleteGroup(selectedGroup._id);
      if (success) {
        onClose(); 
      }
    }
  };

  const handleLeaveGroup = () => {
    if (window.confirm("Bạn có chắc chắn muốn rời khỏi nhóm này?")) {
      leaveGroup(selectedGroup._id);
      onClose();
    }
  };

  return (
    <div className="flex flex-col w-full h-full bg-white border-l border-gray-100 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-bold text-gray-800">Group Info</h3>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"><X size={18} /></button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">

        {/* Profile Section */}
        <div className="flex flex-col items-center py-6 border-b bg-gray-50/30 relative">
          {canManage && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="absolute top-2 right-4 p-2 text-gray-400 hover:text-pink-500 hover:bg-white rounded-full transition-all shadow-sm"
              title="Edit Group"
            >
              <Edit2 size={16} />
            </button>
          )}

          {/* Avatar */}
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-400 to-indigo-400 flex items-center justify-center text-white shadow-md border-4 border-white overflow-hidden">
              {previewAvatar ? (
                <img src={previewAvatar} className="w-full h-full object-cover" alt="Preview" />
              ) : selectedGroup.avatar ? (
                <img src={selectedGroup.avatar} className="w-full h-full object-cover" alt="Group" />
              ) : (
                <Users size={40} />
              )}
            </div>

            {isEditing && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-1.5 bg-gray-800 text-white rounded-full hover:bg-black transition-colors border-2 border-white shadow-lg"
                >
                  <Camera size={14} />
                </button>
              </>
            )}
          </div>

          {/* Text Info */}
          {isEditing ? (
            <div className="w-full px-6 flex flex-col gap-3 items-center animate-in fade-in zoom-in-95 duration-200">
              <input
                className="w-full text-center border-b-2 border-pink-200 focus:border-pink-500 outline-none py-1 font-bold text-gray-800 bg-transparent text-lg transition-colors"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Group Name"
                autoFocus
              />
              <textarea
                className="w-full text-center border border-gray-200 focus:border-pink-500 outline-none p-2 text-sm text-gray-600 bg-white rounded-lg resize-none"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Add a description..."
                rows={2}
              />
              <div className="flex gap-2 mt-2">
                <button onClick={handleCancelEdit} className="px-4 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Cancel</button>
                <button
                  onClick={handleSaveChanges}
                  disabled={isUpdating}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-pink-500 hover:bg-pink-600 rounded-lg flex items-center gap-1 shadow-sm disabled:opacity-50"
                >
                  {isUpdating ? "Saving..." : <><CheckIcon size={14} /> Save</>}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center px-6">
              <h2 className="text-xl font-bold text-gray-800 break-words mb-1">{selectedGroup.name}</h2>
              <p className="text-sm text-gray-500 font-medium mb-3">{selectedGroup.members.length} members</p>
              {selectedGroup.description && (
                <div className="bg-white/50 p-3 rounded-xl border border-gray-100 inline-block max-w-full">
                  <div className="flex items-start gap-2 text-left">
                    <Info size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gray-600 leading-relaxed break-words">{selectedGroup.description}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Add Member Action */}
        {canManage && !isEditing && (
          <div className="p-4 border-b">
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-50 text-purple-600 rounded-xl font-medium hover:bg-purple-100 transition-colors shadow-sm"
            >
              <Plus size={18} /> Add Members
            </button>
          </div>
        )}

        {/* Members List Section */}
        <div className="border-b">
          <button onClick={() => setIsMembersOpen(!isMembersOpen)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
            <span className="font-semibold text-sm flex items-center gap-2 text-gray-700">
              <Users size={16} className="text-purple-500" /> Members
            </span>
            {isMembersOpen ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
          </button>

          {isMembersOpen && (
            <div className="px-2 pb-2 space-y-1">
              {selectedGroup.members.map((member) => {
                const user = member.user;
                const userId = user._id || user;
                const isMe = userId === authUser._id;
                const role = member.role;
                const canInteract = (isOwner && !isMe) || (isAdmin && role === 'member' && !isMe);

                return (
                  <div key={userId} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 group relative transition-colors">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="relative">
                        <img
                          src={user.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || "User")}&background=random`}
                          className="w-10 h-10 rounded-full object-cover border"
                          alt={user.fullName}
                        />
                        {role === 'owner' && <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm"><Crown size={10} className="text-yellow-500 fill-yellow-500" /></div>}
                        {role === 'admin' && <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm"><Shield size={10} className="text-blue-500 fill-blue-500" /></div>}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {user.fullName} {isMe && <span className="text-gray-400 font-normal">(You)</span>}
                        </p>
                        <p className="text-[10px] text-gray-500 capitalize font-medium">
                          {role === 'owner' ? 'Owner' : role === 'admin' ? 'Admin' : 'Member'}
                        </p>
                      </div>
                    </div>

                    {canInteract && (
                      <div className="relative">
                        <button
                          onClick={() => setActiveMenuId(activeMenuId === userId ? null : userId)}
                          className="p-1.5 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <MoreVertical size={16} />
                        </button>
                        {activeMenuId === userId && (
                          <div className="absolute right-0 top-8 w-48 bg-white border border-gray-100 shadow-xl rounded-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                            
                            {/* 🔥 TRANSFER OWNERSHIP */}
                            {isOwner && !isMe && (
                                <button onClick={() => handleTransferOwnership(userId, user.fullName)} className="w-full text-left px-4 py-2.5 text-xs hover:bg-orange-50 text-orange-600 flex items-center gap-2 font-medium">
                                    <ArrowRightLeft size={14}/> Transfer Ownership
                                </button>
                            )}

                            {isOwner && role !== 'admin' && (
                              <button onClick={() => handleUpdateRole(userId, 'admin')} className="w-full text-left px-4 py-2.5 text-xs hover:bg-gray-50 text-gray-700 flex items-center gap-2">
                                <Shield size={14} className="text-blue-500" /> Make Admin
                              </button>
                            )}
                            {isOwner && role === 'admin' && (
                              <button onClick={() => handleUpdateRole(userId, 'member')} className="w-full text-left px-4 py-2.5 text-xs hover:bg-gray-50 text-gray-700 flex items-center gap-2">
                                <User size={14} className="text-gray-500" /> Dismiss Admin
                              </button>
                            )}
                            <button onClick={() => handleRemoveMember(userId, user.fullName)} className="w-full text-left px-4 py-2.5 text-xs hover:bg-red-50 text-red-600 flex items-center gap-2 border-t border-gray-100">
                              <Trash2 size={14} /> Remove from group
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Media Section */}
        <div className="border-b">
          <button onClick={() => setIsMediaOpen(!isMediaOpen)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
            <span className="font-semibold text-sm flex items-center gap-2 text-gray-700">
              <ImageIcon size={16} className="text-green-500" /> Shared Media
            </span>
            {isMediaOpen ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
          </button>

          {isMediaOpen && (
            <div className="p-4 pt-0">
              {sharedMedia.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {sharedMedia.map((media, idx) => (
                    <div key={idx} className="aspect-square rounded-lg overflow-hidden cursor-pointer border hover:opacity-90 transition-opacity bg-gray-100">
                      <img src={media.url} className="w-full h-full object-cover" onClick={() => window.open(media.url, '_blank')} alt="Shared" />
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-gray-400 text-center py-6 bg-gray-50 rounded-lg border border-dashed">No media shared yet</p>}
            </div>
          )}
        </div>

        {/* Danger Zone */}
        <div className="p-4 mt-2 mb-10">
            {isOwner ? (
                <button
                    onClick={handleDeleteGroup}
                    className="w-full flex items-center justify-center gap-2 p-3 bg-red-50 text-red-600 font-semibold rounded-xl hover:bg-red-100 transition-colors shadow-sm border border-red-200"
                >
                    <Trash2 size={18} /> Delete Group
                </button>
            ) : (
                <button
                    onClick={handleLeaveGroup}
                    className="w-full flex items-center justify-center gap-2 p-3 bg-red-50 text-red-600 font-semibold rounded-xl hover:bg-red-100 transition-colors shadow-sm"
                >
                    <LogOut size={18} /> Leave Group
                </button>
            )}
            
            {isOwner && (
                <p className="text-center text-xs text-gray-400 mt-2">
                    Chủ nhóm chỉ có thể giải tán nhóm hoặc chuyển quyền sở hữu.
                </p>
            )}
        </div>
      </div>

      {showAddModal && (
        <div onClick={(e) => e.stopPropagation()}>
          <AddMemberModal onClose={() => setShowAddModal(false)} />
        </div>
      )}
    </div>
  );
}