import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { uploadMiddleware } from "../middleware/multer.middleware.js"; // Import middleware mới
import { 
  sendMessage, 
  getMessagesByUserId, 
  getChatPartners, 
  markAsRead, 
  deleteConversation,
  reactToMessage 
} from "../controllers/message.controller.js";

const router = express.Router();

router.use(protectRoute); //

router.get("/users", getChatPartners);
router.get("/:id", getMessagesByUserId);

router.post("/send/:id", uploadMiddleware.fields([
  { name: "image", maxCount: 1 },
  { name: "audio", maxCount: 1 }
]), sendMessage);

router.put("/read/:partnerId", markAsRead);
router.post("/react/:messageId", reactToMessage);
router.delete("/conversation/:id", deleteConversation);

export default router;