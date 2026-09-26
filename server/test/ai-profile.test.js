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
const P3 = await import("../src/models/Part3.js");
const { aiSettings, AI_PROFILE_NAMES } = await import(
  "../src/services/aiService.js"
);

let mongo, trainee;
const auth = (user) => ({ Authorization: `Bearer ${token(user)}` });
const clearAiEnv = () => {
  for (const key of [
    "AI_ENABLED",
    "AI_PROVIDER",
    "AI_PROVIDER_PROFILE",
    "AI_MODEL",
    "AI_API_KEY",
    "AI_BASE_URL",
    "AI_EXTERNAL_DATA_APPROVED",
    "GEMINI_API_KEY",
    "GEMINI_MODEL",
    "OPENAI_API_KEY",
    "OPENAI_MODEL",
  ])
    delete process.env[key];
};

before(async () => {
  mongo = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    instanceOpts: [{ ip: "127.0.0.1" }],
  });
  await mongoose.connect(mongo.getUri());
  trainee = await User.create({
    name: "AI Profile Trainee",
    email: "ai-profile@example.test",
    password: "DemoOnly!2026",
    role: "trainee",
    accountStatus: "approved",
  });
});

after(async () => {
  clearAiEnv();
  await mongoose.disconnect();
  await mongo?.stop();
});

test("no profile selected means AI assistance is off", async () => {
  clearAiEnv();
  const settings = aiSettings();
  assert.equal(settings.enabled, false);
  assert.equal(settings.profile, null);
  assert.equal(settings.provider, "disabled");
  const response = await request(app)
    .get("/api/part3/ai/settings")
    .set(auth(trainee));
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.equal(response.body.data.enabled, false);
});

test("one switch moves every AI task to the selected provider", async () => {
  clearAiEnv();
  process.env.AI_PROVIDER_PROFILE = "gemini";
  process.env.GEMINI_API_KEY = "gemini-profile-secret";

  // Choosing a profile is enough to switch AI on; the profile carries the model.
  let settings = aiSettings();
  assert.equal(settings.enabled, true);
  assert.equal(settings.profile, "gemini");
  assert.equal(settings.provider, "openai-compatible");
  assert.equal(settings.model, "gemini-3.8-flash");
  assert.match(settings.baseUrl, /generativelanguage\.googleapis\.com/);
  assert.equal(settings.apiKey, undefined);
  assert.equal(
    JSON.stringify(settings).includes("gemini-profile-secret"),
    false,
    "the settings payload reports configuration, never the secret",
  );

  // The per-profile env switches override the profile defaults.
  process.env.GEMINI_MODEL = "gemini-3.8-pro";
  assert.equal(aiSettings().model, "gemini-3.8-pro");
  delete process.env.GEMINI_MODEL;

  process.env.AI_PROVIDER_PROFILE = "openai";
  settings = aiSettings();
  assert.equal(settings.profile, "openai");
  assert.equal(settings.model, "gpt-4o-mini");
  assert.match(settings.baseUrl, /api\.openai\.com/);

  process.env.OPENAI_MODEL = "gpt-4o";
  assert.equal(aiSettings().model, "gpt-4o");
  clearAiEnv();
});

test("a selected provider still fails closed until external data handling is approved", async () => {
  clearAiEnv();
  process.env.AI_PROVIDER_PROFILE = "gemini";
  process.env.GEMINI_API_KEY = "gemini-test-key";
  await request(app)
    .post("/api/part3/ai/skill-extraction")
    .set(auth(trainee))
    .send({
      sourceReferenceId: "synthetic-cv",
      sourceText: "Synthetic radar interpretation project experience.",
    })
    .expect(503);
  assert.ok(
    await P3.P3AIRequestMetadata.exists({
      actor: trainee._id,
      outcome: "DISABLED",
    }),
  );
  clearAiEnv();
});

test("the selected profile drives the outbound request, with no fallback", async () => {
  clearAiEnv();
  process.env.AI_PROVIDER_PROFILE = "gemini";
  process.env.GEMINI_API_KEY = "gemini-test-key";
  process.env.AI_EXTERNAL_DATA_APPROVED = "true";

  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                suggestions: [
                  {
                    tag: "Radar interpretation",
                    supportingPassage: "Synthetic radar interpretation project",
                  },
                ],
              }),
            },
          },
        ],
      }),
    };
  };
  try {
    const response = await request(app)
      .post("/api/part3/ai/skill-extraction")
      .set(auth(trainee))
      .send({
        sourceReferenceId: "synthetic-cv",
        sourceText: "Synthetic radar interpretation project experience.",
      });
    assert.equal(response.status, 200, JSON.stringify(response.body));
    assert.equal(calls.length, 1);
    assert.equal(
      calls[0].url,
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    );
    assert.equal(
      calls[0].options.headers.Authorization,
      "Bearer gemini-test-key",
    );
    assert.equal(
      JSON.parse(calls[0].options.body).model,
      "gemini-3.8-flash",
    );
  } finally {
    globalThis.fetch = realFetch;
    clearAiEnv();
  }
});

test("an unknown profile is reported and never silently falls back", async () => {
  clearAiEnv();
  process.env.AI_PROVIDER_PROFILE = "cloudinary_gemini";
  const settings = aiSettings();
  assert.equal(settings.profile, "cloudinary_gemini");
  assert.match(settings.profileError, /Unknown AI_PROVIDER_PROFILE/);
  assert.ok(settings.profileError.includes(AI_PROFILE_NAMES.join(", ")));
  const response = await request(app)
    .post("/api/part3/ai/skill-extraction")
    .set(auth(trainee))
    .send({
      sourceReferenceId: "synthetic-cv",
      sourceText: "Synthetic radar interpretation project experience.",
    });
  assert.equal(response.status, 503, JSON.stringify(response.body));
  assert.match(response.body.message, /Unknown AI_PROVIDER_PROFILE/);
  clearAiEnv();
});

test("AI_ENABLED=false wins over any profile", async () => {
  clearAiEnv();
  process.env.AI_PROVIDER_PROFILE = "gemini";
  process.env.GEMINI_API_KEY = "gemini-test-key";
  process.env.AI_EXTERNAL_DATA_APPROVED = "true";
  process.env.AI_ENABLED = "false";
  const settings = aiSettings();
  assert.equal(settings.enabled, false);
  assert.equal(settings.profile, "gemini");
  await request(app)
    .post("/api/part3/ai/skill-extraction")
    .set(auth(trainee))
    .send({
      sourceReferenceId: "synthetic-cv",
      sourceText: "Synthetic radar interpretation project experience.",
    })
    .expect(503);
  clearAiEnv();
});
