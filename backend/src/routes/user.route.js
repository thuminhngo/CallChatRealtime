import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js"; // Middleware kiểm tra đăng nhập
import { blockUser, unblockUser, getBlockedUsers } from "../controllers/user.controller.js";

const router = express.Router();

router.put("/block/:id", protectRoute, blockUser);
router.put("/unblock/:id", protectRoute, unblockUser);
router.get("/blocked", protectRoute, getBlockedUsers);

export default router;