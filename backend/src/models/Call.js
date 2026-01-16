import mongoose from "mongoose";

const callSchema = new mongoose.Schema(
  {
    callerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    callType: { type: String, enum: ["audio", "video"], default: "audio" },
    
    // Status chung
    status: { 
      type: String, 
      // 👇 THÊM "cancelled" VÀO ĐÂY
      enum: ["answered", "missed", "rejected", "busy", "unavailable", "cancelled"], 
      required: true 
    },

    // Trạng thái hiển thị riêng cho người gọi (Optional: Nếu bạn đã thêm logic này ở Controller)
    callerStatus: {
        type: String,
        enum: ["answered", "missed", "rejected", "busy", "unavailable", "cancelled"],
        default: "answered"
    },
    // Trạng thái hiển thị riêng cho người nhận
    receiverStatus: {
        type: String,
        enum: ["answered", "missed", "rejected", "busy", "unavailable", "cancelled"],
        default: "missed"
    },

    duration: { type: Number, default: 0 }, 
  },
  { timestamps: true }
);

const Call = mongoose.model("Call", callSchema);
export default Call;