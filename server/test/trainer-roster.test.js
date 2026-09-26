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
const { seedTrainerWorkspace } = await import("../src/seed/demoTrainer.js");

let mongo, admin, part2, part3;
const auth = (user) => ({ Authorization: `Bearer ${token(user)}` });

before(async () => {
  mongo = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    instanceOpts: [{ ip: "127.0.0.1" }],
  });
  await mongoose.connect(mongo.getUri());
  admin = await User.create({
    name: "Roster Coordinator",
    email: "roster-admin@example.test",
    password: "DemoOnly!2026",
    role: "admin",
    accountStatus: "approved",
  });
  part2 = await seedPart2(admin);
  part3 = await seedPart3(admin, part2);
  await seedTrainerWorkspace(admin, part2, part3);
});
after(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});

test("trainer roster lists the trainees confirmed into the trainer's own batches with progress", async () => {
  const response = await request(app)
    .get("/api/part3/trainees")
    .set(auth(part3.trainers[1]))
    .expect(200);
  const { batches, rows } = response.body.data;
  assert.ok(
    batches.length >= 2,
    "a trainer with two permitted batches should see both",
  );
  assert.ok(rows.length >= 6, "the confirmed rosters should be listed");
  const names = rows.map((row) => row.trainee.name);
  assert.ok(names.includes("Kavya Rao"));
  assert.ok(
    !names.includes("Asha Sharma"),
    "a trainee outside the trainer's batches must not appear",
  );
  for (const row of rows) {
    assert.ok(row.batch.name, "each row names its batch");
    assert.ok(row.trainee.email, "each row identifies the trainee");
    assert.ok(
      row.learning.total >= 1,
      "each row reports the published module count for its batch",
    );
  }
  assert.ok(
    rows.some((row) => row.learning.percent === 100),
    "recorded module completion should be visible",
  );
  assert.ok(
    rows.some((row) => row.evaluations.pending > 0),
    "pending evaluation work should be visible on the roster",
  );
});

test("trainer roster stays scoped and is refused to trainees", async () => {
  const response = await request(app)
    .get("/api/part3/trainees")
    .set(auth(part3.trainers[2]))
    .expect(200);
  assert.equal(response.body.data.rows.length, 0);
  assert.equal(response.body.data.batches.length, 0);
  await request(app).get("/api/part3/trainees").set(auth(part2.asha)).expect(403);
});

test("trainer workspace seed is idempotent and leaves no trainer page empty", async () => {
  const before = {
    enrollments: await P2.P2Enrollment.countDocuments(),
    modules: await P3.P3LearningModule.countDocuments(),
    questions: await P3.P3Question.countDocuments(),
    feedback: await P3.P3Feedback.countDocuments(),
  };
  await seedTrainerWorkspace(admin, part2, part3);
  assert.equal(await P2.P2Enrollment.countDocuments(), before.enrollments);
  assert.equal(await P3.P3LearningModule.countDocuments(), before.modules);
  assert.equal(await P3.P3Question.countDocuments(), before.questions);
  assert.equal(await P3.P3Feedback.countDocuments(), before.feedback);

  const head = part3.trainers[1];
  const questions = await request(app)
    .get("/api/part3/questions")
    .set(auth(head))
    .expect(200);
  assert.ok(
    questions.body.data.some((row) => row.questionKey === "SYN-RAD-Q02"),
    "the trainer's question bank should contain their own reviewed question",
  );
  const submissions = await request(app)
    .get("/api/part3/submissions")
    .set(auth(head))
    .expect(200);
  assert.ok(
    submissions.body.data.some((row) => row.status === "SUBMITTED"),
    "the evaluation queue should contain actionable work",
  );
  const feedback = await request(app)
    .get("/api/part3/feedback")
    .set(auth(head))
    .expect(200);
  assert.ok(
    feedback.body.data.aggregates.length >= 1,
    "the trainer should see scoped feedback aggregates",
  );
  assert.equal(
    feedback.body.data.responses.length,
    0,
    "a trainer never receives identified participant responses",
  );
  const results = await request(app)
    .get("/api/part3/results")
    .set(auth(head))
    .expect(200);
  assert.ok(
    results.body.data.length >= 1,
    "a published result should be visible to the trainer",
  );
  const learning = await request(app)
    .get("/api/part3/learning")
    .set(auth(head))
    .expect(200);
  assert.ok(
    learning.body.data.modules.length >= 4,
    "the resource library should cover both assigned batches",
  );
});
