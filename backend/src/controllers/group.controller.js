import Group from "../models/Group.js";
import GroupMessage from "../models/GroupMessage.js";
import GroupCall from "../models/GroupCall.js";
import User from "../models/User.js";
import { emitToUser } from "../lib/socket.js";
import { uploadOnCloudinary } from "../lib/cloudinary.js"; 

/* =========================================
   1. TẠO NHÓM
   ========================================= */
export const createGroup = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const { name, description, members = [], isPrivate } = req.body;

    // Tạo danh sách thành viên ban đầu
    const initialMembers = [{ user: ownerId, role: "owner" }];
    for (const m of members) {
      if (m && m !== ownerId.toString())
        initialMembers.push({ user: m, role: "member", status: "invited" });
    }

    const group = new Group({
      name,
      description,
      owner: ownerId,
      members: initialMembers,
      isPrivate,
    });
    await group.save();

    // 🔥 FIX: Populate thông tin thành viên để Frontend hiển thị ngay
    await group.populate("members.user", "fullName profilePic email");
    await group.populate("owner", "fullName profilePic");

    // Notify invited members
    for (const m of group.members) {
      if (m.user._id.toString() === ownerId.toString()) continue;
      emitToUser(m.user._id, "group:invited", {
        groupId: group._id,
        name: group.name,
      });
    }

    res.status(201).json({ success: true, group });
  } catch (err) {
    console.error("createGroup error:", err);
    res.status(500).json({ message: "Lỗi khi tạo nhóm" });
  }
};

/* =========================================
   2. LẤY DANH SÁCH NHÓM (CỦA USER)
   ========================================= */
export const getUserGroups = async (req, res) => {
  try {
    const myId = req.user._id;
    
    // 1. Lấy nhóm và populate đầy đủ thông tin thành viên
    const groups = await Group.find({ "members.user": myId })
      .populate("owner", "fullName profilePic")
      .populate("members.user", "fullName profilePic email") // 🔥 FIX: Populate để hiện tên/avatar trong Info
      .sort({ updatedAt: -1 });

    // 2. 🔥 FIX: Lấy tin nhắn cuối cùng cho mỗi nhóm để hiện ở Sidebar
    const groupsWithLastMessage = await Promise.all(groups.map(async (group) => {
        const lastMsg = await GroupMessage.findOne({ group: group._id })
            .sort({ createdAt: -1 })
            .select("content attachments createdAt");
        
        const groupObj = group.toObject();
        
        // Gắn thêm field lastMessage và lastMessageTime
        if (lastMsg) {
            groupObj.lastMessage = lastMsg.content || (lastMsg.attachments?.length ? "[File]" : "No content");
            groupObj.lastMessageTime = lastMsg.createdAt;
        } else {
            groupObj.lastMessage = "";
            groupObj.lastMessageTime = group.updatedAt;
        }
        
        return groupObj;
    }));

    // Sắp xếp lại theo tin nhắn mới nhất
    groupsWithLastMessage.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));

    res.status(200).json({ success: true, groups: groupsWithLastMessage });
  } catch (err) {
    console.error("getUserGroups error:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

/* =========================================
   3. LẤY CHI TIẾT NHÓM
   ========================================= */
export const getGroupById = async (req, res) => {
  try {
    const { id } = req.params;
    const group = await Group.findById(id)
      .populate("members.user", "fullName profilePic email") // 🔥 FIX: Populate thành viên
      .populate("owner", "fullName profilePic");
      
    if (!group) return res.status(404).json({ message: "Không tìm thấy nhóm" });
    res.status(200).json({ success: true, group });
  } catch (err) {
    console.error("getGroupById error:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

/* =========================================
   4. THÊM THÀNH VIÊN
   ========================================= */
export const addMember = async (req, res) => {
  try {
    const actorId = req.user._id;
    const { id } = req.params;
    const { userId, role = "member" } = req.body;

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ message: "Không tìm thấy nhóm" });

    const actorRole = group.getMemberRole(actorId);
    if (!actorRole || (actorRole !== "owner" && actorRole !== "admin")) {
      return res.status(403).json({ message: "Bạn không có quyền thêm thành viên" });
    }

    if (group.isMember(userId))
      return res.status(400).json({ message: "Đã là thành viên" });

    group.members.push({ user: userId, role, status: "invited" });
    await group.save();

    // 🔥 FIX: Populate lại để trả về Frontend cập nhật ngay
    await group.populate("members.user", "fullName profilePic email");
    await group.populate("owner", "fullName profilePic");

    emitToUser(userId, "group:member:added", {
      groupId: group._id,
      name: group.name,
    });

    res.status(200).json({ success: true, group });
  } catch (err) {
    console.error("addMember error:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

/* =========================================
   5. XÓA THÀNH VIÊN
   ========================================= */
export const removeMember = async (req, res) => {
  try {
    const actorId = req.user._id;
    const { id, userId } = req.params;

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ message: "Không tìm thấy nhóm" });

    const actorRole = group.getMemberRole(actorId);
    if (!actorRole || (actorRole !== "owner" && actorRole !== "admin")) {
      return res.status(403).json({ message: "Bạn không có quyền xóa thành viên" });
    }

    if (group.owner.toString() === userId.toString())
      return res.status(400).json({ message: "Không thể xóa chủ nhóm" });

    group.members = group.members.filter(
      (m) => m.user.toString() !== userId.toString()
    );
    await group.save();

    // 🔥 FIX: Populate lại
    await group.populate("members.user", "fullName profilePic email");
    await group.populate("owner", "fullName profilePic");

    emitToUser(userId, "group:member:removed", { groupId: group._id });

    res.status(200).json({ success: true, group });
  } catch (err) {
    console.error("removeMember error:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

/* =========================================
   6. RỜI NHÓM
   ========================================= */
export const leaveGroup = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ message: "Không tìm thấy nhóm" });

    if (group.owner.toString() === userId.toString()) {
      return res.status(400).json({ message: "Chủ nhóm không thể rời nhóm. Hãy chuyển quyền trước." });
    }

    const initialCount = group.members.length;
    group.members = group.members.filter(m => m.user.toString() !== userId.toString());

    if (group.members.length === initialCount) {
        return res.status(400).json({ message: "Bạn không phải thành viên nhóm này" });
    }

    await group.save();

    for (const m of group.members) {
      // Logic notify có thể thêm sau
    }

    res.status(200).json({ success: true, message: "Đã rời nhóm" });
  } catch (err) {
    console.error("leaveGroup error:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

/* =========================================
   7. CẬP NHẬT QUYỀN (ROLE)
   ========================================= */
export const setMemberRole = async (req, res) => {
  try {
    const actorId = req.user._id;
    const { id } = req.params; 
    const { userId, role } = req.body;

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ message: "Không tìm thấy nhóm" });

    if (group.owner.toString() !== actorId.toString()) {
      return res.status(403).json({ message: "Chỉ chủ nhóm mới có quyền thay đổi quyền" });
    }

    const member = group.members.find(
      (m) => m.user.toString() === userId.toString()
    );
    if (!member)
      return res.status(404).json({ message: "Thành viên không tồn tại" });

    member.role = role;
    await group.save();


    await group.populate("members.user", "fullName profilePic email");
    await group.populate("owner", "fullName profilePic");

    emitToUser(userId, "group:role:updated", { groupId: group._id, role });

    res.status(200).json({ success: true, group });
  } catch (err) {
    console.error("setMemberRole error:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

/* =========================================
   8. GỬI TIN NHẮN NHÓM
   ========================================= */
export const sendGroupMessage = async (req, res) => {
  try {
    const senderId = req.user._id;
    const { id } = req.params;
    const { content } = req.body;

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ message: "Không tìm thấy nhóm" });
    if (!group.isMember(senderId))
      return res.status(403).json({ message: "Bạn không phải thành viên nhóm" });

    const attachments = [];

    // Image
    if (req.files?.image?.length) {
      for (const img of req.files.image) {
        const uploadResult = await uploadOnCloudinary(img.path, { resource_type: "image" });
        if (uploadResult?.url) {
          attachments.push({ type: "image", url: uploadResult.url });
        }
      }
    }

    // Audio
    if (req.files?.audio?.[0]) {
      const audioFile = req.files.audio[0];
      const uploadResult = await uploadOnCloudinary(audioFile.path, { resource_type: "video" });
      if (uploadResult?.url) {
        attachments.push({ type: "audio", url: uploadResult.url });
      }
    }

    if (!content && attachments.length === 0) {
      return res.status(400).json({ message: "Tin nhắn không được để trống" });
    }

    const message = await GroupMessage.create({
      group: id,
      sender: senderId,
      content,
      attachments,
    });

    await message.populate("sender", "fullName profilePic");

    // Update timestamp cho group để nhảy lên đầu
    group.updatedAt = new Date();
    await group.save();

    // Realtime
    for (const m of group.members) {
      if (m.user.toString() === senderId.toString()) continue;
      emitToUser(m.user, "group:message", { groupId: id, message });
    }

    res.status(201).json({ success: true, message });
  } catch (err) {
    console.error("sendGroupMessage error:", err);
    res.status(500).json({ message: "Lỗi server khi gửi tin nhắn" });
  }
};

/* API chỉnh sửa thông tin nhóm */
export const updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found" });
    }

    if (name) group.name = name;
    if (description !== undefined) group.description = description;

    
    const imageFile = req.files?.image?.[0]; 

    if (imageFile) {
      const uploadResult = await uploadOnCloudinary(imageFile.path, {
        resource_type: "image",
      });
      // Helper uploadOnCloudinary thường trả về .url hoặc .secure_url
      group.avatar = uploadResult.url || uploadResult.secure_url;
    }

    await group.save();

    await group.populate("members.user", "fullName profilePic email");
    await group.populate("owner", "fullName profilePic");

    res.json({
      success: true,
      group,
    });
  } catch (error) {
    console.error("updateGroup error:", error);
    res.status(500).json({ success: false, message: "Update failed" });
  }
};
/* =========================================
   9. CÁC API KHÁC (CALL, MESSAGE LIST...)
   ========================================= */
export const getGroupMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ message: "Không tìm thấy nhóm" });
    if (!group.isMember(userId)) return res.status(403).json({ message: "Bạn không phải thành viên nhóm" });

    const messages = await GroupMessage.find({ group: id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("sender", "fullName profilePic");

    res.status(200).json({ success: true, messages: messages.reverse() });
  } catch (err) {
    console.error("getGroupMessages error:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

export const startGroupCall = async (req, res) => {
  try {
    const hostId = req.user._id;
    const { id } = req.params;
    const { participantIds = [], isVideo = true } = req.body;

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ message: "Không tìm thấy nhóm" });
    if (!group.isMember(hostId)) return res.status(403).json({ message: "Bạn không phải thành viên" });

    const participants = group.members
      .filter((m) => participantIds.includes(m.user.toString()))
      .map((m) => ({ user: m.user, state: "ringing" }));

    const call = new GroupCall({
      group: id,
      host: hostId,
      participants,
      status: "ongoing",
      startedAt: new Date(),
    });
    await call.save();

    for (const p of participants) {
      emitToUser(p.user, "group:call:incoming", {
        groupId: id,
        callId: call._id,
        host: hostId,
        isVideo,
      });
    }

    res.status(201).json({ success: true, call });
  } catch (err) {
    console.error("startGroupCall error:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

export const endGroupCall = async (req, res) => {
  try {
    const { callId } = req.params;
    const call = await GroupCall.findById(callId);
    if (!call) return res.status(404).json({ message: "Không tìm thấy cuộc gọi" });

    call.status = "ended";
    call.endedAt = new Date();
    await call.save();

    for (const p of call.participants) {
      emitToUser(p.user, "group:call:ended", { callId: call._id });
    }

    res.status(200).json({ success: true, call });
  } catch (err) {
    console.error("endGroupCall error:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

export const updateCallStatus = async (req, res) => {
  try {
    const userId = req.user._id;
    const { callId } = req.params;
    const { status } = req.body; 

    const call = await GroupCall.findById(callId);
    if (!call) return res.status(404).json({ message: "Không tìm thấy cuộc gọi" });

    const participant = call.participants.find(p => p.user.toString() === userId.toString());
    if (!participant) return res.status(403).json({ message: "Bạn không có trong cuộc gọi này" });

    participant.state = status;
    if (status === "connected") {
        participant.joinedAt = new Date();
    }
    await call.save();

    emitToUser(call.host, "group:call:status_update", { callId, userId, status });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("updateCallStatus error:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};