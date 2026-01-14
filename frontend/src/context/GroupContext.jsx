import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";

import toast from "react-hot-toast";

import { axiosInstance } from "../lib/axios";
import { useSocket } from "./SocketContext";

/* =========================================================
 * CONTEXT SETUP
 * ======================================================= */
const GroupContext = createContext();
export const useGroup = () => useContext(GroupContext);

/* =========================================================
 * PROVIDER
 * ======================================================= */
export const GroupProvider = ({ children }) => {
  const { socket } = useSocket();

  /* -------------------------
   * STATE
   * ----------------------- */
  const [myGroups, setMyGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupMessages, setGroupMessages] = useState([]);

  const [isGroupsLoading, setIsGroupsLoading] = useState(false);
  const [isGroupMessagesLoading, setIsGroupMessagesLoading] = useState(false);

  // Danh sách user đang typing trong group
  const [groupTypingUsers, setGroupTypingUsers] = useState({});

  // Ref dùng để tránh stale state trong socket listener
  const selectedGroupRef = useRef(null);

  useEffect(() => {
    selectedGroupRef.current = selectedGroup;
  }, [selectedGroup]);

  /* =======================================================
   * 1. API HANDLERS
   * ===================================================== */

  // 🔥 1. HÀM ĐÁNH DẤU ĐÃ ĐỌC (MỚI)
  const markReadGroup = useCallback(async (groupId) => {
    try {
      // Cập nhật UI ngay lập tức: reset unreadCount về 0
      setMyGroups((prev) =>
        prev.map((g) => (g._id === groupId ? { ...g, unreadCount: 0 } : g))
      );
      // Gọi API ngầm để lưu vào DB
      await axiosInstance.put(`/groups/${groupId}/read`);
    } catch (error) {
      console.error("Mark group read error", error);
    }
  }, []);

  // Lấy danh sách nhóm của user
  const fetchMyGroups = useCallback(async () => {
    setIsGroupsLoading(true);
    try {
      const res = await axiosInstance.get("/groups");
      setMyGroups(res.data.success ? res.data.groups : []);
    } catch (err) {
      console.error("fetchMyGroups error:", err);
      setMyGroups([]);
    } finally {
      setIsGroupsLoading(false);
    }
  }, []);

  // Tạo group mới
  const createGroup = async (data) => {
    try {
      const res = await axiosInstance.post("/groups", data);
      if (res.data.success) {
        setMyGroups((prev) => [res.data.group, ...prev]);
        toast.success("Tạo nhóm thành công");
        return true;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi tạo nhóm");
    }
    return false;
  };

  // 🔥 2. CẬP NHẬT: Gọi markReadGroup khi lấy tin nhắn
  const getGroupMessages = useCallback(async (groupId) => {
    if (!groupId) return;
    setIsGroupMessagesLoading(true);

    // Đánh dấu đã đọc ngay khi bắt đầu tải tin nhắn
    markReadGroup(groupId);

    try {
      const res = await axiosInstance.get(`/groups/${groupId}/messages`);
      if (res.data.success) {
        setGroupMessages(res.data.messages);
      }
    } catch (err) {
      toast.error("Không thể tải tin nhắn nhóm");
      setGroupMessages([]);
    } finally {
      setIsGroupMessagesLoading(false);
    }
  }, [markReadGroup]);

  // Gửi tin nhắn group (text / image / audio)
  const sendGroupMessage = async (groupId, messageData) => {
    try {
      const formData = new FormData();

      if (messageData.text) {
        formData.append("content", messageData.text);
      }

      if (messageData.image) {
        if (Array.isArray(messageData.image)) {
          messageData.image.forEach((file) =>
            formData.append("image", file)
          );
        } else {
          formData.append("image", messageData.image);
        }
      }

      if (messageData.audio) {
        formData.append("audio", messageData.audio);
      }

      const res = await axiosInstance.post(
        `/groups/${groupId}/messages`,
        formData
      );

      if (res.data.success) {
        setGroupMessages((prev) => [...prev, res.data.message]);
        updateGroupInSidebar(groupId, res.data.message);
      }
    } catch (error) {
      console.error("sendGroupMessage error:", error);
      toast.error(
        error.response?.data?.message || "Gửi tin nhắn thất bại"
      );
      throw error;
    }
  };

  // Thêm thành viên vào group
  const addMember = async (groupId, userId) => {
    try {
      const res = await axiosInstance.post(
        `/groups/${groupId}/members`,
        { userId }
      );
      if (res.data.success) {
        setSelectedGroup(res.data.group);
        toast.success("Đã thêm thành viên");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi thêm thành viên");
    }
  };

  // Xoá thành viên khỏi group
  const removeMember = async (groupId, userId) => {
    try {
      const res = await axiosInstance.delete(
        `/groups/${groupId}/members/${userId}`
      );
      if (res.data.success) {
        setSelectedGroup(res.data.group);
        toast.success("Đã xóa thành viên");
      }
    } catch {
      toast.error("Lỗi xóa thành viên");
    }
  };

  // Rời khỏi group
  const leaveGroup = async (groupId) => {
    try {
      await axiosInstance.post(`/groups/${groupId}/leave`);
      setMyGroups((prev) =>
        prev.filter((g) => g._id !== groupId)
      );

      if (selectedGroup?._id === groupId) {
        setSelectedGroup(null);
      }

      toast.success("Đã rời nhóm");
      return true;
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Lỗi khi rời nhóm"
      );
      return false;
    }
  };

  // Xóa nhóm (Owner)
  const deleteGroup = async (groupId) => {
    try {
      const res = await axiosInstance.delete(`/groups/${groupId}`);
      if (res.data.success) {
        setMyGroups((prev) => prev.filter((g) => g._id !== groupId));
        
        if (selectedGroup?._id === groupId) {
          setSelectedGroup(null);
        }
        
        toast.success("Đã giải tán nhóm");
        return true;
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi xóa nhóm");
      return false;
    }
  };

  // Cập nhật role của thành viên
  const updateMemberRole = async (groupId, userId, role) => {
    try {
      const res = await axiosInstance.put(
        `/groups/${groupId}/members/role`,
        { userId, role }
      );
      if (res.data.success) {
        setSelectedGroup((prev) => ({
          ...prev,
          members: prev.members.map((m) =>
            m.user._id === userId || m.user === userId
              ? { ...m, role }
              : m
          ),
        }));
        toast.success("Đã cập nhật quyền");
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Lỗi cập nhật quyền"
      );
    }
  };

  // CHUYỂN QUYỀN SỞ HỮU
  const transferOwnership = async (groupId, newOwnerId) => {
    try {
      const res = await axiosInstance.put(`/groups/${groupId}/transfer-ownership`, { newOwnerId });
      if (res.data.success) {
        const updatedGroup = res.data.group;
        
        if (selectedGroup?._id === groupId) {
            setSelectedGroup(updatedGroup);
        }

        setMyGroups(prev => prev.map(g => g._id === groupId ? { ...g, ...updatedGroup } : g));
        
        toast.success("Đã chuyển quyền sở hữu thành công");
        return true;
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi chuyển quyền");
      return false;
    }
  };

  // Lấy danh sách media đã chia sẻ trong group
  const getGroupSharedMedia = useCallback(() => {
    if (!groupMessages) return [];
    const media = [];

    groupMessages.forEach((msg) => {
      if (msg.attachments?.length) {
        msg.attachments.forEach((att) => {
          if (att.type === "image") {
            media.push({ _id: msg._id, url: att.url });
          }
        });
      }
    });

    return media.reverse();
  }, [groupMessages]);

  // 🔥 3. CẬP NHẬT: Logic Sidebar Real-time (Unread + Sorting)
  const updateGroupInSidebar = useCallback((groupId, message) => {
    setMyGroups((prev) => {
      // a. Tìm và cập nhật nhóm có tin mới
      const updatedGroups = prev.map((g) => {
        if (g._id === groupId) {
          // Kiểm tra xem user có đang mở nhóm này không?
          const isCurrentlyActive = selectedGroupRef.current?._id === groupId;
          
          if (isCurrentlyActive) {
             // Nếu đang mở nhóm -> Gọi API đánh dấu đọc để cập nhật DB luôn
             markReadGroup(groupId); 
          }

          return {
            ...g,
            lastMessage: message.content || (message.attachments?.length ? "[File]" : "Tin nhắn mới"),
            // Cập nhật thời gian bằng thời gian của tin nhắn vừa nhận
            lastMessageTime: message.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            // Tăng unreadCount nếu KHÔNG đang xem nhóm đó
            unreadCount: isCurrentlyActive ? 0 : (g.unreadCount || 0) + 1,
          };
        }
        return g;
      });

      // b. SẮP XẾP NGAY LẬP TỨC: Đưa nhóm mới nhất lên đầu
      return updatedGroups.sort((a, b) => {
        const timeA = new Date(a.lastMessageTime || a.updatedAt || 0);
        const timeB = new Date(b.lastMessageTime || b.updatedAt || 0);
        return timeB - timeA; // Giảm dần (Mới nhất lên đầu)
      });
    });
  }, [markReadGroup]);

  // Cập nhật thông tin group (name / description / avatar)
  const updateGroupInfo = async (groupId, data) => {
    try {
      const formData = new FormData();

      if (data.name) formData.append("name", data.name);
      if (data.description !== undefined) {
        formData.append("description", data.description);
      }
      if (data.image) formData.append("image", data.image);

      const res = await axiosInstance.put(
        `/groups/${groupId}`,
        formData
      );

      if (res.data.success) {
        const updatedGroup = res.data.group;
        setSelectedGroup(updatedGroup);
        setMyGroups((prev) =>
          prev.map((g) =>
            g._id === groupId
              ? { ...g, ...updatedGroup }
              : g
          )
        );
        toast.success("Group updated successfully");
        return true;
      }
    } catch (error) {
      console.error("Update group error:", error);
      toast.error(
        error.response?.data?.message ||
          "Failed to update group"
      );
      return false;
    }
  };

  /* =======================================================
   * 2. SOCKET HANDLERS
   * ===================================================== */

  // Join / Leave room khi đổi selectedGroup
  useEffect(() => {
    if (!socket || !selectedGroup) return;

    socket.emit("group:join", {
      groupId: selectedGroup._id,
    });

    setGroupMessages([]);
    setGroupTypingUsers({});

    return () => {
      socket.emit("group:leave", {
        groupId: selectedGroup._id,
      });
    };
  }, [socket, selectedGroup]);

  // Lắng nghe socket event của group
  useEffect(() => {
    if (!socket) return;

    const onGroupMessage = ({ groupId, message }) => {
      if (selectedGroupRef.current?._id === groupId) {
        setGroupMessages((prev) => [...prev, message]);
      }
      updateGroupInSidebar(groupId, message);
    };

    const onInvited = ({ name }) => {
      toast.success(`Bạn được thêm vào nhóm "${name}"`);
      fetchMyGroups();
    };

    const onTyping = ({ groupId, senderId }) => {
      if (selectedGroupRef.current?._id === groupId) {
        setGroupTypingUsers((prev) => ({
          ...prev,
          [senderId]: true,
        }));
      }
    };

    const onStopTyping = ({ groupId, senderId }) => {
      if (selectedGroupRef.current?._id === groupId) {
        setGroupTypingUsers((prev) => {
          const copy = { ...prev };
          delete copy[senderId];
          return copy;
        });
      }
    };

    const onGroupUpdated = (updatedGroup) => {
      setMyGroups((prev) =>
        prev.map((g) =>
          g._id === updatedGroup._id
            ? { ...g, ...updatedGroup }
            : g
        )
      );

      if (
        selectedGroupRef.current?._id ===
        updatedGroup._id
      ) {
        setSelectedGroup((prev) => ({
          ...prev,
          ...updatedGroup,
        }));
      }
    };

    const onGroupDeleted = ({ groupId, name }) => {
       setMyGroups((prev) => prev.filter((g) => g._id !== groupId));
       
       if (selectedGroupRef.current?._id === groupId) {
          setSelectedGroup(null);
          toast.error(`Nhóm "${name}" đã bị giải tán.`);
       }
    };

    socket.on("group:updated", onGroupUpdated);
    socket.on("group:message", onGroupMessage);
    socket.on("group:invited", onInvited);
    socket.on("group:typing", onTyping);
    socket.on("group:stop-typing", onStopTyping);
    socket.on("group:deleted", onGroupDeleted);

    return () => {
      socket.off("group:updated", onGroupUpdated);
      socket.off("group:message", onGroupMessage);
      socket.off("group:invited", onInvited);
      socket.off("group:typing", onTyping);
      socket.off("group:stop-typing", onStopTyping);
      socket.off("group:deleted", onGroupDeleted);
    };
  }, [socket, fetchMyGroups, updateGroupInSidebar]);

  // Emit typing / stop typing
  const sendGroupTyping = (isTyping) => {
    if (!socket || !selectedGroup) return;
    socket.emit(
      isTyping ? "group:typing" : "group:stop-typing",
      { groupId: selectedGroup._id }
    );
  };

  /* =======================================================
   * CONTEXT VALUE
   * ===================================================== */
  return (
    <GroupContext.Provider
      value={{
        myGroups,
        selectedGroup,
        setSelectedGroup,
        groupMessages,
        isGroupsLoading,
        isGroupMessagesLoading,
        fetchMyGroups,
        createGroup,
        getGroupMessages,
        sendGroupMessage,
        addMember,
        removeMember,
        groupTypingUsers,
        sendGroupTyping,
        leaveGroup,
        deleteGroup, 
        updateMemberRole,
        transferOwnership, 
        getGroupSharedMedia,
        updateGroupInfo,
        markReadGroup 
      }}
    >
      {children}
    </GroupContext.Provider>
  );
};