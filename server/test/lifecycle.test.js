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
const M = await import("../src/models/Part2.js");
const { seedPart2 } = await import("../src/seed/demoPart2.js");
let mongo, admin, seed;
const auth = (user) => ({ Authorization: `Bearer ${token(user)}` });

before(async () => {
  mongo = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    instanceOpts: [{ ip: "127.0.0.1" }],
  });
  await mongoose.connect(mongo.getUri());
  admin = await User.create({
    name: "Part 2 Coordinator",
    email: "part2-admin@example.test",
    password: "DemoOnly!2026",
    role: "admin",
    accountStatus: "approved",
  });
  seed = await seedPart2(admin);
});
after(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});

test("idempotent seed creates coherent Part 2 data without Part 3 assignments", async () => {
  await seedPart2(admin);
  assert.equal(await User.countDocuments({ role: "trainee" }), 10);
  assert.equal(await User.countDocuments({ role: "trainer" }), 3);
  assert.equal(await M.P2Competency.countDocuments(), 10);
  assert.equal(await M.P2Course.countDocuments({ status: "PUBLISHED" }), 5);
  assert.equal(
    await M.P2LearningPath.countDocuments({ status: "PUBLISHED" }),
    3,
  );
  assert.equal(await M.P2Nomination.countDocuments({ status: "RETURNED" }), 1);
  assert.equal(
    await M.P2Nomination.countDocuments({ status: "WAITLISTED" }),
    1,
  );
  assert.equal(await M.P2Nomination.countDocuments({ status: "SUBMITTED" }), 1);
});

test("coordinator configuration is validated, audited and protected by role", async () => {
  const payload = {
    code: "SYN-INT-01",
    name: "Synthetic Integration Review",
    description: "Synthetic configuration created by the integration test.",
    domain: "Integration",
    version: 1,
    levels: [
      {
        value: 1,
        label: "Guided",
        definition: "Can complete the synthetic task with guidance.",
      },
      {
        value: 2,
        label: "Independent",
        definition: "Can complete the synthetic task independently.",
      },
    ],
    status: "DRAFT",
    isSynthetic: true,
  };
  await request(app)
    .post("/api/competencies")
    .set(auth(seed.asha))
    .send(payload)
    .expect(403);
  let response = await request(app)
    .post("/api/competencies")
    .set(auth(admin))
    .send(payload);
  assert.equal(response.status, 201, JSON.stringify(response.body));
  const competency = response.body.data;
  response = await request(app).post("/api/job-roles").set(auth(admin)).send({
    title: "Synthetic Integration Role",
    description: "Proposed role created for integration verification.",
    isSynthetic: true,
  });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  const role = response.body.data;
  response = await request(app)
    .post(`/api/job-roles/${role._id}/requirements`)
    .set(auth(admin))
    .send({
      competency: competency._id,
      competencyVersion: 1,
      requiredLevel: 2,
      priority: "HIGH",
      version: 1,
      isSynthetic: true,
    });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  assert.equal(response.body.data.requiredLevel, 2);
  assert.equal(
    await M.P2AuditLog.countDocuments({
      action: {
        $in: [
          "COMPETENCY_VERSION_CREATED",
          "JOB_ROLE_CREATED",
          "ROLE_REQUIREMENT_CREATED",
        ],
      },
    }),
    3,
  );
});

test("missing prerequisite data remains an explicit needs-information outcome", async () => {
  const applicant = await User.create({
    name: "Synthetic Missing Prerequisite Applicant",
    email: "missing-prerequisite@example.test",
    password: "DemoOnly!2026",
    role: "trainee",
    accountStatus: "approved",
  });
  const response = await request(app)
    .get(`/api/batches/${seed.batches[0]._id}/eligibility`)
    .set(auth(applicant));
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.equal(response.body.data.status, "NEEDS_INFORMATION");
  assert.ok(
    response.body.data.checks.some(
      (check) => check.rule === "JOB_ROLE" && check.outcome === "MISSING",
    ),
  );
});

test("gap analysis distinguishes a two-level gap, missing evidence and incompatible versions", async () => {
  let response = await request(app).get("/api/gaps/me").set(auth(seed.asha));
  assert.equal(response.status, 200, JSON.stringify(response.body));
  const radar = response.body.data.find(
    (x) => x.competency.code === "SYN-RAD-01",
  );
  const quality = response.body.data.find(
    (x) => x.competency.code === "SYN-RAD-02",
  );
  assert.equal(radar.gap, 2);
  assert.equal(radar.category, "TWO_LEVEL_GAP");
  assert.equal(quality.gap, null);
  assert.equal(quality.category, "NOT_ASSESSED");
  await M.P2CompetencyRecord.updateOne(
    { trainee: seed.asha._id, competency: radar.competency._id },
    { frameworkVersion: 2 },
  );
  response = await request(app).get("/api/gaps/me").set(auth(seed.asha));
  assert.equal(
    response.body.data.find((x) => x.competency.code === "SYN-RAD-01").category,
    "NOT_COMPARABLE",
  );
});

test("returned nomination can be corrected and resubmitted; ownership is enforced", async () => {
  const nomination = seed.returned;
  let response = await request(app)
    .patch(`/api/nominations/${nomination._id}`)
    .set(auth(seed.trainees[1]))
    .send({ correctionResponse: "Cross-user edit" });
  assert.equal(response.status, 404);
  response = await request(app)
    .patch(`/api/nominations/${nomination._id}`)
    .set(auth(seed.asha))
    .send({
      correctionResponse:
        "The selected foundation batch supports guided interpretation practice before the advanced step.",
    });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  response = await request(app)
    .post(`/api/nominations/${nomination._id}/transitions`)
    .set(auth(seed.asha))
    .send({ status: "RESUBMITTED", reason: "Correction supplied" });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.equal(response.body.data.status, "RESUBMITTED");
});

test("atomic approval allocates one final seat, rejects stale retry and never overbooks", async () => {
  const batch = seed.batches[0];
  await M.P2Enrollment.deleteMany({ batch: batch._id });
  await M.P2Nomination.deleteMany({ batch: batch._id, status: "APPROVED" });
  await M.P2Batch.updateOne(
    { _id: batch._id },
    { capacity: 1, seatsAllocated: 0 },
  );
  const candidates = [];
  for (const trainee of seed.trainees.slice(2, 4)) {
    const need = await M.P2TrainingNeed.create({
      title: `Seat request ${trainee._id}`,
      requestedBy: trainee._id,
      beneficiary: trainee._id,
      targetJobRole: seed.role._id,
      competencyGoals: [seed.competencies[0]._id],
      justification: "Synthetic final-seat concurrency test.",
      status: "APPROVED",
      reviewedBy: admin._id,
      reviewedAt: new Date(),
      reviewReason: "Approved for test",
      isSynthetic: true,
      demoNamespace: "test-concurrency",
    });
    candidates.push(
      await M.P2Nomination.create({
        trainee: trainee._id,
        course: seed.courses[0]._id,
        batch: batch._id,
        trainingNeed: need._id,
        ruleVersion: seed.rules[0]._id,
        reason: "Synthetic application",
        eligibilitySnapshot: {
          status: "ELIGIBLE",
          ruleVersion: 1,
          checkedAt: new Date(),
          checks: [],
          blockingReasons: [],
          missingInformation: [],
        },
        status: "UNDER_REVIEW",
        revision: 2,
        isSynthetic: true,
        demoNamespace: "test-concurrency",
      }),
    );
  }
  const responses = await Promise.all(
    candidates.map((nomination) =>
      request(app)
        .post(`/api/nominations/${nomination._id}/transitions`)
        .set(auth(admin))
        .send({
          status: "APPROVED",
          expectedRevision: 2,
          reason: "Allocate the final seat",
        }),
    ),
  );
  assert.deepEqual(responses.map((x) => x.status).sort(), [200, 409]);
  assert.equal((await M.P2Batch.findById(batch._id)).seatsAllocated, 1);
  assert.equal(
    await M.P2Enrollment.countDocuments({
      batch: batch._id,
      status: "CONFIRMED",
    }),
    1,
  );
  const winner = responses.find((x) => x.status === 200).body.data.nomination;
  const retry = await request(app)
    .post(`/api/nominations/${winner._id}/transitions`)
    .set(auth(admin))
    .send({
      status: "APPROVED",
      expectedRevision: winner.revision,
      reason: "Retry decision",
    });
  assert.equal(retry.status, 409);
  assert.equal((await M.P2Batch.findById(batch._id)).seatsAllocated, 1);
  assert.equal(
    await M.P2AuditLog.countDocuments({
      action: "NOMINATION_APPROVED_AND_SEAT_ALLOCATED",
    }),
    1,
  );
  assert.equal(
    await M.P2Notification.countDocuments({
      recipient: winner.trainee,
      type: "ADMISSION_CONFIRMED",
    }),
    1,
  );
});

test("cancellation releases capacity once and waitlist remains human-controlled", async () => {
  const enrollment = await M.P2Enrollment.findOne({ status: "CONFIRMED" });
  const nomination = await M.P2Nomination.findById(enrollment.nomination);
  let response = await request(app)
    .post(`/api/nominations/${nomination._id}/transitions`)
    .set(auth(admin))
    .send({
      status: "ADMISSION_CANCELLED",
      reason: "Applicant cannot attend the scheduled dates",
    });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  const afterOne = await M.P2Batch.findById(nomination.batch);
  response = await request(app)
    .post(`/api/nominations/${nomination._id}/transitions`)
    .set(auth(admin))
    .send({ status: "ADMISSION_CANCELLED", reason: "Duplicate cancellation" });
  assert.equal(response.status, 409);
  assert.equal(
    (await M.P2Batch.findById(nomination.batch)).seatsAllocated,
    afterOne.seatsAllocated,
  );
  assert.equal(
    await M.P2Nomination.countDocuments({ status: "WAITLISTED" }),
    1,
  );
});

test("pinned rule version remains unchanged after a newer course rule is published", async () => {
  const batch = await M.P2Batch.findById(seed.batches[1]._id);
  const pinned = String(batch.ruleVersion);
  await M.P2CourseRuleVersion.create({
    course: batch.course,
    version: 3,
    status: "PUBLISHED",
    eligibilityRules: [],
    requiresApprovedTrainingNeed: false,
    createdBy: admin._id,
    publishedAt: new Date(),
    isSynthetic: true,
    demoNamespace: "rule-test",
  });
  assert.equal(
    String((await M.P2Batch.findById(batch._id)).ruleVersion),
    pinned,
  );
});
