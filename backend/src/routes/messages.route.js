import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { uploadMiddleware } from "../middleware/multer.middleware.js"; // Import middleware mới
import { 
  sendMessage, 
  getMessagesByUserId, 
  getChatPartners, 
  markAsRead, 
  deleteConversation,
  reactToMessage,
  searchMessagesGlobal,
  searchMessagesInChat
} from "../controllers/message.controller.js";

const router = express.Router();

router.use(protectRoute); //

router.get("/users", getChatPartners);
router.get("/:id", getMessagesByUserId);
router.get("/search/global", searchMessagesGlobal);

// Tìm kiếm tin nhắn trong một cuộc trò chuyện 1-1 cụ thể
router.get("/search/:id", searchMessagesInChat);

router.post("/send/:id", uploadMiddleware.fields([
  { name: "image", maxCount: 1 },
  { name: "audio", maxCount: 1 }
]), sendMessage);

router.put("/read/:partnerId", markAsRead);
router.post("/react/:messageId", reactToMessage);
router.delete("/conversation/:id", deleteConversation);

export default router;