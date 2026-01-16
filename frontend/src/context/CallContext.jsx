import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";
import { axiosInstance } from "../lib/axios";
import { useSocket } from "./SocketContext";
import toast from "react-hot-toast";

const CallContext = createContext();
export const useCall = () => useContext(CallContext);

const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

export const CallProvider = ({ children }) => {
  const { socket } = useSocket();

  const [calls, setCalls] = useState([]);
  const [isCallLoading, setIsCallLoading] = useState(false);
  const [localTracks, setLocalTracks] = useState([]); // [audio, video|screen]
  const [remoteUsers, setRemoteUsers] = useState([]); // normalized users
  const [incomingCall, setIncomingCall] = useState(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const callTimerRef = useRef(0);

  const screenVideoTrackRef = useRef(null);
  const wasCameraOnRef = useRef(false);

  /* ============================
   * AGORA EVENTS
   * ============================ */
  useEffect(() => {
    const handleUserPublished = async (user, mediaType) => {
      await client.subscribe(user, mediaType);

      setRemoteUsers(prev => {
        const existing = prev.find(u => u.uid === user.uid);

        const updated = {
          uid: user.uid,
          audioTrack: mediaType === "audio" ? user.audioTrack : existing?.audioTrack,
          videoTrack: mediaType === "video" ? user.videoTrack : existing?.videoTrack,
          isVideoOn: mediaType === "video" ? true : existing?.isVideoOn ?? false,
        };

        return existing
          ? prev.map(u => (u.uid === user.uid ? updated : u))
          : [...prev, updated];
      });

      if (mediaType === "audio") {
        user.audioTrack?.play();
      }
    };

    const handleUserUnpublished = (user, mediaType) => {
      setRemoteUsers(prev =>
        prev.map(u =>
          u.uid === user.uid
            ? {
                ...u,
                videoTrack: mediaType === "video" ? null : u.videoTrack,
                isVideoOn: mediaType === "video" ? false : u.isVideoOn,
              }
            : u
        )
      );

      if (mediaType === "audio") {
        user.audioTrack?.stop();
      }
    };

    const handleUserLeft = user => {
      setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
    };

    client.on("user-published", handleUserPublished);
    client.on("user-unpublished", handleUserUnpublished);
    client.on("user-left", handleUserLeft);

    return () => {
      client.off("user-published", handleUserPublished);
      client.off("user-unpublished", handleUserUnpublished);
      client.off("user-left", handleUserLeft);
    };
  }, []);

  /* ============================
   * JOIN / LEAVE
   * ============================ */
  const joinChannel = async (appId, channelName, token, uid, isVideo = true) => {
    try {
      await client.join(appId, channelName, token, uid);

      let audioTrack;
      let videoTrack;

      if (isVideo) {
        [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
      } else {
        audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      }

      const tracks = [audioTrack, videoTrack].filter(Boolean);
      await client.publish(tracks);

      setLocalTracks(tracks);
      return tracks;
    } catch (err) {
      toast.error("Không thể truy cập thiết bị");
      throw err;
    }
  };

  const leaveChannel = async () => {
    localTracks.forEach(t => {
      t?.stop();
      t?.close();
    });

    setLocalTracks([]);
    setRemoteUsers([]);
    setIsScreenSharing(false);
    callTimerRef.current = 0;

    await client.leave();
    fetchCallHistory();
  };

  /* ============================
   * SCREEN SHARE (PATCHED)
   * ============================ */
  const stopScreenShare = async () => {
    try {
      if (screenVideoTrackRef.current) {
        await client.unpublish(screenVideoTrackRef.current);
        screenVideoTrackRef.current.stop();
        screenVideoTrackRef.current.close();
        screenVideoTrackRef.current = null;
      }

      if (wasCameraOnRef.current) {
        const camTrack = await AgoraRTC.createCameraVideoTrack();
        await client.publish(camTrack);
        setLocalTracks(prev => [prev[0], camTrack]);
      } else {
        setLocalTracks(prev => [prev[0]]);
      }

      setIsScreenSharing(false);
    } catch (err) {
      toast.error("Lỗi khi dừng chia sẻ màn hình");
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        await stopScreenShare();
        return;
      }

      wasCameraOnRef.current = !!localTracks[1];

      const screenResult = await AgoraRTC.createScreenVideoTrack(
        {
          encoderConfig: "1080p_1",
          optimizationMode: "detail",
        },
        "auto"
      );

      const screenVideoTrack = Array.isArray(screenResult)
        ? screenResult[0]
        : screenResult;

      const screenAudioTrack = Array.isArray(screenResult)
        ? screenResult[1]
        : null;

      screenVideoTrackRef.current = screenVideoTrack;

      if (localTracks[1]) {
        await client.unpublish(localTracks[1]);
        localTracks[1].stop();
        localTracks[1].close();
      }

      await client.publish([screenVideoTrack, screenAudioTrack].filter(Boolean));

      setLocalTracks(prev => [prev[0], screenVideoTrack]);
      setIsScreenSharing(true);

      screenVideoTrack.on("track-ended", () => {
        stopScreenShare();
      });
    } catch (err) {
      console.error(err);
      toast.error("Không thể chia sẻ màn hình");
      setIsScreenSharing(false);
    }
  };

  /* ============================
   * HISTORY + SOCKET
   * ============================ */
  const fetchCallHistory = useCallback(async () => {
    try {
      setIsCallLoading(true);
      const res = await axiosInstance.get("/calls/history");
      if (res.data.success) setCalls(res.data.calls);
    } catch {
      setCalls([]);
    } finally {
      setIsCallLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleIncoming = data => setIncomingCall(data);
    const handleCancelled = () => setIncomingCall(null);

    socket.on("incomingCall", handleIncoming);
    socket.on("callCancelled", handleCancelled);
    socket.on("call:history_updated", fetchCallHistory);

    return () => {
      socket.off("incomingCall", handleIncoming);
      socket.off("callCancelled", handleCancelled);
      socket.off("call:history_updated", fetchCallHistory);
    };
  }, [socket, fetchCallHistory]);

  const rejectCall = () => {
    if (!incomingCall || !socket) return;
    socket.emit("call:rejected", { channelName: incomingCall.channelName });
    setIncomingCall(null);
  };

  return (
    <CallContext.Provider
      value={{
        calls,
        isCallLoading,
        fetchCallHistory,
        joinChannel,
        leaveChannel,
        toggleScreenShare,
        localTracks,
        remoteUsers,
        incomingCall,
        setIncomingCall,
        rejectCall,
        callTimerRef,
        isScreenSharing,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};