// import {
//   createContext,
//   useContext,
//   useState,
//   useCallback,
//   useEffect,
//   useRef,
// } from "react";
// import AgoraRTC from "agora-rtc-sdk-ng";
// import { axiosInstance } from "../lib/axios";
// import { useSocket } from "./SocketContext";
// import toast from "react-hot-toast";

// const CallContext = createContext();
// export const useCall = () => useContext(CallContext);

// // Create client outside component to persist across re-renders
// const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

// export const CallProvider = ({ children }) => {
//   const { socket, authUser } = useSocket();
//   const [calls, setCalls] = useState([]);
//   const [isCallLoading, setIsCallLoading] = useState(false);
//   const [localTracks, setLocalTracks] = useState([]);
//   const [remoteUsers, setRemoteUsers] = useState([]);
//   const [incomingCall, setIncomingCall] = useState(null);

//   // Timer ref to calculate duration for logs
//   const callTimerRef = useRef(0);

//   // ===============================
//   // --- 1. AGORA EVENT LISTENERS ---
//   // ===============================
//   useEffect(() => {
//     const handleUserPublished = async (user, mediaType) => {
//       await client.subscribe(user, mediaType);
//       if (mediaType === "video") {
//         setRemoteUsers((prev) => {
//           // Avoid duplicates
//           const filtered = prev.filter((u) => u.uid !== user.uid);
//           return [...filtered, user];
//         });
//       }
//       if (mediaType === "audio") user.audioTrack.play();
//     };

//     const handleUserLeft = (user) => {
//       setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
//     };

//     client.on("user-published", handleUserPublished);
//     client.on("user-left", handleUserLeft);

//     return () => {
//       client.off("user-published", handleUserPublished);
//       client.off("user-left", handleUserLeft);
//     };
//   }, []);

//   // ===============================
//   // --- 2. JOIN CHANNEL (Generic) ---
//   // Used by both Caller and Receiver in CallPage.jsx
//   // ===============================
//   const joinChannel = async (appId, channelName, token, uid, isVideo = true) => {
//     try {
//       await client.join(appId, channelName, token, uid);

//       let audioTrack, videoTrack;

//       if (isVideo) {
//         // Nếu là Video Call: Lấy cả Mic và Cam
//         [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
//       } else {
//         // Nếu là Voice Call: CHỈ LẤY MIC (Tránh lỗi Camera đang bận)
//         audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
//         videoTrack = null; 
//       }

//       setLocalTracks(isVideo ? [audioTrack, videoTrack] : [audioTrack]);

//       // Publish track (lọc bỏ null nếu không có video)
//       const tracksToPublish = [audioTrack, videoTrack].filter(Boolean);
//       await client.publish(tracksToPublish);

//       return [audioTrack, videoTrack];
//     } catch (error) {
//       console.error("Agora Connection Error:", error);
//       toast.error("Không thể truy cập thiết bị (Mic/Cam đang bận?)");
//       throw error;
//     }
//   };

//   // ===============================
//   // --- 3. LEAVE CHANNEL ---
//   // ===============================
//   const leaveChannel = async ({ status = "ended", receiverId } = {}) => {
//     // Stop local tracks
//     localTracks.forEach((track) => {
//       track.stop();
//       track.close();
//     });
//     setLocalTracks([]);
//     setRemoteUsers([]);

//     // Leave Agora
//     await client.leave();

//     // Reset Timer
//     callTimerRef.current = 0;

//     // Refresh history
//     fetchCallHistory();
//   };

//   // ===============================
//   // --- 4. SOCKET & HISTORY ---
//   // ===============================
//   const fetchCallHistory = useCallback(async () => {
//     try {
//       setIsCallLoading(true);
//       const res = await axiosInstance.get("/calls/history");
//       if (res.data.success) setCalls(res.data.calls);
//     } catch (error) {
//       setCalls([]);
//     } finally {
//       setIsCallLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     if (!socket) return;
//     const handleRefresh = () => fetchCallHistory();
//     const handleIncoming = (data) => setIncomingCall(data);
//     const handleCancelled = () => setIncomingCall(null);

//     socket.on("call:history_updated", handleRefresh);
//     socket.on("incomingCall", handleIncoming);
//     socket.on("callCancelled", handleCancelled);

//     return () => {
//       socket.off("call:history_updated", handleRefresh);
//       socket.off("incomingCall", handleIncoming);
//       socket.off("callCancelled", handleCancelled);
//     };
//   }, [socket, fetchCallHistory]);

//   // Reject function for the Modal
//   const rejectCall = () => {
//     if (!incomingCall || !socket) return;
//     socket.emit("call:rejected", { channelName: incomingCall.channelName });
//     setIncomingCall(null);
//   };

//   return (
//     <CallContext.Provider
//       value={{
//         calls,
//         isCallLoading,
//         fetchCallHistory,
//         joinChannel, // MUST be the generic function
//         leaveChannel,
//         localTracks,
//         remoteUsers,
//         incomingCall,
//         setIncomingCall, // Exposed for Modal to clear it on accept
//         rejectCall,
//         callTimerRef,
//       }}
//     >
//       {children}
//     </CallContext.Provider>
//   );
// };


// src/context/CallContext.jsx
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
  const [localTracks, setLocalTracks] = useState([]);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [incomingCall, setIncomingCall] = useState(null);
  const callTimerRef = useRef(0);

  // --- 1. AGORA EVENTS ---
  useEffect(() => {
    const handleUserPublished = async (user, mediaType) => {
      await client.subscribe(user, mediaType);
      if (mediaType === "video") {
        setRemoteUsers((prev) => {
          const filtered = prev.filter(u => u.uid !== user.uid);
          return [...filtered, user];
        });
      }
      if (mediaType === "audio") user.audioTrack.play();
    };

    const handleUserLeft = (user) => {
      setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
    };

    client.on("user-published", handleUserPublished);
    client.on("user-left", handleUserLeft);

    return () => {
      client.off("user-published", handleUserPublished);
      client.off("user-left", handleUserLeft);
    };
  }, []);

  // --- 2. JOIN CHANNEL (Đã sửa để hỗ trợ Voice Only) ---
  const joinChannel = async (appId, channelName, token, uid, isVideo = true) => {
    try {
      await client.join(appId, channelName, token, uid);

      let audioTrack, videoTrack;

      if (isVideo) {
        // Nếu là Video Call: Xin cả 2 quyền
        [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
      } else {
        // Nếu là Voice Call: CHỈ XIN QUYỀN MIC (Tránh lỗi Cam đang bận)
        audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      }

      setLocalTracks(isVideo ? [audioTrack, videoTrack] : [audioTrack]);

      // Publish những track nào tồn tại
      const tracksToPublish = [audioTrack, videoTrack].filter(Boolean);
      await client.publish(tracksToPublish);

      return [audioTrack, videoTrack];
    } catch (error) {
      console.error("Lỗi Agora:", error);
      toast.error("Không thể truy cập Mic/Camera (Có thể đang bị chiếm dụng?)");
      throw error; 
    }
  };

  // --- 3. LEAVE CHANNEL ---
  const leaveChannel = async () => {
    localTracks.forEach(track => {
      if(track) {
        track.stop();
        track.close();
      }
    });
    setLocalTracks([]);
    setRemoteUsers([]);
    await client.leave();
    callTimerRef.current = 0;
    fetchCallHistory();
  };

  // --- 4. SOCKET & HISTORY ---
  const fetchCallHistory = useCallback(async () => {
    try {
      setIsCallLoading(true);
      const res = await axiosInstance.get("/calls/history");
      if (res.data.success) setCalls(res.data.calls);
    } catch (error) {
      setCalls([]);
    } finally {
      setIsCallLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleRefresh = () => fetchCallHistory();
    const handleIncoming = (data) => setIncomingCall(data);
    const handleCancelled = () => setIncomingCall(null);

    socket.on("call:history_updated", handleRefresh);
    socket.on("incomingCall", handleIncoming);
    socket.on("callCancelled", handleCancelled);

    return () => {
      socket.off("call:history_updated", handleRefresh);
      socket.off("incomingCall", handleIncoming);
      socket.off("callCancelled", handleCancelled);
    };
  }, [socket, fetchCallHistory]);

  const rejectCall = () => {
    if (!incomingCall || !socket) return;
    socket.emit("call:rejected", { channelName: incomingCall.channelName });
    setIncomingCall(null);
  };

  return (
    <CallContext.Provider value={{
      calls,
      isCallLoading,
      fetchCallHistory,
      joinChannel,
      leaveChannel,
      localTracks,
      remoteUsers,
      incomingCall,
      setIncomingCall,
      rejectCall,
      callTimerRef
    }}>
      {children}
    </CallContext.Provider>
  );
};