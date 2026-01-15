import Call from "../models/Call.js";
import User from "../models/User.js";
import { emitToUser } from "../lib/socket.js";
import { ENV } from "../lib/env.js";
import pkg from "agora-access-token";

const { RtcTokenBuilder, RtcRole } = pkg;

/**
 * 1. Lấy lịch sử cuộc gọi (Calls Dashboard)
 */
export const getCallHistory = async (req, res) => {
  try {
    const myId = req.user._id;

    const calls = await Call.find({
      $or: [{ callerId: myId }, { receiverId: myId }],
    })
      .populate("callerId", "fullName profilePic email")
      .populate("receiverId", "fullName profilePic email")
      .sort({ createdAt: -1 });

    const formattedCalls = calls.map((call) => {
      const isOutgoing =
        call.callerId._id.toString() === myId.toString();
      const contact = isOutgoing ? call.receiverId : call.callerId;

      return {
        _id: call._id,
        contact,
        direction: isOutgoing ? "outgoing" : "incoming",
        status: isOutgoing
          ? call.callerStatus
          : call.receiverStatus,
        duration: call.duration,
        callType: call.callType,
        createdAt: call.createdAt,
      };
    });

    res.status(200).json({ success: true, calls: formattedCalls });
  } catch (error) {
    console.error("getCallHistory error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * 2. Lưu lịch sử cuộc gọi
 * Được gọi 1 lần DUY NHẤT khi call kết thúc
 */
export const saveCallLog = async (req, res) => {
  try {
    const { receiverId, callType, reason, duration = 0 } = req.body;
    const callerId = req.user._id;

    if (!receiverId || !callType || !reason) {
      return res.status(400).json({ message: "Thiếu dữ liệu cuộc gọi" });
    }

    let callerStatus = "busy";
    let receiverStatus = "missed";

    switch (reason) {
      case "completed":
        callerStatus = "completed";
        receiverStatus = "completed";
        break;

      case "timeout":
        callerStatus = "busy";
        receiverStatus = "missed";
        break;

      case "rejected":
        callerStatus = "busy";
        receiverStatus = "rejected";
        break;

      case "cancelled":
        callerStatus = "cancelled";
        receiverStatus = "missed";
        break;
    }

    const call = await Call.create({
      callerId,
      receiverId,
      callType,
      callerStatus,
      receiverStatus,
      duration,
    });

    // realtime update dashboard
    emitToUser(receiverId, "call:history_updated");
    emitToUser(callerId, "call:history_updated");

    res.status(201).json({ success: true, call });
  } catch (error) {
    console.error("saveCallLog error:", error);
    res.status(500).json({ message: "Lỗi khi lưu lịch sử cuộc gọi" });
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
