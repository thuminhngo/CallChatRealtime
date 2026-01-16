import { useEffect, useRef } from "react";
import { Phone, PhoneOff } from "lucide-react";
import { useCall } from "../context/CallContext";
import { OpenCallWindow } from "../utils/window";
import { useSocket } from "../context/SocketContext";

export default function IncomingCallModal() {
  const { incomingCall, rejectCall, setIncomingCall } = useCall();
  const { socket } = useSocket();
  const ringtoneRef = useRef(new Audio("/ringtone.mp3"));

  // 1. Xử lý nhạc chuông
  useEffect(() => {
    if (!incomingCall) return;
    
    ringtoneRef.current.loop = true;
    ringtoneRef.current.volume = 0.8;
    
    // Xử lý auto-play policy
    const playPromise = ringtoneRef.current.play();
    if (playPromise !== undefined) {
        playPromise.catch((error) => {
            console.log("Autoplay prevented:", error);
        });
    }

    return () => {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    };
  }, [incomingCall]);

  // 2. Lắng nghe sự kiện kết thúc
  useEffect(() => {
    if (!socket || !incomingCall) return;

    const handleCallEnded = () => {
      setIncomingCall(null);
    };

    socket.on("call:ended", handleCallEnded);
    socket.on("callCancelled", handleCallEnded);

    return () => {
      socket.off("call:ended", handleCallEnded);
      socket.off("callCancelled", handleCallEnded);
    };
  }, [socket, incomingCall, setIncomingCall]);

  const handleAccept = () => {
    if (!incomingCall) return;
    ringtoneRef.current.pause();
    ringtoneRef.current.currentTime = 0;

    OpenCallWindow({
      name: incomingCall.callerInfo.name,
      avatar: incomingCall.callerInfo.avatar,
      id: incomingCall.callerInfo.id,
      video: incomingCall.isVideo ? "true" : "false",
      caller: "false", 
      channelName: incomingCall.channelName 
    });

    setIncomingCall(null); 
  };

  // --- HÀM XỬ LÝ AVATAR TỪ TÊN (CẬP NHẬT) ---
  const getSafeAvatar = () => {
      const avatar = incomingCall?.callerInfo?.avatar;
      const name = incomingCall?.callerInfo?.name || "Unknown";

      // 1. Nếu có avatar upload -> dùng avatar đó
      if (avatar && avatar !== "undefined" && avatar !== "null") {
          return avatar;
      }
      
      // 2. Nếu không -> Gọi API tạo ảnh từ fullName (ui-avatars.com)
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=200`; 
  };

  if (!incomingCall) return null;

  return (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
    <div className="relative w-full max-w-sm bg-white rounded-3xl px-6 pt-8 pb-10 shadow-2xl">

      {/* Thanh nhấn trên */}
      <div className="absolute top-0 left-0 w-full h-1 rounded-t-3xl bg-gradient-to-r from-pink-500 to-violet-500" />

      {/* Avatar */}
      <div className="relative flex justify-center mb-6">
        <div className="absolute inset-0 rounded-full bg-pink-400/30 animate-pulse"></div>
        <img
          src={getSafeAvatar()}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
              incomingCall.callerInfo.name
            )}&background=random&color=fff&size=200`;
          }}
          alt="Caller"
          className="relative z-10 w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
        />
      </div>

      {/* Tên */}
      <h3 className="text-lg font-semibold text-gray-800 text-center truncate">
        {incomingCall.callerInfo.name}
      </h3>

      {/* Trạng thái */}
      <p className="mt-1 text-sm text-pink-500 text-center">
        {incomingCall.isVideo ? "Cuộc gọi video đến" : "Cuộc gọi thoại đến"}
      </p>

      {/* Nút hành động */}
      <div className="mt-8 flex justify-center gap-12">
        {/* Từ chối */}
        <button
          onClick={rejectCall}
          className="flex flex-col items-center gap-2 active:scale-95 transition"
        >
          <div className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center text-white shadow-md hover:bg-red-600 transition">
            <PhoneOff size={26} />
          </div>
          <span className="text-xs text-gray-500">Từ chối</span>
        </button>

        {/* Nghe */}
        <button
          onClick={handleAccept}
          className="flex flex-col items-center gap-2 active:scale-95 transition"
        >
          <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center text-white shadow-md hover:bg-green-600 transition animate-pulse">
            <Phone size={26} />
          </div>
          <span className="text-xs text-gray-500">Nghe máy</span>
        </button>
      </div>
    </div>
  </div>
);}