import {
  ChevronDown,
  ChevronRight,
  Cloud,
  Image as ImageIcon,
  X,
  Ban,
  Trash2,
  Unlock,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";

/* ================= InfoItem ================= */
const InfoItem = ({ icon: Icon, label, onClick, danger = false, disabled = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex items-center w-full p-3 rounded-xl transition-colors gap-3
      ${disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"}
    `}
  >
    <div
      className={`p-2 rounded-lg ${
        danger ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-600"
      }`}
    >
      <Icon size={16} />
    </div>
    <span
      className={`text-sm font-medium ${
        danger ? "text-red-600" : "text-gray-700"
      }`}
    >
      {label}
    </span>
  </button>
);

/* ================= Sidebar ================= */
export default function InfoSidebar({ chat, onClose }) {
  const [isMediaOpen, setIsMediaOpen] = useState(false);
  const [sharedMedia, setSharedMedia] = useState([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);

  const {
    getSharedMedia,
    blockUser,
    unblockUser,
    deleteConversation,
    isBlockedByPartner,
  } = useChat();

  const { authUser } = useAuth();

  const isSelfChat = chat.isSelfChat || chat._id === authUser?._id;

  // 🔥 BLOCK LOGIC CHUẨN
  const isBlockedByMe = authUser?.blockedUsers?.includes(chat._id);
  const isBlocked = isBlockedByMe || isBlockedByPartner;

  /* ========== Fetch media ========== */
  useEffect(() => {
    if (!isMediaOpen || !chat?._id) return;

    const fetchMedia = async () => {
      setIsLoadingMedia(true);
      const media = await getSharedMedia(chat._id);
      setSharedMedia(media || []);
      setIsLoadingMedia(false);
    };

    fetchMedia();
  }, [isMediaOpen, chat?._id, getSharedMedia]);

  /* ========== Actions ========== */
  const handleBlockAction = () => {
    if (isBlockedByMe) {
      unblockUser(chat._id);
    } else {
      if (window.confirm(`Block ${chat.fullName}?`)) {
        blockUser(chat._id);
      }
    }
  };

  const handleDeleteAction = () => {
    if (
      window.confirm(
        `Delete conversation with ${chat.fullName}? This cannot be undone.`
      )
    ) {
      deleteConversation(chat._id);
      onClose();
    }
  };

  const avatarUrl =
    chat?.profilePic ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      chat?.fullName || "User"
    )}&background=random`;

  /* ================= Render ================= */
  return (
    <div className="flex flex-col w-full h-full bg-white border-l border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="font-bold text-sm text-gray-800">Chat Details</h3>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full text-gray-500"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Avatar */}
        <div className="flex flex-col items-center py-6 border-b">
          {isSelfChat ? (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center">
              <Cloud size={50} className="text-white" />
            </div>
          ) : (
            <img
              src={avatarUrl}
              alt={chat.fullName}
              className="w-24 h-24 rounded-full mb-3 border"
            />
          )}

          <h2 className="text-xl font-bold">
            {isSelfChat ? "My Cloud" : chat.fullName}
          </h2>

          {!isSelfChat && (
            <p className="text-sm text-gray-400">
              {chat.email || "No email provided"}
            </p>
          )}
        </div>

        {/* Shared Media */}
        <div className="py-2 border-b">
          <button
            onClick={() => setIsMediaOpen(!isMediaOpen)}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <ImageIcon size={18} />
              </div>
              <span className="font-semibold text-sm">Shared Media</span>
            </div>
            {isMediaOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>

          {isMediaOpen && (
            <div className="p-3">
              {isLoadingMedia ? (
                <p className="text-xs text-gray-400 text-center">Loading...</p>
              ) : sharedMedia.length ? (
                <div className="grid grid-cols-3 gap-2">
                  {sharedMedia.map((msg) => (
                    <div
                      key={msg._id}
                      onClick={() => window.open(msg.image, "_blank")}
                      className="aspect-square cursor-pointer overflow-hidden rounded-lg"
                    >
                      <img
                        src={msg.image}
                        className="w-full h-full object-cover hover:scale-110 transition"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center">
                  No media shared
                </p>
              )}
            </div>
          )}
        </div>

        {/* Danger Zone */}
        {!isSelfChat && (
          <div className="py-4 space-y-1">
            <h4 className="px-3 text-xs font-semibold text-gray-400 uppercase">
              Privacy & Support
            </h4>

            <InfoItem
              icon={isBlockedByMe ? Unlock : Ban}
              label={
                isBlockedByMe
                  ? "Unblock User"
                  : isBlockedByPartner
                  ? "You are blocked"
                  : "Block User"
              }
              onClick={handleBlockAction}
              danger={!isBlockedByMe}
              disabled={isBlockedByPartner}
            />

            <InfoItem
              icon={Trash2}
              label="Delete Conversation"
              onClick={handleDeleteAction}
              danger
            />
          </div>
        )}
      </div>
    </div>
  );
}
