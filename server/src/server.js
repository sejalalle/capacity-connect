import "dotenv/config";
import mongoose from "mongoose";
import app from "./app.js";
import connectDB from "./config/db.js";
if (
  !process.env.JWT_SECRET ||
  process.env.JWT_SECRET.length < 32 ||
  process.env.JWT_SECRET.startsWith("replace-")
)
  throw new Error("Set JWT_SECRET to a random value of at least 32 characters");
await connectDB();
const server = app.listen(process.env.PORT || 5000, () =>
  console.log(`SAMARTHYA API listening on ${process.env.PORT || 5000}`),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => {
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  });
