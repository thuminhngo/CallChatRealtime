import mongoose from "mongoose";

const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: {
      type: String,
      enum: ["owner", "admin", "member"],
      default: "member",
    },
    joinedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["active", "invited", "left", "banned"],
      default: "active",
    },
  },
  { _id: false }
);

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    avatar: { type: String, default: "" },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [memberSchema],
    isPrivate: { type: Boolean, default: false },
    inviteCode: { type: String },
    lastRead: { type: Date, default: Date.now },
    settings: {
      muteNotifications: { type: Boolean, default: false },
      historyVisibleToNewMembers: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

groupSchema.methods.isMember = function (userId) {
  return this.members.some((m) => m.user.toString() === userId.toString());
};

groupSchema.methods.getMemberRole = function (userId) {
  const m = this.members.find((m) => m.user.toString() === userId.toString());
  return m ? m.role : null;
};

const Group = mongoose.model("Group", groupSchema);

export default Group;
