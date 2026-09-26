import "dotenv/config";
import mongoose from "mongoose";
import app from "./app.js";
import connectDB from "./config/db.js";
import { runReminders } from "./services/reminderService.js";
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

// Time-driven reminders: one scan shortly after boot, then on a fixed interval.
// Notices are deduplicated by eventId, so repeated scans are safe.
const scan = () =>
  runReminders()
    .then((result) =>
      console.log(
        `Reminder scan: ${result.assessmentDeadlineReminders} assessment, ${result.learningDeadlineReminders} training, ${result.recommendationNotices} recommendation notices`,
      ),
    )
    .catch((error) => console.error("Reminder scan failed:", error.message));
const bootScan = setTimeout(scan, 5000);
const reminderTimer = setInterval(
  scan,
  Number(process.env.REMINDER_INTERVAL_MS || 6 * 60 * 60 * 1000),
);
bootScan.unref();
reminderTimer.unref();

for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => {
    clearTimeout(bootScan);
    clearInterval(reminderTimer);
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  });
