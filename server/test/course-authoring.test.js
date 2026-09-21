import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryReplSet } from "mongodb-memory-server";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = crypto.randomBytes(48).toString("hex");
const { default: app } = await import("../src/app.js");
const { default: User } = await import("../src/models/User.js");
const P2 = await import("../src/models/Part2.js");
const { default: generateToken } =
  await import("../src/utils/generateToken.js");

let mongo,
  trainer,
  otherTrainer,
  trainee,
  pendingTrainer,
  token,
  otherToken,
  traineeToken,
  pendingToken,
  competency;
const auth = (value) => ({ Authorization: `Bearer ${value}` });

test("coordinator publishes framework drafts for trainer course mapping without granting trainers framework control", async () => {
  const admin = await User.create({
    name: "Synthetic Coordinator",
    email: "mapping-admin@example.test",
    password: "LocalTest!2026",
    role: "admin",
    accountStatus: "approved",
  });
  const draft = await P2.P2Competency.create({
    name: "Synthetic Mapping Task",
    code: "SYN-MAPPING",
    domain: "Radar",
    version: 1,
    status: "DRAFT",
    levels: [{ value: 1, label: "Awareness", definition: "Explain the task" }],
    createdBy: admin._id,
  });
  let response = await request(app).get("/api/competencies").set(auth(token));
  assert.equal(
    response.body.data.items.some((item) => item._id === draft.id),
    false,
  );
  await request(app)
    .post(`/api/competencies/${draft.id}/publish`)
    .set(auth(token))
    .send({})
    .expect(403);
  await request(app)
    .post(`/api/competencies/${draft.id}/publish`)
    .set(auth(generateToken(admin)))
    .send({})
    .expect(200);
  response = await request(app).get("/api/competencies").set(auth(token));
  assert.equal(
    response.body.data.items.some((item) => item._id === draft.id),
    true,
  );
});

before(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongo.getUri());
  [trainer, otherTrainer, trainee, pendingTrainer] = await User.create([
    {
      name: "Synthetic Course Author",
      email: "course.author@example.test",
      password: "LocalTest!2026",
      role: "trainer",
      accountStatus: "approved",
    },
    {
      name: "Synthetic Other Trainer",
      email: "other.author@example.test",
      password: "LocalTest!2026",
      role: "trainer",
      accountStatus: "approved",
    },
    {
      name: "Synthetic Learner",
      email: "course.learner@example.test",
      password: "LocalTest!2026",
      role: "trainee",
      accountStatus: "approved",
    },
    {
      name: "Synthetic Pending Trainer",
      email: "pending.author@example.test",
      password: "LocalTest!2026",
      role: "trainer",
      accountStatus: "pending",
    },
  ]);
  token = generateToken(trainer);
  otherToken = generateToken(otherTrainer);
  traineeToken = generateToken(trainee);
  pendingToken = generateToken(pendingTrainer);
  competency = await P2.P2Competency.create({
    name: "Synthetic Radar Task",
    code: "SYN-RADAR-AUTH",
    description: "Synthetic task",
    domain: "Radar",
    version: 1,
    levels: [
      { value: 1, label: "Guided", definition: "Performs with guidance" },
    ],
    status: "PUBLISHED",
    createdBy: trainer._id,
    isSynthetic: true,
  });
});

after(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});

test("approved trainer creates, validates and publishes an owned course without coordinator approval", async () => {
  let response = await request(app)
    .post("/api/courses")
    .set(auth(token))
    .send({ title: "Sample Trainer Programme", code: "SYN-TRAINER-COURSE" });
  assert.equal(response.status, 201);
  const courseId = response.body.data._id;
  assert.equal(String(response.body.data.createdBy), String(trainer._id));
  assert.equal(response.body.data.status, "DRAFT");

  response = await request(app)
    .post(`/api/courses/${courseId}/publish`)
    .set(auth(token))
    .send({});
  assert.equal(response.status, 400);
  assert.ok(response.body.errors.some((item) => item.field === "description"));

  response = await request(app)
    .patch(`/api/courses/${courseId}`)
    .set(auth(token))
    .send({
      description: "Synthetic course authored by an approved trainer.",
      domain: "Weather Radar Interpretation",
      category: "Professional learning",
      duration: { value: 8, unit: "HOURS" },
      difficulty: "FOUNDATION",
      competencyOutcomes: [
        { competency: competency._id, frameworkVersion: 1, targetLevel: 1 },
      ],
    });
  assert.equal(response.status, 200);

  response = await request(app)
    .patch(`/api/courses/${courseId}`)
    .set(auth(otherToken))
    .send({ title: "Unauthorized edit" });
  assert.equal(response.status, 403);
  response = await request(app)
    .post(`/api/courses/${courseId}/publish`)
    .set(auth(token))
    .send({});
  assert.equal(response.status, 200);
  assert.equal(response.body.data.status, "PUBLISHED");

  response = await request(app).get("/api/courses").set(auth(traineeToken));
  assert.equal(response.status, 200);
  assert.ok(response.body.data.items.some((item) => item._id === courseId));
  response = await request(app)
    .patch(`/api/courses/${courseId}`)
    .set(auth(token))
    .send({ title: "Silent active edit" });
  assert.equal(response.status, 409);
});

test("pending trainer cannot author and draft course resources stay private", async () => {
  let response = await request(app)
    .post("/api/courses")
    .set(auth(pendingToken))
    .send({ title: "Blocked", code: "BLOCKED" });
  assert.equal(response.status, 403);

  response = await request(app)
    .post("/api/courses")
    .set(auth(token))
    .send({ title: "Private Draft", code: "SYN-PRIVATE-DRAFT" });
  const courseId = response.body.data._id;
  const pdf = Buffer.from("%PDF-1.4\nSynthetic private learning material");
  response = await request(app)
    .post(`/api/part3/course-files/${courseId}`)
    .set(auth(token))
    .set("Content-Type", "application/pdf")
    .set("X-File-Name", "sample.pdf")
    .send(pdf);
  assert.equal(response.status, 201);
  const resourceId = response.body.data._id;

  response = await request(app)
    .post("/api/part3/learning/modules")
    .set(auth(token))
    .send({
      course: courseId,
      order: 1,
      title: "Draft radar module",
      summary: "Synthetic private module summary.",
      announcement: "",
      completionRule: "VIEW",
      resources: [
        {
          title: "Sample PDF",
          type: "PDF",
          privateResource: resourceId,
          restricted: true,
        },
      ],
    });
  assert.equal(response.status, 201);
  assert.equal(response.body.data.status, "DRAFT");

  await request(app)
    .get(`/api/part3/files/${resourceId}`)
    .set(auth(token))
    .expect(200);
  await request(app)
    .get(`/api/part3/files/${resourceId}`)
    .set(auth(traineeToken))
    .expect(404);
  await request(app)
    .get(`/api/part3/course-files/${courseId}`)
    .set(auth(otherToken))
    .expect(403);
});
