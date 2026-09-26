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
  unscopedAdmin,
  part2,
  part3,
  trainee,
  trainer,
  submission,
  publishedResult;
const auth = (user) => ({ Authorization: `Bearer ${token(user)}` });

before(async () => {
  mongo = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    instanceOpts: [{ ip: "127.0.0.1" }],
  });
  await mongoose.connect(mongo.getUri());
  admin = await User.create({
    name: "Part 3A Coordinator",
    email: "part3a-admin@example.test",
    password: "DemoOnly!2026",
    role: "admin",
    accountStatus: "approved",
  });
  part2 = await seedPart2(admin);
  part3 = await seedPart3(admin, part2);
  unscopedAdmin = await User.create({
    name: "Unscoped Part 3A Admin",
    email: "unscoped-part3a-admin@example.test",
    password: "DemoOnly!2026",
    role: "admin",
    accountStatus: "approved",
  });
  trainee = await User.findById(part3.enrollment.trainee);
  trainer = part3.trainers[1];
});
after(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});

test("Part 3 seed is idempotent and preserves Part 3A resources", async () => {
  await seedPart3(admin, part2);
  assert.equal(await P3.P3TrainerProfile.countDocuments(), 3);
  assert.equal(await P3.P3LearningModule.countDocuments(), 2);
  assert.equal(await P3.P3Question.countDocuments(), 1);
  assert.equal(await P3.P3Assessment.countDocuments(), 2);
  assert.equal(await P3.P3AssessmentSubmission.countDocuments(), 1);
  assert.equal(
    await P3.P3AssessmentSubmission.countDocuments({
      status: "RETURNED_FOR_REVISION",
    }),
    1,
  );
  assert.equal(await P3.P3Evidence.countDocuments(), 3);
  assert.equal(
    await P3.P3Evidence.countDocuments({ status: "NEEDS_REVISION" }),
    1,
  );
  assert.equal(await P3.P3CapabilitySnapshot.countDocuments(), 0);
  await request(app).get("/api/part3/capability").set(auth(admin)).expect(200);
});

test("expertise remains self-declared until a reasoned coordinator review", async () => {
  const competency = part2.competencies[1];
  let response = await request(app)
    .post("/api/part3/expertise")
    .set(auth(trainer))
    .send({
      competency: competency._id,
      frameworkVersion: 1,
      claimedLevel: 3,
      qualifications: ["Synthetic observation qualification"],
      domains: ["Weather Radar"],
      relevantExperienceYears: 4,
      teachingYears: 3,
      supportingResources: [],
    });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  assert.equal(response.body.data.status, "PENDING_REVIEW");
  assert.equal(response.body.data.approvedLevel, null);
  response = await request(app)
    .post(`/api/part3/expertise/${response.body.data._id}/review`)
    .set(auth(unscopedAdmin))
    .send({
      status: "REVIEWED",
      approvedLevel: 3,
      reason: "Synthetic supporting record checked for the demonstration.",
      source: "SYNTHETIC_PRIVATE_DOCUMENT",
    });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.equal(response.body.data.status, "REVIEWED");
  assert.equal(response.body.data.reviewHistory.length, 2);
});

test("suitability applies mandatory checks and exact 100-point contributions", async () => {
  const needsInformationTrainer = await User.create({
    name: "Synthetic Missing Information Trainer",
    email: "missing-information-trainer@example.test",
    password: "DemoOnly!2026",
    role: "trainer",
    accountStatus: "approved",
  });
  await P3.P3TrainerProfile.create({
    trainer: needsInformationTrainer._id,
    professionalExperienceYears: 5,
    teachingExperienceYears: 4,
    domains: ["Weather Radar"],
    deliveryModes: ["ONLINE", "BLENDED"],
    locations: [part3.batch.location],
    reviewStatus: "REVIEWED",
    reviewedBy: admin._id,
    reviewedAt: new Date(),
  });
  await P3.P3TrainerExpertise.create({
    trainer: needsInformationTrainer._id,
    competency: part2.competencies[0]._id,
    frameworkVersion: 1,
    claimedLevel: 3,
    approvedLevel: 3,
    qualifications: ["Synthetic radar training qualification"],
    domains: ["Weather Radar"],
    relevantExperienceYears: 5,
    teachingYears: 4,
    status: "REVIEWED",
    reviewedBy: admin._id,
    reviewedAt: new Date(),
    reviewBasis: "Synthetic reviewed record without availability.",
  });
  const response = await request(app)
    .get(
      `/api/part3/trainer-suitability/${part3.batch._id}/${part3.session._id}`,
    )
    .set(auth(admin));
  assert.equal(response.status, 200, JSON.stringify(response.body));
  const first = response.body.data.find(
    (item) => item.trainer.name === "Synthetic Trainer 1",
  );
  assert.equal(first.status, "ELIGIBLE");
  assert.equal(first.totalPoints, 94);
  assert.deepEqual(
    Object.fromEntries(first.factors.map((item) => [item.key, item.weight])),
    {
      competencyMatch: 35,
      proficiency: 20,
      qualification: 10,
      relevantExperience: 10,
      teachingExperience: 10,
      domainRelevance: 10,
      availabilityFit: 5,
    },
  );
  assert.ok(
    first.factors.every((item) => item.source && item.missingDataBehavior),
  );
  const missing = response.body.data.find(
    (item) => item.trainer.name === "Synthetic Missing Information Trainer",
  );
  assert.equal(missing.status, "NEEDS_INFORMATION");
  assert.ok(missing.missingInformation.includes("AVAILABILITY"));
  const unavailable = response.body.data.find(
    (item) => item.trainer.name === "Synthetic Trainer 3",
  );
  assert.equal(unavailable.status, "INELIGIBLE");
  assert.equal(unavailable.totalPoints, null);
  assert.ok(
    unavailable.checks.some(
      (item) => item.key === "AVAILABILITY" && item.outcome === "FAIL",
    ),
  );
  await request(app)
    .get(
      `/api/part3/trainer-suitability/${part3.batch._id}/${part3.session._id}`,
    )
    .set(auth(trainee))
    .expect(403);
});

test("trainee trainer matching explains every match and answers the trainee's own gap", async () => {
  const response = await request(app)
    .get("/api/part3/trainer-match")
    .set(auth(trainee))
    .expect(200);
  const report = response.body.data;
  assert.ok(report.note.includes("coordinator"));

  const reasons = report.matches.flatMap((match) =>
    match.sessions.flatMap((session) => session.reasons),
  );
  assert.ok(reasons.length, "a recommended session must carry reasons");
  assert.ok(
    reasons.every((reason) => !reason.includes("undefined")),
    JSON.stringify(reasons),
  );
  assert.ok(
    reasons.some((reason) => reason.includes("points")),
    "factor reasons must name the factor and its contribution",
  );

  const gapRows = report.gapMatches;
  assert.ok(Array.isArray(gapRows) && gapRows.length);
  for (const row of gapRows) {
    assert.ok(row.competency.name);
    assert.ok(row.requiredLevel >= 1);
    for (const candidate of row.trainers) {
      assert.ok(
        candidate.reviewedLevel >= row.requiredLevel,
        "a gap match must meet the required level",
      );
      assert.ok(candidate.explanation.includes("reviewed expertise"));
      assert.ok(!candidate.explanation.includes("undefined"));
    }
  }
  assert.ok(
    gapRows.some((row) => row.trainers.length),
    "the seeded reviewed trainer must be surfaced for a gap",
  );

  await request(app)
    .get("/api/part3/trainer-match")
    .set(auth(admin))
    .expect(403);
});

test("partial unavailability overrides a wider available window and planning remains coordinator-scoped", async () => {
  const row = await P3.P3TrainerAvailability.create({
    trainer: trainer._id,
    start: new Date(part3.session.start.getTime() + 1000),
    end: new Date(part3.session.end.getTime() - 1000),
    available: false,
    createdBy: trainer._id,
  });
  const response = await request(app)
    .get(
      `/api/part3/trainer-suitability/${part3.batch._id}/${part3.session._id}`,
    )
    .set(auth(admin))
    .expect(200);
  const result = response.body.data.find(
    (x) => x.trainer._id === String(trainer._id),
  );
  assert.equal(result.status, "INELIGIBLE");
  assert.ok(
    result.checks.some((x) => x.key === "AVAILABILITY" && x.outcome === "FAIL"),
  );
  const body = {
    batch: String(part3.batch._id),
    traineeCount: 30,
    batchSize: 30,
    trainersPerSession: 1,
    start: new Date(part3.session.start.getTime() - 86400000).toISOString(),
    end: new Date(part3.session.end.getTime() + 86400000).toISOString(),
  };
  await request(app)
    .post("/api/part3/capacity")
    .set(auth(trainee))
    .send(body)
    .expect(403);
  await request(app)
    .post("/api/part3/capacity")
    .set(auth(admin))
    .send({ ...body, batchSize: 0 })
    .expect(400);
  const plan = await request(app)
    .post("/api/part3/capacity")
    .set(auth(admin))
    .send(body)
    .expect(200);
  assert.equal(plan.body.data.batchesRequired, 1);
  assert.equal(
    plan.body.data.requiredTeachingHours,
    plan.body.data.teachingHoursPerBatch,
  );
  assert.ok(plan.body.data.assumptions.length);
  await P3.P3TrainerAvailability.deleteOne({ _id: row._id });
});

test("assignment rejects stale shortlists and atomically prevents overlapping concurrent confirmations", async () => {
  let response = await request(app)
    .post("/api/part3/trainer-assignments")
    .set(auth(admin))
    .send({
      batch: part3.batch._id,
      sessionId: part3.session._id,
      trainer: part3.trainers[2]._id,
      reason: "Attempt to bypass mandatory criteria.",
      rankingDepartureReason: "",
      shortlistCalculatedAt: new Date(Date.now() - 3600000).toISOString(),
    });
  assert.equal(response.status, 409);

  const batch = await P2.P2Batch.findById(part3.batch._id);
  const base = new Date(part3.session.start.getTime() + 30 * 60000);
  batch.sessions.push(
    {
      title: "Synthetic concurrent session A",
      subject: "Weather Radar",
      competency: part2.competencies[0]._id,
      frameworkVersion: 1,
      requiredProficiency: 3,
      requiredQualifications: ["Synthetic radar training qualification"],
      start: base,
      end: new Date(base.getTime() + 30 * 60000),
    },
    {
      title: "Synthetic concurrent session B",
      subject: "Weather Radar",
      competency: part2.competencies[0]._id,
      frameworkVersion: 1,
      requiredProficiency: 3,
      requiredQualifications: ["Synthetic radar training qualification"],
      start: new Date(base.getTime() + 10 * 60000),
      end: new Date(base.getTime() + 40 * 60000),
    },
  );
  await batch.save();
  const fresh = await P2.P2Batch.findById(batch._id);
  const sessionIds = fresh.sessions.slice(-2).map((item) => item._id);
  const shortlist = await request(app)
    .get(`/api/part3/trainer-suitability/${batch._id}/${sessionIds[0]}`)
    .set(auth(admin));
  const selected = shortlist.body.data.find(
    (item) => item.trainer.name === "Synthetic Trainer 1",
  );
  assert.equal(selected.status, "ELIGIBLE");
  const requests = sessionIds.map((sessionId) =>
    request(app).post("/api/part3/trainer-assignments").set(auth(admin)).send({
      batch: batch._id,
      sessionId,
      trainer: part3.trainers[0]._id,
      reason: "Synthetic concurrent reservation test.",
      rankingDepartureReason: "",
      shortlistCalculatedAt: selected.calculatedAt,
    }),
  );
  const outcomes = (await Promise.all(requests))
    .map((item) => item.status)
    .sort();
  assert.deepEqual(outcomes, [201, 409]);
});

test("learning resources and progress enforce enrollment ownership without changing competency", async () => {
  let response = await request(app)
    .get("/api/part3/learning")
    .set(auth(trainee));
  assert.equal(response.status, 200);
  assert.equal(response.body.data.modules.length, 2);
  const before = await P2.P2CompetencyRecord.countDocuments({
    trainee: trainee._id,
  });
  response = await request(app)
    .post(`/api/part3/learning/modules/${part3.modules[0]._id}/progress`)
    .set(auth(trainee))
    .send({ enrollment: part3.enrollment._id, status: "COMPLETED" });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.equal(
    await P2.P2CompetencyRecord.countDocuments({ trainee: trainee._id }),
    before,
  );
  response = await request(app)
    .get("/api/part3/learning")
    .set(auth(part2.asha));
  assert.equal(response.body.data.modules.length, 0);
  await request(app)
    .post(`/api/part3/learning/modules/${part3.modules[0]._id}/progress`)
    .set(auth(part2.asha))
    .send({ enrollment: part3.enrollment._id, status: "COMPLETED" })
    .expect(403);
});

test("trainee assessment APIs hide answer keys and server controls resumable scoring and limits", async () => {
  let response = await request(app)
    .get("/api/part3/assessments")
    .set(auth(trainee));
  assert.equal(response.status, 200);
  const serialized = JSON.stringify(response.body);
  assert.doesNotMatch(
    serialized,
    /correctOptionId|quality-control context to be reviewed first/i,
  );

  response = await request(app)
    .post(`/api/part3/assessments/${part3.mcq._id}/attempts/start`)
    .set(auth(trainee))
    .send({});
  assert.equal(response.status, 201, JSON.stringify(response.body));
  const attempt = response.body.data.attempt;
  assert.equal(
    response.body.data.assessment.questionVersions[0].correctOptionId,
    undefined,
  );
  const resumed = await request(app)
    .post(`/api/part3/assessments/${part3.mcq._id}/attempts/start`)
    .set(auth(trainee))
    .send({});
  assert.equal(resumed.body.data.attempt._id, attempt._id);
  assert.deepEqual(
    resumed.body.data.attempt.questionOrder,
    attempt.questionOrder,
  );
  assert.equal(
    resumed.body.data.attempt.effectiveDeadline,
    attempt.effectiveDeadline,
  );

  response = await request(app)
    .put(`/api/part3/attempts/${attempt._id}/answers`)
    .set(auth(trainee))
    .send({
      answers: [{ questionId: "SYN-RAD-Q01", optionId: "A" }],
      score: 1000,
    });
  assert.equal(response.status, 400, "client-supplied scores must be rejected");
  await request(app)
    .put(`/api/part3/attempts/${attempt._id}/answers`)
    .set(auth(trainee))
    .send({ answers: [{ questionId: "SYN-RAD-Q01", optionId: "A" }] })
    .expect(200);
  const key = crypto.randomUUID();
  response = await request(app)
    .post(`/api/part3/attempts/${attempt._id}/submit`)
    .set(auth(trainee))
    .send({ submissionKey: key });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.equal(response.body.data.rawScore, 10);
  const duplicate = await request(app)
    .post(`/api/part3/attempts/${attempt._id}/submit`)
    .set(auth(trainee))
    .send({ submissionKey: key });
  assert.equal(duplicate.body.data._id, attempt._id);
  assert.equal(
    await P3.P3AssessmentAttempt.countDocuments({
      enrollment: part3.enrollment._id,
      assessment: part3.mcq._id,
      attemptNumber: 1,
    }),
    1,
  );
});

test("expired attempts recover saved answers after restart semantics and enforce attempt limit", async () => {
  let response = await request(app)
    .post(`/api/part3/assessments/${part3.mcq._id}/attempts/start`)
    .set(auth(trainee))
    .send({});
  assert.equal(response.status, 201, JSON.stringify(response.body));
  const second = response.body.data.attempt;
  await request(app)
    .put(`/api/part3/attempts/${second._id}/answers`)
    .set(auth(trainee))
    .send({ answers: [{ questionId: "SYN-RAD-Q01", optionId: "A" }] })
    .expect(200);
  await P3.P3AssessmentAttempt.updateOne(
    { _id: second._id },
    { effectiveDeadline: new Date(Date.now() - 1000) },
  );
  response = await request(app)
    .post(`/api/part3/assessments/${part3.mcq._id}/attempts/start`)
    .set(auth(trainee))
    .send({});
  assert.equal(response.status, 409);
  const recovered = await P3.P3AssessmentAttempt.findById(second._id);
  assert.equal(recovered.status, "TIMED_OUT");
  assert.equal(recovered.rawScore, 10);
  assert.equal(
    await P3.P3AssessmentAttempt.countDocuments({
      enrollment: part3.enrollment._id,
      assessment: part3.mcq._id,
    }),
    2,
  );
});

test("reviewed question and published assessment versions cannot be silently altered", async () => {
  const original = await P3.P3Assessment.findById(part3.mcq._id).lean();
  await request(app)
    .patch(`/api/part3/assessments/${part3.mcq._id}`)
    .set(auth(trainer))
    .send({ passingScore: 0 })
    .expect(404);
  const unchanged = await P3.P3Assessment.findById(part3.mcq._id).lean();
  assert.equal(unchanged.version, original.version);
  assert.equal(unchanged.passingScore, original.passingScore);
  const invalid = await request(app)
    .post("/api/part3/questions")
    .set(auth(trainer))
    .send({
      batch: part3.batch._id,
      course: part3.batch.course,
      subject: "Weather Radar",
      questionKey: "SYN_INVALID",
      text: "This question has duplicate option text and must be rejected.",
      options: [
        { optionId: "A", text: "Duplicate" },
        { optionId: "B", text: "Duplicate" },
      ],
      correctOptionId: "A",
      marks: 1,
      explanation: "This item is deliberately invalid for testing.",
      sourceReference: "Synthetic validation source",
    });
  assert.equal(invalid.status, 400);
});

test("a question needs an independent reviewer before it can be published into an assessment", async () => {
  await P3.P3BatchPermission.create({
    batch: part3.batch._id,
    user: part3.trainers[0]._id,
    actions: ["MANAGE_QUESTION_BANK", "CREATE_ASSESSMENT"],
    grantedBy: admin._id,
    reason: "Synthetic independent reviewer grant for the review-chain test.",
    isSynthetic: true,
    demoNamespace: "part3-review-chain",
  });

  let response = await request(app)
    .post("/api/part3/questions")
    .set(auth(trainer))
    .send({
      batch: part3.batch._id,
      course: part3.batch.course,
      subject: "Weather Radar",
      questionKey: "SYN_REVIEW_CHAIN",
      text: "Which product best shows the radial velocity of a storm?",
      options: [
        { optionId: "A", text: "Base reflectivity product" },
        { optionId: "B", text: "Radial velocity product" },
      ],
      correctOptionId: "B",
      marks: 1,
      explanation: "Radial velocity shows motion toward or away from the radar.",
      sourceReference: "Synthetic radar product reference",
      provenance: { type: "MANUAL" },
    });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  const question = response.body.data;
  assert.equal(question.status, "DRAFT");

  await request(app)
    .post(`/api/part3/questions/${question._id}/review`)
    .set(auth(trainer))
    .send({ reason: "The author must not perform the independent review." })
    .expect(403);

  const draftBody = {
    batch: String(part3.batch._id),
    course: String(part3.batch.course),
    title: "Synthetic review-chain assessment",
    type: "MCQ",
    instructions: "Synthetic assessment used to verify the review chain.",
    opensAt: new Date(Date.now() - 3600000).toISOString(),
    closesAt: new Date(Date.now() + 3600000).toISOString(),
    durationMinutes: 20,
    attemptLimit: 1,
    passingScore: 50,
    resultReleasePolicy: "ON_PUBLICATION",
    questionIds: [String(question._id)],
  };

  response = await request(app)
    .post("/api/part3/assessments")
    .set(auth(trainer))
    .send(draftBody);
  assert.equal(response.status, 409, JSON.stringify(response.body));

  response = await request(app)
    .post(`/api/part3/questions/${question._id}/review`)
    .set(auth(part3.trainers[0]))
    .send({ reason: "Independently reviewed against the cited approved source." });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.equal(response.body.data.status, "REVIEWED");

  response = await request(app)
    .post("/api/part3/assessments")
    .set(auth(trainer))
    .send(draftBody);
  assert.equal(response.status, 201, JSON.stringify(response.body));
  const assessment = response.body.data;
  assert.equal(assessment.status, "DRAFT");

  response = await request(app)
    .post(`/api/part3/assessments/${assessment._id}/publish`)
    .set(auth(trainer))
    .send({ reason: "Reviewed and ready for delivery." });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.equal(response.body.data.status, "PUBLISHED");

  const recordsBefore = await P2.P2CompetencyRecord.countDocuments();
  response = await request(app)
    .post(`/api/part3/assessments/${assessment._id}/attempts/start`)
    .set(auth(trainee))
    .send({});
  assert.equal(response.status, 201, JSON.stringify(response.body));
  assert.ok(response.body.data.attempt.questionOrder.length >= 1);
  assert.equal(
    JSON.stringify(response.body.data).includes("correctOptionId"),
    false,
    "an answer key must never reach a trainee response",
  );
  assert.equal(
    await P2.P2CompetencyRecord.countDocuments(),
    recordsBefore,
    "publishing and attempting an assessment never creates a competency record",
  );

  // Restore the shared fixture: later suites prepare a result for this batch and
  // must not see an extra published assessment.
  await P3.P3AssessmentAttempt.deleteMany({ assessment: assessment._id });
  await P3.P3Assessment.deleteOne({ _id: assessment._id });
  await P3.P3Question.deleteOne({ _id: question._id });
  await P3.P3BatchPermission.deleteOne({
    batch: part3.batch._id,
    user: part3.trainers[0]._id,
  });
});

test("practical evaluation requires assigned evaluator and enforces rubric limits", async () => {
  let response = await request(app)
    .post("/api/part3/submissions")
    .set(auth(trainee))
    .send({
      enrollment: part3.enrollment._id,
      assessment: part3.practical._id,
      responseText:
        "Synthetic practical interpretation with an uncertainty statement.",
      privateResources: [],
    });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  submission = response.body.data;
  await request(app)
    .post(`/api/part3/submissions/${submission._id}/evaluations`)
    .set(auth(part3.trainers[0]))
    .send({
      status: "EVALUATED",
      criterionMarks: [
        { criterionId: "OBSERVATION", marks: 35, comment: "" },
        { criterionId: "REASONING", marks: 45, comment: "" },
      ],
      comments: "Should be rejected because evaluator was not assigned.",
    })
    .expect(403);
  response = await request(app)
    .post(`/api/part3/submissions/${submission._id}/evaluations`)
    .set(auth(trainer))
    .send({
      status: "EVALUATED",
      criterionMarks: [
        { criterionId: "OBSERVATION", marks: 41, comment: "" },
        { criterionId: "REASONING", marks: 45, comment: "" },
      ],
      comments: "Invalid marks above the rubric maximum.",
    });
  assert.equal(response.status, 400);
  response = await request(app)
    .post(`/api/part3/submissions/${submission._id}/evaluations`)
    .set(auth(trainer))
    .send({
      status: "EVALUATED",
      criterionMarks: [
        {
          criterionId: "OBSERVATION",
          marks: 35,
          comment: "Observed synthetic features.",
        },
        {
          criterionId: "REASONING",
          marks: 45,
          comment: "Reasoning included uncertainty.",
        },
      ],
      comments:
        "Synthetic human evaluation completed against rubric version one.",
    });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  assert.equal(response.body.data.score, 80);
});

test("draft results remain private; publication and correction preserve history", async () => {
  let response = await request(app)
    .post("/api/part3/results/prepare")
    .set(auth(trainer))
    .send({
      enrollment: part3.enrollment._id,
      reason: "All required Part 3A components were checked.",
    });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  const draft = response.body.data;
  assert.equal(draft.status, "READY_FOR_REVIEW");
  response = await request(app).get("/api/part3/results").set(auth(trainee));
  assert.equal(response.body.data.length, 0);
  response = await request(app)
    .get("/api/part3/results")
    .set(auth(unscopedAdmin));
  assert.equal(response.body.data.length, 0);
  response = await request(app)
    .post(`/api/part3/results/${draft._id}/publish`)
    .set(auth(unscopedAdmin))
    .send({
      reason: "Coordinator authorized publication after required checks.",
    });
  assert.equal(
    response.status,
    403,
    "admin role alone lacks batch publication permission",
  );
  response = await request(app)
    .post(`/api/part3/results/${draft._id}/publish`)
    .set(auth(admin))
    .send({ reason: "Authorized publisher released the reviewed result." });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  publishedResult = response.body.data;
  assert.equal(publishedResult.status, "PUBLISHED");
  response = await request(app).get("/api/part3/results").set(auth(trainee));
  assert.equal(response.body.data.length, 1);
  assert.equal(response.body.data[0].percentage, publishedResult.percentage);

  const correction = await request(app)
    .post("/api/part3/results/prepare")
    .set(auth(trainer))
    .send({
      enrollment: part3.enrollment._id,
      reason: "Prepare an authorized correction version.",
    });
  assert.equal(correction.body.data.version, 2);
  await request(app)
    .post(`/api/part3/results/${correction.body.data._id}/publish`)
    .set(auth(trainer))
    .send({ reason: "Correction reviewed and authorized." })
    .expect(200);
  assert.equal(
    (await P3.P3ResultVersion.findById(publishedResult._id)).status,
    "SUPERSEDED",
  );
  assert.equal(
    await P3.P3ResultVersion.countDocuments({
      enrollment: part3.enrollment._id,
    }),
    2,
  );
  assert.equal(
    await P2.P2CompetencyRecord.countDocuments({
      trainee: trainee._id,
      sourceType: "PART3_REVIEW",
    }),
    0,
  );
});

test("private submission files validate content and enforce batch-scoped downloads", async () => {
  let response = await request(app)
    .post(`/api/part3/files/${part3.batch._id}`)
    .set(auth(trainee))
    .set("Content-Type", "text/plain")
    .set("X-File-Name", "synthetic-submission.txt")
    .set("X-File-Purpose", "SUBMISSION")
    .send(Buffer.from("Synthetic private practical submission"));
  assert.equal(response.status, 201, JSON.stringify(response.body));
  const resource = response.body.data;
  await request(app)
    .get(`/api/part3/files/${resource._id}`)
    .set(auth(trainee))
    .expect(200);
  await request(app)
    .get(`/api/part3/files/${resource._id}`)
    .set(auth(part2.asha))
    .expect(404);
  await request(app)
    .get(`/api/part3/files/${resource._id}`)
    .set(auth(unscopedAdmin))
    .expect(404);
  response = await request(app)
    .post(`/api/part3/files/${part3.batch._id}`)
    .set(auth(trainee))
    .set("Content-Type", "application/pdf")
    .set("X-File-Name", "fake.pdf")
    .set("X-File-Purpose", "SUBMISSION")
    .send(Buffer.from("not a pdf"));
  assert.equal(response.status, 400);
});

test("important Part 3A decisions create safe audits and deduplicated notifications", async () => {
  const actions = await P2.P2AuditLog.distinct("action");
  for (const expected of [
    "TRAINER_EXPERTISE_REVIEWED",
    "TRAINER_ASSIGNED",
    "ASSESSMENT_ATTEMPT_SUBMITTED",
    "SUBMISSION_EVALUATED",
    "RESULT_PUBLISHED",
    "RESULT_CORRECTED",
  ])
    assert.ok(actions.includes(expected), `missing audit action ${expected}`);
  assert.ok(
    await P2.P2Notification.exists({
      recipient: trainee._id,
      type: "RESULT_PUBLISHED",
    }),
  );
  const auditText = JSON.stringify(await P2.P2AuditLog.find().lean());
  assert.doesNotMatch(
    auditText,
    /DemoOnly|Bearer|correctOptionId|private practical submission/,
  );
});
