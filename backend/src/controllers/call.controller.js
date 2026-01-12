import Call from "../models/Call.js";
import User from "../models/User.js";
import { emitToUser } from "../lib/socket.js";
import { ENV } from "../lib/env.js";
import pkg from 'agora-access-token';

const { RtcTokenBuilder, RtcRole } = pkg;

/**
 * 1. Lấy lịch sử cuộc gọi (Dùng cho trang CallsDashboard)
 */
export const getCallHistory = async (req, res) => {
  try {
    const myId = req.user._id;

    // Tìm tất cả cuộc gọi liên quan đến mình
    const calls = await Call.find({
      $or: [{ callerId: myId }, { receiverId: myId }],
    })
      .populate("callerId", "fullName profilePic email")
      .populate("receiverId", "fullName profilePic email")
      .sort({ createdAt: -1 });

    // Định dạng lại dữ liệu để khớp với component CallHistoryItem.jsx
    const formattedCalls = calls.map((call) => {
      const isOutgoing = call.callerId._id.toString() === myId.toString();
      const contact = isOutgoing ? call.receiverId : call.callerId;

      return {
        _id: call._id,
        contact: contact,
        direction: isOutgoing ? "outgoing" : "incoming",
        status: call.status,
        duration: call.duration,
        callType: call.callType,
        createdAt: call.createdAt,
      };
    });

    res.status(200).json({ success: true, calls: formattedCalls });
  } catch (error) {
    console.error("Error in getCallHistory:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * 2. Lưu lịch sử cuộc gọi mới (Gọi khi cuộc gọi kết thúc/bị từ chối)
 */
export const saveCallLog = async (req, res) => {
  try {
    const { receiverId, callType, status, duration } = req.body;
    const callerId = req.user._id;

    const newCall = new Call({
      callerId,
      receiverId,
      callType,
      status,
      duration,
    });

    await newCall.save();

    // Thông báo cho người kia để họ cập nhật danh sách log real-time
    emitToUser(receiverId, "call:history_updated", newCall);

    res.status(201).json({ success: true, call: newCall });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lưu lịch sử cuộc gọi" });
  }
};

/**
 * 3. HÀM SINH TOKEN AGORA CHO CUỘC GỌI VIDEO/VOICE
 */
export const generateAgoraToken = async (req, res) => {
  try {
    const { channelName } = req.query; // Tên phòng được gửi từ Frontend
    if (!channelName) {
      return res.status(400).json({ message: "Thiếu tên phòng (channelName)" });
    }

    const appId = ENV.AGORA_APP_ID; 
    const appCertificate = ENV.AGORA_APP_CERTIFICATE; 
    const uid = 0; // 0 cho phép Agora tự định danh người dùng
    const role = RtcRole.PUBLISHER; // Quyền được phát hình ảnh và âm thanh

    // Token sẽ hết hạn sau 1 giờ (3600 giây)
    const expirationTimeInSeconds = 3600;
    const privilegeExpiredTs = Math.floor(Date.now() / 1000) + expirationTimeInSeconds;

    // Gọi hàm của thư viện để sinh ra chuỗi Token mã hóa
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid,
      role,
      privilegeExpiredTs
    );

    res.status(200).json({ success: true, token, appId });
  } catch (error) {
    console.error("Lỗi sinh Token:", error);
    res.status(500).json({ message: "Lỗi Server" });
  }
};