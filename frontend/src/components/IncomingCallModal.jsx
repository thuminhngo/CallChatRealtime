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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[40px] p-8 flex flex-col items-center shadow-2xl border-4 border-pink-50 w-full max-w-sm relative overflow-hidden">
        
        {/* Nền trang trí */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-500 to-violet-500"></div>

        {/* Avatar */}
        <div className="relative mb-6 mt-2">
            <div className="absolute inset-0 bg-pink-500 rounded-full animate-ping opacity-20 duration-1000"></div>
            <div className="absolute inset-0 bg-pink-400 rounded-full animate-pulse opacity-30 delay-75"></div>
            <img
                src={getSafeAvatar()}
                // Fallback lần cuối nếu link ảnh upload bị lỗi 404 thì vẫn quay về API
                onError={(e) => {
                    e.target.onerror = null; // Tránh loop vô hạn
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(incomingCall.callerInfo.name)}&background=random&color=fff&size=200`;
                }}
                className="w-28 h-28 rounded-full border-4 border-white shadow-xl object-cover relative z-10"
                alt="Caller"
            />
        </div>

        <h3 className="text-2xl font-bold text-gray-800 mb-1 text-center truncate w-full px-2">
            {incomingCall.callerInfo.name}
        </h3>
        
        <p className="text-pink-500 font-medium mb-10 flex items-center gap-2 animate-pulse">
           {incomingCall.isVideo ? "📞 Đang gọi video..." : "📞 Đang gọi thoại..."}
        </p>

        <div className="flex gap-10 w-full justify-center items-end">
          <button
            onClick={rejectCall}
            className="flex flex-col items-center gap-2 group transition-transform active:scale-95"
          >
            <div className="bg-red-500 p-5 rounded-full text-white shadow-red-200 shadow-lg group-hover:bg-red-600 group-hover:shadow-red-300 transition-all duration-300">
                <PhoneOff size={32} fill="currentColor"/>
            </div>
            <span className="text-xs text-gray-500 font-medium">Từ chối</span>
          </button>

          <button
            onClick={handleAccept}
            className="flex flex-col items-center gap-2 group transition-transform active:scale-95"
          >
            <div className="bg-green-500 p-5 rounded-full text-white shadow-green-200 shadow-lg group-hover:bg-green-600 group-hover:shadow-green-300 transition-all duration-300 animate-bounce">
                <Phone size={32} fill="currentColor"/>
            </div>
            <span className="text-xs text-gray-500 font-medium">Nghe máy</span>
          </button>
        </div>
      </div>
    </div>
  );
}