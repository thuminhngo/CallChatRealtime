import { useEffect, useRef } from "react";
import { Phone, PhoneOff, Video, Mic } from "lucide-react";
import { useCall } from "../context/CallContext";
import { OpenCallWindow } from "../utils/window";
import { useSocket } from "../context/SocketContext";

export default function IncomingCallModal() {
  const { incomingCall, rejectCall, setIncomingCall } = useCall();
  const { socket } = useSocket();
  const ringtoneRef = useRef(new Audio("/amthanhcuocgoiden.mp3"));

  // 1. Xử lý nhạc chuông
  useEffect(() => {
    if (!incomingCall) return;
    
    const playRingtone = async () => {
        try {
            ringtoneRef.current.loop = true;
            ringtoneRef.current.currentTime = 0;
            await ringtoneRef.current.play();
        } catch (error) {
            console.warn("Autoplay blocked:", error);
        }
    };
    
    playRingtone();

    return () => {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    };
  }, [incomingCall]);

  // 2. Lắng nghe sự kiện Call Ended từ Socket
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
    
    // Tắt nhạc ngay lập tức
    ringtoneRef.current.pause();
    
    OpenCallWindow({
      name: incomingCall.callerInfo.name,
      avatar: incomingCall.callerInfo.avatar,
      id: incomingCall.callerInfo.id,
      video: incomingCall.isVideo ? "true" : "false",
      caller: "false",
      channelName: incomingCall.channelName,
    });
    setIncomingCall(null);
  };

  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      
      {/* Card Giao diện */}
      <div className="relative w-full max-w-sm bg-gray-900 border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col items-center py-12 px-6">
        
        {/* Glow Effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-gradient-to-b from-pink-500/20 to-transparent blur-3xl pointer-events-none" />

        {/* Avatar Section */}
        <div className="relative mb-8 mt-4">
            <div className="absolute inset-0 bg-pink-500 rounded-full animate-ping opacity-20 duration-1000"></div>
            <div className="absolute inset-[-12px] bg-pink-500 rounded-full animate-pulse opacity-10"></div>
            
            <div className="relative w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-pink-500 to-violet-600 shadow-[0_0_30px_rgba(236,72,153,0.3)]">
                <img
                    src={
                    incomingCall.callerInfo.avatar ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        incomingCall.callerInfo.name || "User"
                    )}&background=random&size=256`
                    }
                    className="w-full h-full rounded-full object-cover border-4 border-gray-900 bg-gray-800"
                    alt="Caller Avatar"
                />
            </div>
            
            {/* Call Type Icon */}
            <div className="absolute bottom-1 right-1 bg-gray-800 p-2 rounded-full border border-gray-600 shadow-md text-white">
                {incomingCall.isVideo ? <Video size={16} /> : <Mic size={16} />}
            </div>
        </div>

        {/* Text Info */}
        <div className="text-center space-y-2 mb-10 z-10">
            <h3 className="text-3xl font-bold text-white tracking-wide drop-shadow-md">
            {incomingCall.callerInfo.name}
            </h3>
            <p className="text-pink-300/90 font-medium text-lg flex items-center justify-center gap-2 animate-pulse">
               {incomingCall.isVideo ? "Cuộc gọi video..." : "Cuộc gọi thoại..."}
            </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between w-full px-6 z-10">
          <div className="flex flex-col items-center gap-2">
             <button
                onClick={rejectCall}
                className="group flex items-center justify-center w-16 h-16 bg-red-500/10 hover:bg-red-600 text-red-500 hover:text-white rounded-full border border-red-500/30 transition-all active:scale-95"
            >
                <PhoneOff size={28} />
             </button>
             <span className="text-xs text-gray-400 font-medium">Từ chối</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button
                onClick={handleAccept}
                className="group flex items-center justify-center w-20 h-20 bg-green-500 hover:bg-green-400 text-white rounded-full shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all animate-bounce active:scale-95"
            >
                <Phone size={36} fill="currentColor" />
            </button>
            <span className="text-xs text-gray-400 font-medium">Trả lời</span>
          </div>
        </div>
      </div>
    </div>
  );
}