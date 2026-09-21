import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { HttpError } from "./errorHandler.js";
export const statusMessage = (status) =>
  ({
    pending: "Your account is pending approval.",
    rejected: "Your account has been rejected.",
    suspended: "Your account has been suspended.",
  })[status];
export default async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
  if (!token) throw new HttpError(401, "Authentication required");
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: "samarthya",
      audience: "samarthya-web",
    });
  } catch {
    throw new HttpError(401, "Invalid or expired session");
  }
  if (!/^[a-f\d]{24}$/i.test(payload.sub || ""))
    throw new HttpError(401, "Invalid session");
  const user = await User.findById(payload.sub);
  if (!user || payload.sv !== user.sessionVersion)
    throw new HttpError(401, "Invalid session");
  if (user.accountStatus !== "approved")
    throw new HttpError(403, statusMessage(user.accountStatus));
  req.user = user;
  next();
}
