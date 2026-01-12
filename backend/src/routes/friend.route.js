import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriends,
  getOnlineFriends,
  getSentRequests,
  getPendingRequests,
  cancelFriendRequest,
  unfriend,
} from "../controllers/friend.controller.js";
import { arcjetProtection } from "../middleware/arcject.middleware.js";

const router = express.Router();
router.use(protectRoute); // Sử dụng middleware Arcjet cho tất cả các route trong friend.route.js

router.get("/list", getFriends); // Lấy danh sách bạn bè
router.get("/requests", getPendingRequests); // Lời mời đã nhận
router.get("/sent-requests", getSentRequests); // Lời mời đã gửi
router.get("/online", getOnlineFriends); // Lấy danh sách bạn bè đang online

router.post("/request", sendFriendRequest); // Gửi lời mời kết bạn
router.post("/accept", acceptFriendRequest); // Chấp nhận lời mời kết bạn
router.post("/reject", rejectFriendRequest); // Từ chối lời mời kết bạn
router.post("/unfriend", unfriend); // Hủy kết bạn
router.post("/cancel", cancelFriendRequest); // Hủy lời mời đã gửi
export default router;
