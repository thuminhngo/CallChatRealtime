import { useEffect, useRef, useState } from "react";
import { useCall } from "../context/CallContext";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { PhoneOff, Mic, MicOff, Video, VideoOff, User, ShieldCheck } from "lucide-react";
import { axiosInstance } from "../lib/axios";

export default function CallPage() {
  const { joinChannel, leaveChannel, localTracks, remoteUsers } = useCall();
  const { socket } = useSocket();
  const { authUser } = useAuth();
  
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [timer, setTimer] = useState(0);
  const [statusText, setStatusText] = useState("Đang kết nối...");
  const [remoteCamOff, setRemoteCamOff] = useState(false); // Trạng thái cam đối phương

  const timerRef = useRef(0);
  const localVideoRef = useRef(null);

  // Lấy params từ URL
  const query = new URLSearchParams(window.location.search);
  const channelName = query.get("channelName");
  const remoteUserName = query.get("name") || "Người dùng";
  const remoteAvatar = query.get("avatar"); 
  const remoteUserId = query.get("id");
  const isVideoCall = query.get("video") === "true";
  const isCaller = query.get("caller") === "true";

  // --- 1. KHỞI TẠO CUỘC GỌI ---
  useEffect(() => {
    const initCall = async () => {
      if (!authUser || !socket || !channelName) return;

      try {
        // A. Lấy Token từ Server
        const res = await axiosInstance.get(`/calls/token?channelName=${channelName}`);
        const { token, appId } = res.data;

        // B. Join Agora & Lấy tracks (CÓ CƠ CHẾ THỬ LẠI NẾU CAM BẬN)
        let tracks;
        try {
           // Thử kết nối chế độ Video/Audio theo yêu cầu ban đầu
           tracks = await joinChannel(appId, channelName, token, 0, isVideoCall);
        } catch (err) {
           console.warn("⚠️ Camera bận hoặc lỗi, chuyển sang chế độ Voice Only...", err);
           // Nếu lỗi (ví dụ bên kia đang chiếm Cam), thử lại với chế độ CHỈ AUDIO
           tracks = await joinChannel(appId, channelName, token, 0, false);
           setIsCamOn(false); // Cập nhật UI là cam đang tắt
        }
        
        // Nếu là Audio Call (hoặc đã fallback) thì đảm bảo tắt video track
        if ((!isVideoCall || !isCamOn) && tracks && tracks[1]) {
           tracks[1].setEnabled(false);
           setIsCamOn(false);
        }

        // C. Gửi socket báo Server (nếu là người gọi)
        if (isCaller) {
          setStatusText(`Đang gọi ${remoteUserName}...`);
          socket.emit("call:request", {
            receiverId: remoteUserId,
            channelName: channelName,
            isVideo: isVideoCall,
            name: authUser.fullName,
            avatar: authUser.profilePic
          });
        } else {
          setStatusText("Đang kết nối...");
        }

        // D. Hiển thị Local Video (Nếu có video track)
        if (tracks && tracks[1] && localVideoRef.current) {
          tracks[1].play(localVideoRef.current);
        }

      } catch (error) {
        console.error("Lỗi CallPage Fatal:", error);
        setStatusText("Lỗi kết nối!");
      }
    };

    initCall();
    
    // Cleanup socket listeners
    if(socket) {
      socket.on("call:ended", () => {
          alert("Cuộc gọi đã kết thúc");
          window.close();
      });
      socket.on("callCancelled", () => {
          alert("Người nhận đang bận hoặc từ chối");
          window.close();
      });
    }

    return () => {
       if(socket) {
         socket.off("call:ended");
         socket.off("callCancelled");
       }
    };
  }, [authUser, socket]);

  // --- 2. XỬ LÝ TIMER ---
  useEffect(() => {
    if (remoteUsers.length > 0) {
        setStatusText("Đang trong cuộc gọi");
        const interval = setInterval(() => {
            setTimer((prev) => {
                const next = prev + 1;
                timerRef.current = next;
                return next;
            });
        }, 1000);
        return () => clearInterval(interval);
    } else {
        if (!isCaller) setStatusText("Đang đợi người gọi...");
    }
  }, [remoteUsers.length]);

  // --- 3. HIỂN THỊ REMOTE VIDEO ---
  useEffect(() => {
    if (remoteUsers.length > 0) {
      const remoteUser = remoteUsers[0];
      
      // Xử lý Audio
      if (remoteUser.audioTrack) {
        remoteUser.audioTrack.play();
      }

      // Xử lý Video
      if (remoteUser.videoTrack) {
        remoteUser.videoTrack.play("remote-video-container");
        setRemoteCamOff(false);
      } else {
        setRemoteCamOff(true); // Người đó đang tắt cam
      }
    }
  }, [remoteUsers]);


  // --- 4. HÀNH ĐỘNG ---
  const handleEndCall = () => {
     if (socket) {
        socket.emit("call:end", { 
            channelName, 
            status: remoteUsers.length > 0 ? "answered" : "missed", 
            duration: timerRef.current 
        });
     }
     leaveChannel();
     window.close();
  };

  const toggleMic = async () => {
    if (localTracks[0]) {
      await localTracks[0].setEnabled(!isMicOn);
      setIsMicOn(!isMicOn);
    }
  };

  const toggleCam = async () => {
    if (localTracks[1]) {
      await localTracks[1].setEnabled(!isCamOn);
      setIsCamOn(!isCamOn);
    }
  };

  const formatTime = (s) => {
      const min = Math.floor(s / 60).toString().padStart(2, '0');
      const sec = (s % 60).toString().padStart(2, '0');
      return `${min}:${sec}`;
  };

  // Avatar fallback
  const remoteAvatarDisplay = remoteAvatar && remoteAvatar !== "undefined" && remoteAvatar !== "null" 
    ? remoteAvatar 
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(remoteUserName)}&background=random&size=200`;

  return (
    <div className="h-screen w-full bg-gray-900 flex flex-col relative overflow-hidden font-sans">
      
      {/* --- REMOTE VIDEO CONTAINER (FULL SCREEN) --- */}
      <div className="flex-1 relative bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        
        {/* Container cho Video Agora chạy */}
        <div id="remote-video-container" className={`w-full h-full object-cover transition-opacity duration-500 ${remoteUsers.length > 0 && !remoteCamOff ? 'opacity-100' : 'opacity-0'}`} />

        {/* --- GIAO DIỆN CHỜ HOẶC KHI TẮT CAM --- */}
        {(remoteUsers.length === 0 || remoteCamOff) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-4">
            <div className="relative mb-8">
               <div className="absolute inset-0 bg-pink-500/20 rounded-full animate-ping scale-150"></div>
               <div className="absolute inset-0 bg-pink-500/10 rounded-full animate-pulse scale-[2.0]"></div>
               <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full p-1 bg-gradient-to-tr from-pink-500 to-violet-500 shadow-2xl">
                 <img 
                   src={remoteAvatarDisplay} 
                   alt={remoteUserName} 
                   className="w-full h-full rounded-full object-cover border-4 border-gray-900 bg-gray-800"
                 />
               </div>
               <div className="absolute bottom-2 right-2 bg-gray-800 p-2 rounded-full border border-gray-600 shadow-lg">
                  {remoteUsers.length > 0 ? <Mic size={16} className="text-green-400" /> : <ShieldCheck size={16} className="text-gray-400" />}
               </div>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-wide">{remoteUserName}</h2>
            <p className="text-pink-300/80 animate-pulse font-medium text-lg">{statusText}</p>
          </div>
        )}
      </div>

      {/* --- LOCAL VIDEO (GÓC MÀN HÌNH) --- */}
      <div className="absolute top-6 right-6 w-32 h-44 md:w-56 md:h-72 bg-black rounded-2xl overflow-hidden border border-white/15 shadow-[0_8px_30px_rgb(0,0,0,0.5)] z-20 transition-all hover:scale-105 hover:border-pink-500/50 group">
         <div ref={localVideoRef} className="w-full h-full object-cover transform scale-x-[-1]" /> 
         
         {!isCamOn && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800/90 backdrop-blur-sm text-gray-400">
                 <User size={32} className="mb-2 opacity-50"/>
                 <span className="text-xs font-medium">Camera Off</span>
             </div>
         )}
         <div className="absolute bottom-2 left-3 text-white/80 text-xs font-medium bg-black/40 px-2 py-1 rounded backdrop-blur-md">
            Bạn
         </div>
      </div>

      {/* --- TIMER --- */}
      <div className="absolute top-6 left-6 z-20">
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full shadow-lg">
            <div className={`w-2 h-2 rounded-full ${remoteUsers.length > 0 ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
            <span className="text-white font-mono font-medium tracking-wider text-sm md:text-base">
                {formatTime(timer)}
            </span>
        </div>
      </div>

      {/* --- CONTROLS BAR --- */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 w-full max-w-lg px-4">
        <div className="flex items-center justify-center gap-4 md:gap-8 bg-black/40 backdrop-blur-xl border border-white/10 p-4 md:p-5 rounded-[2rem] shadow-2xl">
            <button 
                onClick={toggleMic} 
                className={`p-4 rounded-full transition-all duration-300 transform hover:scale-110 focus:outline-none ${isMicOn ? "bg-gray-700/50 text-white hover:bg-gray-600" : "bg-white text-gray-900 shadow-[0_0_15px_rgba(255,255,255,0.3)]"}`}
            >
                {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
            </button>

            <button 
                onClick={handleEndCall} 
                className="p-5 md:p-6 bg-red-500 text-white rounded-[2rem] shadow-[0_4px_20px_rgba(239,68,68,0.4)] hover:bg-red-600 hover:scale-105 transition-all duration-300"
            >
                <PhoneOff size={32} fill="currentColor" />
            </button>
            
            <button 
                onClick={toggleCam} 
                className={`p-4 rounded-full transition-all duration-300 transform hover:scale-110 focus:outline-none ${isCamOn ? "bg-gray-700/50 text-white hover:bg-gray-600" : "bg-white text-gray-900 shadow-[0_0_15px_rgba(255,255,255,0.3)]"}`}
            >
                {isCamOn ? <Video size={24} /> : <VideoOff size={24} />}
            </button>
        </div>
      </div>
    </div>
  );
}