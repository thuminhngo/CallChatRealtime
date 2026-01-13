// import { useState, useEffect, useRef } from "react";
// import { Phone, PhoneOff } from "lucide-react";
// import { useSocket } from "../context/SocketContext";
// import { OpenCallWindow } from "../utils/window";

// export default function IncomingCallModal() {
//   const { socket } = useSocket();
//   const [incomingCall, setIncomingCall] = useState(null);
//   const ringtoneRef = useRef(new Audio("/ringtone.mp3"));

//   useEffect(() => {
//     if (!socket) return;

//     socket.on("incomingCall", (data) => {
//       setIncomingCall(data);
//       ringtoneRef.current.loop = true;
//       ringtoneRef.current.play().catch(() => {});
//     });

//     socket.on("callCancelled", () => {
//       stopRingtone();
//       setIncomingCall(null);
//     });

//     return () => {
//       socket.off("incomingCall");
//       socket.off("callCancelled");
//       stopRingtone();
//     };
//   }, [socket]);

//   const stopRingtone = () => {
//     if (ringtoneRef.current) {
//       ringtoneRef.current.pause();
//       ringtoneRef.current.currentTime = 0;
//     }
//   };

//   const handleAccept = () => {
//     if (!incomingCall) return;
//     stopRingtone();
//     OpenCallWindow({
//       name: incomingCall.callerInfo.name,
//       avatar: incomingCall.callerInfo.avatar,
//       id: incomingCall.callerInfo.id,
//       video: incomingCall.isVideo ? "true" : "false",
//       caller: "false",
//     });
//     setIncomingCall(null);
//   };

//   const handleDecline = () => {
//     if (socket && incomingCall) {
//       stopRingtone();
//       socket.emit("call:rejected", { receiverId: incomingCall.callerInfo.id });
//     }
//     setIncomingCall(null);
//   };

//   if (!incomingCall) return null;

//   return (
//     <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
//       <div className="bg-white rounded-[32px] p-8 flex flex-col items-center shadow-2xl">
//         <img
//           src={incomingCall.callerInfo.avatar || "/default-avatar.png"}
//           className="w-24 h-24 rounded-full border-4 border-pink-500 mb-4 object-cover"
//           alt="Caller"
//         />
//         <h3 className="text-xl font-bold">{incomingCall.callerInfo.name}</h3>
//         <p className="text-gray-500 mb-6">
//           Cuộc gọi {incomingCall.isVideo ? "video" : "thoại"} đến...
//         </p>
//         <div className="flex gap-8">
//           <button
//             onClick={handleDecline}
//             className="bg-red-500 p-4 rounded-full text-white shadow-lg hover:bg-red-600 transition-colors"
//           >
//             <PhoneOff size={28} />
//           </button>
//           <button
//             onClick={handleAccept}
//             className="bg-green-500 p-4 rounded-full text-white shadow-lg hover:bg-green-600 transition-colors"
//           >
//             <Phone size={28} />
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// import { useEffect, useRef } from "react";
// import { Phone, PhoneOff } from "lucide-react";
// import { useCall } from "../context/CallContext";
// import { OpenCallWindow } from "../utils/window";

// export default function IncomingCallModal() {
//   const { incomingCall, acceptCall, rejectCall } = useCall();
//   const ringtoneRef = useRef(new Audio("/ringtone.mp3"));

//   useEffect(() => {
//     if (!incomingCall) return;

//     // Phát nhạc chuông
//     ringtoneRef.current.loop = true;
//     ringtoneRef.current.play().catch(() => {});

//     // Cleanup khi call bị hủy hoặc modal unmount
//     return () => {
//       ringtoneRef.current.pause();
//       ringtoneRef.current.currentTime = 0;
//     };
//   }, [incomingCall]);

//   if (!incomingCall) return null;

//   return (
//     <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
//       <div className="bg-white rounded-[32px] p-8 flex flex-col items-center shadow-2xl">
//         <img
//           src={incomingCall.callerInfo.avatar || "/default-avatar.png"}
//           className="w-24 h-24 rounded-full border-4 border-pink-500 mb-4 object-cover"
//           alt="Caller"
//         />
//         <h3 className="text-xl font-bold">{incomingCall.callerInfo.name}</h3>
//         <p className="text-gray-500 mb-6">
//           Cuộc gọi {incomingCall.isVideo ? "video" : "thoại"} đến...
//         </p>
//         <div className="flex gap-8">
//           <button
//             onClick={rejectCall}
//             className="bg-red-500 p-4 rounded-full text-white shadow-lg hover:bg-red-600 transition-colors"
//           >
//             <PhoneOff size={28} />
//           </button>
//           <button
//             onClick={acceptCall}
//             className="bg-green-500 p-4 rounded-full text-white shadow-lg hover:bg-green-600 transition-colors"
//           >
//             <Phone size={28} />
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }


// import { useEffect, useRef } from "react";
// import { Phone, PhoneOff } from "lucide-react";
// import { useCall } from "../context/CallContext";
// import { OpenCallWindow } from "../utils/window"; // Import hàm mở cửa sổ

// export default function IncomingCallModal() {
//   const { incomingCall, rejectCall, setIncomingCall } = useCall();
//   const ringtoneRef = useRef(new Audio("/ringtone.mp3"));

//   useEffect(() => {
//     if (!incomingCall) return;
//     ringtoneRef.current.loop = true;
//     ringtoneRef.current.play().catch(() => {});

//     return () => {
//       ringtoneRef.current.pause();
//       ringtoneRef.current.currentTime = 0;
//     };
//   }, [incomingCall]);

//   const handleAccept = () => {
//     if (!incomingCall) return;

//     // 1. Dừng nhạc chuông
//     ringtoneRef.current.pause();

//     // 2. Mở cửa sổ gọi (đóng vai trò Receiver)
//     // caller='false', truyền channelName nhận được
//     OpenCallWindow({
//       name: incomingCall.callerInfo.name,
//       avatar: incomingCall.callerInfo.avatar,
//       id: incomingCall.callerInfo.id,
//       video: incomingCall.isVideo ? "true" : "false",
//       caller: "false", 
//       channelName: incomingCall.channelName // Channel name từ server gửi về
//     });

//     // 3. Xóa state incomingCall để ẩn modal
//     setIncomingCall(null); 
//   };

//   if (!incomingCall) return null;

//   return (
//     <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
//       <div className="bg-white rounded-[32px] p-8 flex flex-col items-center shadow-2xl animate-in fade-in zoom-in duration-300">
//         <img
//           src={incomingCall.callerInfo.avatar || "/default-avatar.png"}
//           className="w-24 h-24 rounded-full border-4 border-pink-500 mb-4 object-cover animate-bounce"
//           alt="Caller"
//         />
//         <h3 className="text-xl font-bold">{incomingCall.callerInfo.name}</h3>
//         <p className="text-gray-500 mb-6">
//           Cuộc gọi {incomingCall.isVideo ? "video" : "thoại"} đến...
//         </p>
//         <div className="flex gap-8">
//           <button
//             onClick={rejectCall}
//             className="bg-red-500 p-4 rounded-full text-white shadow-lg hover:bg-red-600 transition-colors"
//           >
//             <PhoneOff size={28} />
//           </button>
//           <button
//             onClick={handleAccept}
//             className="bg-green-500 p-4 rounded-full text-white shadow-lg hover:bg-green-600 transition-colors animate-pulse"
//           >
//             <Phone size={28} />
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

import { useEffect, useRef } from "react";
import { Phone, PhoneOff } from "lucide-react";
import { useCall } from "../context/CallContext";
import { OpenCallWindow } from "../utils/window";
import { useSocket } from "../context/SocketContext"; // Cần import SocketContext

export default function IncomingCallModal() {
  const { incomingCall, rejectCall, setIncomingCall } = useCall();
  const { socket } = useSocket(); // Lấy socket instance
  const ringtoneRef = useRef(new Audio("/ringtone.mp3"));

  // 1. Xử lý nhạc chuông
  useEffect(() => {
    if (!incomingCall) return;
    ringtoneRef.current.loop = true;
    ringtoneRef.current.play().catch(() => {});

    return () => {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    };
  }, [incomingCall]);

  // 2. Lắng nghe sự kiện Call Ended (Người gọi dập máy khi chưa ai nghe)
  useEffect(() => {
    if (!socket || !incomingCall) return;

    const handleCallEnded = () => {
      // Tắt modal ngay lập tức
      setIncomingCall(null);
    };

    socket.on("call:ended", handleCallEnded);
    
    // Fallback: lắng nghe callCancelled nếu server emit event này cho trường hợp reject
    socket.on("callCancelled", handleCallEnded);

    return () => {
      socket.off("call:ended", handleCallEnded);
      socket.off("callCancelled", handleCallEnded);
    };
  }, [socket, incomingCall, setIncomingCall]);

  const handleAccept = () => {
    if (!incomingCall) return;

    ringtoneRef.current.pause();

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

  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[40px] p-8 flex flex-col items-center shadow-2xl animate-in fade-in zoom-in duration-300 border-4 border-pink-50 w-full max-w-sm">
        
        {/* Avatar với hiệu ứng sóng */}
        <div className="relative mb-6">
            <div className="absolute inset-0 bg-pink-500 rounded-full animate-ping opacity-20"></div>
            <img
            src={incomingCall.callerInfo.avatar || "/default-avatar.png"}
            className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover relative z-10"
            alt="Caller"
            />
        </div>

        <h3 className="text-2xl font-bold text-gray-800 mb-1">{incomingCall.callerInfo.name}</h3>
        <p className="text-pink-500 font-medium mb-8 flex items-center gap-2 animate-pulse">
           {incomingCall.isVideo ? "Đang gọi video..." : "Đang gọi thoại..."}
        </p>

        <div className="flex gap-8 w-full justify-center">
          <button
            onClick={rejectCall}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="bg-red-500 p-4 rounded-full text-white shadow-lg group-hover:bg-red-600 group-hover:scale-110 transition-all duration-300">
                <PhoneOff size={28} fill="currentColor"/>
            </div>
            <span className="text-xs text-gray-500 font-medium">Từ chối</span>
          </button>

          <button
            onClick={handleAccept}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="bg-green-500 p-4 rounded-full text-white shadow-lg group-hover:bg-green-600 group-hover:scale-110 transition-all duration-300 animate-bounce">
                <Phone size={28} fill="currentColor"/>
            </div>
            <span className="text-xs text-gray-500 font-medium">Nghe máy</span>
          </button>
        </div>
      </div>
    </div>
  );
}