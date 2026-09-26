import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryReplSet } from "mongodb-memory-server";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = crypto.randomBytes(48).toString("hex");
process.env.DEMO_REFERENCE_DATE = "2026-10-01T00:00:00.000Z";
const { default: app } = await import("../src/app.js");
const { default: User } = await import("../src/models/User.js");
const { default: token } = await import("../src/utils/generateToken.js");
const P2 = await import("../src/models/Part2.js");
const { seedPart2 } = await import("../src/seed/demoPart2.js");
const { seedPart3 } = await import("../src/seed/demoPart3.js");
const { seedTrainerWorkspace } = await import("../src/seed/demoTrainer.js");

let mongo, admin, part2, part3, head;
const auth = (user) => ({ Authorization: `Bearer ${token(user)}` });

before(async () => {
  mongo = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    instanceOpts: [{ ip: "127.0.0.1" }],
  });
  await mongoose.connect(mongo.getUri());
  admin = await User.create({
    name: "Session Coordinator",
    email: "session-admin@example.test",
    password: "DemoOnly!2026",
    role: "admin",
    accountStatus: "approved",
  });
  part2 = await seedPart2(admin);
  part3 = await seedPart3(admin, part2);
  await seedTrainerWorkspace(admin, part2, part3);
  head = part3.trainers[1];
});
after(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});

const schedule = async (user) => {
  const response = await request(app)
    .get("/api/part3/training-sessions")
    .set(auth(user))
    .expect(200);
  return response.body.data;
};

test("trainer session schedule describes each session with assignment and availability", async () => {
  const data = await schedule(head);
  assert.ok(data.batches.length >= 2, "both assigned batches should appear");
  const sessions = data.batches.flatMap((batch) => batch.sessions);
  assert.ok(sessions.length >= 4, "scheduled sessions should be listed");
  for (const session of sessions) {
    assert.ok(session.title, "each session has a title");
    assert.ok(session.batch.name, "each session names its batch");
    assert.ok(session.start && session.end, "each session has a window");
  }
  assert.ok(
    sessions.some((row) => row.assignment?.status === "ACTIVE"),
    "a coordinator-confirmed assignment should be visible",
  );
  assert.ok(
    sessions.some((row) => row.availability?.available === true),
    "a declared availability window should be visible",
  );
  assert.ok(
    sessions.some((row) => !row.assignment),
    "sessions without an assignment should be shown as not assigned",
  );
  assert.equal(data.summary.assigned, 2);
  assert.equal(data.summary.total, sessions.length);
});

test("session schedule is trainer-only", async () => {
  await request(app)
    .get("/api/part3/training-sessions")
    .set(auth(part2.asha))
    .expect(403);
  await request(app)
    .get("/api/part3/training-sessions")
    .set(auth(admin))
    .expect(403);
});

test("declaring unavailability flags the active assignment for coordinator review", async () => {
  const before = await schedule(head);
  const workshop = before.batches
    .flatMap((batch) => batch.sessions)
    .find((row) => row.title === "Advanced Radar Pattern Workshop");
  assert.ok(workshop, "the seeded advanced workshop session should exist");
  assert.equal(workshop.assignment?.status, "ACTIVE");

  await request(app)
    .post("/api/part3/availability")
    .set(auth(head))
    .send({
      start: new Date(workshop.start).toISOString(),
      end: new Date(workshop.end).toISOString(),
      available: false,
      reason: "Synthetic conflicting commitment for the demonstration.",
      deliveryModes: ["ONLINE", "BLENDED"],
      locations: ["Demonstration Training Centre"],
      preferenceScore: 1,
    })
    .expect(201);

  const after = await schedule(head);
  const flagged = after.batches
    .flatMap((batch) => batch.sessions)
    .find((row) => row._id === workshop._id);
  assert.equal(flagged.assignment.status, "UNAVAILABLE");
  assert.equal(flagged.availability.available, false);
  assert.equal(after.summary.unavailable, 1);
  assert.equal(after.summary.assigned, 1);
  assert.equal(after.summary.declined, 1);
  assert.ok(
    await P2.P2Notification.exists({ type: "TRAINER_UNAVAILABLE" }),
    "the coordinator should be notified for review",
  );
});
