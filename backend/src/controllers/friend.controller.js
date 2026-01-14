import User from "../models/User.js";
import FriendRequest from "../models/FriendRequest.js";
import { getReceiverSocketId, io, userSocketsMap } from "../lib/socket.js";

/* 1. Gửi lời mời kết bạn */
export const sendFriendRequest = async (req, res) => {
  try {
    const { receiverId } = req.body;
    const senderId = req.user._id;

    if (senderId.toString() === receiverId.toString()) {
      return res.status(400).json({ message: "You cannot send a request to yourself." });
    }

    const sender = await User.findById(senderId);
    const isAlreadyFriend = sender.friends.some(id => id.toString() === receiverId.toString());
    
    if (isAlreadyFriend) {
      return res.status(400).json({ message: "You are already friends." });
    }

    const existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId },
      ],
      status: "pending",
    });

    if (existingRequest) {
      return res.status(400).json({ message: "Friend request already pending." });
    }

    const newRequest = new FriendRequest({ sender: senderId, receiver: receiverId });
    await newRequest.save();

    // Socket: Báo cho người nhận
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      await newRequest.populate("sender", "fullName profilePic email");
      
      // Gửi xuống client object chuẩn hóa luôn để họ thêm vào list ngay
      const formattedNotif = {
        _id: sender._id,
        fullName: sender.fullName,
        profilePic: sender.profilePic,
        email: sender.email,
        requestId: newRequest._id, // Quan trọng để chấp nhận/từ chối
      };
      
      io.to(receiverSocketId).emit("newFriendRequest", formattedNotif);
    }

    res.status(200).json({ message: "Friend request sent successfully.", request: newRequest });
  } catch (error) {
    console.error("Send request error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

/* 2. Chấp nhận lời mời */
export const acceptFriendRequest = async (req, res) => {
  try {
    // Lưu ý: Frontend cần gửi requestId (ID của bản ghi Request), không phải ID của User
    const { requestId } = req.body; 
    const userId = req.user._id;

    const request = await FriendRequest.findById(requestId);
    if (!request || request.status !== "pending") {
      return res.status(404).json({ message: "Request not found or already handled." });
    }

    if (request.receiver.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Unauthorized action." });
    }

    // Cập nhật mảng friends
    await User.findByIdAndUpdate(request.sender, { $push: { friends: request.receiver } });
    const currentUser = await User.findByIdAndUpdate(
      request.receiver, 
      { $push: { friends: request.sender } },
      { new: true }
    );

    await FriendRequest.findByIdAndDelete(requestId);

    // Socket: Báo cho người gửi là lời mời đã được chấp nhận
    const senderSocketId = getReceiverSocketId(request.sender);
    if (senderSocketId) {
      io.to(senderSocketId).emit("friendRequestAccepted", {
        _id: currentUser._id,
        fullName: currentUser.fullName,
        profilePic: currentUser.profilePic,
        email: currentUser.email
      });
    }

    // Trả về info người bạn mới để Frontend add vào list Friends ngay lập tức
    const newFriend = await User.findById(request.sender).select("fullName profilePic email");

    res.status(200).json({ message: "Friend request accepted.", newFriend });
  } catch (error) {
    console.error("Accept request error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

/* 3. Từ chối lời mời */
export const rejectFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.body;
    const userId = req.user._id;

    const request = await FriendRequest.findById(requestId);
    if (!request) return res.status(404).json({ message: "Request not found." });

    if (request.receiver.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Unauthorized action." });
    }

    await FriendRequest.findByIdAndDelete(requestId);

    res.status(200).json({ message: "Friend request rejected." });
  } catch (error) {
    console.error("Reject request error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

/* 4. Hủy lời mời đã gửi (Dùng cho tab Sent) */
export const cancelFriendRequest = async (req, res) => {
  try {
    const { receiverId } = req.body; // Ở đây nhận receiverId vì tìm theo cặp user
    const senderId = req.user._id;

    await FriendRequest.findOneAndDelete({
      sender: senderId,
      receiver: receiverId,
      status: "pending"
    });

    res.status(200).json({ message: "Request cancelled." });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
};

/* 5. Lấy danh sách bạn bè (Kèm trạng thái Online) */
export const getFriends = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).populate("friends", "fullName email profilePic");

    const friendsWithStatus = user.friends.map((friend) => {
      const friendObj = friend.toObject();
      return {
        ...friendObj,
        isOnline: Object.prototype.hasOwnProperty.call(userSocketsMap, friend._id.toString()),
      };
    });

    res.status(200).json(friendsWithStatus);
  } catch (error) {
    console.error("Get friends error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

/* 6. Lấy danh sách bạn bè Online */
export const getOnlineFriends = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).populate("friends", "fullName email profilePic");

    const onlineFriends = user.friends.filter((friend) =>
      Object.prototype.hasOwnProperty.call(userSocketsMap, friend._id.toString())
    );

    res.status(200).json(onlineFriends);
  } catch (error) {
    console.error("Get online friends error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

/* 7. Lấy danh sách lời mời ĐANG CHỜ (Received Requests) - ĐÃ CHUẨN HÓA */
export const getPendingRequests = async (req, res) => {
  try {
    const userId = req.user._id;

    const requests = await FriendRequest.find({
      receiver: userId,
      status: "pending",
    }).populate("sender", "fullName email profilePic"); 

    // CHUẨN HÓA: Trả về danh sách User (người gửi)
    const formattedRequests = requests.map(req => {
        if (!req.sender) return null;
        return {
            _id: req.sender._id,            // ID người gửi
            fullName: req.sender.fullName,
            profilePic: req.sender.profilePic,
            email: req.sender.email,
            requestId: req._id              // ID Request (quan trọng để accept/reject)
        }
    }).filter(item => item !== null);

    res.status(200).json(formattedRequests);
  } catch (error) {
    console.error("Get pending requests error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

/* 8. Lấy danh sách lời mời ĐÃ GỬI (Sent Requests) - ĐÃ CHUẨN HÓA */
export const getSentRequests = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const requests = await FriendRequest.find({
      sender: userId,
      status: "pending",
    }).populate("receiver", "fullName email profilePic"); 

    // CHUẨN HÓA: Trả về danh sách User (người nhận)
    const formattedRequests = requests.map((req) => {
      if (!req.receiver) return null;
      return {
        _id: req.receiver._id,          // ID người nhận
        fullName: req.receiver.fullName,
        email: req.receiver.email,
        profilePic: req.receiver.profilePic,
        requestId: req._id              // ID Request
      };
    }).filter(item => item !== null);

    res.status(200).json(formattedRequests);
  } catch (error) {
    console.error("Get sent requests error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

/* 9. Hủy kết bạn */
export const unfriend = async (req, res) => {
    try {
      const { friendId } = req.body;
      const userId = req.user._id;
  
      await User.findByIdAndUpdate(userId, { $pull: { friends: friendId } });
      await User.findByIdAndUpdate(friendId, { $pull: { friends: userId } });
  
      const friendSocketId = getReceiverSocketId(friendId);
      if(friendSocketId) {
          io.to(friendSocketId).emit("friendRemoved", { userId: userId });
      }
    
      res.status(200).json({ message: "Unfriend successfully." });
    } catch (error) {
      console.error("Unfriend error:", error);
      res.status(500).json({ message: "Server error." });
    }
  };



  export const searchFriends = async (req, res) => {
  try {
    const { q } = req.query;
    const myId = req.user._id;

    // Tìm kiếm trong danh sách bạn bè của user hiện tại
    const user = await User.findById(myId).populate({
      path: "friends",
      match: { fullName: { $regex: q, $options: "i" } },
      select: "fullName profilePic email"
    });

    res.status(200).json(user.friends || []);
  } catch (error) {
    res.status(500).json({ message: "Error searching friends" });
  }
};