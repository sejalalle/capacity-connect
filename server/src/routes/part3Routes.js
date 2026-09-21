import { Router } from "express";
import express from "express";
import mongoose from "mongoose";
import crypto from "node:crypto";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { z } from "zod";
import auth from "../middleware/authMiddleware.js";
import roles from "../middleware/roleMiddleware.js";
import validate from "../middleware/validate.js";
import { HttpError } from "../middleware/errorHandler.js";
import * as P2 from "../models/Part2.js";
import * as P3 from "../models/Part3.js";
import {
  assignTrainer,
  calculateCapability,
  createAssessment,
  createMcqDraft,
  evaluateSubmission,
  publishAssessment,
  publishResult,
  replaceTrainer,
  reviewEvidence,
  submitAssessment,
  submitEvidence,
  trainerSuitability,
} from "../services/part3Service.js";

const router = Router();
router.use(auth);
const ok = (res, data, message) =>
  res.json({ success: true, data, ...(message && { message }) });
const fail = (status, message) => {
  throw new HttpError(status, message);
};
const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid identifier");
const text = z.string().trim().min(4).max(4000);
const short = z.string().trim().min(1).max(200);
const isoDate = z
  .string()
  .datetime({ offset: true })
  .transform((value) => new Date(value));
const body = (shape) => validate(z.object(shape).strict());
const admin = roles(["admin"]),
  trainerOrAdmin = roles(["trainer", "admin"]),
  all = roles(["trainee", "trainer", "admin"]);
const same = (a, b) => String(a?._id || a) === String(b?._id || b);

router.get("/dashboard", all, async (req, res) => {
  if (req.user.role === "trainee") {
    const enrollmentRows = await P2.P2Enrollment.find({
      trainee: req.user._id,
      status: "CONFIRMED",
    })
      .populate({ path: "batch", populate: { path: "course" } })
      .lean();
    const enrollments = enrollmentRows.map((item) => item._id);
    const [assessments, submissions, results, evidence] = await Promise.all([
      P3.P3Assessment.find({
        batch: {
          $in: await P2.P2Enrollment.find({
            _id: { $in: enrollments },
          }).distinct("batch"),
        },
        status: "PUBLISHED",
      })
        .populate("batch competency")
        .lean(),
      P3.P3Submission.find({ enrollment: { $in: enrollments } })
        .populate("assessment")
        .lean(),
      P3.P3Result.find({ trainee: req.user._id, status: "PUBLISHED" })
        .populate("batch")
        .lean(),
      P3.P3Evidence.find({ owner: req.user._id }).populate("competency").lean(),
    ]);
    return ok(res, {
      role: "trainee",
      enrollments: enrollmentRows,
      assessments,
      submissions,
      results,
      evidence,
    });
  }
  if (req.user.role === "trainer") {
    const permissions = await P3.P3BatchPermission.find({
      user: req.user._id,
    }).distinct("batch");
    const [assignments, assessments, submissions, evidence] = await Promise.all(
      [
        P3.P3TrainerAssignment.find({
          trainer: req.user._id,
          status: { $in: ["ACTIVE", "UNAVAILABLE"] },
        })
          .populate({ path: "batch", populate: { path: "course" } })
          .lean(),
        P3.P3Assessment.find({ batch: { $in: permissions } })
          .populate("batch competency")
          .lean(),
        P3.P3Submission.find({
          assessment: {
            $in: await P3.P3Assessment.find({
              batch: { $in: permissions },
            }).distinct("_id"),
          },
        })
          .populate("trainee assessment")
          .lean(),
        P3.P3Evidence.find({
          enrollment: {
            $in: await P2.P2Enrollment.find({
              batch: { $in: permissions },
            }).distinct("_id"),
          },
          status: { $in: ["SUBMITTED", "RETURNED"] },
        })
          .populate("owner competency")
          .lean(),
      ],
    );
    return ok(res, {
      role: "trainer",
      assignments,
      assessments,
      submissions,
      evidence,
    });
  }
  const [
    assignments,
    assessments,
    pendingSubmissions,
    pendingEvidence,
    snapshots,
  ] = await Promise.all([
    P3.P3TrainerAssignment.find({ status: { $in: ["ACTIVE", "UNAVAILABLE"] } })
      .populate("trainer batch")
      .lean(),
    P3.P3Assessment.find()
      .populate("batch competency")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),
    P3.P3Submission.countDocuments({ status: "SUBMITTED" }),
    P3.P3Evidence.countDocuments({
      status: { $in: ["SUBMITTED", "RETURNED"] },
    }),
    P3.P3CapabilitySnapshot.find()
      .populate("competency jobRole")
      .sort({ calculatedAt: -1 })
      .limit(10)
      .lean(),
  ]);
  ok(res, {
    role: "admin",
    assignments,
    assessments,
    pendingSubmissions,
    pendingEvidence,
    snapshots,
  });
});

router.get(
  "/trainer-suitability/:batchId/:sessionId",
  admin,
  async (req, res) =>
    ok(
      res,
      await trainerSuitability(
        objectId.parse(req.params.batchId),
        objectId.parse(req.params.sessionId),
      ),
    ),
);
router.post(
  "/trainer-expertise",
  admin,
  body({
    trainer: objectId,
    competency: objectId,
    frameworkVersion: z.number().int().positive(),
    approvedLevel: z.number().int().min(1).max(5),
    qualifications: z.array(short).min(1),
    teachingYears: z.number().min(0).max(60),
    status: z.enum(["APPROVED", "REJECTED"]),
    reviewBasis: text,
  }),
  async (req, res) =>
    ok(
      res.status(201),
      await P3.P3TrainerExpertise.findOneAndUpdate(
        {
          trainer: req.body.trainer,
          competency: req.body.competency,
          frameworkVersion: req.body.frameworkVersion,
        },
        { ...req.body, reviewedBy: req.user._id, reviewedAt: new Date() },
        { upsert: true, new: true, runValidators: true },
      ),
      "Trainer expertise decision recorded",
    ),
);
router.post(
  "/trainer-availability",
  trainerOrAdmin,
  body({
    trainer: objectId.optional(),
    start: isoDate,
    end: isoDate,
    available: z.boolean(),
    reason: text,
  }),
  async (req, res) => {
    const trainer =
      req.user.role === "trainer" ? req.user._id : req.body.trainer;
    if (!trainer || req.body.end <= req.body.start)
      fail(400, "Valid trainer and availability dates are required");
    const row = await P3.P3TrainerAvailability.create({
      trainer,
      start: req.body.start,
      end: req.body.end,
      available: req.body.available,
      reason: req.body.reason,
      createdBy: req.user._id,
    });
    if (!req.body.available)
      await P3.P3TrainerAssignment.updateMany(
        {
          trainer,
          status: "ACTIVE",
          start: { $lt: req.body.end },
          end: { $gt: req.body.start },
        },
        { status: "UNAVAILABLE" },
      );
    ok(res.status(201), row);
  },
);
router.post(
  "/trainer-assignments",
  admin,
  body({
    batch: objectId,
    sessionId: objectId,
    trainer: objectId,
    reason: text,
    rankingDepartureReason: z.string().max(1000).optional(),
  }),
  async (req, res) =>
    ok(
      res.status(201),
      await assignTrainer({
        actor: req.user,
        batchId: req.body.batch,
        sessionId: req.body.sessionId,
        trainerId: req.body.trainer,
        reason: req.body.reason,
        rankingDepartureReason: req.body.rankingDepartureReason,
      }),
      "Trainer assigned",
    ),
);
router.post(
  "/trainer-assignments/:id/replace",
  admin,
  body({
    trainer: objectId,
    reason: text,
    rankingDepartureReason: z.string().max(1000).optional(),
  }),
  async (req, res) =>
    ok(
      res.status(201),
      await replaceTrainer({
        actor: req.user,
        assignmentId: objectId.parse(req.params.id),
        trainerId: req.body.trainer,
        reason: req.body.reason,
        rankingDepartureReason: req.body.rankingDepartureReason,
      }),
      "Replacement trainer assigned",
    ),
);
router.post(
  "/permissions",
  admin,
  body({
    batch: objectId,
    user: objectId,
    actions: z
      .array(
        z.enum([
          "CREATE_ASSESSMENT",
          "EVALUATE_SUBMISSION",
          "PUBLISH_RESULT",
          "REVIEW_EVIDENCE",
        ]),
      )
      .min(1),
    reason: text,
  }),
  async (req, res) =>
    ok(
      res.status(201),
      await P3.P3BatchPermission.findOneAndUpdate(
        { batch: req.body.batch, user: req.body.user },
        { ...req.body, grantedBy: req.user._id },
        { upsert: true, new: true, runValidators: true },
      ),
      "Scoped permissions saved",
    ),
);

router.get("/assessments", all, async (req, res) => {
  let query = {};
  if (req.user.role === "trainee") {
    const batches = await P2.P2Enrollment.find({
      trainee: req.user._id,
      status: "CONFIRMED",
    }).distinct("batch");
    query = { batch: { $in: batches }, status: "PUBLISHED" };
  } else if (req.user.role === "trainer") {
    const batches = await P3.P3BatchPermission.find({
      user: req.user._id,
    }).distinct("batch");
    query = { batch: { $in: batches } };
  }
  ok(
    res,
    await P3.P3Assessment.find(query)
      .populate("batch competency createdBy")
      .lean(),
  );
});
router.post(
  "/assessments",
  trainerOrAdmin,
  body({
    batch: objectId,
    title: short,
    type: z.enum(["MCQ", "PRACTICAL", "ASSIGNMENT", "WRITTEN", "VIVA"]),
    instructions: text,
    competency: objectId.optional(),
    frameworkVersion: z.number().int().positive().optional(),
    rubricVersion: short.optional(),
    maxScore: z.number().positive().max(1000),
    passingScore: z.number().min(0).max(100),
    questions: z
      .array(
        z
          .object({
            prompt: text,
            options: z.array(short).min(2).max(6),
            correctIndex: z.number().int().min(0),
            points: z.number().positive(),
            sourcePassage: text,
            sourcePage: short,
          })
          .strict(),
      )
      .max(100)
      .default([]),
  }),
  async (req, res) =>
    ok(
      res.status(201),
      await createAssessment(req.user, req.body),
      "Assessment draft created",
    ),
);
router.post(
  "/assessments/:id/publish",
  trainerOrAdmin,
  body({ reason: text }),
  async (req, res) =>
    ok(
      res,
      await publishAssessment(
        req.user,
        objectId.parse(req.params.id),
        req.body.reason,
      ),
      "Assessment published",
    ),
);
router.post(
  "/submissions",
  roles(["trainee"]),
  body({
    enrollment: objectId,
    assessment: objectId,
    answers: z.array(z.number().int().min(0)).max(100).default([]),
    responseText: z.string().max(20000).default(""),
    resourceReferences: z.array(short).max(10).default([]),
  }),
  async (req, res) =>
    ok(
      res.status(201),
      await submitAssessment(req.user, req.body),
      "Submission recorded",
    ),
);
router.post(
  "/evaluations",
  trainerOrAdmin,
  body({
    submission: objectId,
    score: z.number().min(0).max(100),
    comments: text,
  }),
  async (req, res) =>
    ok(
      res.status(201),
      await evaluateSubmission(req.user, req.body),
      "Human evaluation recorded",
    ),
);
router.post(
  "/results",
  trainerOrAdmin,
  body({ enrollment: objectId, reason: text }),
  async (req, res) =>
    ok(
      res.status(201),
      await publishResult(req.user, req.body),
      "Official result published",
    ),
);

router.get("/evidence", all, async (req, res) => {
  let query = {};
  if (req.user.role === "trainee") query.owner = req.user._id;
  else if (req.user.role === "trainer") {
    const batches = await P3.P3BatchPermission.find({
      user: req.user._id,
      actions: "REVIEW_EVIDENCE",
    }).distinct("batch");
    const enrollments = await P2.P2Enrollment.find({
      batch: { $in: batches },
    }).distinct("_id");
    query.enrollment = { $in: enrollments };
  }
  ok(
    res,
    await P3.P3Evidence.find(query)
      .populate("owner competency submission enrollment")
      .lean(),
  );
});
router.post(
  "/evidence",
  roles(["trainee"]),
  body({
    submission: objectId,
    competency: objectId,
    frameworkVersion: z.number().int().positive(),
    rubricVersion: short,
    supplementText: z.string().max(10000).default(""),
    resourceReferences: z.array(short).max(10).default([]),
  }),
  async (req, res) =>
    ok(
      res.status(201),
      await submitEvidence(req.user, req.body),
      "Submission reused as evidence",
    ),
);
router.post(
  "/evidence/:id/review",
  trainerOrAdmin,
  body({
    status: z.enum(["ACCEPTED", "RETURNED", "REJECTED"]),
    outcome: z.enum(["NOT_ASSESSED", "DEMONSTRATED", "NEEDS_PRACTICE"]),
    demonstratedLevel: z.number().int().min(1).max(5).nullable().optional(),
    comments: text,
  }),
  async (req, res) =>
    ok(
      res,
      await reviewEvidence(req.user, {
        ...req.body,
        evidence: objectId.parse(req.params.id),
      }),
      "Evidence review recorded",
    ),
);
router.get("/results", all, async (req, res) => {
  let query = { status: "PUBLISHED" };
  if (req.user.role === "trainee") query.trainee = req.user._id;
  else if (req.user.role === "trainer") {
    const batches = await P3.P3BatchPermission.find({
      user: req.user._id,
    }).distinct("batch");
    query.batch = { $in: batches };
  }
  ok(
    res,
    await P3.P3Result.find(query).populate("trainee batch publishedBy").lean(),
  );
});
router.post(
  "/capability/calculate",
  admin,
  body({
    competency: objectId,
    frameworkVersion: z.number().int().positive(),
    jobRole: objectId.nullable().optional(),
  }),
  async (req, res) =>
    ok(
      res.status(201),
      await calculateCapability(req.user, req.body),
      "Capability coverage calculated",
    ),
);
router.get("/capability", admin, async (req, res) =>
  ok(
    res,
    await P3.P3CapabilitySnapshot.find()
      .populate("competency jobRole calculatedBy")
      .sort({ calculatedAt: -1 })
      .lean(),
  ),
);
router.post(
  "/ai/mcq-drafts",
  trainerOrAdmin,
  body({
    batch: objectId,
    sourceReference: short,
    sourcePage: short,
    sourcePassage: text,
    prompt: text,
    isSynthetic: z.boolean().default(false),
    demoNamespace: z.string().max(100).optional(),
  }),
  async (req, res) =>
    ok(
      res.status(201),
      await createMcqDraft(req.user, req.body),
      "Draft request recorded",
    ),
);

const allowedFiles = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "text/plain",
]);
const canAccessBatch = async (user, batch) => {
  if (user.role === "admin") return true;
  if (user.role === "trainee")
    return Boolean(
      await P2.P2Enrollment.exists({
        trainee: user._id,
        batch,
        status: "CONFIRMED",
      }),
    );
  return Boolean(await P3.P3BatchPermission.exists({ batch, user: user._id }));
};
router.post(
  "/files/:batchId",
  all,
  express.raw({ type: () => true, limit: "5mb" }),
  async (req, res) => {
    const batchId = objectId.parse(req.params.batchId);
    if (!(await canAccessBatch(req.user, batchId)))
      fail(403, "Batch file access is not permitted");
    const mimeType = String(req.headers["content-type"] || "").split(";")[0];
    if (
      !allowedFiles.has(mimeType) ||
      !Buffer.isBuffer(req.body) ||
      !req.body.length
    )
      fail(400, "A PDF, PNG, JPEG or UTF-8 text file is required");
    const purpose = z
      .enum(["LEARNING", "SUBMISSION", "EVIDENCE"])
      .parse(req.headers["x-file-purpose"]);
    const filename = String(req.headers["x-file-name"] || "private-file")
      .replace(/[^a-zA-Z0-9._ -]/g, "_")
      .slice(0, 150);
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "part3PrivateFiles",
    });
    const upload = bucket.openUploadStream(filename, {
      metadata: {
        owner: req.user._id,
        batch: new mongoose.Types.ObjectId(batchId),
        mimeType,
      },
    });
    try {
      await pipeline(Readable.from(req.body), upload);
      const row = await P3.P3PrivateResource.create({
        owner: req.user._id,
        batch: batchId,
        storageId: upload.id,
        filename,
        mimeType,
        size: req.body.length,
        sha256: crypto.createHash("sha256").update(req.body).digest("hex"),
        purpose,
      });
      ok(res.status(201), row, "Private file stored");
    } catch (error) {
      if (upload.id) await bucket.delete(upload.id).catch(() => {});
      throw error;
    }
  },
);
router.get("/files/:id", all, async (req, res) => {
  const row = await P3.P3PrivateResource.findById(
    objectId.parse(req.params.id),
  );
  if (!row) fail(404, "Private file not found");
  if (
    !same(row.owner, req.user) &&
    !(await canAccessBatch(req.user, row.batch))
  )
    fail(404, "Private file not found");
  res.set({
    "Content-Type": row.mimeType,
    "Content-Disposition": `attachment; filename="${row.filename.replaceAll('"', "")}"`,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
  });
  const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: "part3PrivateFiles",
  });
  bucket
    .openDownloadStream(row.storageId)
    .on("error", () => {
      if (!res.headersSent) res.status(404).end();
      else res.destroy();
    })
    .pipe(res);
});

export default router;
