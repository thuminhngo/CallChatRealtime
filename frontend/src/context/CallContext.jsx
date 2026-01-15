import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";
import { axiosInstance } from "../lib/axios";
import { useSocket } from "./SocketContext";
import toast from "react-hot-toast";

const CallContext = createContext();
export const useCall = () => useContext(CallContext);

// Singleton Agora client
const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

export const CallProvider = ({ children }) => {
  const { socket } = useSocket();

  const [calls, setCalls] = useState([]);
  const [isCallLoading, setIsCallLoading] = useState(false);

  const [localTracks, setLocalTracks] = useState([]); // [audio, video]
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [incomingCall, setIncomingCall] = useState(null);

  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const callTimerRef = useRef(0);
  const incomingTimeoutRef = useRef(null);
  const screenTrackRef = useRef(null);

  // Guard trạng thái Agora
  const isJoiningRef = useRef(false);
  const isJoinedRef = useRef(false);

  // ---------------- AGORA EVENTS ----------------
  useEffect(() => {
    const handleUserPublished = async (user, mediaType) => {
      await client.subscribe(user, mediaType);

      setRemoteUsers((prev) => {
        const exists = prev.find(u => u.uid === user.uid);
        if (exists) return prev.map(u => u.uid === user.uid ? user : u);
        return [...prev, user];
      });

      if (mediaType === "audio") {
        user.audioTrack?.play();
      }
    };

    const handleUserLeft = (user) => {
      setRemoteUsers((prev) => prev.filter(u => u.uid !== user.uid));
    };

    client.on("user-published", handleUserPublished);
    client.on("user-left", handleUserLeft);

    return () => {
      client.off("user-published", handleUserPublished);
      client.off("user-left", handleUserLeft);
    };
  }, []);

  // ---------------- JOIN CHANNEL ----------------
  const joinChannel = async (appId, channelName, token, uid, isVideo = true) => {
    if (isJoiningRef.current || isJoinedRef.current) return localTracks;

    try {
      isJoiningRef.current = true;

      await client.join(appId, channelName, token, uid);
      isJoinedRef.current = true;

      socket?.emit("call:accepted", { channelName });

      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      let videoTrack = null;

      if (isVideo) {
        try {
          videoTrack = await AgoraRTC.createCameraVideoTrack({
            encoderConfig: "720p_1",
          });
        } catch {
          toast("Không tìm thấy Camera, chuyển sang thoại.");
        }
      }

      const tracks = [audioTrack, videoTrack].filter(Boolean);
      setLocalTracks([audioTrack, videoTrack]);

      await client.publish(tracks);

      return [audioTrack, videoTrack];
    } catch (error) {
      isJoinedRef.current = false;
      toast.error("Lỗi Agora: " + error.message);
      throw error;
    } finally {
      isJoiningRef.current = false;
    }
  };

  // ---------------- LEAVE CHANNEL ----------------
  const leaveChannel = async () => {
    try {
      if (screenTrackRef.current) {
        await client.unpublish(screenTrackRef.current);
        screenTrackRef.current.stop();
        screenTrackRef.current.close();
        screenTrackRef.current = null;
      }

      const tracks = localTracks.filter(Boolean);
      if (tracks.length && client.connectionState === "CONNECTED") {
        await client.unpublish(tracks);
      }

      for (let track of tracks) {
        track.stop();
        track.close();
      }

      if (client.connectionState !== "DISCONNECTED") {
        await client.leave();
      }
    } catch (e) {
      console.warn("Leave error:", e);
    } finally {
      socket?.emit("call:ended");

      setLocalTracks([]);
      setRemoteUsers([]);
      setIsScreenSharing(false);

      isJoinedRef.current = false;
      isJoiningRef.current = false;
      callTimerRef.current = 0;

      fetchCallHistory();
    }
  };

  // ---------------- SCREEN SHARE ----------------
  const startScreenShare = async () => {
    if (!isJoinedRef.current || isScreenSharing) return;

    try {
      const screenTrack = await AgoraRTC.createScreenVideoTrack(
        { encoderConfig: "1080p_1" },
        "auto"
      );

      screenTrackRef.current = screenTrack;

      const camTrack = localTracks[1];
      if (camTrack) {
        await client.unpublish(camTrack);
        camTrack.stop();
      }

      await client.publish(screenTrack);
      setIsScreenSharing(true);

      screenTrack.on("track-ended", stopScreenShare);
    } catch (e) {
      toast.error("Không thể chia sẻ màn hình");
    }
  };

  const stopScreenShare = async () => {
    if (!screenTrackRef.current) return;

    await client.unpublish(screenTrackRef.current);
    screenTrackRef.current.stop();
    screenTrackRef.current.close();
    screenTrackRef.current = null;

    const camTrack = localTracks[1];
    if (camTrack) {
      await client.publish(camTrack);
    }

    setIsScreenSharing(false);
  };

  // ---------------- CALL HISTORY ----------------
  const fetchCallHistory = useCallback(async () => {
    try {
      setIsCallLoading(true);
      const res = await axiosInstance.get("/calls/history");
      if (res.data.success) setCalls(res.data.calls);
    } finally {
      setIsCallLoading(false);
    }
  }, []);

  // ---------------- SOCKET EVENTS ----------------
  useEffect(() => {
    if (!socket) return;

    socket.on("call:history_updated", fetchCallHistory);

    socket.on("incomingCall", (data) => {
      if (isJoinedRef.current) {
        socket.emit("call:busy", { callerId: data.caller._id });
        return;
      }

      setIncomingCall(data);

      incomingTimeoutRef.current = setTimeout(() => {
        socket.emit("call:missed", {
          channelName: data.channelName,
        });
        setIncomingCall(null);
      }, 30000);
    });

    socket.on("callCancelled", () => {
      clearTimeout(incomingTimeoutRef.current);
      setIncomingCall(null);
    });

    return () => {
      socket.off("call:history_updated", fetchCallHistory);
      socket.off("incomingCall");
      socket.off("callCancelled");
    };
  }, [socket, fetchCallHistory]);

  const rejectCall = () => {
    if (!incomingCall || !socket) return;

    clearTimeout(incomingTimeoutRef.current);

    socket.emit("call:rejected", {
      channelName: incomingCall.channelName,
    });

    setIncomingCall(null);
  };

  return (
    <CallContext.Provider value={{
      calls,
      isCallLoading,
      fetchCallHistory,

      joinChannel,
      leaveChannel,

      startScreenShare,
      stopScreenShare,
      isScreenSharing,

      localTracks,
      setLocalTracks,
      remoteUsers,

      incomingCall,
      setIncomingCall,
      rejectCall,

      callTimerRef,
      client,
    }}>
      {children}
    </CallContext.Provider>
  );
};
