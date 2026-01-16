import { 
  XCircle, Phone, PhoneOff, Video, MessageCircle, 
  PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock, Ban 
} from "lucide-react";

// Format thời lượng cuộc gọi (Giữ nguyên)
function formatDuration(seconds) {
  if (!seconds || seconds === 0) return "";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Format thời gian tương đối (Giữ nguyên)
function formatRelativeTime(date) {
  const now = new Date();
  const callDate = new Date(date);
  const diffMs = now - callDate;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffMins < 1) return "Vừa xong";
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays === 1) return "Hôm qua";
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return callDate.toLocaleDateString('vi-VN');
}

export default function CallHistoryItem({ call, onCall, onVideo, onMessage }) {
  // Logic hiển thị dựa trên status đã được Backend cá nhân hóa (callerStatus/receiverStatus)
  const getCallInfo = () => {
    const { direction, status } = call;

    // Icon hướng mặc định
    const DirectionIcon = direction === "outgoing" ? PhoneOutgoing : PhoneIncoming;

    switch (status) {
      case "answered":
        return { 
          icon: DirectionIcon, 
          color: direction === "outgoing" ? "text-green-500" : "text-blue-500", 
          label: direction === "outgoing" ? "Cuộc gọi đi" : "Cuộc gọi đến" 
        };
      case "missed":
        return { icon: PhoneMissed, color: "text-red-500", label: "Cuộc gọi nhỡ" };
      case "rejected":
        return { icon: PhoneOff, color: "text-orange-500", label: "Đã từ chối" };
      case "unavailable":
        return { icon: PhoneMissed, color: "text-gray-500", label: "Không trả lời" };
      case "busy":
        return { icon: Ban, color: "text-red-500", label: "Máy bận" };
      case "cancelled":
        return { icon: XCircle, color: "text-gray-400", label: "Đã hủy" };
      default:
        return { icon: DirectionIcon, color: "text-gray-400", label: status };
    }
  };

  const { icon: StatusIcon, color, label } = getCallInfo();
  const contact = call.contact || {};
  
  // Xử lý Avatar an toàn
  const avatarUrl = contact.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.fullName || 'U')}&background=random`;
  
  // Highlight đỏ cho các cuộc gọi cần chú ý (Nhỡ hoặc Bận)
  const isMissedAlert = ["missed", "busy"].includes(call.status);

  return (
    <div className="group flex items-center justify-between p-3 md:p-4 bg-white border border-gray-50 rounded-[20px] hover:shadow-md hover:border-pink-100 transition-all cursor-pointer">
      <div className="flex items-center gap-3 md:gap-4">
        <div className="relative">
          <img 
            src={avatarUrl} 
            alt={contact.fullName} 
            className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border-2 border-gray-50 group-hover:border-pink-200 transition-colors" 
          />
          {/* Icon trạng thái nhỏ ở góc avatar */}
          <div className={`absolute -bottom-1 -right-1 p-1 rounded-full bg-white shadow-sm border border-gray-100 ${color}`}>
            {call.callType === "video" ? <Video size={10} /> : <StatusIcon size={10} />}
          </div>
        </div>
        
        <div className="flex flex-col">
          <h3 className="font-bold text-gray-800 text-sm md:text-base line-clamp-1">{contact.fullName}</h3>
          <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
            <span className={isMissedAlert ? 'text-red-500 font-bold' : ''}>{label}</span>
            
            {call.callType === "video" && (
              <>
                <span>•</span>
                <span className="text-blue-500 font-medium">Video</span>
              </>
            )}
            
            {call.duration > 0 && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock size={10} />
                  {formatDuration(call.duration)}
                </span>
              </>
            )}
            
            <span>•</span>
            <span className="whitespace-nowrap">{formatRelativeTime(call.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Nhóm nút chức năng - Ẩn trên mobile và hiện khi hover trên desktop */}
      <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all translate-x-0 md:translate-x-2 md:group-hover:translate-x-0">
        <button 
          onClick={(e) => { e.stopPropagation(); onMessage?.(call); }} 
          className="p-2 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-xl transition-colors"
          title="Nhắn tin"
        >
          <MessageCircle size={18} />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onCall?.(call); }} 
          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-colors"
          title="Gọi thoại"
        >
          <Phone size={18} />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onVideo?.(call); }} 
          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
          title="Gọi video"
        >
          <Video size={18} />
        </button>
      </div>
    </div>
  );
}