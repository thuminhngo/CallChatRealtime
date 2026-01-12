import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../lib/utils.js";
import { sendWelcomeEmail, sendOTPEmail } from "../emails/emailHandlers.js";
import { ENV } from "../lib/env.js";
import cloudinary from "../lib/cloudinary.js"; 

/* Signup Controller */
export const signup = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const userExists = await User.findOne({ email });
    if (userExists)
      return res.status(400).json({ message: "Email already in use." });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
      // Mặc định blockedUsers và deletedConversations là mảng rỗng [] từ Model
    });

    await newUser.save();

    generateToken(newUser._id, res);

    res.status(201).json({
      message: "User created successfully.",
      success: true,
      user: {
        _id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        profilePic: newUser.profilePic,
        // Thêm 2 trường này để đồng bộ frontend
        blockedUsers: [],
        deletedConversations: []
      },
    });

    try {
      await sendWelcomeEmail(newUser.email, newUser.fullName, ENV.CLIENT_URL);
    } catch (emailError) {
      console.error("Error sending welcome email:", emailError);
    }
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

/* Login Controller */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    generateToken(user._id, res);

    res.status(200).json({
      message: "Login successful.",
      success: true,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        profilePic: user.profilePic,
        // --- QUAN TRỌNG: Trả về danh sách chặn & xoá ---
        blockedUsers: user.blockedUsers, 
        deletedConversations: user.deletedConversations,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

/* Logout Controller */
export const logout = (req, res) => {
  res.cookie("jwt", "", {maxAge: 0})
  res.status(200).json({
    message: "Logout successful.",
    success: true,
  });
} ;

/* Forgot Password Controller */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000; 
    await user.save();

    await sendOTPEmail(user.email, user.fullName, otp);

    res.status(200).json({
      success: true,
      message: "OTP has been sent to your email.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Server error." });
  }
};

/* Reset Password Controller */
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "All fields are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const user = await User.findOne({
      email,
      otp: otp.toString(),
      otpExpires: { $gt: Date.now() },
    }).select("+password");

    if (!user) {
      return res.status(400).json({ message: "OTP is incorrect or expired." });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    user.otp = undefined;
    user.otpExpires = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Server error." });
  }
};

/* Update Profile Controller */
export const updateProfile = async (req, res) => {
  try {
    const { fullName, profilePic } = req.body;
    const userId = req.user._id;

    const updateFields = {};
    if (fullName) updateFields.fullName = fullName;

    if (profilePic) {
      const uploadResponse = await cloudinary.uploader.upload(profilePic, {
        timeout: 60000, 
        folder: "profile_pics", 
      });
      updateFields.profilePic = uploadResponse.secure_url;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser, 
    });
    
  } catch (error) {
    console.error("Update profile error:", error); 
    if (error.name === 'TimeoutError' || error.http_code === 499) {
      return res.status(408).json({ message: "Upload ảnh mất quá nhiều thời gian, vui lòng thử lại với ảnh nhẹ hơn." });
    }
    res.status(500).json({ message: "Server error." });
  }
};

/* Change Current Password Controller */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "All fields are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters." });
    }

    const user = await User.findById(userId).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully.",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

/* Search user by email */
export const searchUserByEmail = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email: email.toLowerCase() }).select("-password");
    
    if (!user) return res.status(200).json([]); 
    res.status(200).json([user]); 
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

/* Check Auth Controller */
export const checkAuth = (req, res) => {
  try {
    // req.user được gán từ middleware protectRoute
    const user = req.user; 

    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        profilePic: user.profilePic,
        blockedUsers: user.blockedUsers,
        deletedConversations: user.deletedConversations,
      },
    });
  } catch (error) {
    console.log("Error in checkAuth controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};