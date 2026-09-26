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
const { tttEligibility } = await import("../src/services/tttService.js");

let mongo, admin, p2, p3, candidate, evaluator, program;
const auth = (user) => ({ Authorization: `Bearer ${token(user)}` });

before(async () => {
  mongo = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    instanceOpts: [{ ip: "127.0.0.1" }],
  });
  await mongoose.connect(mongo.getUri());
  admin = await User.create({
    name: "TTT Coordinator",
    email: "ttt-admin@example.test",
    password: "DemoOnly!2026",
    role: "admin",
    accountStatus: "approved",
  });
  p2 = await seedPart2(admin);
  p3 = await seedPart3(admin, p2);
  program = await P3.P3TTTProgram.findById(p3.tttProgram._id);
  candidate = p2.trainees[3];
  evaluator = p3.trainers[0];
});

after(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});

test("eligibility requires demonstrated subject competence and reports missing information", async () => {
  const missing = await tttEligibility({
    candidateId: candidate._id,
    competency: program.competency,
    frameworkVersion: program.frameworkVersion,
    targetLevel: program.targetLevel,
  });
  assert.equal(missing.status, "NEEDS_INFORMATION");
  assert.ok(missing.missingInformation.length);

  await P2.P2CompetencyRecord.create({
    trainee: candidate._id,
    competency: program.competency,
    frameworkVersion: program.frameworkVersion,
    demonstratedLevel: program.targetLevel,
    status: "DEMONSTRATED",
    sourceType: "PART3_REVIEW",
    reviewer: evaluator._id,
    assessedAt: new Date("2026-01-01"),
    isSynthetic: true,
    demoNamespace: "ttt-tests",
  });

  const eligible = await tttEligibility({
    candidateId: candidate._id,
    competency: program.competency,
    frameworkVersion: program.frameworkVersion,
    targetLevel: program.targetLevel,
  });
  assert.equal(eligible.status, "ELIGIBLE");

  const response = await request(app)
    .get("/api/part3/ttt/eligibility")
    .query({
      competency: String(program.competency),
      frameworkVersion: program.frameworkVersion,
      targetLevel: program.targetLevel,
    })
    .set(auth(admin));
  assert.equal(response.status, 200, JSON.stringify(response.body));
  const row = response.body.data.find(
    (item) => String(item.candidate._id) === String(candidate._id),
  );
  assert.equal(row.status, "ELIGIBLE");
});

let nomination, practice;

test("nomination, acceptance, teaching practice and evaluation follow the workflow", async () => {
  let response = await request(app)
    .post("/api/part3/ttt/nominations")
    .set(auth(admin))
    .send({
      program: program._id,
      candidate: candidate._id,
      rationale: "Synthetic nomination for the Train-the-Trainer test.",
      requestId: crypto.randomUUID(),
    });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  nomination = response.body.data;
  assert.equal(nomination.status, "NOMINATED");

  response = await request(app)
    .post(`/api/part3/ttt/nominations/${nomination._id}/transitions`)
    .set(auth(candidate))
    .send({ action: "ACCEPT", reason: "Accepting the nomination." });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.equal(response.body.data.status, "ACCEPTED");

  response = await request(app)
    .post(`/api/part3/ttt/nominations/${nomination._id}/transitions`)
    .set(auth(candidate))
    .send({ action: "START", reason: "Starting Train-the-Trainer learning." });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.equal(response.body.data.status, "IN_PROGRESS");

  response = await request(app)
    .get(`/api/part3/ttt/nominations/${nomination._id}/learning`)
    .set(auth(candidate));
  assert.equal(response.status, 200, JSON.stringify(response.body));
  const learning = response.body.data;
  assert.ok(learning.total >= 1, "the program must list a Train-the-Trainer course");
  assert.equal(learning.completed, 0);
  assert.equal(learning.gate, "TTT_LEARNING_REQUIRED");
  assert.ok(
    learning.items.every((item) => item.status === "NOT_STARTED"),
  );

  response = await request(app)
    .get(`/api/part3/ttt/nominations/${nomination._id}/learning`)
    .set(auth(p2.trainees[5]));
  assert.equal(response.status, 403);

  response = await request(app)
    .post(`/api/part3/ttt/nominations/${nomination._id}/teaching-practice`)
    .set(auth(candidate))
    .send({
      sessionTitle: "Premature teaching practice session",
      responseText: "Submitted before Train-the-Trainer learning was complete.",
    });
  assert.equal(response.status, 409, JSON.stringify(response.body));

  response = await request(app)
    .post(`/api/part3/ttt/nominations/${nomination._id}/learning`)
    .set(auth(candidate))
    .send({ course: program.courses[0]._id, progressPercent: 100 });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.equal(response.body.data.gate, "READY_FOR_TEACHING_PRACTICE");
  assert.equal(response.body.data.completed, learning.total);

  const expertiseBefore = await P3.P3TrainerExpertise.findOne({
    trainer: candidate._id,
    competency: program.competency,
    frameworkVersion: program.frameworkVersion,
  }).lean();
  assert.equal(
    expertiseBefore,
    null,
    "Train-the-Trainer learning completion must not create reviewed expertise",
  );

  response = await request(app)
    .post(`/api/part3/ttt/nominations/${nomination._id}/teaching-practice`)
    .set(auth(candidate))
    .send({
      sessionTitle: "Synthetic teaching practice session",
      responseText:
        "Synthetic teaching practice submitted for evaluation.",
    });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  practice = response.body.data;
  assert.equal(practice.status, "SUBMITTED");

  response = await request(app)
    .post(`/api/part3/ttt/practices/${practice._id}/evaluate`)
    .set(auth(evaluator))
    .send({
      outcome: "DEMONSTRATED",
      comments: "Synthetic evaluation.",
      criterionMarks: [
        { criterionId: "SUBJECT_ACCURACY", marks: 30 },
        { criterionId: "STRUCTURE", marks: 30 },
        { criterionId: "ENGAGEMENT", marks: 20 },
        { criterionId: "ASSESSMENT", marks: 20 },
      ],
    });
  assert.equal(response.status, 201, JSON.stringify(response.body));

  response = await request(app)
    .get(`/api/part3/ttt/nominations/${nomination._id}`)
    .set(auth(admin));
  assert.equal(response.body.data.status, "EVALUATED");
});

test("evaluation marks cannot exceed the practice rubric", async () => {
  const extra = await P3.P3TTTPractice.create({
    nomination: nomination._id,
    candidate: candidate._id,
    program: program._id,
    sessionTitle: "Second synthetic practice",
    rubric: [
      { criterionId: "SUBJECT_ACCURACY", label: "Subject accuracy", maxMarks: 30 },
    ],
    version: 2,
    status: "SUBMITTED",
  });
  const response = await request(app)
    .post(`/api/part3/ttt/practices/${extra._id}/evaluate`)
    .set(auth(evaluator))
    .send({
      outcome: "DEMONSTRATED",
      comments: "Over-limit attempt.",
      criterionMarks: [{ criterionId: "SUBJECT_ACCURACY", marks: 99 }],
    });
  assert.equal(response.status, 400, JSON.stringify(response.body));
});

test("admin verification creates reviewed expertise and promotes the candidate to trainer", async () => {
  const beforeRole = await User.findById(candidate._id).lean();
  assert.equal(beforeRole.role, "trainee");

  const coverageBefore = await request(app)
    .get("/api/part3/capability")
    .set(auth(admin));
  assert.equal(coverageBefore.status, 200, JSON.stringify(coverageBefore.body));
  const radarBefore = coverageBefore.body.data.coverage.find(
    (row) => String(row.competency._id) === String(program.competency),
  );
  assert.ok(radarBefore, "the program competency must appear in coverage");

  let response = await request(app)
    .post(`/api/part3/ttt/nominations/${nomination._id}/verify`)
    .set(auth(admin))
    .send({
      outcome: "VERIFIED",
      reason: "Synthetic teaching capability verified by coordinator.",
    });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.equal(response.body.data.verification.outcome, "VERIFIED");
  assert.equal(response.body.data.promotedToTrainer, true);

  const expertise = await P3.P3TrainerExpertise.findOne({
    trainer: candidate._id,
    competency: program.competency,
    frameworkVersion: program.frameworkVersion,
  }).lean();
  assert.equal(expertise.status, "REVIEWED");
  assert.equal(expertise.approvedLevel, program.targetLevel);

  const afterRole = await User.findById(candidate._id).lean();
  assert.equal(afterRole.role, "trainer");

  // The organizational loop closes: verification raises the reported trainer pool.
  const coverageAfter = await request(app)
    .get("/api/part3/capability")
    .set(auth(admin));
  const radarAfter = coverageAfter.body.data.coverage.find(
    (row) => String(row.competency._id) === String(program.competency),
  );
  assert.equal(
    radarAfter.reviewedTrainerCount,
    radarBefore.reviewedTrainerCount + 1,
    "a verified trainer must increase the reviewed trainer pool",
  );

  response = await request(app)
    .post(`/api/part3/ttt/nominations/${nomination._id}/verify`)
    .set(auth(admin))
    .send({
      outcome: "VERIFIED",
      reason: "Repeated verification should be rejected.",
    });
  assert.equal(response.status, 409);
});

test("a trainer cannot evaluate their own teaching practice", async () => {
  const selfPractice = await P3.P3TTTPractice.create({
    nomination: p3.tttReady._id,
    candidate: evaluator._id,
    program: program._id,
    sessionTitle: "Synthetic self practice",
    rubric: [
      { criterionId: "SUBJECT_ACCURACY", label: "Subject accuracy", maxMarks: 30 },
    ],
    version: 3,
    status: "SUBMITTED",
  });
  const response = await request(app)
    .post(`/api/part3/ttt/practices/${selfPractice._id}/evaluate`)
    .set(auth(evaluator))
    .send({
      outcome: "DEMONSTRATED",
      comments: "Self evaluation must be rejected.",
      criterionMarks: [{ criterionId: "SUBJECT_ACCURACY", marks: 20 }],
    });
  assert.equal(response.status, 403);
});
