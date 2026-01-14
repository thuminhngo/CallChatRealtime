import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { uploadMiddleware } from "../middleware/multer.middleware.js";
// import { upload } from "../lib/cloudinary.js"; // Không cần thiết nếu đã dùng trong controller

// ✅ FIX: Thêm dấu { và gom gọn các import
import {
  createGroup,
  getUserGroups,
  getGroupById,
  addMember,
  removeMember,
  setMemberRole,
  sendGroupMessage,
  getGroupMessages,
  startGroupCall,
  endGroupCall,
  updateCallStatus,
  leaveGroup,
  updateGroup,
} from "../controllers/group.controller.js";

const router = express.Router();

router.use(protectRoute);

router.post("/", createGroup);
router.get("/", getUserGroups);
router.get("/:id", getGroupById);

router.post("/:id/members", addMember);
router.delete("/:id/members/:userId", removeMember);
router.put("/:id/members/role", setMemberRole);
router.post("/:id/leave", leaveGroup);

router.post(
  "/:id/messages", 
  uploadMiddleware.fields([
    { name: "image", maxCount: 5 },
    { name: "audio", maxCount: 1 },
  ]),
  sendGroupMessage
);

router.put(
  "/:id",
  uploadMiddleware.fields([
    { name: "image", maxCount: 1 },
  ]),
  updateGroup
);



router.get("/:id/messages", getGroupMessages);

router.post("/:id/calls", startGroupCall);
router.post("/calls/:callId/end", endGroupCall);
router.put("/calls/:callId/status", updateCallStatus);

export default router;