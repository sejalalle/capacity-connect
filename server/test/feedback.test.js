import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = crypto.randomBytes(48).toString("hex");
const { default: app } = await import("../src/app.js");
const { default: User } = await import("../src/models/User.js");
const { default: token } = await import("../src/utils/generateToken.js");
const P2 = await import("../src/models/Part2.js");
const P3 = await import("../src/models/Part3.js");
let mongo, trainee, other, trainer, admin, batch, enrollment, course;
const auth = (u) => ({ Authorization: `Bearer ${token(u)}` });
before(async () => {
  mongo = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    instanceOpts: [{ ip: "127.0.0.1" }],
  });
  await mongoose.connect(mongo.getUri());
  await P3.P3Feedback.init();
  [trainee, other, trainer, admin] = await Promise.all(
    ["trainee", "trainee", "trainer", "admin"].map((role, i) =>
      User.create({
        name: `Synthetic ${i}`,
        email: `feedback-${i}@example.test`,
        password: "DemoOnly!2026",
        role,
        accountStatus: "approved",
      }),
    ),
  );
  course = await P2.P2Course.create({
    title: "Synthetic Radar Course",
    code: "FEEDBACK-DEMO",
    createdBy: trainer._id,
  });
  batch = await P2.P2Batch.create({
    course: course._id,
    ruleVersion: new mongoose.Types.ObjectId(),
    name: "Synthetic batch",
    capacity: 5,
    deliveryMode: "ONLINE",
    createdBy: admin._id,
  });
  enrollment = await P2.P2Enrollment.create({
    trainee: trainee._id,
    batch: batch._id,
    nomination: new mongoose.Types.ObjectId(),
    admittedBy: admin._id,
  });
});
after(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});
test("feedback is participant-scoped and concurrent duplicate responses are prevented", async () => {
  const body = {
    enrollment: String(enrollment._id),
    targetType: "COURSE",
    target: String(course._id),
    rating: 4,
    comment: "Useful synthetic lesson",
  };
  await request(app)
    .post("/api/part3/feedback")
    .set(auth(other))
    .send(body)
    .expect(403);
  await request(app)
    .post("/api/part3/feedback")
    .set(auth(trainee))
    .send({ ...body, target: String(new mongoose.Types.ObjectId()) })
    .expect(403);
  await request(app)
    .post("/api/part3/feedback")
    .set(auth(trainee))
    .send({ ...body, rating: 6 })
    .expect(400);
  const responses = await Promise.all(
    [1, 2].map(() =>
      request(app).post("/api/part3/feedback").set(auth(trainee)).send(body),
    ),
  );
  assert.deepEqual(responses.map((x) => x.status).sort(), [200, 409]);
  assert.equal(await P3.P3Feedback.countDocuments(), 1);
  const opportunities = await request(app)
    .get("/api/part3/feedback/opportunities")
    .set(auth(trainee))
    .expect(200);
  assert.equal(opportunities.body.data.submitted.length, 1);
  const hidden = await request(app)
    .get("/api/part3/feedback")
    .set(auth(trainer))
    .expect(200);
  assert.equal(hidden.body.data.aggregates.length, 0);
  await P3.P3TrainerAssignment.create({
    trainer: trainer._id,
    batch: batch._id,
    sessionId: new mongoose.Types.ObjectId(),
    assignedBy: admin._id,
    status: "ACTIVE",
  });
  const summary = await request(app)
    .get("/api/part3/feedback")
    .set(auth(trainer))
    .expect(200);
  assert.equal(summary.body.data.aggregates[0].average, 4);
  assert.deepEqual(summary.body.data.responses, []);
  assert.ok(!JSON.stringify(summary.body).includes("Useful synthetic lesson"));
  await request(app).get("/api/part3/feedback").set(auth(trainee)).expect(403);
  const coordinator = await request(app)
    .get("/api/part3/feedback")
    .set(auth(admin))
    .expect(200);
  assert.equal(coordinator.body.data.responses.length, 1);
  assert.equal(await P2.P2CompetencyRecord.countDocuments(), 0);
});

test("certificates enforce pinned conditions, scoped publication, private PDFs and idempotent history", async () => {
  const id = String(enrollment._id);
  const issue = (user) =>
    request(app)
      .post("/api/part3/certificates/issue")
      .set(auth(user))
      .send({ enrollment: id });
  await P3.P3CompletionCertificate.init();
  await issue(trainee).expect(403);
  await issue(trainer).expect(403);
  await issue(admin).expect(409);
  const rule = await P2.P2CourseRuleVersion.create({
    course: course._id,
    version: 1,
    status: "PUBLISHED",
    createdBy: admin._id,
    certificatePolicy: {
      enabled: true,
      requireLearningCompletion: true,
      requirePublishedPass: true,
    },
  });
  batch.ruleVersion = rule._id;
  await batch.save();
  await issue(admin).expect(409);
  const result = await P3.P3ResultVersion.create({
    enrollment: enrollment._id,
    batch: batch._id,
    trainee: trainee._id,
    version: 1,
    status: "PUBLISHED",
    outcome: "PASS",
    preparedBy: admin._id,
    publishedBy: admin._id,
    publishedAt: new Date(),
  });
  await issue(admin).expect(409);
  const module = await P3.P3LearningModule.create({
    course: course._id,
    batch: batch._id,
    order: 1,
    title: "Synthetic learning",
    status: "PUBLISHED",
    createdBy: trainer._id,
  });
  await P3.P3LearningProgress.create({
    enrollment: enrollment._id,
    trainee: trainee._id,
    module: module._id,
    status: "COMPLETED",
    completedAt: new Date(),
  });
  const responses = await Promise.all([issue(admin), issue(admin)]);
  assert.deepEqual(
    responses.map((x) => x.status),
    [200, 200],
  );
  assert.equal(responses[0].body.data._id, responses[1].body.data._id);
  const certificate = responses[0].body.data;
  assert.equal(certificate.resultVersion, String(result._id));
  assert.equal(await P3.P3CompletionCertificate.countDocuments(), 1);
  assert.equal(
    await P2.P2AuditLog.countDocuments({ action: "CERTIFICATE_ISSUED" }),
    1,
  );
  assert.equal(
    await P2.P2Notification.countDocuments({ type: "CERTIFICATE_ISSUED" }),
    1,
  );
  await request(app)
    .get(`/api/part3/certificates/${certificate._id}/pdf`)
    .set(auth(other))
    .expect(404);
  const pdf = await request(app)
    .get(`/api/part3/certificates/${certificate._id}/pdf`)
    .set(auth(trainee))
    .expect(200);
  assert.match(pdf.headers["content-type"], /application\/pdf/);
  assert.equal(pdf.body.subarray(0, 4).toString(), "%PDF");
  await request(app)
    .post(`/api/part3/certificates/${certificate._id}/revoke`)
    .set(auth(admin))
    .send({ reason: "Correction required for synthetic record" })
    .expect(200);
  await request(app)
    .get(`/api/part3/certificates/${certificate._id}/pdf`)
    .set(auth(trainee))
    .expect(409);
  const revoked = await issue(admin).expect(200);
  assert.equal(revoked.body.data.status, "REVOKED");
  assert.equal(revoked.body.data.history.length, 2);
  assert.equal(await P2.P2CompetencyRecord.countDocuments(), 0);
});
