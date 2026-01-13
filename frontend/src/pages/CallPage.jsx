import { useEffect, useRef, useState } from "react";
import { useCall } from "../context/CallContext";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { PhoneOff, Mic, MicOff, Video, VideoOff, User, Clock } from "lucide-react";
import { axiosInstance } from "../lib/axios";

export default function CallPage() {
  const { joinChannel, leaveChannel, localTracks, remoteUsers } = useCall();
  const { socket } = useSocket();
  const { authUser } = useAuth();
  
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [timer, setTimer] = useState(0);
  const [statusText, setStatusText] = useState("Đang kết nối...");
  const [remoteCamOff, setRemoteCamOff] = useState(false); 
  const isEndedRef = useRef(false); 
  
  const timerRef = useRef(0);
  const hasAnsweredRef = useRef(false);
  const localVideoRef = useRef(null);
  
  
  const dialToneRef = useRef(new Audio("/amthanhcuocgoiden.mp3"));

  // Lấy params từ URL
  const query = new URLSearchParams(window.location.search);
  const channelName = query.get("channelName");
  const remoteUserName = query.get("name") || "Người dùng";
  const remoteAvatar = query.get("avatar"); 
  const remoteUserId = query.get("id");
  const isVideoCall = query.get("video") === "true";
  const isCaller = query.get("caller") === "true";

  // --- 1. KHỞI TẠO CUỘC GỌI và TIMEOUT ---
  useEffect(() => {
    const initCall = async () => {
      if (!authUser || !socket || !channelName) return;

      try {
        const res = await axiosInstance.get(`/calls/token?channelName=${channelName}`);
        const { token, appId } = res.data;

        let tracks;
        try {
           tracks = await joinChannel(appId, channelName, token, 0, isVideoCall);
        } catch (err) {
           console.warn("Camera bận, chuyển sang Voice Only...", err);
           tracks = await joinChannel(appId, channelName, token, 0, false);
           setIsCamOn(false);
        }
        
        if ((!isVideoCall || !isCamOn) && tracks && tracks[1]) {
           tracks[1].setEnabled(false);
           setIsCamOn(false);
        }

        if (isCaller) {
          setStatusText(`Đang gọi ${remoteUserName}...`);
          
          //Phát nhạc chờ khi bắt đầu gọi
          dialToneRef.current.loop = true;
          dialToneRef.current.play().catch(e => console.log("Không thể phát nhạc chờ:", e));

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

        if (tracks && tracks[1] && localVideoRef.current) {
          tracks[1].play(localVideoRef.current);
        }

      } catch (error) {
        console.error("Lỗi CallPage:", error);
        setStatusText("Lỗi kết nối!");
      }
    };

    initCall();


    let timeoutId;
    if (isCaller) {
      timeoutId = setTimeout(() => {
        if (remoteUsers.length === 0) {
           console.log("Call timeout -> Auto ending");
           socket.emit("call:timeout", { channelName });
           alert("Người nhận không trả lời.");
           window.close();
        }
      }, 30000); // 30 giây
    }

    if (remoteUsers.length > 0) {
        clearTimeout(timeoutId);
    }
    
    if(socket) {
      const onCallEnded = (data) => {
          isEndedRef.current = true;
          if (data.reason === "timeout") alert("Không có phản hồi.");
          else if (data.reason === "peer_disconnected") alert("Người dùng đã ngắt kết nối.");
          else alert("Cuộc gọi đã kết thúc.");
          
          window.close();
      };

      socket.on("call:ended", onCallEnded);
      socket.on("callCancelled", onCallEnded);
      
      // Cleanup
      return () => {
         clearTimeout(timeoutId);
         socket.off("call:ended", onCallEnded);
         socket.off("callCancelled", onCallEnded);
         
         //Tắt nhạc chờ khi unmount
         dialToneRef.current.pause();
         dialToneRef.current.currentTime = 0;
         
         leaveChannel();
      };
    }
  }, [authUser, socket, remoteUsers.length]);
    

  // --- 2. XỬ LÝ TIMER & TRẠNG THÁI ---
  useEffect(() => {
    // CHỈ KHI remoteUsers > 0 (đối phương đã vào) thì mới tính là Bắt máy
    if (remoteUsers.length > 0) {
        //Đối phương đã vào -> Tắt nhạc chờ ngay lập tức
        dialToneRef.current.pause();
        dialToneRef.current.currentTime = 0;

        hasAnsweredRef.current = true; 
        setStatusText("Đang trò chuyện");
        
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
        else if (isCaller && !hasAnsweredRef.current) setStatusText(`Đang gọi ${remoteUserName}...`);
    }
  }, [remoteUsers.length]);

  // --- 3. HIỂN THỊ REMOTE VIDEO ---
  useEffect(() => {
    if (remoteUsers.length > 0) {
      const remoteUser = remoteUsers[0];
      if (remoteUser.audioTrack) remoteUser.audioTrack.play();
      if (remoteUser.videoTrack) {
        remoteUser.videoTrack.play("remote-video-container");
        setRemoteCamOff(false);
      } else {
        setRemoteCamOff(true);
      }
    }
  }, [remoteUsers]);

  // XỬ LÝ ĐÓNG CỬA SỔ TRÌNH DUYỆT (NÚT X)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!isEndedRef.current && socket) {
         const finalStatus = remoteUsers.length > 0 ? "ended" : "missed";
         socket.emit("call:end", { 
            channelName, 
            status: finalStatus, 
            duration: timerRef.current 
         });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [socket, channelName, remoteUsers.length]);

  // --- 4. HÀNH ĐỘNG KẾT THÚC CUỘC GỌI ---
  const handleEndCall = () => {
    isEndedRef.current = true;
    
    //Tắt nhạc chờ khi bấm nút hủy
    dialToneRef.current.pause();
    dialToneRef.current.currentTime = 0;

     if (socket) {
        const finalStatus = hasAnsweredRef.current ? "answered" : "missed";
        const finalDuration = timerRef.current;

        socket.emit("call:end", { 
            channelName, 
            status: finalStatus, 
            duration: finalDuration 
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

  const remoteAvatarDisplay = remoteAvatar && remoteAvatar !== "undefined" && remoteAvatar !== "null" 
    ? remoteAvatar 
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(remoteUserName)}&background=random&size=200`;

  return (
    <div className="h-screen w-full bg-gray-900 flex flex-col relative overflow-hidden font-sans">
      
      {/* REMOTE SCREEN */}
      <div className="flex-1 relative bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <div id="remote-video-container" className={`w-full h-full object-cover transition-opacity duration-500 ${remoteUsers.length > 0 && !remoteCamOff ? 'opacity-100' : 'opacity-0'}`} />

        {/* Màn hình chờ / Avatar fallback */}
        {(remoteUsers.length === 0 || remoteCamOff) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-4">
            <div className="relative mb-8 group">
               <div className={`absolute inset-0 bg-pink-500/20 rounded-full ${remoteUsers.length === 0 ? 'animate-ping' : ''} scale-150`}></div>
               <div className="relative w-32 h-32 md:w-48 md:h-48 rounded-full p-1 bg-gradient-to-tr from-pink-500 to-violet-500 shadow-2xl overflow-hidden">
                 <img 
                   src={remoteAvatarDisplay} 
                   alt={remoteUserName} 
                   className="w-full h-full rounded-full object-cover border-4 border-gray-900"
                 />
               </div>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-wide drop-shadow-md">{remoteUserName}</h2>
            <p className="text-pink-300 font-medium text-lg animate-pulse">{statusText}</p>
          </div>
        )}
      </div>

      {/* LOCAL VIDEO */}
      <div className="absolute top-6 right-6 w-32 h-44 md:w-48 md:h-64 bg-black rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl z-20 transition-all hover:scale-105 hover:border-pink-500/50">
         <div ref={localVideoRef} className="w-full h-full object-cover transform scale-x-[-1]" /> 
         {!isCamOn && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800/90 text-gray-400">
                 <User size={32} className="opacity-50"/>
                 <span className="text-xs mt-2">Camera Off</span>
             </div>
         )}
      </div>

      {/* TIMER UI */}
      {remoteUsers.length > 0 && (
        <div className="absolute top-6 left-6 z-20 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md border border-white/10 px-5 py-2 rounded-full shadow-lg">
                <Clock size={18} className="text-pink-400 animate-pulse" />
                <span className="text-white font-mono font-bold tracking-wider text-lg">
                    {formatTime(timer)}
                </span>
            </div>
        </div>
      )}

      {/* CONTROLS */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 w-full max-w-lg px-4">
        <div className="flex items-center justify-center gap-6 bg-white/10 backdrop-blur-xl border border-white/10 p-4 rounded-[2.5rem] shadow-2xl">
            <button 
                onClick={toggleMic} 
                className={`p-4 rounded-full transition-all duration-200 hover:scale-110 ${isMicOn ? "bg-gray-600/50 text-white hover:bg-gray-500" : "bg-white text-red-500 shadow-[0_0_15px_rgba(255,255,255,0.5)]"}`}
            >
                {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
            </button>

            <button 
                onClick={handleEndCall} 
                className="p-6 bg-red-600 text-white rounded-[2rem] shadow-lg shadow-red-600/40 hover:bg-red-700 hover:scale-105 transition-all duration-300 mx-2"
            >
                <PhoneOff size={32} fill="currentColor" />
            </button>
            
            <button 
                onClick={toggleCam} 
                className={`p-4 rounded-full transition-all duration-200 hover:scale-110 ${isCamOn ? "bg-gray-600/50 text-white hover:bg-gray-500" : "bg-white text-red-500 shadow-[0_0_15px_rgba(255,255,255,0.5)]"}`}
            >
                {isCamOn ? <Video size={24} /> : <VideoOff size={24} />}
            </button>
        </div>
      </div>
    </div>
  );
}