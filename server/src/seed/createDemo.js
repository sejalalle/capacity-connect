import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import { seedPart2 } from "./demoPart2.js";
import { seedPart3 } from "./demoPart3.js";
if (process.env.NODE_ENV === "production")
  throw new Error("Demo seed is disabled in production");
try {
  await connectDB();
  const admin = await User.findOne({
    role: "admin",
    accountStatus: "approved",
  });
  if (!admin) throw new Error("Run the administrator seed first");
  const part2 = await seedPart2(admin);
  await seedPart3(admin, part2);
  console.log(
    "Synthetic Part 2, Part 3A and Part 3B datasets created with traceable admission, trainer, assessment, evidence and competency-decision records.",
  );
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
