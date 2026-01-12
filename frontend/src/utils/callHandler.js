// src/utils/callHandler.js
import { OpenCallWindow } from "./window";
import toast from "react-hot-toast";

/**
 * Hàm chung để bắt đầu cuộc gọi từ bất kỳ đâu
 * @param {Object} caller - Thông tin người gọi (authUser)
 * @param {Object} receiver - Thông tin người nhận (chat/friend/contact)
 * @param {Boolean} isVideo - true nếu là video call
 */
export const startCall = (caller, receiver, isVideo = false) => {
  // 1. Kiểm tra dữ liệu đầu vào
  if (!caller || !receiver) {
    console.error("Thiếu thông tin người gọi hoặc người nhận");
    return;
  }

  if (caller._id === receiver._id) {
    toast.error("Không thể tự gọi cho chính mình!");
    return;
  }

  // 2. TẠO CHANNEL NAME CHUẨN (Ngắn gọn để tránh lỗi Agora)
  // Lấy 4 ký tự cuối của ID
  const shortSenderId = String(caller._id).slice(-4);
  const shortReceiverId = String(receiver._id).slice(-4);
  const channelName = `c_${shortSenderId}_${shortReceiverId}_${Date.now()}`;

  // 3. Mở cửa sổ cuộc gọi
  OpenCallWindow({
    name: receiver.fullName,
    avatar: receiver.profilePic,
    id: receiver._id,
    video: isVideo ? "true" : "false",
    caller: "true", // Luôn là true vì hàm này dùng để BẮT ĐẦU gọi
    channelName: channelName
  });
};