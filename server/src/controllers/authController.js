import bcrypt from "bcryptjs";
import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";
import { HttpError } from "../middleware/errorHandler.js";
import { statusMessage } from "../middleware/authMiddleware.js";
const dummyHash = await bcrypt.hash("Unusable-dummy-password", 12);
export async function register(req, res) {
  const { confirmPassword, ...fields } = req.validated.body;
  const user = await User.create({ ...fields, accountStatus: "pending" });
  res.status(201).json({
    success: true,
    data: { user },
    message: "Your registration has been submitted for approval.",
  });
}
export async function login(req, res) {
  const { email, password } = req.validated.body;
  const user = await User.findOne({ email }).select("+password");
  const valid = await bcrypt.compare(password, user?.password || dummyHash);
  if (!user || !valid) throw new HttpError(401, "Invalid credentials");
  if (user.accountStatus !== "approved")
    throw new HttpError(403, statusMessage(user.accountStatus));
  res.json({ success: true, data: { token: generateToken(user), user } });
}
export function me(req, res) {
  res.json({ success: true, data: { user: req.user } });
}
