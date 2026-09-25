import crypto from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import auth from "../middleware/authMiddleware.js";
import roles from "../middleware/roleMiddleware.js";
import validate from "../middleware/validate.js";
import User from "../models/User.js";
import * as P2 from "../models/Part2.js";
import * as P3 from "../models/Part3.js";
import { HttpError } from "../middleware/errorHandler.js";
import {
  achievementsFor,
  aiAssist,
  assignReviewer,
  capabilityReport,
  decideCompetency,
  deterministicCompetencyMatch,
  evidenceFor,
  passportFor,
  reviewEvidence,
  reviseEvidence,
  submitEvidence,
  supersedeDecision,
  updateFollowUp,
  recordWorkplaceEntry,
} from "../services/part3bService.js";
import { aiSettings } from "../services/aiService.js";

const router = Router();
router.use(auth);
const all = roles(["trainee", "trainer", "admin"]);
const reviewer = roles(["trainer", "admin"]);
const admin = roles(["admin"]);
const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid identifier");
const short = z.string().trim().min(1).max(300);
const text = z.string().trim().min(4).max(5000);
const body = (shape) => validate(z.object(shape).strict());
const ok = (res, data, message, status = 200) =>
  res.status(status).json({ success: true, data, ...(message && { message }) });
const fail = (status, message) => {
  throw new HttpError(status, message);
};
const id = (value) => String(value?._id || value || "");

const claim = z
  .object({
    competency: objectId,
    frameworkVersion: z.number().int().positive(),
    rubricVersion: short,
    targetLevel: z.number().int().min(1).max(5),
  })
  .strict();
router.get("/evidence", all, async (req, res) =>
  ok(res, await evidenceFor(req.user, req.query)),
);
router.post(
  "/evidence",
  roles(["trainee"]),
  body({
    evidenceKey: z.string().uuid().optional(),
    enrollment: objectId.optional(),
    evidenceType: z.enum([
      "CERTIFICATE",
      "PROJECT",
      "ASSESSMENT",
      "PRACTICAL_TASK",
      "TRAINER_RECOMMENDATION",
      "OTHER",
    ]),
    claimedCompetencies: z.array(claim).min(1).max(10),
    assessmentSubmission: objectId.optional(),
    evaluation: objectId.optional(),
    resultVersion: objectId.optional(),
    privateResources: z.array(objectId).max(10).default([]),
    description: text,
  }),
  async (req, res) =>
    ok(
      res,
      await submitEvidence(req.user, req.body),
      "Evidence submitted for review",
      201,
    ),
);
router.post(
  "/evidence/:id/revisions",
  roles(["trainee"]),
  body({
    description: text,
    privateResources: z.array(objectId).max(10).default([]),
    comments: text,
  }),
  async (req, res) =>
    ok(
      res,
      await reviseEvidence(req.user, objectId.parse(req.params.id), req.body),
      "Evidence revision submitted",
    ),
);
router.post(
  "/evidence/:id/assign-reviewer",
  admin,
  body({ reviewer: objectId, reason: text }),
  async (req, res) =>
    ok(
      res,
      await assignReviewer(
        req.user,
        objectId.parse(req.params.id),
        req.body.reviewer,
        req.body.reason,
      ),
      "Reviewer assigned",
    ),
);
router.post(
  "/evidence/:id/review",
  reviewer,
  body({
    status: z.enum(["VERIFIED", "REJECTED", "NEEDS_REVISION"]),
    reason: z.string().trim().max(3000).default(""),
    comments: z.string().trim().max(3000).default(""),
  }),
  async (req, res) =>
    ok(
      res,
      await reviewEvidence(req.user, objectId.parse(req.params.id), req.body),
      "Evidence review recorded",
    ),
);
router.post(
  "/evidence/:id/competency-decisions",
  reviewer,
  body({
    competency: objectId,
    frameworkVersion: z.number().int().positive(),
    rubricVersion: short,
    targetLevel: z.number().int().min(1).max(5),
    demonstratedLevel: z.number().int().min(1).max(5).nullable().default(null),
    outcome: z.enum(["DEMONSTRATED", "NEEDS_PRACTICE"]),
    criterionResults: z
      .array(
        z
          .object({
            criterionId: short,
            met: z.boolean(),
            comments: z.string().trim().max(2000).default(""),
          })
          .strict(),
      )
      .min(1)
      .max(30),
    evidenceVersion: z.number().int().positive(),
    reason: text,
    idempotencyKey: z.string().uuid(),
    followUpDueDate: z
      .string()
      .datetime({ offset: true })
      .transform((x) => new Date(x))
      .optional(),
    followUpComments: z.string().trim().max(2000).default(""),
  }),
  async (req, res) =>
    ok(
      res,
      await decideCompetency(req.user, objectId.parse(req.params.id), req.body),
      "Human competency decision recorded",
      201,
    ),
);
router.post(
  "/competency-decisions/:id/supersede",
  reviewer,
  body({
    action: z.enum(["CORRECT", "REVOKE"]),
    outcome: z.enum(["DEMONSTRATED", "NEEDS_PRACTICE"]).optional(),
    demonstratedLevel: z.number().int().min(1).max(5).nullable().optional(),
    reason: text,
    idempotencyKey: z.string().uuid(),
  }),
  async (req, res) =>
    ok(
      res,
      await supersedeDecision(
        req.user,
        objectId.parse(req.params.id),
        req.body,
      ),
      "Decision history retained and current record recalculated",
    ),
);
router.get("/competency-passport", all, async (req, res) =>
  ok(res, await passportFor(req.user, req.query.trainee)),
);
router.get("/achievements", all, async (req, res) =>
  ok(res, await achievementsFor(req.user, req.query)),
);
router.get("/follow-ups", all, async (req, res) => {
  const query =
    req.user.role === "admin"
      ? {}
      : req.user.role === "trainer"
        ? { responsibleUser: req.user._id }
        : { trainee: req.user._id };
  ok(
    res,
    await P3.P3FollowUp.find(query)
      .populate("trainee competency recommendedCourse responsibleUser")
      .sort({ createdAt: -1 })
      .lean(),
  );
});
router.patch(
  "/follow-ups/:id",
  all,
  body({
    status: z.enum(["IN_PROGRESS", "COMPLETED", "CANCELLED"]),
    comments: text,
  }),
  async (req, res) =>
    ok(
      res,
      await updateFollowUp(req.user, objectId.parse(req.params.id), req.body),
      "Follow-up updated",
    ),
);
router.post(
  "/follow-ups/:id/workplace-entries",
  all,
  body({
    type: z.enum(["APPLICATION", "OBSERVATION"]),
    text,
    evidence: objectId.optional(),
    requestId: z.string().uuid(),
  }),
  async (req, res) =>
    ok(
      res,
      await recordWorkplaceEntry(
        req.user,
        objectId.parse(req.params.id),
        req.validated.body,
      ),
      "Workplace record saved; competency remains subject to human review",
    ),
);
router.get("/capability", admin, async (req, res) =>
  ok(res, await capabilityReport(req.user, req.query)),
);

router.get("/ai/settings", all, (req, res) => ok(res, aiSettings()));
router.post("/ai/competency-search", all, body({ text }), async (req, res) =>
  ok(res, await deterministicCompetencyMatch(req.body.text)),
);
router.post(
  "/ai/skill-extraction",
  all,
  body({ sourceReferenceId: short, sourceText: text }),
  async (req, res) =>
    ok(
      res,
      await aiAssist(req.user, "SKILL_EXTRACTION", {
        sourceReferenceIds: [req.body.sourceReferenceId],
        sourceText: req.body.sourceText,
      }),
    ),
);
router.post(
  "/ai/skill-extraction/:requestId/accept",
  all,
  body({ tag: short, action: z.enum(["ACCEPTED", "EDITED", "REJECTED"]) }),
  async (req, res) => {
    const row = await P3.P3AIRequestMetadata.findOne({
      requestId: req.params.requestId,
      actor: req.user._id,
      feature: "SKILL_EXTRACTION",
      outcome: "SUCCEEDED",
    });
    if (!row) fail(404, "AI request metadata not found");
    row.humanAction = req.body.action;
    await row.save();
    if (req.body.action !== "REJECTED")
      await User.updateOne(
        { _id: req.user._id },
        { $addToSet: { skills: req.body.tag } },
      );
    await P2.P2AuditLog.create({
      actor: req.user._id,
      action: "AI_SKILL_SUGGESTION_REVIEWED",
      entityType: "P3AIRequestMetadata",
      entityId: row._id,
      changes: {
        humanAction: row.humanAction,
        acceptedAs:
          req.body.action === "REJECTED" ? "NONE" : "SELF_DECLARED_SKILL",
      },
      reason: "Human reviewed an AI suggestion",
      correlationId: crypto.randomUUID(),
    });
    ok(
      res,
      { requestId: row.requestId, humanAction: row.humanAction },
      "Suggestion review recorded",
    );
  },
);
router.post(
  "/ai/competency-matching",
  all,
  body({ text, competencyIds: z.array(objectId).min(1).max(50).optional() }),
  async (req, res) => {
    const catalogue = await P2.P2Competency.find({
      ...(req.body.competencyIds && {
        _id: { $in: req.body.competencyIds },
      }),
      status: "PUBLISHED",
    })
      .select("name code description domain version")
      .lean();
    ok(
      res,
      await aiAssist(req.user, "COMPETENCY_MATCHING", {
        sourceReferenceIds: req.body.competencyIds || [],
        text: req.body.text,
        catalogue: catalogue.map((x) => ({
          id: id(x),
          name: x.name,
          code: x.code,
          description: x.description,
          domain: x.domain,
          version: x.version,
        })),
      }),
    );
  },
);
router.post(
  "/ai/competency-matching/:requestId/review",
  all,
  body({
    action: z.enum(["ACCEPTED", "EDITED", "REJECTED"]),
    competency: objectId.optional(),
    reason: text,
  }),
  async (req, res) => {
    const row = await P3.P3AIRequestMetadata.findOne({
      requestId: req.params.requestId,
      actor: req.user._id,
      feature: "COMPETENCY_MATCHING",
      outcome: "SUCCEEDED",
    });
    if (!row) fail(404, "AI request metadata not found");
    if (
      req.body.action !== "REJECTED" &&
      (!req.body.competency ||
        !(await P2.P2Competency.exists({
          _id: req.body.competency,
          status: "PUBLISHED",
        })))
    )
      fail(
        400,
        "A published catalogue competency is required to confirm a mapping",
      );
    row.humanAction = req.body.action;
    await row.save();
    await P2.P2AuditLog.create({
      actor: req.user._id,
      action: "AI_COMPETENCY_MATCH_REVIEWED",
      entityType: "P3AIRequestMetadata",
      entityId: row._id,
      changes: {
        humanAction: row.humanAction,
        suggestedCompetency: req.body.competency || null,
      },
      reason: req.body.reason,
      correlationId: crypto.randomUUID(),
    });
    ok(
      res,
      { requestId: row.requestId, humanAction: row.humanAction },
      "Mapping suggestion review recorded; no competency record was changed",
    );
  },
);
router.post(
  "/ai/mcq-drafts",
  reviewer,
  body({
    batch: objectId,
    course: objectId,
    learningModule: objectId,
    competency: objectId.optional(),
    frameworkVersion: z.number().int().positive().optional(),
    subject: short,
    sourceReference: short,
    sourcePage: z.string().trim().max(100).default(""),
    sourcePassage: text,
  }),
  async (req, res) => {
    const permission = await P3.P3BatchPermission.exists({
      batch: req.body.batch,
      user: req.user._id,
      actions: { $in: ["USE_AI", "MANAGE_QUESTION_BANK"] },
    });
    if (!permission)
      fail(
        403,
        "Question-bank or AI drafting scope is required for this batch",
      );
    const learningModule = await P3.P3LearningModule.findOne({
      _id: req.body.learningModule,
      batch: req.body.batch,
      course: req.body.course,
      status: "PUBLISHED",
    });
    if (!learningModule)
      fail(409, "AI drafting requires an authorized published learning module");
    const result = await aiAssist(req.user, "MCQ_DRAFTING", {
      sourceReferenceIds: [req.body.sourceReference],
      sourcePassage: req.body.sourcePassage,
      sourcePage: req.body.sourcePage,
    });
    const latest = await P3.P3Question.findOne({
      questionKey: `AI-${result.requestId}`,
    }).sort({ version: -1 });
    const question = await P3.P3Question.create({
      course: req.body.course,
      subject: req.body.subject,
      competency: req.body.competency,
      frameworkVersion: req.body.frameworkVersion,
      questionKey: `AI-${result.requestId}`,
      version: (latest?.version || 0) + 1,
      text: result.question,
      options: result.options,
      correctOptionId: result.correctOptionId,
      marks: 1,
      explanation: result.explanation,
      sourceReference: `${req.body.sourceReference}${req.body.sourcePage ? `, page ${req.body.sourcePage}` : ""}`,
      provenance: {
        type: "AI_ASSISTED",
        requestId: result.requestId,
        supportingPassage: result.sourcePassage,
        providerReviewRequired: true,
      },
      status: "DRAFT",
      author: req.user._id,
    });
    ok(
      res,
      question,
      "AI-assisted question saved as an unpublished draft",
      201,
    );
  },
);
router.get("/ai/activity", admin, async (req, res) =>
  ok(
    res,
    await P3.P3AIRequestMetadata.find()
      .populate("actor", "name role")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean(),
  ),
);

export default router;
