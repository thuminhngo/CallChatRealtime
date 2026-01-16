import Call from "../models/Call.js";
import User from "../models/User.js";
import { emitToUser } from "../lib/socket.js";
import { ENV } from "../lib/env.js";
import pkg from "agora-access-token";

const { RtcTokenBuilder, RtcRole } = pkg;

/* =========================================
   1. LẤY LỊCH SỬ CUỘC GỌI (Đã sửa)
   ========================================= */
export const getCallHistory = async (req, res) => {
  try {
    const myId = req.user._id.toString();

    const calls = await Call.find({
      $or: [{ callerId: myId }, { receiverId: myId }],
    })
      .populate("callerId", "fullName profilePic email")
      .populate("receiverId", "fullName profilePic email")
      .sort({ createdAt: -1 });

    const formattedCalls = calls.map((call) => {
      const isOutgoing = call.callerId._id.toString() === myId;
      const contact = isOutgoing ? call.receiverId : call.callerId;
      
      // 🔥 LOGIC MỚI: Trả về đúng status mà user này cần thấy
      // Nếu là người gọi -> lấy callerStatus
      // Nếu là người nhận -> lấy receiverStatus
      const myStatus = isOutgoing ? call.callerStatus : call.receiverStatus;

      return {
        _id: call._id,
        contact,
        direction: isOutgoing ? "outgoing" : "incoming",
        status: myStatus, // Status hiển thị (đã được cá nhân hóa)
        callType: call.callType,
        duration: call.duration,
        createdAt: call.createdAt,
      };
    });

    res.status(200).json({ success: true, calls: formattedCalls });
  } catch (error) {
    console.error("getCallHistory error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================================
   2. LƯU LOG CUỘC GỌI (Đã sửa logic phân loại)
   ========================================= */
export const saveCallLog = async (req, res) => {
  try {
    const { receiverId, callType, status, duration = 0 } = req.body;
    const callerId = req.user._id;

    // Mặc định
    let callerStatus = "answered";
    let receiverStatus = "answered";

    // 🔥 PHÂN LOẠI TRẠNG THÁI CHO 2 PHÍA
    switch (status) {
      case "answered":
        callerStatus = "answered";
        receiverStatus = "answered";
        break;

      case "missed": 
        // Timeout: Người gọi thấy "Không trả lời", Người nhận thấy "Nhỡ"
        callerStatus = "unavailable"; 
        receiverStatus = "missed";    
        break;

      case "rejected": 
        // Người nhận tắt máy: Người gọi thấy "Máy bận", Người nhận thấy "Đã từ chối"
        callerStatus = "busy";        
        receiverStatus = "rejected";  
        break;

      case "cancelled":
        // Người gọi tắt trước: Người gọi thấy "Đã hủy", Người nhận thấy "Nhỡ"
        callerStatus = "cancelled";   
        receiverStatus = "missed";    
        break;
      
      case "busy":
         // Đang trong cuộc gọi khác
         callerStatus = "busy";
         receiverStatus = "missed";
         break;

      default:
        callerStatus = status;
        receiverStatus = status;
    }

    const call = await Call.create({
      callerId,
      receiverId,
      callType,
      status: status, // Status kỹ thuật (chung)
      callerStatus,   // Status hiển thị cho người gọi
      receiverStatus, // Status hiển thị cho người nhận
      duration,
    });

    // Notify Realtime để cập nhật danh sách ngay lập tức
    emitToUser(receiverId, "call:history_updated", {});
    emitToUser(callerId, "call:history_updated", {});

    res.status(201).json({ success: true, call });
  } catch (error) {
    console.error("Lỗi saveCallLog:", error);
    res.status(500).json({ message: "Lỗi lưu lịch sử" });
  }
};
/**
 * 3. Sinh Token Agora (Voice / Video)
 */
export const generateAgoraToken = async (req, res) => {
  try {
    const { channelName } = req.query;

    if (!channelName) {
      return res
        .status(400)
        .json({ message: "Thiếu channelName" });
    }

    const appId = ENV.AGORA_APP_ID;
    const appCertificate = ENV.AGORA_APP_CERTIFICATE;

    if (!appId || !appCertificate) {
      return res
        .status(500)
        .json({ message: "Agora config chưa đầy đủ" });
    }

    const uid = 0; // Agora tự gán UID
    const role = RtcRole.PUBLISHER;
    const expireSeconds = 3600;
    const privilegeExpiredTs =
      Math.floor(Date.now() / 1000) + expireSeconds;

    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid,
      role,
      privilegeExpiredTs
    );

    res.status(200).json({
      success: true,
      token,
      appId,
    });
  } catch (error) {
    console.error("generateAgoraToken error:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};
