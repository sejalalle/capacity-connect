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
const P3 = await import("../src/models/Part3.js");
const { seedPart2 } = await import("../src/seed/demoPart2.js");
const { seedPart3 } = await import("../src/seed/demoPart3.js");
const { runReminders } = await import("../src/services/reminderService.js");

let mongo, admin, part2, part3, trainee;
const auth = (user) => ({ Authorization: `Bearer ${token(user)}` });

before(async () => {
  mongo = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    instanceOpts: [{ ip: "127.0.0.1" }],
  });
  await mongoose.connect(mongo.getUri());
  admin = await User.create({
    name: "Reminder Coordinator",
    email: "reminder-admin@example.test",
    password: "DemoOnly!2026",
    role: "admin",
    accountStatus: "approved",
  });
  part2 = await seedPart2(admin);
  part3 = await seedPart3(admin, part2);
  trainee = await User.findById(part3.enrollment.trainee);
});
after(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});

test("time-driven reminders notify deadlines and recommendations once, without changing workflow state", async () => {
  const soon = new Date(Date.now() + 86400000);
  const assessment = await P3.P3Assessment.create({
    batch: part3.batch._id,
    course: part3.batch.course,
    ruleVersion: part3.batch.ruleVersion,
    createdBy: admin._id,
    title: "Synthetic deadline reminder assessment",
    type: "MCQ",
    version: 1,
    status: "PUBLISHED",
    opensAt: new Date(Date.now() - 86400000),
    closesAt: soon,
    durationMinutes: 30,
    attemptLimit: 1,
    passingScore: 50,
    resultReleasePolicy: "ON_PUBLICATION",
    maxScore: 1,
    isSynthetic: true,
    demoNamespace: "reminder-tests",
  });
  const module = await P3.P3LearningModule.create({
    course: part3.batch.course,
    batch: part3.batch._id,
    order: 99,
    title: "Synthetic deadline reminder module",
    deadline: soon,
    version: 1,
    status: "PUBLISHED",
    createdBy: admin._id,
    isSynthetic: true,
    demoNamespace: "reminder-tests",
  });

  const recordsBefore = await P2.P2CompetencyRecord.countDocuments();
  const first = await runReminders({ withinDays: 3 });
  assert.ok(first.assessmentDeadlineReminders >= 1);
  assert.ok(first.learningDeadlineReminders >= 1);
  assert.ok(first.windowEnd > first.windowStart);

  assert.ok(
    await P2.P2Notification.exists({
      recipient: trainee._id,
      type: "ASSESSMENT_DEADLINE_REMINDER",
      "entityReference.entityId": assessment._id,
    }),
    "an assessment closing inside the window must produce a reminder",
  );
  assert.ok(
    await P2.P2Notification.exists({
      recipient: trainee._id,
      type: "TRAINING_DEADLINE_REMINDER",
      "entityReference.entityId": module._id,
    }),
    "a learning deadline inside the window must produce a reminder",
  );
  assert.ok(
    await P2.P2Notification.exists({
      recipient: trainee._id,
      type: "RECOMMENDATION_AVAILABLE",
    }),
    "a role requirement with a published course must produce a recommendation notice",
  );

  const notificationsAfterFirst = await P2.P2Notification.countDocuments();
  const second = await runReminders({ withinDays: 3 });
  assert.ok(second.assessmentDeadlineReminders >= 1, "the scan re-reports its matches");
  assert.equal(
    await P2.P2Notification.countDocuments(),
    notificationsAfterFirst,
    "a repeated scan must not duplicate a notice",
  );

  assert.equal(
    await P2.P2CompetencyRecord.countDocuments(),
    recordsBefore,
    "reminders never create or change a competency record",
  );
  assert.equal(
    (await P3.P3Assessment.findById(assessment._id)).status,
    "PUBLISHED",
  );
  assert.equal(
    (await P3.P3LearningModule.findById(module._id)).status,
    "PUBLISHED",
  );
});

test("the reminder scan is coordinator-only", async () => {
  await request(app)
    .post("/api/notifications/reminders/run")
    .set(auth(trainee))
    .send({ withinDays: 3 })
    .expect(403);
  const response = await request(app)
    .post("/api/notifications/reminders/run")
    .set(auth(admin))
    .send({ withinDays: 3 });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.ok(response.body.data.windowEnd);
});
