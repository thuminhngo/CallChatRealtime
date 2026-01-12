import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    profilePic: {
      type: String,
      default: "",
    },

    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // --- MỚI: DANH SÁCH NGƯỜI BỊ CHẶN ---
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // --- MỚI: LỊCH SỬ XOÁ TRÒ CHUYỆN (SOFT DELETE) ---
    // Lưu mốc thời gian để lọc tin nhắn cũ đi
    deletedConversations: [
      {
        partnerId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: "User" 
        },
        deletedAt: { 
            type: Date, 
            default: Date.now 
        }
      }
    ],

    otp: { type: String },
    otpExpires: { type: Date },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;