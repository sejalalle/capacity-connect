// Isolated, synthetic database for browser tests. Never connects to MONGO_URI.
import crypto from "node:crypto";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = crypto.randomBytes(48).toString("hex");
const mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
await mongoose.connect(mongo.getUri());
const { default: User } = await import("../src/models/User.js");
await User.init();
for (const role of ["admin", "trainee", "trainer"])
  await User.create({
    name: `Demo ${role}`,
    email: `${role}@example.test`,
    password: "DemoOnly!2026",
    role,
    accountStatus: "approved",
    department: "Synthetic Meteorology",
    designation: "Demonstration",
  });
const { seedPart2 } = await import("../src/seed/demoPart2.js");
const { seedPart3 } = await import("../src/seed/demoPart3.js");
const demoAdmin = await User.findOne({ role: "admin" });
const part2 = await seedPart2(demoAdmin);
await seedPart3(demoAdmin, part2);
const { default: app } = await import("../src/app.js");
const port = Number(process.env.E2E_PORT || 5100);
const server = app.listen(port, "127.0.0.1", () =>
  console.log("E2E API ready"),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () =>
    server.close(async () => {
      await mongoose.disconnect();
      await mongo.stop();
      process.exit(0);
    }),
  );
