import express from "express";
import { login, signup, logout,  updateProfile, changePassword , forgotPassword, resetPassword , searchUserByEmail, checkAuth} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { arcjetProtection } from "../middleware/arcject.middleware.js";

const router = express.Router();
//router.use(arcjetProtection); // sung dụng middleware Arcjet cho tất cả các route trong auth.route.js

router.get("/test",arcjetProtection, (req, res) => {
  res.status(200).json({ message: "Arcjet protection passed. Access granted." });
});

router.post("/login", login);

router.post("/signup", signup);

router.get("/logout", logout);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

router.put("/update-profile", protectRoute ,updateProfile);
router.put("/change-password", protectRoute, changePassword);

router.get("/search", protectRoute, searchUserByEmail);

router.get("/check", protectRoute, checkAuth);


export default router;

