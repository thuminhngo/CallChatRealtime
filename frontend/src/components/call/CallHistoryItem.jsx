import { Phone, Video, MessageCircle, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock } from "lucide-react";

// Format duration in seconds to mm:ss or hh:mm:ss
function formatDuration(seconds) {
  if (!seconds || seconds === 0) return "";
  
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Format date to relative time
function formatRelativeTime(date) {
  const now = new Date();
  const callDate = new Date(date);
  const diffMs = now - callDate;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return callDate.toLocaleDateString();
}

export default function CallHistoryItem({ call, onCall, onVideo, onMessage }) {
  // Determine icon and color based on call status and direction
  const getCallInfo = () => {
    // Missed/rejected/busy/unavailable calls
    if (call.status === "missed" || call.status === "rejected" || call.status === "busy" || call.status === "unavailable") {
      return { 
        icon: PhoneMissed, 
        color: "text-red-500", 
        bg: "bg-red-50", 
        label: call.status === "rejected" ? "Declined" : 
               call.status === "busy" ? "Busy" : 
               call.status === "unavailable" ? "No Answer" : "Missed" 
      };
    }
    
    // Answered calls - check direction
    if (call.direction === "incoming") {
      return { icon: PhoneIncoming, color: "text-blue-500", bg: "bg-blue-50", label: "Incoming" };
    }
    
    if (call.direction === "outgoing") {
      return { icon: PhoneOutgoing, color: "text-green-500", bg: "bg-green-50", label: "Outgoing" };
    }
    
    return { icon: Phone, color: "text-gray-500", bg: "bg-gray-50", label: "Unknown" };
  };

  const { icon: TypeIcon, color, label } = getCallInfo();
  const contact = call.contact || {};
  const avatarUrl = contact.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.fullName || 'U')}&background=random`;
  const isMissed = call.status === "missed" || call.status === "rejected" || call.status === "busy" || call.status === "unavailable";

  return (
    <div className="group flex items-center justify-between p-3 md:p-4 bg-white border border-gray-50 rounded-[20px] hover:shadow-md hover:border-pink-100 transition-all cursor-default">
      {/* Left side info */}
      <div className="flex items-center gap-3 md:gap-4">
        <div className="relative">
          <img 
            src={avatarUrl} 
            alt={contact.fullName} 
            className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border-2 border-gray-50 group-hover:border-pink-200 transition-colors" 
          />
          {/* Call type icon */}
          <div className={`absolute -bottom-1 -right-1 p-1 rounded-full bg-white shadow-sm border border-gray-100 ${color}`}>
            {call.callType === "video" ? <Video size={10} /> : <TypeIcon size={10} />}
          </div>
        </div>
        
        <div>
          <h3 className="font-bold text-gray-800 text-sm md:text-base">{contact.fullName}</h3>
          <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
            <span className={isMissed ? 'text-red-500 font-medium' : ''}>{label}</span>
            {call.callType === "video" && (
              <>
                <span>•</span>
                <span className="text-blue-500">Video</span>
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
            <span>{formatRelativeTime(call.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all translate-x-2 md:group-hover:translate-x-0">
        <button 
          onClick={() => onMessage(call)}
          className="p-2 md:p-2.5 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-xl transition-colors" 
          title="Message"
        >
          <MessageCircle size={18} />
        </button>
        <button 
          onClick={() => onCall(call)}
          className="p-2 md:p-2.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-colors"
          title="Voice Call"
        >
          <Phone size={18} />
        </button>
        <button 
          onClick={() => onVideo(call)}
          className="p-2 md:p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
          title="Video Call"
        >
          <Video size={18} />
        </button>
      </div>
    </div>
  );
}