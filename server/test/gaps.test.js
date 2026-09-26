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

let mongo, admin, trainee, p2, p3;
const auth = (user) => ({ Authorization: `Bearer ${token(user)}` });

before(async () => {
  mongo = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    instanceOpts: [{ ip: "127.0.0.1" }],
  });
  await mongoose.connect(mongo.getUri());
  admin = await User.create({
    name: "Gaps Coordinator",
    email: "gaps-admin@example.test",
    password: "DemoOnly!2026",
    role: "admin",
    accountStatus: "approved",
  });
  p2 = await seedPart2(admin);
  p3 = await seedPart3(admin, p2);
  trainee = p2.asha;
});

after(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});

test("approving an account works and writes an audit record (boot regression)", async () => {
  const pending = await User.create({
    name: "Pending Trainee",
    email: "pending-approval@example.test",
    password: "DemoOnly!2026",
    role: "trainee",
    accountStatus: "pending",
  });
  const response = await request(app)
    .patch(`/api/users/${pending._id}/status`)
    .set(auth(admin))
    .send({ accountStatus: "approved" });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.equal(response.body.data.user.accountStatus, "approved");
  const audit = await P2.P2AuditLog.findOne({
    entityId: pending._id,
    action: "ACCOUNT_STATUS_CHANGED",
  }).lean();
  assert.ok(audit, "status change should be audited");
  assert.equal(audit.newStatus, "approved");
  assert.ok(audit.correlationId);
});

test("public announcements feed shows only published homepage items", async () => {
  const response = await request(app).get("/api/announcements/public");
  assert.equal(response.status, 200, JSON.stringify(response.body));
  const titles = response.body.data.map((row) => row.title);
  assert.ok(titles.includes("New radar interpretation course published"));
  assert.ok(
    !titles.includes("Draft: upcoming monsoon preparedness workshop"),
    "drafts must not appear publicly",
  );
});

test("authenticated announcements are audience-filtered", async () => {
  const response = await request(app)
    .get("/api/announcements")
    .set(auth(trainee));
  assert.equal(response.status, 200, JSON.stringify(response.body));
  const categories = response.body.data.map((row) => row.audience);
  assert.ok(categories.includes("ALL") || categories.includes("TRAINEE"));
  assert.ok(
    !categories.includes("TRAINER"),
    "a trainee must not receive trainer-only announcements",
  );
});

test("publishing an announcement notifies the target audience", async () => {
  let response = await request(app)
    .post("/api/announcements")
    .set(auth(admin))
    .send({
      title: "Synthetic trainee notice",
      body: "A synthetic announcement created by the test suite.",
      audience: "TRAINEE",
      category: "NOTIFICATION",
    });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  const announcement = response.body.data;
  assert.equal(announcement.status, "DRAFT");

  response = await request(app)
    .post(`/api/announcements/${announcement._id}/publish`)
    .set(auth(admin))
    .send({ reason: "Synthetic test publication." });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.ok(response.body.data.notifiedRecipients >= 1);

  const notification = await P2.P2Notification.findOne({
    eventId: `announcement:${announcement._id}:trainee`,
  }).lean();
  assert.ok(notification, "a trainee notification should be recorded");
});

test("achievements are derived from stored records", async () => {
  const response = await request(app)
    .get("/api/part3/achievements")
    .set(auth(trainee));
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.ok(Array.isArray(response.body.data.items));
  assert.ok(response.body.data.items.length >= 1);
  assert.match(response.body.data.label, /milestones/i);
});

test("training demand links capability gaps to trainer supply", async () => {
  const response = await request(app)
    .get("/api/part3/training-demand")
    .set(auth(admin));
  assert.equal(response.status, 200, JSON.stringify(response.body));
  const report = response.body.data;
  assert.ok(report.summary);
  assert.ok(Array.isArray(report.rows));
  assert.match(report.definition, /demand/i);
  assert.match(
    report.chain,
    /Train-the-Trainer/i,
    "the demand chain must name the Train-the-Trainer link",
  );

  const row = report.rows.find((item) => item.gapHeadcount > 0);
  assert.ok(row, "the seeded data must contain a capability gap");
  assert.equal(row.requiredHeadcount - row.verifiedHeadcount, row.gapHeadcount);
  assert.equal(typeof row.trainerCapacityGap, "boolean");
  assert.equal(
    row.trainerCapacityGap,
    row.gapHeadcount > 0 &&
      row.availableTrainers != null &&
      row.availableTrainers < row.gapHeadcount,
    "the capacity gap flag must follow demand against available trainers",
  );
  assert.ok(row.eligibleTrainers >= 0);
  assert.ok(row.recommendedAction);
  assert.match(
    row.recommendedAction,
    row.trainerCapacityGap ? /Train-the-Trainer/i : /batch|coverage/i,
    "the recommended action must follow the capacity verdict",
  );

  assert.equal(
    report.summary.competenciesWithTrainerCapacityGap,
    report.rows.filter((item) => item.trainerCapacityGap).length,
  );
  assert.ok(
    report.summary.totalPeopleNeedingDevelopment >=
      report.rows.reduce((sum, item) => sum + item.gapHeadcount, 0),
  );
  assert.ok(
    report.summary.tttInProgress >= 1,
    "the seeded train-the-trainer nominations must be counted",
  );
});

test("training demand is coordinator-only", async () => {
  const response = await request(app)
    .get("/api/part3/training-demand")
    .set(auth(trainee));
  assert.equal(response.status, 403);
});
