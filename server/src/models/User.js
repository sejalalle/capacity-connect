import mongoose from "mongoose";
import bcrypt from "bcryptjs";
const { Schema } = mongoose;
const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["trainee", "trainer", "admin"],
      required: true,
    },
    department: String,
    designation: String,
    phone: String,
    profilePhoto: String,
    qualifications: [String],
    interests: [String],
    skills: [String],
    workExperience: [
      { organization: String, role: String, from: Date, to: Date },
    ],
    certificates: [
      { title: String, issuedBy: String, date: Date, fileUrl: String },
    ],
    accountStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended"],
      default: "pending",
    },
    // Professional profile stays embedded; skills and certificate links are self-declared.
    jobRole: { type: Schema.Types.ObjectId, ref: "JobRole" },
    sessionVersion: { type: Number, default: 0 },
    scheduleVersion: { type: Number, default: 0, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.password;
        delete ret.__v;
        delete ret.sessionVersion;
        delete ret.scheduleVersion;
        return ret;
      },
    },
  },
);
userSchema.index({ role: 1, accountStatus: 1, createdAt: -1 });
userSchema.pre("save", async function () {
  if (this.isModified("password"))
    this.password = await bcrypt.hash(this.password, 12);
});
export default mongoose.model("User", userSchema);
