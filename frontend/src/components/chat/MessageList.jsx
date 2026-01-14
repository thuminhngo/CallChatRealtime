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
    fullName || "U"
  )}&background=random`;

/* ================= UI COMPONENTS ================= */

// 1. Bong bóng 3 chấm (Chỉ phần animation)
function TypingBubble() {
  return (
    <div className="bg-white border border-gray-100 rounded-[20px] rounded-tl-sm px-4 py-3 shadow-sm h-[40px] flex items-center">
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

// 2. Avatar chồng nhau (cho nhóm nhiều người)
function AvatarStack({ users }) {
  return (
    <div className="flex items-end -space-x-3 mr-2 mb-1">
      {users.map((u, index) => (
        <img
          key={u.id}
          src={u.avatar}
          alt={u.fullName}
          title={u.fullName}
          className="w-8 h-8 rounded-full border-2 border-white object-cover"
          style={{ zIndex: users.length - index }}
        />
      ))}
    </div>
  );
}

// 3. Indicator tổng hợp (Xử lý logic hiển thị Avatar)
function TypingIndicator({ isGroup, typingUsersInfo, partnerAvatar }) {
  // Case 1: Chat 1-1
  if (!isGroup) {
    return (
      <div className="flex items-end mb-2 gap-2">
        <img
          src={partnerAvatar}
          alt="Avatar"
          className="w-8 h-8 rounded-full border border-gray-100 object-cover mb-1"
        />
        <TypingBubble />
      </div>
    );
  }

  // Case 2: Chat Group - Không có ai gõ (Safety check)
  if (!typingUsersInfo || typingUsersInfo.length === 0) return null;

  // Case 3: Chat Group - 1 người gõ
  if (typingUsersInfo.length === 1) {
    const user = typingUsersInfo[0];
    return (
      <div className="flex items-end mb-2 gap-2">
        <img
          src={user.avatar}
          alt={user.fullName}
          title={user.fullName}
          className="w-8 h-8 rounded-full border border-gray-100 object-cover mb-1"
        />
        <div className="flex flex-col">
          {/* Tùy chọn: Hiển thị tên người gõ nếu muốn */}
          {/* <span className="text-[10px] text-gray-400 ml-1 mb-0.5">{user.fullName}</span> */}
          <TypingBubble />
        </div>
      </div>
    );
  }

  // Case 4: Chat Group - Nhiều người gõ
  return (
    <div className="flex items-end mb-2">
      <AvatarStack users={typingUsersInfo} />
      <TypingBubble />
    </div>
  );
}

/* ================= MAIN ================= */
const MessageList = forwardRef(function MessageList(
  { chat, messages, isGroup, isLoading },
  ref
) {
  const messagesEndRef = useRef(null);
  
  // 🔥 LẤY STATE TỪ CONTEXT (SỬA ĐỔI)
  const { isBlockedByPartner, messageIdToScroll, setMessageIdToScroll } = useChat();
  
  const { authUser } = useAuth();
  const { typingUsers } = useSocket();
  const { groupTypingUsers, selectedGroup } = useGroup();

  /* ===== 1–1 typing logic ===== */
  const chatId = !isGroup ? chat?.id || chat?._id : null;
  const isBlockedByMe = !isGroup && authUser?.blockedUsers?.includes(chatId);

  const isPartnerTyping =
    !isGroup &&
    typingUsers &&
    typingUsers[chatId] &&
    !isBlockedByMe &&
    !isBlockedByPartner;

  /* ===== GROUP typing logic ===== */
  const groupTypingUsersInfo = useMemo(() => {
    // 1. Basic checks
    if (!isGroup || !selectedGroup || !groupTypingUsers) return [];
    
    // 2. Lấy danh sách ID đang gõ (loại bỏ bản thân)
    const typingIds = Object.keys(groupTypingUsers).filter(
      (id) => id && String(id) !== String(authUser?._id)
    );

    if (typingIds.length === 0) return [];

    // 3. Map ID sang thông tin User từ selectedGroup.members
    return typingIds
      .map((id) => {
        const member = selectedGroup.members?.find((m) => {
           const mId = m.user?._id || m.user || m.id;
           return String(mId) === String(id);
        });

        if (!member) return null;

        const userObj = member.user || member; 
        const fullName = userObj.fullName || "Member";
        const profilePic = userObj.profilePic;

        return {
          id,
          fullName,
          avatar: buildAvatar(profilePic, fullName),
        };
      })
      .filter(Boolean)
      .slice(0, 3); // Giới hạn hiển thị tối đa 3 avatar chồng nhau
  }, [groupTypingUsers, isGroup, selectedGroup, authUser?._id]);

  const partnerAvatar = buildAvatar(chat?.profilePic, chat?.fullName);

  // 🔥 LOGIC CUỘN VÀ HIGHLIGHT TIN NHẮN TÌM KIẾM (THÊM MỚI)
  useEffect(() => {
    if (messageIdToScroll) {
      const element = document.getElementById(`message-${messageIdToScroll}`);
      if (element) {
        // Cuộn tới tin nhắn
        element.scrollIntoView({ behavior: "smooth", block: "center" });

        // Thêm class highlight (bg-yellow-100)
        element.classList.add("bg-yellow-100", "transition-colors", "duration-[2000ms]");

        // Xóa highlight sau 2 giây
        setTimeout(() => {
          element.classList.remove("bg-yellow-100");
          setMessageIdToScroll(null); // Reset state trong context để có thể tìm lại
        }, 2000);
      }
    }
  }, [messageIdToScroll, messages, setMessageIdToScroll]);

  // Auto scroll logic (Chỉ chạy khi KHÔNG đang tìm kiếm tin nhắn cũ)
  useEffect(() => {
    if (!messageIdToScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [
    messages,
    isPartnerTyping,
    groupTypingUsersInfo.length,
    messageIdToScroll,
  ]);

  // Group messages by date
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
        Chưa có tin nhắn nào.
        
        {/* Typing Indicator in Empty State */}
        <div className="absolute bottom-4 left-4">
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
                // 🔥 THÊM DIV BAO BỌC VỚI ID ĐỂ TÌM KIẾM
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
      <div className="sticky bottom-0 pointer-events-none pl-2">
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