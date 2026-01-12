import Message from "../models/Message.js";
import User from "../models/User.js";
import { uploadOnCloudinary } from "../lib/cloudinary.js";
// ✅ Import đầy đủ các hàm socket cần thiết
import { getReceiverSocketId, io, isUserOnline, emitToUser } from "../lib/socket.js"; 

/* =========================
   1. LẤY DANH SÁCH CHAT
========================= */
export const getChatPartners = async (req, res) => {
  try {
    const myId = req.user._id;

    const me = await User.findById(myId);
    if (!me) return res.status(404).json({ message: "User not found" });

    // Lấy danh sách cuộc trò chuyện đã xóa
    const deletedMap = new Map();
    (me.deletedConversations || []).forEach(item => {
      deletedMap.set(item.partnerId.toString(), new Date(item.deletedAt));
    });

    // Tìm tất cả tin nhắn liên quan đến mình
    const messages = await Message.find({
      $or: [{ senderId: myId }, { receiverId: myId }],
    }).sort({ createdAt: -1 });

    const partnerMap = new Map();

    messages.forEach(msg => {
      const partnerId =
        msg.senderId.toString() === myId.toString()
          ? msg.receiverId.toString()
          : msg.senderId.toString();

      // Bỏ qua tin nhắn cũ hơn thời điểm xóa cuộc trò chuyện
      const deletedAt = deletedMap.get(partnerId);
      if (deletedAt && msg.createdAt <= deletedAt) return;

      if (!partnerMap.has(partnerId)) {
        partnerMap.set(partnerId, {
          lastMessage: msg,
          unreadCount: 0,
        });
      }

      // Đếm tin nhắn chưa đọc từ người khác gửi cho mình
      if (msg.receiverId.toString() === myId.toString() && !msg.isRead) {
        partnerMap.get(partnerId).unreadCount++;
      }
    });

    const partnerIds = [...partnerMap.keys()];
    const partners = await User.find({ _id: { $in: partnerIds } }).select("-password");

    const result = partners.map(p => {
      const data = partnerMap.get(p._id.toString());
      return {
        ...p.toObject(),
        isOnline: isUserOnline(p._id.toString()),
        lastMessage:
          data.lastMessage.text ||
          (data.lastMessage.image ? "[Hình ảnh]" : data.lastMessage.audio ? "[Voice]" : ""),
        lastMessageTime: data.lastMessage.createdAt,
        unreadCount: data.unreadCount,
      };
    });

    // Sắp xếp theo tin nhắn mới nhất
    result.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));

    res.status(200).json(result);
  } catch (err) {
    console.error("getChatPartners error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   2. LẤY TIN NHẮN & ĐÁNH DẤU ĐÃ ĐỌC (Updated)
========================= */
export const getMessagesByUserId = async (req, res) => {
  try {
    const myId = req.user._id;
    const { id: partnerId } = req.params;

    const partner = await User.findById(partnerId);
    if (!partner) return res.status(404).json({ message: "User not found" });

    // 1. Kiểm tra block
    const isBlockedByPartner = partner.blockedUsers?.some(
      id => id.toString() === myId.toString()
    );

    const me = await User.findById(myId);
    // Kiểm tra lịch sử xóa chat
    const deletedState = me.deletedConversations?.find(
      item => item.partnerId.toString() === partnerId
    );

    const deletedAt = deletedState ? new Date(deletedState.deletedAt) : new Date(0);

    // 2. Lấy danh sách tin nhắn
    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: partnerId },
        { senderId: partnerId, receiverId: myId },
      ],
      createdAt: { $gt: deletedAt },
    })
      .sort({ createdAt: 1 })
      .populate("senderId", "fullName profilePic")
      .populate("receiverId", "fullName profilePic");

    // ======================================================
    // 🔥 LOGIC CẬP NHẬT TỨC THÌ (Thêm đoạn này)
    // ======================================================
    
    // Tìm các tin nhắn do đối phương gửi (sender = partnerId)
    // gửi cho mình (receiver = myId) mà chưa đọc (isRead = false)
    const unreadMessages = await Message.updateMany(
      { senderId: partnerId, receiverId: myId, isRead: false },
      { $set: { isRead: true } }
    );

    // Nếu có ít nhất 1 tin nhắn được cập nhật (unreadMessages.modifiedCount > 0)
    // Báo cho phía Đối Phương biết là mình đã đọc (để họ hiện chữ "Seen")
    if (unreadMessages.modifiedCount > 0) {
      const partnerSocketId = getReceiverSocketId(partnerId);
      if (partnerSocketId) {
        // Gửi sự kiện 'messagesRead' cho đối phương
        io.to(partnerSocketId).emit("messagesRead", { 
          conversationId: myId // ID của cuộc trò chuyện (là mình)
        });
      }
      
      // (Tuỳ chọn) Gửi sự kiện cho chính các tab khác của mình để cập nhật sidebar
      const mySocketId = getReceiverSocketId(myId);
      if (mySocketId) {
         io.to(mySocketId).emit("conversationRead", {
           partnerId: partnerId
         });
      }
    }

    res.status(200).json({
      messages,
      isBlockedByPartner,
    });

  } catch (err) {
    console.error("getMessagesByUserId error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
/* =========================
   3. GỬI TIN NHẮN (TEXT / IMAGE / VOICE) - ĐÃ SỬA
========================= */
export const sendMessage = async (req, res) => {
  try {
    const senderId = req.user._id;
    const receiverId = req.params.id;
    const { text } = req.body;

    let imageUrl = null;
    let audioUrl = null;

    // ✅ FIX: Lấy .url từ kết quả trả về của Cloudinary

    // Xử lý Image
    if (req.files?.image?.[0]) {
      const localPath = req.files.image[0].path;
      const uploadResult = await uploadOnCloudinary(localPath, {
        resource_type: "image",
      });
      // Kiểm tra có kết quả thì mới lấy url
      if (uploadResult) imageUrl = uploadResult.url;
    }

    // Xử lý Audio
    if (req.files?.audio?.[0]) {
      const localPath = req.files.audio[0].path;
      const uploadResult = await uploadOnCloudinary(localPath, {
        resource_type: "video", // Cloudinary dùng 'video' cho audio
      });
      // Kiểm tra có kết quả thì mới lấy url
      if (uploadResult) audioUrl = uploadResult.url;
    }

    // Kiểm tra rỗng
    if (!text && !imageUrl && !audioUrl) {
      return res.status(400).json({ message: "Message is empty" });
    }

    // ✅ FIX: Tạo Message trực tiếp (Bỏ Conversation)
    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl, // Lưu String URL
      audio: audioUrl, // Lưu String URL
    });

    await newMessage.save();

    // ✅ FIX: Realtime Socket
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      // Gửi event 'newMessage' cho người nhận
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("❌ sendMessage error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* =========================
   4. ĐÁNH DẤU ĐÃ ĐỌC
========================= */
export const markAsRead = async (req, res) => {
  try {
    const myId = req.user._id;
    const { partnerId } = req.params;

    await Message.updateMany(
      { senderId: partnerId, receiverId: myId, isRead: false },
      { $set: { isRead: true } }
    );

    // Báo cho người gửi biết tin nhắn đã được đọc
    emitToUser(partnerId, "messagesRead", { partnerId: myId });

    res.status(200).json({ success: true });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   5. REACTION
========================= */
export const reactToMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    // Tìm xem user này đã react chưa
    const index = message.reactions.findIndex(
      r => r.userId.toString() === userId.toString()
    );

    if (index > -1) {
      // Nếu react icon giống hệt -> Xóa (toggle off)
      // Nếu khác -> Thay đổi icon mới
      message.reactions[index].emoji === emoji
        ? message.reactions.splice(index, 1)
        : (message.reactions[index].emoji = emoji);
    } else {
      // Chưa react -> Thêm mới
      message.reactions.push({ emoji, userId });
    }

    await message.save();

    // Gửi socket cho cả người gửi và người nhận để cập nhật UI
    emitToUser(message.senderId, "messageReaction", message);
    emitToUser(message.receiverId, "messageReaction", message);

    res.status(200).json(message);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   6. XOÁ CUỘC TRÒ CHUYỆN
========================= */
export const deleteConversation = async (req, res) => {
  try {
    const myId = req.user._id;
    const { id: partnerId } = req.params;

    const user = await User.findById(myId);
    
    // Tìm trong danh sách đã xóa xem có chưa
    const index = user.deletedConversations.findIndex(
      i => i.partnerId.toString() === partnerId
    );

    if (index > -1) {
      user.deletedConversations[index].deletedAt = new Date();
    } else {
      user.deletedConversations.push({ partnerId, deletedAt: new Date() });
    }

    await user.save();
    res.status(200).json({ success: true });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};