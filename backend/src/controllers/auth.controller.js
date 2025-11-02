import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../lib/utils.js";
import { sendWelcomeEmail } from "../emails/emailHandlers.js";
import { ENV } from "../lib/env.js";

/*  Signup Controller */
export const signup = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // 1. Kiểm tra email tồn tại
    const userExists = await User.findOne({ email });
    if (userExists)
      return res.status(400).json({ message: "Email already in use." });

    // 2. Băm mật khẩu tại controller
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Tạo user với mật khẩu đã băm
    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    // ... phần còn lại giữ nguyên (Token & Email)
    generateToken(newUser._id, res);

    res.status(201).json({
      message: "User created successfully.",
      success: true,
      user: {
        _id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
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



/*  Login Controller */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    //kiem tra nguoi dung ton tai
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    //so sanh mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    //tạo token
    generateToken(user._id, res);

    res.status(200).json({
      message: "Login successful.",
      success: true,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        profilePic: user.profilePic,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

/*  Logout Controller */
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
      throw new AppError("Email is required.", 400);
    }

    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError("Email does not exist.", 404);
    }

    // Generate OTP 6 digits
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 phút
    await user.save();

    // Send OTP email
    await sendOTPEmail(user.email, user.fullName, otp);

    res.status(200).json({
      success: true,
      message: "OTP has been sent to your email.",
    });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || "Server error." });
  }
};

/* Reset Password Controller */
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      throw new AppError("All fields are required.", 400);
    }

    if (newPassword.length < 6) {
      throw new AppError("Password must be at least 6 characters.", 400);
    }

    const user = await User.findOne({
      email,
      otp: otp.toString(),
      otpExpires: { $gt: Date.now() },
    }).select("+password");

    if (!user) {
      throw new AppError("OTP is incorrect or expired.", 400);
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    // Clear OTP after success
    user.otp = undefined;
    user.otpExpires = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || "Server error." });
  }
};

export const updateProfilePic = async (req, res) => {
  try {
    const { profilePic } = req.body; 
    if (!profilePic) return res.status(400).json({ message: "Profile picture URL is required." });

    const userId = req.user._id;

    const uploadResponse = await cloudinary.uploader.upload(profilePic);

    const UpdateUser = await User.findByIdAndUpdate( 
      userId, 
      { profilePic: uploadResponse.secure_url },
      { new: true }
    );

    res.status(200).json(UpdateUser);
  } catch (error) {
    console.error("Update profile picture error:", error);
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
      return res
        .status(400)
        .json({ message: "New password must be at least 6 characters." });
    }

    // Lấy user + password
    const user = await User.findById(userId).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // So sánh mật khẩu hiện tại
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ message: "Current password is incorrect." });
    }

    // Băm mật khẩu mới
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



   




