import User from "../models/User.js";
import { emitToUser } from "../lib/socket.js";

/* Chặn User */
export const blockUser = async (req, res) => {
  try {
    const { id: idToBlock } = req.params;
    const myId = req.user._id;

    if (myId.toString() === idToBlock) {
      return res.status(400).json({ message: "Không thể tự chặn chính mình" });
    }

    const userToBlock = await User.findById(idToBlock);
    if (!userToBlock) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    // Tối ưu: Chạy cả 2 lệnh update DB cùng lúc
    await Promise.all([
      // Update mình: Thêm vào danh sách chặn, xóa khỏi bạn bè
      User.findByIdAndUpdate(myId, {
        $addToSet: { blockedUsers: idToBlock },
        $pull: { friends: idToBlock },
      }),
      // Update người kia: Xóa mình khỏi danh sách bạn bè của họ
      User.findByIdAndUpdate(idToBlock, {
        $pull: { friends: myId },
      }),
    ]);

    // Socket Events
    emitToUser(idToBlock, "user:blocked", { senderId: myId.toString() });
    
    // Báo cho cả 2 bên là đã hủy kết bạn (để cập nhật UI ngay lập tức)
    emitToUser(idToBlock, "friendRemoved", { userId: myId.toString() });
    emitToUser(myId.toString(), "friendRemoved", { userId: idToBlock });

    res.status(200).json({ message: "Đã chặn người dùng thành công" });
  } catch (error) {
    console.error("Error in blockUser:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/* Bỏ chặn User */
export const unblockUser = async (req, res) => {
  try {
    const { id: idToUnblock } = req.params;
    const myId = req.user._id;

    // 1. Kiểm tra user có tồn tại không (Tùy chọn, nhưng nên có)
    const userExists = await User.findById(idToUnblock);
    if (!userExists) {
        return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    // 2. Xóa khỏi danh sách chặn
    await User.findByIdAndUpdate(myId, {
      $pull: { blockedUsers: idToUnblock },
    });

    // 3. Gửi Socket thông báo (nếu cần)
    emitToUser(idToUnblock, "user:unblocked", { senderId: myId });

    // ĐÃ XÓA: Các sự kiện friendRemoved. 
    // Lý do: Bỏ chặn không có nghĩa là kết bạn lại, và cũng không phải là hủy kết bạn (đã hủy lúc chặn rồi).

    res.status(200).json({ message: "Đã bỏ chặn thành công" });
  } catch (error) {
    console.error("Error in unblockUser:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/* Lấy danh sách người bị chặn */
export const getBlockedUsers = async (req, res) => {
  try {
    const myId = req.user._id;
    
    // Populate lấy thông tin chi tiết từ ID trong mảng blockedUsers
    const user = await User.findById(myId).populate("blockedUsers", "-password");

    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user.blockedUsers);
  } catch (error) {
    console.error("Error in getBlockedUsers controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};