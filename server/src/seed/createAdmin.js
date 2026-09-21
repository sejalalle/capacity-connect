import "dotenv/config";
import mongoose from "mongoose";
import { z } from "zod";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import { password } from "../middleware/validate.js";
try {
  const email = z
    .string()
    .email()
    .parse(process.env.ADMIN_SEED_EMAIL)
    .toLowerCase();
  const secret = password.parse(process.env.ADMIN_SEED_PASSWORD);
  if (secret.startsWith("replace-"))
    throw new Error("Replace the example admin password first");
  await connectDB();
  if (await User.exists({ role: "admin" }))
    throw new Error(
      "An administrator already exists. This one-time seed will not create another.",
    );
  await User.create({
    name: "Platform Administrator",
    email,
    password: secret,
    role: "admin",
    accountStatus: "approved",
    department: "Platform Administration",
    designation: "Administrator",
  });
  console.log("Administrator created. Credentials were read from .env.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
