import { LoaderIcon } from "lucide-react";
import { useEffect, useMemo, useRef, forwardRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import { useSocket } from "../../context/SocketContext";
import { useGroup } from "../../context/GroupContext";
import MessageBubble from "./MessageBubble";

/* ================= UTIL ================= */
function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const buildAvatar = (profilePic, fullName) =>
  profilePic ||
  `https://ui-avatars.com/api/?name=${encodeURIComponent(
    fullName || "Member"
  )}&background=random`;

/* ================= UI COMPONENTS ================= */

// 1. Bong bóng 3 chấm
function TypingBubble() {
  return (
    <div className="bg-white border border-gray-100 rounded-[20px] rounded-tl-sm px-4 py-3 shadow-sm h-[40px] flex items-center w-fit">
      <div className="flex items-center gap-1">
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
        <span
          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </div>
  );
}

// 2. Avatar Stack (Sử dụng CSS Flexbox chuẩn để tránh lỗi hiển thị)
function AvatarStack({ users }) {
  return (
    // -space-x-3: Tạo hiệu ứng xếp chồng (âm margin)
    // overflow-visible: Đảm bảo bóng đổ không bị cắt
    <div className="flex items-center -space-x-3 mr-2 mb-1 overflow-visible p-1">
      {users.map((u, index) => (
        <img
          key={u.id}
          src={u.avatar}
          alt={u.fullName}
          title={u.fullName}
          className="w-8 h-8 rounded-full border-2 border-white object-cover shadow-sm relative transition-transform hover:-translate-y-1 hover:z-10"
          style={{ zIndex: index }} // Đảm bảo thứ tự xếp chồng
        />
      ))}
    </div>
  );
}

// 3. Indicator tổng hợp
function TypingIndicator({ isGroup, typingUsersInfo, partnerAvatar }) {
  // === CASE 1: Chat 1-1 ===
  if (!isGroup) {
    return (
      <div className="flex items-end mb-2 gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <img
          src={partnerAvatar}
          alt="Avatar"
          className="w-8 h-8 rounded-full border border-gray-100 object-cover mb-1"
        />
        <TypingBubble />
      </div>
    );
  }

  // === CASE 2: Safety Check ===
  if (!typingUsersInfo || typingUsersInfo.length === 0) return null;

  // === CASE 3: Group - 1 người gõ ===
  if (typingUsersInfo.length === 1) {
    const user = typingUsersInfo[0];
    return (
      <div className="flex items-end mb-2 gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <img
          src={user.avatar}
          alt={user.fullName}
          className="w-8 h-8 rounded-full border border-gray-100 object-cover mb-1 shadow-sm"
        />
        <div className="flex flex-col items-start">
          <span className="text-[10px] text-gray-500 ml-1 mb-1 font-medium line-clamp-1 max-w-[150px]">
            {user.fullName} is typing...
          </span>
          <TypingBubble />
        </div>
      </div>
    );
  }

  // === CASE 4: Group - Nhiều người gõ (Stack) ===
  return (
    <div className="flex items-end mb-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <AvatarStack users={typingUsersInfo} />
      <div className="flex flex-col items-start">
        <span className="text-[10px] text-gray-500 ml-1 mb-1 font-medium">
          {typingUsersInfo.length} people are typing...
        </span>
        <TypingBubble />
      </div>
    </div>
  );
}

/* ================= MAIN COMPONENT ================= */
const MessageList = forwardRef(function MessageList(
  { chat, messages, isGroup, isLoading },
  ref
) {
  const messagesEndRef = useRef(null);
  
  const { isBlockedByPartner, messageIdToScroll, setMessageIdToScroll } = useChat();
  const { authUser } = useAuth();
  const { typingUsers } = useSocket();
  const { groupTypingUsers, selectedGroup } = useGroup();

  // Logic 1-1
  const chatId = !isGroup ? chat?.id || chat?._id : null;
  const isBlockedByMe = !isGroup && authUser?.blockedUsers?.includes(chatId);
  const isPartnerTyping =
    !isGroup &&
    typingUsers &&
    typingUsers[chatId] &&
    !isBlockedByMe &&
    !isBlockedByPartner;

  /* ===== LOGIC TÌM USER TRONG GROUP (CÓ LOG DEBUG) ===== */
  const groupTypingUsersInfo = useMemo(() => {
    if (!isGroup || !selectedGroup || !groupTypingUsers) return [];

    // Lọc ID (bỏ qua bản thân)
    const typingIds = Object.keys(groupTypingUsers).filter(
      (id) => id && String(id) !== String(authUser?._id)
    );
    
    // --- DEBUG LOG: Bật F12 lên xem nếu vẫn lỗi ---
    // console.log("Danh sách ID đang gõ:", typingIds); 

    if (typingIds.length === 0) return [];

    const result = typingIds
      .map((id) => {
        // Tìm member bất chấp cấu trúc dữ liệu (String ID hay Object User)
        const member = selectedGroup.members?.find((m) => {
           const mId = m.user?._id || m.user || m.id || m._id; 
           return String(mId) === String(id);
        });

        let fullName = "Member";
        let profilePic = null;

        if (member) {
            const userObj = typeof member.user === 'object' ? member.user : member;
            fullName = userObj?.fullName || userObj?.username || "Member";
            profilePic = userObj?.profilePic || null;
        }

        return {
          id,
          fullName,
          avatar: buildAvatar(profilePic, fullName),
        };
      })
      .slice(0, 4); // Lấy tối đa 4 người cho đẹp đội hình

    return result;
  }, [groupTypingUsers, isGroup, selectedGroup, authUser?._id]);

  const partnerAvatar = buildAvatar(chat?.profilePic, chat?.fullName);

  /* ===== SCROLL & HIGHLIGHT ===== */
  useEffect(() => {
    if (messageIdToScroll) {
      const element = document.getElementById(`message-${messageIdToScroll}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.classList.add("bg-yellow-100", "transition-colors", "duration-[2000ms]");
        setTimeout(() => {
          element.classList.remove("bg-yellow-100");
          setMessageIdToScroll(null);
        }, 2000);
      }
    }
  }, [messageIdToScroll, messages, setMessageIdToScroll]);

  // Auto scroll
  useEffect(() => {
    if (!messageIdToScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isPartnerTyping, groupTypingUsersInfo.length, messageIdToScroll]);

  const groupedMessages = useMemo(() => {
    const groups = {};
    if (!messages) return groups;
    messages.forEach((msg) => {
      const dateKey = new Date(msg.createdAt).toDateString();
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(msg);
    });
    return groups;
  }, [messages]);

  const getSenderInfo = (msg) => {
    const userObj = msg.sender || msg.senderId;
    return {
      senderId: userObj?._id || userObj,
      fullName: userObj?.fullName || "Người dùng",
      profilePic: userObj?.profilePic,
    };
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoaderIcon className="w-8 h-8 animate-spin text-pink-300" />
      </div>
    );
  }

  // Empty State
  if (!messages || messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-300 text-sm relative">
        <p>Chưa có tin nhắn nào.</p>
        <div className="absolute bottom-4 left-4 w-full">
           {(isPartnerTyping || (isGroup && groupTypingUsersInfo.length > 0)) && (
              <TypingIndicator 
                isGroup={isGroup}
                typingUsersInfo={groupTypingUsersInfo}
                partnerAvatar={partnerAvatar}
              />
           )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="flex-1 overflow-y-auto p-4 space-y-6 bg-[#FAFAFA] custom-scrollbar"
    >
      {Object.entries(groupedMessages).map(([dateKey, msgs]) => (
        <div key={dateKey}>
          <div className="flex justify-center mb-6 sticky top-0 z-10">
            <span className="text-[10px] font-bold text-gray-500 bg-gray-200/80 px-3 py-1 rounded-full">
              {formatDate(msgs[0].createdAt)}
            </span>
          </div>

          <div className="space-y-1">
            {msgs.map((msg, index) => {
              const msgId = msg._id || msg.id;
              const { senderId, fullName, profilePic } = getSenderInfo(msg);
              const isMe = String(senderId) === String(authUser?._id);

              const avatar = isMe
                ? buildAvatar(authUser?.profilePic, authUser?.fullName)
                : isGroup
                ? buildAvatar(profilePic, fullName)
                : partnerAvatar;

              const nextMsg = msgs[index + 1];
              const nextSender = nextMsg
                ? getSenderInfo(nextMsg).senderId
                : null;
              const isLastInGroup =
                !nextMsg || String(nextSender) !== String(senderId);

              return (
                <div 
                  key={msgId} 
                  id={`message-${msgId}`} 
                  className="transition-all duration-500 rounded-lg p-1"
                >
                  <MessageBubble
                    message={{ ...msg, displayTime: formatTime(msg.createdAt) }}
                    isMe={isMe}
                    avatar={avatar}
                    isLastInGroup={isLastInGroup}
                    showSenderName={isGroup && !isMe && isLastInGroup}
                    senderName={fullName}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* ===== TYPING INDICATOR SECTION ===== */}
      <div className="sticky bottom-0 pointer-events-none pl-2 pb-2 bg-gradient-to-t from-[#FAFAFA] via-[#FAFAFA]/90 to-transparent pt-4">
        {(isPartnerTyping || (isGroup && groupTypingUsersInfo.length > 0)) && (
          <TypingIndicator
            isGroup={isGroup}
            typingUsersInfo={groupTypingUsersInfo}
            partnerAvatar={partnerAvatar}
          />
        )}
      </div>

      <div ref={messagesEndRef} />
    </div>
  );
});

export default MessageList;