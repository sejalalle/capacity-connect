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
let mongo, trainee, outsider, trainer, otherTrainer, admin, course;
let assetId, assetSize;
const auth = (u) => ({ Authorization: `Bearer ${token(u)}` });
const mp4 = (bytes = 2048) =>
  Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x18]),
    Buffer.from("ftyp"),
    Buffer.from("isom"),
    Buffer.alloc(bytes, 0x11),
  ]);
before(async () => {
  mongo = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    instanceOpts: [{ ip: "127.0.0.1" }],
  });
  await mongoose.connect(mongo.getUri());
  await P3.P3MediaProgress.init();
  [trainee, outsider, trainer, otherTrainer, admin] = await Promise.all(
    ["trainee", "trainee", "trainer", "trainer", "admin"].map((role, i) =>
      User.create({
        name: `Synthetic Media ${i}`,
        email: `media-${i}@example.test`,
        password: "DemoOnly!2026",
        role,
        accountStatus: "approved",
      }),
    ),
  );
  course = await P2.P2Course.create({
    title: "Synthetic Media Course",
    code: "MEDIA-DEMO",
    createdBy: trainer._id,
  });
  const batch = await P2.P2Batch.create({
    course: course._id,
    ruleVersion: new mongoose.Types.ObjectId(),
    name: "Synthetic media batch",
    capacity: 5,
    deliveryMode: "ONLINE",
    createdBy: admin._id,
  });
  await P2.P2Enrollment.create({
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
const upload = (user, body, headers = {}) =>
  request(app)
    .post(`/api/part3/media/courses/${course._id}`)
    .set(auth(user))
    .set({ "Content-Type": "video/mp4", "X-File-Name": "synthetic.mp4", ...headers })
    .send(body);

test("video upload is course-owner scoped, content-validated and stored as ready", async () => {
  await upload(otherTrainer, mp4()).expect(403);
  await upload(trainer, Buffer.from("not actually a video"), {
    "Content-Type": "video/mp4",
  }).expect(400);
  const response = await upload(trainer, mp4(), {
    "X-Media-Title": "Synthetic radar lecture",
  }).expect(201);
  assetId = response.body.data._id;
  assetSize = response.body.data.size;
  assert.equal(response.body.data.status, "READY");
  assert.equal(response.body.data.mimeType, "video/mp4");
  assert.equal(response.body.data.title, "Synthetic radar lecture");
  const stored = await P3.P3PrivateResource.findById(
    response.body.data.media,
  ).lean();
  assert.equal(stored.purpose, "VIDEO");
  assert.equal(stored.size, assetSize);
});

test("trainee listing is enrollment-scoped and playback position resumes", async () => {
  const hidden = await request(app).get("/api/part3/media").set(auth(outsider)).expect(200);
  assert.equal(hidden.body.data.assets.length, 0);
  const visible = await request(app).get("/api/part3/media").set(auth(trainee)).expect(200);
  assert.equal(visible.body.data.assets.length, 1);
  assert.deepEqual(visible.body.data.progress, {});
  await request(app)
    .post(`/api/part3/media/${assetId}/progress`)
    .set(auth(outsider))
    .send({ positionSeconds: 12, durationSeconds: 100 })
    .expect(403);
  await request(app)
    .post(`/api/part3/media/${assetId}/progress`)
    .set(auth(trainee))
    .send({ positionSeconds: 42, durationSeconds: 100 })
    .expect(200);
  const resumed = await request(app).get("/api/part3/media").set(auth(trainee)).expect(200);
  assert.equal(resumed.body.data.progress[assetId].positionSeconds, 42);
  assert.equal(resumed.body.data.progress[assetId].completed, false);
  await request(app)
    .post(`/api/part3/media/${assetId}/progress`)
    .set(auth(trainee))
    .send({ positionSeconds: 97, durationSeconds: 100 })
    .expect(200);
  const rows = await P3.P3MediaProgress.find({ media: assetId }).lean();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].completed, true);
});

test("recording streams inline with range support and token authentication", async () => {
  await request(app).get(`/api/part3/media/${assetId}/content`).expect(401);
  const full = await request(app)
    .get(`/api/part3/media/${assetId}/content`)
    .query({ token: token(trainee) })
    .expect(200);
  assert.match(full.headers["content-type"], /video\/mp4/);
  assert.equal(full.headers["accept-ranges"], "bytes");
  const partial = await request(app)
    .get(`/api/part3/media/${assetId}/content`)
    .set(auth(trainee))
    .set("Range", "bytes=0-99")
    .expect(206);
  assert.equal(partial.headers["content-range"], `bytes 0-99/${assetSize}`);
  assert.equal(partial.headers["content-length"], "100");
});

test("coordinator takedown withdraws the recording and removal clears playback records", async () => {
  await request(app)
    .post(`/api/part3/media/${assetId}/moderate`)
    .set(auth(otherTrainer))
    .send({ status: "TAKEN_DOWN", reason: "Attempt by a non-coordinator" })
    .expect(403);
  const moderated = await request(app)
    .post(`/api/part3/media/${assetId}/moderate`)
    .set(auth(admin))
    .send({ status: "TAKEN_DOWN", reason: "Synthetic moderation for regression coverage" })
    .expect(200);
  assert.equal(moderated.body.data.status, "TAKEN_DOWN");
  const withdrawn = await request(app).get("/api/part3/media").set(auth(trainee)).expect(200);
  assert.equal(withdrawn.body.data.assets.length, 0);
  await request(app)
    .get(`/api/part3/media/${assetId}/content`)
    .set(auth(trainee))
    .expect(404);
  await request(app).delete(`/api/part3/media/${assetId}`).set(auth(admin)).expect(200);
  assert.equal(await P3.P3MediaProgress.countDocuments({ media: assetId }), 0);
  assert.equal(await P3.P3PrivateResource.countDocuments({ course: course._id }), 0);
});
