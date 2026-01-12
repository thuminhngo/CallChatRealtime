import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useSocket } from "./SocketContext";

const FriendContext = createContext();

export const useFriend = () => useContext(FriendContext);

export const FriendProvider = ({ children }) => {
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const { socket } = useSocket();
  const [newFriendAlerts, setNewFriendAlerts] = useState(0);

  // Lắng nghe sự kiện Real-time
  useEffect(() => {
    if (!socket) return;

    socket.on("newFriendRequest", (newRequest) => {
      setFriendRequests((prev) => [...prev, newRequest]);
      setNewFriendAlerts(prev => prev + 1);
      // thông báo cho người dùng 
      toast(`New friend request from ${newRequest.fullName}`, { icon: "👋" });
    });

    socket.on("friendRequestAccepted", (newFriend) => {
      setFriends((prev) => [...prev, newFriend]);
      // Xóa khỏi danh sách đã gửi (so sánh user._id)
      setSentRequests((prev) => prev.filter(user => user._id !== newFriend._id));
      toast.success(`${newFriend.fullName} accepted your request!`);
    });

    socket.on("friendRemoved", ({ userId }) => {
        setFriends((prev) => prev.filter((f) => f._id !== userId));
        toast("A friend has removed you.", { icon: "info" });
    });

    return () => {
      socket.off("newFriendRequest");
      socket.off("friendRequestAccepted");
      socket.off("friendRemoved");
    };
  }, [socket]);

  /* Lấy danh sách bạn bè */
  const getFriends = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/friends/list");
      setFriends(res.data);
    } catch (error) {}
  }, []);

  /* Lấy danh sách lời mời kết bạn (Received) */
  const getFriendRequests = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/friends/requests");
      setFriendRequests(res.data);
    } catch (error) {}
  }, []);

  /* Lấy danh sách lời mời đã gửi (Sent) */
  const getSentRequests = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/friends/sent-requests");
      setSentRequests(res.data);
    } catch (error) {}
  }, []);

  /* Tìm kiếm user */
  const searchUsers = async (email) => {
    try {
      const res = await axiosInstance.get(`/auth/search?email=${email}`);
      return Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []);
    } catch (error) {
      console.error("Search error:", error);
      return [];
    }
  };

  /* Gửi lời mời kết bạn */
  const sendFriendRequest = async (receiverId) => {
    try {
      const res = await axiosInstance.post("/friends/request", { receiverId });
      toast.success("Friend request sent!");
      getSentRequests();
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send request");
      throw error;
    }
  };

  /* Chấp nhận lời mời */
  const acceptFriendRequest = async (requestId) => {
    try {
      await axiosInstance.post("/friends/accept", { requestId });
      // Lọc bỏ request đã xử lý dựa trên requestId
      setFriendRequests((prev) => prev.filter((user) => user.requestId !== requestId));
      getFriends(); // Cập nhật lại list bạn bè

      //gửi thông báo cho người dùng đã đc accept
      toast.success("Request accepted!");
    } catch (error) {
      console.error(error);
      toast.error("Error accepting request");
    }
  };

  const markFriendAlertsAsRead = useCallback(() => {
    setNewFriendAlerts(0);
  }, []);

  /* Từ chối lời mời */
  const rejectFriendRequest = async (requestId) => {
    try {
        await axiosInstance.post("/friends/reject", { requestId });
        setFriendRequests((prev) => prev.filter((user) => user.requestId !== requestId));
        toast.success("Request rejected");
    } catch (error) {
        console.error(error);
        toast.error("Error rejecting request");
    }
  };

  /* Hủy lời mời đã gửi */
  const cancelFriendRequest = async (receiverId) => {
    try {
      await axiosInstance.post("/friends/cancel", { receiverId });
      // Lọc bỏ dựa trên user._id (vì sentRequests là danh sách user)
      setSentRequests((prev) => prev.filter((user) => user._id !== receiverId));
      toast.success("Request cancelled");
    } catch (error) {
      toast.error("Error cancelling request");
    }
  };

  /* Hủy kết bạn */
  const removeFriend = async (friendId) => {
    try {
      await axiosInstance.post("/friends/unfriend", { friendId });
      setFriends((prev) => prev.filter((f) => f._id !== friendId));
      toast.success("Unfriended");
    } catch (error) {
      toast.error("Error removing friend");
    }
  };

  /* Tải dữ liệu ban đầu */
  useEffect(() => {
    getFriends();
    getFriendRequests();
    getSentRequests();
  }, [getFriends, getFriendRequests, getSentRequests]);
  return (
    <FriendContext.Provider
      value={{
        friends, friendRequests, sentRequests,
        getFriends, getFriendRequests, getSentRequests,
        searchUsers, sendFriendRequest, acceptFriendRequest, 
        rejectFriendRequest, cancelFriendRequest, removeFriend
      }}
    >
      {children}
    </FriendContext.Provider>
  );
};