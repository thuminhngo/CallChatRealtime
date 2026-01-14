import mongoose from "mongoose";

const participantSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    state: {
      type: String,
      enum: ["ringing", "connected", "left", "rejected"],
      default: "ringing",
    },
    joinedAt: { type: Date },
  },
  { _id: false }
);

const groupCallSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    host: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    participants: [participantSchema],
    status: {
      type: String,
      enum: ["idle", "ongoing", "ended", "failed"],
      default: "idle",
    },
    startedAt: { type: Date },
    endedAt: { type: Date },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

const GroupCall = mongoose.model("GroupCall", groupCallSchema);

export default GroupCall;
