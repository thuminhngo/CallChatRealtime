import mongoose from "mongoose";

const callSchema = new mongoose.Schema(
  {
    callerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    callType: { type: String, enum: ["audio", "video"], default: "audio" },
    status: { 
      type: String, 
      enum: ["answered", "missed", "rejected", "busy", "unavailable"], 
      required: true 
    },
    duration: { type: Number, default: 0 }, // Tính bằng giây
  },
  { timestamps: true }
);

const Call = mongoose.model("Call", callSchema);
export default Call;