import { useEffect, useRef, useState } from "react";
import { useCall } from "../context/CallContext";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { PhoneOff, Mic, MicOff, Video, VideoOff, User, Clock, Monitor, MonitorOff } from "lucide-react";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

export default function CallPage() {
  const { joinChannel, leaveChannel, toggleScreenShare, localTracks, remoteUsers, isScreenSharing, callTimerRef } = useCall();
  const { socket } = useSocket();
  const { authUser } = useAuth();
  
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [timer, setTimer] = useState(0);
  const [statusText, setStatusText] = useState("Đang kết nối...");
  const [remoteCamOff, setRemoteCamOff] = useState(true);

  // Refs
  const hasAnsweredRef = useRef(false);
  const localVideoRef = useRef(null);
  const outgoingAudioRef = useRef(new Audio("/amthanhcuocgoidenmp3"));
  const remoteVideoTrackRef = useRef(null); 

  // Params
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
        const res = await axiosInstance.get(`/calls/token?channelName=${channelName}`);
        const { token, appId } = res.data;

        if (isCaller) {
          outgoingAudioRef.current.loop = true;
          outgoingAudioRef.current.play().catch(() => {});
        }

        let tracks;
        try {
          tracks = await joinChannel(appId, channelName, token, 0, isVideoCall);
        } catch (err) {
          console.warn("Lỗi Cam, chuyển sang Voice Only...", err);
          tracks = await joinChannel(appId, channelName, token, 0, false);
          setIsCamOn(false);
        }
        
        if ((!isVideoCall || !isCamOn) && tracks && tracks[1]) {
          tracks[1].setEnabled(false);
          setIsCamOn(false);
        }

        if (isCaller) {
          setStatusText(`Đang gọi ${remoteUserName}...`);
          socket.emit("call:request", {
            receiverId: remoteUserId,
            channelName,
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
        console.error("Lỗi Init Call:", error);
        setStatusText("Lỗi kết nối!");
      }
    };
    initCall();

    if (socket) {
      socket.on("call:ended", () => {
        stopOutgoingSound();
        window.close();
      });
      socket.on("callCancelled", () => {
        stopOutgoingSound();
        toast.error("Người nhận bận");
        setTimeout(() => window.close(), 2000);
      });
    }

    return () => {
      stopOutgoingSound();
      leaveChannel();
      if (socket) {
        socket.off("call:ended");
        socket.off("callCancelled");
      }
    };
  }, [authUser, socket]);

  const stopOutgoingSound = () => {
    if (outgoingAudioRef.current) {
      outgoingAudioRef.current.pause();
      outgoingAudioRef.current.currentTime = 0;
    }
  };

  // --- 2. TIMEOUT & TIMER ---
  useEffect(() => {
    let timeoutId;

    if (isCaller && remoteUsers.length === 0 && !hasAnsweredRef.current) {
      timeoutId = setTimeout(() => {
        toast.error("Không ai nghe máy...");
        if (socket) {
          socket.emit("call:end", { channelName, status: "missed", duration: 0 });
        }
        window.close();
      }, 15000);
    }

    if (remoteUsers.length > 0) {
      clearTimeout(timeoutId);
      stopOutgoingSound();
      hasAnsweredRef.current = true;
      setStatusText("Đang trò chuyện");

      const interval = setInterval(() => {
        setTimer(prev => {
          const next = prev + 1;
          callTimerRef.current = next;
          return next;
        });
      }, 1000);
      return () => clearInterval(interval);
    }

    return () => clearTimeout(timeoutId);
  }, [remoteUsers.length, isCaller]);

  // --- 3. REMOTE VIDEO (FIX FREEZE) ---
  useEffect(() => {
    const containerId = "remote-video-container";

    if (remoteUsers.length === 0) {
      if (remoteVideoTrackRef.current) {
        remoteVideoTrackRef.current.stop();
        remoteVideoTrackRef.current = null;
      }
      setRemoteCamOff(true);
      return;
    }

    const remoteUser = remoteUsers[0];

    if (remoteUser.audioTrack) {
      remoteUser.audioTrack.play();
    }

    // FIX: chỉ play khi track THỰC SỰ thay đổi
    if (remoteUser.videoTrack) {
      if (remoteVideoTrackRef.current !== remoteUser.videoTrack) {
        if (remoteVideoTrackRef.current) {
          remoteVideoTrackRef.current.stop();
        }
        remoteUser.videoTrack.play(containerId);
        remoteVideoTrackRef.current = remoteUser.videoTrack;
      }
      setRemoteCamOff(false);
    } else {
      if (remoteVideoTrackRef.current) {
        remoteVideoTrackRef.current.stop();
        remoteVideoTrackRef.current = null;
      }
      setRemoteCamOff(true);
    }
  }, [remoteUsers]);

  // --- 4. BEFORE UNLOAD ---
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (socket && !hasAnsweredRef.current) {
        socket.emit("call:end", { channelName, status: "cancelled", duration: 0 });
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [socket, channelName]);

  const handleEndCall = () => {
    if (socket) {
      const finalStatus = hasAnsweredRef.current ? "answered" : "cancelled";
      socket.emit("call:end", { channelName, status: finalStatus, duration: callTimerRef.current });
    }
    leaveChannel();
    setTimeout(() => window.close(), 100);
  };

  const toggleMic = async () => {
    if (localTracks[0]) {
      await localTracks[0].setEnabled(!isMicOn);
      setIsMicOn(!isMicOn);
    }
  };

  const toggleCam = async () => {
    if (isScreenSharing) {
      toast("Vui lòng tắt Share Screen trước!");
      return;
    }
    if (localTracks[1]) {
      await localTracks[1].setEnabled(!isCamOn);
      setIsCamOn(!isCamOn);
    }
  };

  const formatTime = (s) => {
    const min = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${min}:${sec}`;
  };

  // Avatar: luôn dùng API nếu không có avatar hợp lệ
  const getAvatar = () => {
    if (remoteAvatar && remoteAvatar !== "undefined" && remoteAvatar !== "null") return remoteAvatar;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(remoteUserName)}&background=random`;
  };

  return (
    <div className="h-screen w-full bg-gray-900 flex flex-col relative overflow-hidden font-sans">
      <div className="flex-1 relative bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <div
          id="remote-video-container"
          className={`w-full h-full bg-black transition-opacity duration-300 ${remoteUsers.length > 0 && !remoteCamOff ? "opacity-100" : "opacity-0"}`}
        />

        {(remoteUsers.length === 0 || remoteCamOff) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-4">
            <div className="relative mb-8">
              <img
                src={getAvatar()}
                alt={remoteUserName}
                className="w-32 h-32 md:w-48 md:h-48 rounded-full object-cover border-4 border-gray-900 shadow-2xl"
              />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">{remoteUserName}</h2>
            <p className="text-pink-300 font-medium text-lg animate-pulse">{statusText}</p>
          </div>
        )}
      </div>

      <div className="absolute top-6 right-6 w-32 h-44 md:w-48 md:h-64 bg-black rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl z-20">
        <div ref={localVideoRef} className={`w-full h-full object-cover ${!isScreenSharing ? "transform scale-x-[-1]" : ""}`} />
        {(!isCamOn && !isScreenSharing) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800/90 text-gray-400">
            <User size={32} />
            <span className="text-xs mt-2">Camera Off</span>
          </div>
        )}
      </div>

      {remoteUsers.length > 0 && (
        <div className="absolute top-6 left-6 z-20">
          <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-5 py-2 rounded-full">
            <Clock size={18} className="text-green-400 animate-pulse" />
            <span className="text-white font-mono font-bold text-lg">{formatTime(timer)}</span>
          </div>
        </div>
      )}

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 w-full max-w-xl px-4">
        <div className="flex items-center justify-center gap-4 bg-white/10 backdrop-blur-xl p-4 rounded-[2rem]">
          <button onClick={toggleMic} className={`p-4 rounded-full ${isMicOn ? "bg-gray-600/50 text-white" : "bg-white text-red-600"}`}>
            {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
          </button>

          <button onClick={handleEndCall} className="p-5 bg-red-600 text-white rounded-[2rem]">
            <PhoneOff size={32} fill="currentColor" />
          </button>

          <button onClick={toggleCam} className={`p-4 rounded-full ${isCamOn ? "bg-gray-600/50 text-white" : "bg-white text-red-600"}`}>
            {isCamOn ? <Video size={24} /> : <VideoOff size={24} />}
          </button>

          <button onClick={toggleScreenShare} className={`p-4 rounded-full ${isScreenSharing ? "bg-blue-600 text-white" : "bg-gray-600/50 text-white"}`}>
            {isScreenSharing ? <MonitorOff size={24} /> : <Monitor size={24} />}
          </button>
        </div>
      </div>
    </div>
  );
}