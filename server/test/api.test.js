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
const { default: generateToken } =
  await import("../src/utils/generateToken.js");
let mongo, admin, adminToken;
const password = "LocalTest!2026";
const registration = (
  role = "trainee",
  email = `${crypto.randomUUID()}@example.test`,
) => ({
  name: "Synthetic Test User",
  email,
  password,
  confirmPassword: password,
  role,
  department: "Synthetic Meteorology",
  designation: "Test participant",
  phone: "",
});
const auth = (token) => ({ Authorization: `Bearer ${token}` });
function noPassword(value) {
  assert.ok(!JSON.stringify(value ?? {}).includes('"password"'));
}
before(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongo.getUri());
  await User.init();
  admin = await User.create({
    name: "Test Administrator",
    email: "admin@example.test",
    password,
    role: "admin",
    accountStatus: "approved",
  });
  adminToken = generateToken(admin);
});
after(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});
test("registration → approval → login → JWT → profile persistence → suspension revokes token", async () => {
  const body = registration();
  let response = await request(app).post("/api/auth/register").send(body);
  assert.equal(response.status, 201);
  assert.equal(response.body.data.user.accountStatus, "pending");
  assert.equal(
    response.body.message,
    "Your registration has been submitted for approval.",
  );
  assert.equal(response.body.data.token, undefined);
  noPassword(response.body);
  const id = response.body.data.user._id;
  const stored = await User.findById(id).select("+password");
  assert.match(stored.password, /^\$2[aby]\$12\$/);
  assert.notEqual(stored.password, password);
  noPassword(stored.toJSON());
  response = await request(app)
    .post("/api/auth/login")
    .send({ email: body.email, password });
  assert.equal(response.status, 403);
  assert.equal(response.body.message, "Your account is pending approval.");
  response = await request(app)
    .patch(`/api/users/${id}/status`)
    .set(auth(adminToken))
    .send({ accountStatus: "approved" });
  assert.equal(response.status, 200);
  response = await request(app)
    .post("/api/auth/login")
    .send({ email: body.email, password });
  assert.equal(response.status, 200);
  noPassword(response.body);
  const token = response.body.data.token;
  assert.ok(token);
  response = await request(app).get("/api/auth/me").set(auth(token));
  assert.equal(response.status, 200);
  assert.equal(response.body.data.user.role, "trainee");
  const profile = {
    name: "Updated Synthetic User",
    qualifications: ["Atmospheric Sciences"],
    skills: ["Radar Interpretation"],
    interests: ["Hydrometeorology"],
    profilePhoto: "https://example.test/photo.png",
    workExperience: [
      {
        organization: "Synthetic Laboratory",
        role: "Analyst",
        from: "2020-01-01",
        to: "",
      },
    ],
    certificates: [
      {
        title: "Sample certificate",
        issuedBy: "Synthetic Institute",
        date: "2025-01-01",
        fileUrl: "https://example.test/certificate.pdf",
      },
    ],
  };
  response = await request(app)
    .patch(`/api/users/${id}`)
    .set(auth(token))
    .send(profile);
  assert.equal(response.status, 200);
  noPassword(response.body);
  response = await request(app).get(`/api/users/${id}`).set(auth(token));
  assert.equal(response.body.data.user.name, profile.name);
  assert.deepEqual(response.body.data.user.skills, profile.skills);
  for (const endpoint of ["/api/users", `/api/users/${admin.id}`]) {
    response = await request(app).get(endpoint).set(auth(token));
    assert.equal(response.status, 403);
  }
  response = await request(app)
    .patch(`/api/users/${id}/status`)
    .set(auth(token))
    .send({ accountStatus: "approved" });
  assert.equal(response.status, 403);
  response = await request(app)
    .patch(`/api/users/${id}`)
    .set(auth(token))
    .send({ role: "admin" });
  assert.equal(response.status, 400);
  response = await request(app)
    .patch(`/api/users/${id}/status`)
    .set(auth(adminToken))
    .send({ accountStatus: "rejected" });
  assert.equal(response.status, 409);
  response = await request(app)
    .patch(`/api/users/${id}/status`)
    .set(auth(adminToken))
    .send({ accountStatus: "suspended" });
  assert.equal(response.status, 200);
  response = await request(app).get("/api/auth/me").set(auth(token));
  assert.equal(response.status, 403);
  response = await request(app)
    .post("/api/auth/login")
    .send({ email: body.email, password });
  assert.equal(response.status, 403);
  assert.equal(response.body.message, "Your account has been suspended.");
});
test("trainer authorization, rejection, status filter and pagination", async () => {
  const trainer = await User.create({
    ...registration("trainer"),
    accountStatus: "approved",
  });
  const token = generateToken(trainer);
  for (const method of ["get", "patch"]) {
    const endpoint =
      method === "get" ? "/api/users" : `/api/users/${admin.id}/status`;
    const response = await request(app)
      [method](endpoint)
      .set(auth(token))
      .send(method === "patch" ? { accountStatus: "suspended" } : undefined);
    assert.equal(response.status, 403);
  }
  let response = await request(app)
    .patch(`/api/users/${trainer.id}`)
    .set(auth(token))
    .send({ designation: "Senior Synthetic Trainer" });
  assert.equal(response.status, 200);
  const body = registration("trainer");
  response = await request(app).post("/api/auth/register").send(body);
  const id = response.body.data.user._id;
  response = await request(app)
    .patch(`/api/users/${id}/status`)
    .set(auth(adminToken))
    .send({ accountStatus: "rejected" });
  assert.equal(response.status, 200);
  response = await request(app)
    .post("/api/auth/login")
    .send({ email: body.email, password });
  assert.equal(response.status, 403);
  assert.equal(response.body.message, "Your account has been rejected.");
  response = await request(app)
    .get("/api/users?role=trainer&status=rejected&page=1&limit=1")
    .set(auth(adminToken));
  assert.equal(response.status, 200);
  assert.equal(response.body.data.pagination.total, 1);
  assert.equal(response.body.data.users[0]._id, id);
  noPassword(response.body);
  response = await request(app)
    .patch(`/api/users/${admin.id}/status`)
    .set(auth(adminToken))
    .send({ accountStatus: "suspended" });
  assert.equal(response.status, 409);
});
test("invalid input and credentials consistently return envelopes without secrets", async () => {
  for (const endpoint of [
    "/api/users",
    "/api/auth/me",
    `/api/users/${admin.id}`,
  ]) {
    for (const headers of [{}, auth("invalid")]) {
      const r = await request(app).get(endpoint).set(headers);
      assert.equal(r.status, 401);
      assert.equal(r.body.success, false);
    }
  }
  for (const body of [
    { ...registration(), role: "admin" },
    { ...registration(), accountStatus: "approved" },
    { ...registration(), password: "weak", confirmPassword: "weak" },
    { ...registration(), confirmPassword: "mismatch" },
    { ...registration(), email: "invalid" },
  ]) {
    const r = await request(app).post("/api/auth/register").send(body);
    assert.equal(r.status, 400);
    assert.ok(r.body.errors.length);
    noPassword(r.body.data);
  }
  for (const email of ["admin@example.test", "absent@example.test"]) {
    const r = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "WrongPassword!" });
    assert.equal(r.status, 401);
    assert.equal(r.body.message, "Invalid credentials");
  }
  let r = await request(app)
    .post("/api/auth/register")
    .send(registration("trainee", "admin@example.test"));
  assert.equal(r.status, 409);
  r = await request(app).get("/api/users?page=0").set(auth(adminToken));
  assert.equal(r.status, 400);
  r = await request(app).get("/api/users/not-an-id").set(auth(adminToken));
  assert.equal(r.status, 400);
  r = await request(app)
    .patch(`/api/users/${admin.id}`)
    .set(auth(adminToken))
    .send({ password: "NewPassword!2026" });
  assert.equal(r.status, 400);
  r = await request(app)
    .patch(`/api/users/${admin.id}`)
    .set(auth(adminToken))
    .send({ profilePhoto: "javascript:alert(1)" });
  assert.equal(r.status, 400);
  r = await request(app)
    .post("/api/auth/login")
    .set("Content-Type", "application/json")
    .send("{");
  assert.equal(r.status, 400);
  assert.equal(r.body.success, false);
  r = await request(app).get("/api/missing");
  assert.equal(r.status, 404);
  assert.equal(r.body.success, false);
});

test("profile validation rejects impossible dates and reversed experience ranges", async () => {
  for (const workExperience of [
    [{ organization: "Synthetic lab", role: "Analyst", from: "2025-02-30" }],
    [
      {
        organization: "Synthetic lab",
        role: "Analyst",
        from: "2025-03-01",
        to: "2024-03-01",
      },
    ],
  ]) {
    const response = await request(app)
      .patch(`/api/users/${admin.id}`)
      .set(auth(adminToken))
      .send({ workExperience });
    assert.equal(response.status, 400);
  }
});
