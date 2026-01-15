import { useEffect, useRef, useState } from "react";
import { useCall } from "../context/CallContext";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { useNavigate } from "react-router-dom";
import {
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  XSquare,
  Clock,
  User,
  ArrowLeft,
} from "lucide-react";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

export default function CallPage() {
  const {
    client,
    joinChannel,
    leaveChannel,
    localTracks,
    remoteUsers,
    startScreenShare,
    stopScreenShare,
    isScreenSharing,
  } = useCall();

  const { socket } = useSocket();
  const { authUser } = useAuth();
  const navigate = useNavigate();

  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [timer, setTimer] = useState(0);
  const [statusText, setStatusText] = useState("Đang kết nối...");

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const hasInitRef = useRef(false);
  const isEndedRef = useRef(false);
  const timerRef = useRef(0);
  const hasAnsweredRef = useRef(false);
  const dialToneRef = useRef(new Audio("/amthanhcuocgoiden.mp3"));

  // ---- URL PARAMS ----
  const query = new URLSearchParams(window.location.search);
  const channelName = query.get("channelName");
  const remoteUserName = query.get("name") || "Người dùng";
  const remoteAvatar = query.get("avatar");
  const remoteUserId = query.get("id");
  const isVideoCall = query.get("video") === "true";
  const isCaller = query.get("caller") === "true";

  // ---- SAFE EXIT ----
  const cleanupAndExit = async () => {
    if (isEndedRef.current) return;
    isEndedRef.current = true;

    dialToneRef.current.pause();
    dialToneRef.current.currentTime = 0;

    await leaveChannel();

    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };

  // ---- INIT CALL ----
  useEffect(() => {
    const initCall = async () => {
      if (hasInitRef.current) return;
      hasInitRef.current = true;

      if (!authUser || !socket || !channelName) {
        toast.error("Thông tin cuộc gọi không hợp lệ");
        navigate("/");
        return;
      }

      try {
        const res = await axiosInstance.get(
          `/calls/token?channelName=${channelName}`
        );
        const { token, appId } = res.data;

        const tracks = await joinChannel(
          appId,
          channelName,
          token,
          0,
          isVideoCall
        );

        if (tracks?.[1] && localVideoRef.current) {
          tracks[1].play(localVideoRef.current);
          setIsCamOn(true);
        } else {
          setIsCamOn(false);
        }

        if (isCaller) {
          setStatusText(`Đang gọi ${remoteUserName}...`);
          dialToneRef.current.loop = true;
          dialToneRef.current.play().catch(() => {});
          socket.emit("call:request", {
            receiverId: remoteUserId,
            channelName,
            isVideo: isVideoCall,
            name: authUser.fullName,
            avatar: authUser.profilePic,
          });
        } else {
          setStatusText("Đang kết nối...");
        }
      } catch (e) {
        toast.error("Không thể kết nối cuộc gọi");
        cleanupAndExit();
      }
    };

    initCall();

    return () => {
      dialToneRef.current.pause();
      leaveChannel();
    };
  }, []);

  // ---- REMOTE USER JOIN ----
  useEffect(() => {
    if (remoteUsers.length > 0) {
      dialToneRef.current.pause();
      dialToneRef.current.currentTime = 0;

      hasAnsweredRef.current = true;
      setStatusText("Đang trò chuyện");

      if (timerRef.current === 0) {
        const interval = setInterval(() => {
          setTimer((p) => {
            timerRef.current = p + 1;
            return p + 1;
          });
        }, 1000);
        return () => clearInterval(interval);
      }

      const remoteUser = remoteUsers[0];
      if (remoteUser.videoTrack && remoteVideoRef.current) {
        remoteUser.videoTrack.play(remoteVideoRef.current);
      }
    } else {
      if (!isCaller) setStatusText("Đang đợi người gọi...");
    }
  }, [remoteUsers, isCaller]);

  // ---- REMOTE END ----
  useEffect(() => {
    if (!socket) return;

    const handleEnded = () => {
      toast("Cuộc gọi đã kết thúc");
      cleanupAndExit();
    };

    socket.on("call:ended", handleEnded);
    return () => socket.off("call:ended", handleEnded);
  }, [socket]);

  // ---- ACTIONS ----
  const handleEndCall = async () => {
    await cleanupAndExit();
  };

  const toggleMic = async () => {
    if (localTracks[0]) {
      await localTracks[0].setEnabled(!isMicOn);
      setIsMicOn(!isMicOn);
    }
  };

  const toggleCam = async () => {
    if (isScreenSharing) {
      toast("Tắt chia sẻ màn hình trước");
      return;
    }
    if (localTracks[1]) {
      await localTracks[1].setEnabled(!isCamOn);
      setIsCamOn(!isCamOn);
    }
  };

  const handleScreenShare = async () => {
    if (isScreenSharing) await stopScreenShare();
    else await startScreenShare();
  };

  // ---- HELPERS ----
  const formatTime = (s) =>
    `${Math.floor(s / 60)
      .toString()
      .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const remoteAvatarDisplay =
    remoteAvatar && remoteAvatar !== "undefined"
      ? remoteAvatar
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(
          remoteUserName
        )}&background=random`;

  const isRemoteCamOn =
    remoteUsers.length > 0 && remoteUsers[0].videoTrack;

  // ================= UI =================
  return (
    <div className="h-screen w-full bg-gray-900 flex flex-col relative overflow-hidden">
      {/* REMOTE */}
      <div className="flex-1 relative bg-black flex items-center justify-center">
        <div
          ref={remoteVideoRef}
          className={`absolute inset-0 ${
            isRemoteCamOn ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
        />

        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-gray-800 to-gray-900">
          <img
            src={remoteAvatarDisplay}
            className="w-32 h-32 rounded-full border-4 border-gray-700 mb-4"
          />
          <h2 className="text-white text-xl font-bold">
            {remoteUserName}
          </h2>
          <p className="text-pink-400">{statusText}</p>
        </div>
      </div>

      {/* LOCAL */}
      <div className="absolute top-6 right-6 w-40 h-56 bg-gray-800 rounded-xl overflow-hidden border">
        <div
          ref={localVideoRef}
          className={`w-full h-full ${
            isScreenSharing ? "" : "scale-x-[-1]"
          }`}
        />
        {!isCamOn && !isScreenSharing && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <User />
          </div>
        )}
      </div>

      {/* TOP LEFT */}
      <div className="absolute top-6 left-6 flex flex-col gap-4">
        <button
          onClick={cleanupAndExit}
          className="p-2 bg-white/10 rounded-full text-white"
        >
          <ArrowLeft />
        </button>

        {remoteUsers.length > 0 && (
          <div className="bg-black/40 px-4 py-2 rounded-full text-white flex gap-2">
            <Clock />
            {formatTime(timer)}
          </div>
        )}
      </div>

      {/* CONTROLS */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 bg-white/10 p-4 rounded-full">
        <button onClick={toggleMic}>
          {isMicOn ? <Mic /> : <MicOff />}
        </button>

        <button
          onClick={handleEndCall}
          className="bg-red-600 p-4 rounded-full"
        >
          <PhoneOff />
        </button>

        <button onClick={toggleCam}>
          {isCamOn ? <Video /> : <VideoOff />}
        </button>

        <button onClick={handleScreenShare} className="hidden md:block">
          {isScreenSharing ? <XSquare /> : <Monitor />}
        </button>
      </div>
    </div>
  );
}
