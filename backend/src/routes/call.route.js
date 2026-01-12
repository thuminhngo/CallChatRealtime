import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getCallHistory, saveCallLog, generateAgoraToken } from "../controllers/call.controller.js"; // Đã thêm generateAgoraToken

const router = express.Router();

router.get("/history", protectRoute, getCallHistory);
router.post("/log", protectRoute, saveCallLog);
router.get("/token", protectRoute, generateAgoraToken);

export default router;