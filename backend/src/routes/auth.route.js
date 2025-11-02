import express from "express";
import { login, signup, logout,  updateProfilePic, changePassword , forgotPassword, resetPassword} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { arcjetProtection } from "../middleware/arcject.middleware.js";

const router = express.Router();
router.use(arcjetProtection); // sung dụng middleware Arcjet cho tất cả các route trong auth.route.js

router.get("/test",arcjetProtection, (req, res) => {
  res.status(200).json({ message: "Arcjet protection passed. Access granted." });
});

router.get("/login",arcjetProtection, login);

router.post("/signup", signup);

router.get("/logout", logout);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

router.put("/update-profilePic", protectRoute ,updateProfilePic);
router.put("/change-password", protectRoute, changePassword);

export default router;

