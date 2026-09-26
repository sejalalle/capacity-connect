import { Router } from "express";
import { z } from "zod";
import auth from "../middleware/authMiddleware.js";
import roles from "../middleware/roleMiddleware.js";
import validate from "../middleware/validate.js";
import { HttpError } from "../middleware/errorHandler.js";
import {
  candidatesFor,
  eligibleCandidates,
  evaluatePractice,
  listPrograms,
  nominateCandidate,
  nominationFor,
  practicesFor,
  recordTttLearning,
  savePractice,
  saveProgram,
  transitionNomination,
  tttLearningFor,
  verifyTrainer,
} from "../services/tttService.js";

const router = Router();
router.use(auth);
const all = roles(["trainee", "trainer", "admin"]);
const trainerOrAdmin = roles(["trainer", "admin"]);
const admin = roles(["admin"]);
const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid identifier");
const text = z.string().trim().min(4).max(5000);
const body = (shape) => validate(z.object(shape).strict());
const ok = (res, data, message, status = 200) =>
  res.status(status).json({ success: true, data, ...(message && { message }) });
const fail = (status, message) => {
  throw new HttpError(status, message);
};
const revision = z.number().int().min(0).optional();

router.get("/ttt/programs", trainerOrAdmin, async (req, res) =>
  ok(res, await listPrograms(req.user)),
);
router.post(
  "/ttt/programs",
  admin,
  body({
    id: objectId.optional(),
    title: z.string().trim().min(4).max(300),
    competency: objectId,
    frameworkVersion: z.number().int().positive(),
    targetLevel: z.number().int().min(1).max(5),
    courses: z.array(objectId).max(20).default([]),
    teachingPracticeRequirements: z.string().trim().max(3000).default(""),
    defaultEvaluator: objectId.optional(),
    status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("DRAFT"),
  }),
  async (req, res) =>
    ok(res, await saveProgram(req.user, req.body), "Program saved", 201),
);
router.get("/ttt/eligibility", admin, async (req, res) => {
  const competency = objectId.safeParse(req.query.competency);
  const frameworkVersion = Number(req.query.frameworkVersion);
  const targetLevel = Number(req.query.targetLevel);
  if (!competency.success)
    fail(400, "A valid competency identifier is required");
  if (!Number.isInteger(frameworkVersion) || frameworkVersion < 1)
    fail(400, "A positive framework version is required");
  if (!Number.isInteger(targetLevel) || targetLevel < 1 || targetLevel > 5)
    fail(400, "A target level between 1 and 5 is required");
  ok(
    res,
    await eligibleCandidates({
      competency: competency.data,
      frameworkVersion,
      targetLevel,
      department: req.query.department || undefined,
    }),
  );
});
router.get("/ttt/candidates", all, async (req, res) =>
  ok(res, await candidatesFor(req.user)),
);
router.post(
  "/ttt/nominations",
  admin,
  body({
    program: objectId,
    candidate: objectId,
    rationale: text,
    requestId: z.string().uuid(),
  }),
  async (req, res) =>
    ok(
      res,
      await nominateCandidate(req.user, req.body),
      "Candidate nominated for Train-the-Trainer",
      201,
    ),
);
router.get("/ttt/nominations/:id", all, async (req, res) =>
  ok(res, await nominationFor(req.user, objectId.parse(req.params.id))),
);
router.get("/ttt/nominations/:id/practices", all, async (req, res) =>
  ok(res, await practicesFor(req.user, objectId.parse(req.params.id))),
);
router.post(
  "/ttt/nominations/:id/transitions",
  all,
  body({
    action: z.enum(["ACCEPT", "START", "RETURN", "WITHDRAW", "REJECT"]),
    reason: z.string().trim().max(3000).default(""),
    expectedRevision: revision,
  }),
  async (req, res) =>
    ok(
      res,
      await transitionNomination(
        req.user,
        objectId.parse(req.params.id),
        req.body,
      ),
      "Nomination updated",
    ),
);
router.get("/ttt/nominations/:id/learning", all, async (req, res) =>
  ok(res, await tttLearningFor(req.user, objectId.parse(req.params.id))),
);
router.post(
  "/ttt/nominations/:id/learning",
  roles(["trainee"]),
  body({
    course: objectId,
    progressPercent: z.number().min(0).max(100),
  }),
  async (req, res) =>
    ok(
      res,
      await recordTttLearning(
        req.user,
        objectId.parse(req.params.id),
        req.body,
      ),
      "Train-the-Trainer learning progress recorded",
    ),
);
router.post(
  "/ttt/nominations/:id/teaching-practice",
  roles(["trainee"]),
  body({
    sessionTitle: z.string().trim().min(4).max(300),
    scheduledAt: z
      .string()
      .datetime({ offset: true })
      .transform((x) => new Date(x))
      .optional(),
    observers: z.array(objectId).max(10).default([]),
    responseText: z.string().trim().max(5000).default(""),
    privateResources: z.array(objectId).max(10).default([]),
    rubric: z
      .array(
        z
          .object({
            criterionId: z.string().trim().min(1).max(60),
            label: z.string().trim().min(1).max(200),
            description: z.string().trim().max(500).default(""),
            maxMarks: z.number().int().min(1).max(100),
          })
          .strict(),
      )
      .max(15)
      .default([]),
  }),
  async (req, res) =>
    ok(
      res,
      await savePractice(req.user, objectId.parse(req.params.id), req.body),
      req.body.responseText
        ? "Teaching practice submitted for evaluation"
        : "Teaching practice scheduled",
      201,
    ),
);
router.post(
  "/ttt/practices/:id/evaluate",
  trainerOrAdmin,
  body({
    outcome: z.enum(["DEMONSTRATED", "NEEDS_PRACTICE"]),
    criterionMarks: z
      .array(
        z
          .object({
            criterionId: z.string().trim().min(1).max(60),
            marks: z.number().min(0).max(100),
            comment: z.string().trim().max(1000).default(""),
          })
          .strict(),
      )
      .min(1)
      .max(15),
    comments: z.string().trim().max(3000).default(""),
  }),
  async (req, res) =>
    ok(
      res,
      await evaluatePractice(req.user, objectId.parse(req.params.id), req.body),
      "Teaching practice evaluation recorded",
      201,
    ),
);
router.post(
  "/ttt/nominations/:id/verify",
  admin,
  body({
    outcome: z.enum(["VERIFIED", "RETURNED"]),
    reason: text,
    expectedRevision: revision,
  }),
  async (req, res) =>
    ok(
      res,
      await verifyTrainer(req.user, objectId.parse(req.params.id), req.body),
      req.body.outcome === "VERIFIED"
        ? "Trainer verified and added to the trainer pool"
        : "Candidate returned for further development",
    ),
);

export default router;
