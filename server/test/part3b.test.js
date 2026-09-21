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

let mongo,
  admin,
  p2,
  p3,
  trainee,
  otherTrainee,
  reviewer,
  otherTrainer,
  evidence;
const auth = (user) => ({ Authorization: `Bearer ${token(user)}` });
before(async () => {
  mongo = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    instanceOpts: [{ ip: "127.0.0.1" }],
  });
  await mongoose.connect(mongo.getUri());
  admin = await User.create({
    name: "Part 3B Coordinator",
    email: "part3b-admin@example.test",
    password: "DemoOnly!2026",
    role: "admin",
    accountStatus: "approved",
  });
  p2 = await seedPart2(admin);
  p3 = await seedPart3(admin, p2);
  trainee = await User.findById(p3.enrollment.trainee);
  otherTrainee = p2.trainees[2];
  reviewer = p3.trainers[1];
  otherTrainer = p3.trainers[0];
  await P2.P2CompetencyRecord.create({
    trainee: trainee._id,
    competency: p2.competencies[0]._id,
    frameworkVersion: 1,
    demonstratedLevel: 2,
    status: "DEMONSTRATED",
    sourceType: "HISTORICAL_REVIEW",
    sourceReference: "Synthetic lower-level review",
    assessedAt: new Date("2026-01-01"),
    reviewer: admin._id,
    isSynthetic: true,
    demoNamespace: "part3b-tests",
  });
});
after(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});

test("evidence ownership, framework validation and reviewer scope are enforced", async () => {
  await request(app)
    .post("/api/part3/evidence")
    .set(auth(trainee))
    .send({
      enrollment: p3.enrollment._id,
      evidenceType: "OTHER",
      claimedCompetencies: [
        {
          competency: p2.competencies[0]._id,
          frameworkVersion: 2,
          rubricVersion: "SYN-RAD-RUBRIC-v1",
          targetLevel: 3,
        },
      ],
      privateResources: [],
      description:
        "This deliberately incompatible framework claim must be rejected.",
    })
    .expect(409);
  let response = await request(app)
    .post("/api/part3/evidence")
    .set(auth(trainee))
    .send({
      enrollment: p3.enrollment._id,
      evidenceType: "PRACTICAL_TASK",
      claimedCompetencies: [
        {
          competency: p2.competencies[0]._id,
          frameworkVersion: 1,
          rubricVersion: "SYN-RAD-RUBRIC-v1",
          targetLevel: 3,
        },
      ],
      privateResources: [],
      description:
        "Synthetic task evidence submitted for a scoped human review.",
    });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  evidence = response.body.data;
  response = await request(app)
    .get("/api/part3/evidence")
    .set(auth(otherTrainee));
  assert.equal(response.status, 200);
  assert.ok(!response.body.data.some((x) => x._id === evidence._id));
  await request(app)
    .post(`/api/part3/evidence/${evidence._id}/assign-reviewer`)
    .set(auth(admin))
    .send({
      reviewer: reviewer._id,
      reason:
        "Assign the reviewed subject specialist for this synthetic batch.",
    })
    .expect(200);
  await request(app)
    .post(`/api/part3/evidence/${evidence._id}/review`)
    .set(auth(otherTrainer))
    .send({
      status: "VERIFIED",
      reason: "Should not be permitted",
      comments: "Outside assignment scope.",
    })
    .expect(403);
  await request(app)
    .post(`/api/part3/evidence/${evidence._id}/review`)
    .set(auth(trainee))
    .send({
      status: "VERIFIED",
      reason: "Self review",
      comments: "Self review",
    })
    .expect(403);
});

test("revision retains the previous version and rejects invalid transitions or missing reasons", async () => {
  let row = await P3.P3Evidence.create({
    owner: trainee._id,
    enrollment: p3.enrollment._id,
    evidenceKey: crypto.randomUUID(),
    version: 1,
    evidenceType: "OTHER",
    claimedCompetencies: [
      {
        competency: p2.competencies[0]._id,
        frameworkVersion: 1,
        rubricVersion: "SYN-RAD-RUBRIC-v1",
        targetLevel: 3,
      },
    ],
    status: "SUBMITTED",
    submittedAt: new Date(),
    description: "Synthetic evidence requiring a clearer description.",
    assignedReviewer: reviewer._id,
  });
  row.status = "UNDER_REVIEW";
  await row.save();
  await request(app)
    .post(`/api/part3/evidence/${row._id}/review`)
    .set(auth(reviewer))
    .send({ status: "NEEDS_REVISION", reason: "", comments: "" })
    .expect(400);
  await request(app)
    .post(`/api/part3/evidence/${row._id}/review`)
    .set(auth(reviewer))
    .send({
      status: "NEEDS_REVISION",
      reason: "Add the task context used by the rubric.",
      comments: "The source remains retained.",
    })
    .expect(200);
  const response = await request(app)
    .post(`/api/part3/evidence/${row._id}/revisions`)
    .set(auth(trainee))
    .send({
      description:
        "Synthetic revised evidence with the requested task context.",
      privateResources: [],
      comments: "Revision responds to the reviewer request.",
    });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.equal(response.body.data.version, 2);
  assert.equal(response.body.data.versionHistory.length, 1);
  await request(app)
    .post(`/api/part3/evidence/${row._id}/revisions`)
    .set(auth(trainee))
    .send({
      description: "An invalid second edit while submitted.",
      privateResources: [],
      comments: "Should fail transition validation.",
    })
    .expect(409);
});

test("private evidence files use opaque storage and owner or scoped-reviewer downloads", async () => {
  const response = await request(app)
    .post(`/api/part3/files/${p3.batch._id}`)
    .set(auth(trainee))
    .set("Content-Type", "text/plain")
    .set("X-File-Name", "../../synthetic-evidence.txt")
    .set("X-File-Purpose", "EVIDENCE")
    .send(Buffer.from("Synthetic private evidence content"));
  assert.equal(response.status, 201, JSON.stringify(response.body));
  assert.equal(response.body.data.purpose, "EVIDENCE");
  assert.ok(!response.body.data.filename.includes("/"));
  await request(app)
    .get(`/api/part3/files/${response.body.data._id}`)
    .set(auth(trainee))
    .expect(200);
  await request(app)
    .get(`/api/part3/files/${response.body.data._id}`)
    .set(auth(reviewer))
    .expect(200);
  await request(app)
    .get(`/api/part3/files/${response.body.data._id}`)
    .set(auth(otherTrainer))
    .expect(404);
});

test("verified evidence alone does not promote; needs-practice preserves a lower valid level and is idempotent", async () => {
  await request(app)
    .post(`/api/part3/evidence/${evidence._id}/review`)
    .set(auth(reviewer))
    .send({
      status: "VERIFIED",
      reason: "Accepted for the stated practical task only.",
      comments: "A separate competency decision is still required.",
    })
    .expect(200);
  let record = await P2.P2CompetencyRecord.findOne({
    trainee: trainee._id,
    competency: p2.competencies[0]._id,
  });
  assert.equal(record.demonstratedLevel, 2);
  const decision = {
    competency: p2.competencies[0]._id,
    frameworkVersion: 1,
    rubricVersion: "SYN-RAD-RUBRIC-v1",
    targetLevel: 3,
    demonstratedLevel: null,
    outcome: "NEEDS_PRACTICE",
    criterionResults: [
      {
        criterionId: "REASONING",
        met: false,
        comments: "Higher-level reasoning requires more practice.",
      },
    ],
    evidenceVersion: 1,
    reason:
      "The L3 synthetic task criterion was not fully demonstrated; preserve the reviewed L2.",
    idempotencyKey: crypto.randomUUID(),
    followUpComments: "Recommend guided practice and reassessment.",
  };
  await request(app)
    .post(`/api/part3/evidence/${evidence._id}/competency-decisions`)
    .set(auth(reviewer))
    .send({ ...decision, competency: p2.competencies[1]._id })
    .expect(409);
  let response = await request(app)
    .post(`/api/part3/evidence/${evidence._id}/competency-decisions`)
    .set(auth(reviewer))
    .send(decision);
  assert.equal(response.status, 201, JSON.stringify(response.body));
  const decisionId = response.body.data._id;
  response = await request(app)
    .post(`/api/part3/evidence/${evidence._id}/competency-decisions`)
    .set(auth(reviewer))
    .send(decision);
  assert.equal(response.status, 201);
  assert.equal(response.body.data._id, decisionId);
  record = await P2.P2CompetencyRecord.findOne({
    trainee: trainee._id,
    competency: p2.competencies[0]._id,
  });
  assert.equal(record.status, "DEMONSTRATED");
  assert.equal(record.demonstratedLevel, 2);
  assert.equal(
    await P3.P3CompetencyHistory.countDocuments({ decision: decisionId }),
    1,
  );
  assert.equal(
    await P3.P3FollowUp.countDocuments({ sourceDecision: decisionId }),
    1,
  );
  const followUp = await P3.P3FollowUp.findOne({ sourceDecision: decisionId });
  await request(app)
    .patch(`/api/part3/follow-ups/${followUp._id}`)
    .set(auth(trainee))
    .send({
      status: "IN_PROGRESS",
      comments: "The trainee started the recommended synthetic practice.",
    })
    .expect(200);
  await request(app)
    .patch(`/api/part3/follow-ups/${followUp._id}`)
    .set(auth(reviewer))
    .send({
      status: "COMPLETED",
      comments:
        "The assigned reviewer recorded completion; this does not prove competency.",
    })
    .expect(200);
  await request(app)
    .patch(`/api/part3/follow-ups/${followUp._id}`)
    .set(auth(trainee))
    .send({
      status: "IN_PROGRESS",
      comments: "A finalized follow-up cannot return to progress.",
    })
    .expect(409);
});

test("a valid human decision updates the correct record and revocation recalculates from retained lower evidence", async () => {
  const response = await request(app)
    .post("/api/part3/evidence")
    .set(auth(trainee))
    .send({
      enrollment: p3.enrollment._id,
      evidenceType: "PROJECT",
      claimedCompetencies: [
        {
          competency: p2.competencies[0]._id,
          frameworkVersion: 1,
          rubricVersion: "SYN-RAD-RUBRIC-v1",
          targetLevel: 3,
        },
      ],
      privateResources: [],
      description:
        "A second synthetic task record with complete rubric evidence.",
    });
  const row = response.body.data;
  await request(app)
    .post(`/api/part3/evidence/${row._id}/assign-reviewer`)
    .set(auth(admin))
    .send({
      reviewer: reviewer._id,
      reason: "Assign explicit subject reviewer.",
    })
    .expect(200);
  await request(app)
    .post(`/api/part3/evidence/${row._id}/review`)
    .set(auth(reviewer))
    .send({
      status: "VERIFIED",
      reason: "Evidence accepted for this task.",
      comments: "Competency decision remains separate.",
    })
    .expect(200);
  let decided = await request(app)
    .post(`/api/part3/evidence/${row._id}/competency-decisions`)
    .set(auth(reviewer))
    .send({
      competency: p2.competencies[0]._id,
      frameworkVersion: 1,
      rubricVersion: "SYN-RAD-RUBRIC-v1",
      targetLevel: 3,
      demonstratedLevel: 3,
      outcome: "DEMONSTRATED",
      criterionResults: [
        {
          criterionId: "HUMAN_REVIEW",
          met: true,
          comments: "All configured task criteria met.",
        },
      ],
      evidenceVersion: 1,
      reason: "The assigned reviewer confirmed all synthetic L3 task criteria.",
      idempotencyKey: crypto.randomUUID(),
      followUpComments: "",
    });
  assert.equal(decided.status, 201, JSON.stringify(decided.body));
  let record = await P2.P2CompetencyRecord.findOne({
    trainee: trainee._id,
    competency: p2.competencies[0]._id,
  });
  assert.equal(record.demonstratedLevel, 3);
  await request(app)
    .post(`/api/part3/competency-decisions/${decided.body.data._id}/supersede`)
    .set(auth(reviewer))
    .send({
      action: "REVOKE",
      reason:
        "Synthetic source invalidation used to verify recalculation history.",
      idempotencyKey: crypto.randomUUID(),
    })
    .expect(200);
  record = await P2.P2CompetencyRecord.findOne({
    trainee: trainee._id,
    competency: p2.competencies[0]._id,
  });
  assert.equal(record.demonstratedLevel, 2);
  assert.equal(record.status, "DEMONSTRATED");
  assert.ok(
    await P2.P2AuditLog.exists({ action: "COMPETENCY_DECISION_REVOKED" }),
  );
});

test("gap and capability analytics keep unknown data separate and count distinct required people", async () => {
  const passport = await request(app)
    .get("/api/part3/competency-passport")
    .set(auth(trainee));
  assert.equal(passport.status, 200);
  assert.equal(
    passport.body.data.gaps.find((x) => x.competency.code === "SYN-RAD-02")
      .category,
    "NOT_ASSESSED",
  );
  const report = await request(app)
    .get("/api/part3/capability")
    .set(auth(admin));
  assert.equal(report.status, 200, JSON.stringify(report.body));
  const radar = report.body.data.coverage.find(
    (x) => x.competency.code === "SYN-RAD-01",
  );
  assert.equal(radar.denominator, 10);
  assert.equal(radar.meetingCount <= radar.denominator, true);
  assert.equal(
    radar.notAssessedCount + radar.belowRequiredCount + radar.meetingCount <=
      radar.denominator,
    true,
  );
  const dated = await request(app)
    .get(
      `/api/part3/capability?start=${encodeURIComponent(p3.session.start.toISOString())}&end=${encodeURIComponent(p3.session.end.toISOString())}`,
    )
    .set(auth(admin));
  const datedRadar = dated.body.data.coverage.find(
    (x) => x.competency.code === "SYN-RAD-01",
  );
  assert.equal(datedRadar.reviewedTrainerCount, 2);
  assert.equal(datedRadar.availableTrainerCount, 2);
  const zeroRole = await P2.P2JobRole.create({
    title: "Synthetic unassigned role",
    status: "ACTIVE",
    createdBy: admin._id,
    isSynthetic: true,
    demoNamespace: "part3b-tests",
  });
  await P2.P2RoleRequirement.create({
    jobRole: zeroRole._id,
    competency: p2.competencies[9]._id,
    competencyVersion: 1,
    requiredLevel: 2,
    priority: "LOW",
    version: 99,
    createdBy: admin._id,
    isSynthetic: true,
    demoNamespace: "part3b-tests",
  });
  const second = await request(app)
    .get(`/api/part3/capability?competency=${p2.competencies[9]._id}`)
    .set(auth(admin));
  assert.ok(
    second.body.data.coverage.some(
      (x) => x.denominator === 0 && x.coveragePercent === null,
    ),
  );
  await request(app)
    .get("/api/part3/capability")
    .set(auth(trainee))
    .expect(403);
});

test("AI disabled, provider failure and invalid output preserve manual workflows without creating decisions", async () => {
  process.env.AI_ENABLED = "false";
  await request(app)
    .post("/api/part3/ai/skill-extraction")
    .set(auth(trainee))
    .send({
      sourceReferenceId: "synthetic-cv",
      sourceText: "Synthetic radar interpretation project experience.",
    })
    .expect(503);
  assert.equal(
    (
      await request(app)
        .post("/api/part3/ai/competency-search")
        .set(auth(trainee))
        .send({ text: "radar interpretation" })
    ).status,
    200,
  );
  process.env.AI_ENABLED = "true";
  process.env.AI_PROVIDER = "mock";
  process.env.AI_TEST_SCENARIO = "failure";
  await request(app)
    .post("/api/part3/ai/skill-extraction")
    .set(auth(trainee))
    .send({
      sourceReferenceId: "synthetic-cv",
      sourceText: "Synthetic radar interpretation project experience.",
    })
    .expect(502);
  process.env.AI_TEST_SCENARIO = "invalid";
  await request(app)
    .post("/api/part3/ai/skill-extraction")
    .set(auth(trainee))
    .send({
      sourceReferenceId: "synthetic-cv",
      sourceText: "Synthetic radar interpretation project experience.",
    })
    .expect(502);
  process.env.AI_TEST_SCENARIO = "timeout";
  await request(app)
    .post("/api/part3/ai/skill-extraction")
    .set(auth(trainee))
    .send({
      sourceReferenceId: "synthetic-cv",
      sourceText: "Synthetic radar interpretation project experience.",
    })
    .expect(504);
  assert.ok(await P3.P3AIRequestMetadata.exists({ outcome: "DISABLED" }));
  assert.ok(await P3.P3AIRequestMetadata.exists({ outcome: "FAILED" }));
  assert.ok(await P3.P3AIRequestMetadata.exists({ outcome: "INVALID_OUTPUT" }));
  process.env.AI_API_KEY = "must-never-appear-in-audit-records";
  assert.ok(
    !JSON.stringify(await P3.P3AIRequestMetadata.find().lean()).includes(
      process.env.AI_API_KEY,
    ),
  );
  assert.equal(
    await P3.P3CompetencyDecision.countDocuments({
      trainee: trainee._id,
      reviewer: trainee._id,
    }),
    0,
  );
  delete process.env.AI_TEST_SCENARIO;
});

test("mocked AI output stays a self-declared suggestion or unpublished question draft", async () => {
  process.env.AI_ENABLED = "true";
  process.env.AI_PROVIDER = "mock";
  let response = await request(app)
    .post("/api/part3/ai/skill-extraction")
    .set(auth(trainee))
    .send({
      sourceReferenceId: "synthetic-cv",
      sourceText: "Synthetic radar interpretation project experience.",
    });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  const requestId = response.body.data.requestId;
  await request(app)
    .post(`/api/part3/ai/skill-extraction/${requestId}/accept`)
    .set(auth(trainee))
    .send({ tag: "Radar interpretation", action: "ACCEPTED" })
    .expect(200);
  const updated = await User.findById(trainee._id);
  assert.ok(updated.skills.includes("Radar interpretation"));
  assert.equal(
    await P2.P2CompetencyRecord.countDocuments({
      trainee: trainee._id,
      sourceReference: requestId,
    }),
    0,
  );
  response = await request(app)
    .post("/api/part3/ai/competency-matching")
    .set(auth(trainee))
    .send({ text: "Synthetic radar interpretation task" });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  await request(app)
    .post(
      `/api/part3/ai/competency-matching/${response.body.data.requestId}/review`,
    )
    .set(auth(trainee))
    .send({
      action: "ACCEPTED",
      competency: p2.competencies[0]._id,
      reason:
        "Human confirmed a catalogue mapping suggestion without changing proficiency.",
    })
    .expect(200);
  assert.ok(
    await P3.P3AIRequestMetadata.exists({
      requestId: response.body.data.requestId,
      humanAction: "ACCEPTED",
    }),
  );
  assert.equal(
    await P2.P2CompetencyRecord.countDocuments({
      trainee: trainee._id,
      sourceReference: response.body.data.requestId,
    }),
    0,
  );
  response = await request(app)
    .post("/api/part3/ai/mcq-drafts")
    .set(auth(reviewer))
    .send({
      batch: p3.batch._id,
      course: p3.batch.course,
      learningModule: p3.modules[0]._id,
      competency: p2.competencies[0]._id,
      frameworkVersion: 1,
      subject: "Weather Radar",
      sourceReference: "Synthetic approved module",
      sourcePage: "4",
      sourcePassage:
        "The approved synthetic passage states that quality-control context is reviewed first.",
    });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  assert.equal(response.body.data.status, "DRAFT");
  assert.equal(response.body.data.provenance.type, "AI_ASSISTED");
  assert.equal(
    await P3.P3Assessment.countDocuments({
      questionVersions: { $elemMatch: { question: response.body.data._id } },
    }),
    0,
  );
});
