import jwt from "jsonwebtoken";
export default function generateToken(user) {
  return jwt.sign({ sv: user.sessionVersion || 0 }, process.env.JWT_SECRET, {
    subject: user.id,
    expiresIn: process.env.JWT_EXPIRES_IN || "8h",
    algorithm: "HS256",
    issuer: "samarthya",
    audience: "samarthya-web",
  });
}
