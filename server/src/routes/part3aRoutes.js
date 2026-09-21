import { Router } from "express";
import express from "express";
import crypto from "node:crypto";
import mongoose from "mongoose";
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
  addAvailability,
  calculateSuitability,
  completeEvaluation,
  confirmAssignment,
  createAssessmentDraft,
  createQuestion,
  learningFor,
  prepareResult,
  publishAssessmentVersion,
  publishResultVersion,
  recordLearningProgress,
  resultsFor,
  reviewExpertise,
  reviewQuestion,
  saveAttempt,
  changeLearningModuleStatus,
  reviseLearningModule,
  saveLearningModule,
  updateLearningModule,
  saveTrainerProfile,
  startAttempt,
  submitAttempt,
  submitExpertise,
  submitPractical,
} from "../services/part3aService.js";

const router = Router();
router.use(auth);
const ok = (res, data, message, status = 200) =>
  res.status(status).json({ success: true, data, ...(message && { message }) });
const fail = (status, message) => {
  throw new HttpError(status, message);
};
const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid identifier");
const short = z.string().trim().min(1).max(300);
const text = z.string().trim().min(4).max(10000);
const isoDate = z
  .string()
  .datetime({ offset: true })
  .transform((value) => new Date(value));
const body = (shape) => validate(z.object(shape).strict());
const admin = roles(["admin"]);
const trainer = roles(["trainer"]);
const trainerOrAdmin = roles(["trainer", "admin"]);
const all = roles(["trainee", "trainer", "admin"]);
const same = (a, b) => String(a?._id || a || "") === String(b?._id || b || "");

router.get("/dashboard", all, async (req, res) => {
  if (req.user.role === "trainee") {
    const enrollments = await P2.P2Enrollment.find({
      trainee: req.user._id,
      status: "CONFIRMED",
    })
      .populate({ path: "batch", populate: { path: "course" } })
      .lean();
    const batches = enrollments.map((row) => row.batch?._id).filter(Boolean);
    const [modules, assessments, attempts, submissions, results] =
      await Promise.all([
        P3.P3LearningModule.find({
          batch: { $in: batches },
          status: "PUBLISHED",
        })
          .sort({ order: 1 })
          .lean(),
        P3.P3Assessment.find({ batch: { $in: batches }, status: "PUBLISHED" })
          .select(
            "-questionVersions.correctOptionId -questionVersions.explanation",
          )
          .lean(),
        P3.P3AssessmentAttempt.find({ trainee: req.user._id }).lean(),
        P3.P3AssessmentSubmission.find({ trainee: req.user._id })
          .sort({ submittedAt: -1, version: -1 })
          .lean(),
        P3.P3ResultVersion.find({
          trainee: req.user._id,
          status: "PUBLISHED",
        }).lean(),
      ]);
    return ok(res, {
      role: "trainee",
      enrollments,
      modules,
      assessments,
      attempts,
      submissions,
      results,
    });
  }
  if (req.user.role === "trainer") {
    const batches = await P3.P3BatchPermission.find({
      user: req.user._id,
    }).distinct("batch");
    const [
      profile,
      expertise,
      availability,
      assignments,
      modules,
      questions,
      assessments,
      submissions,
      evaluations,
    ] = await Promise.all([
      P3.P3TrainerProfile.findOne({ trainer: req.user._id }).lean(),
      P3.P3TrainerExpertise.find({ trainer: req.user._id })
        .populate("competency")
        .lean(),
      P3.P3TrainerAvailability.find({ trainer: req.user._id })
        .sort({ start: 1 })
        .lean(),
      P3.P3TrainerAssignment.find({
        trainer: req.user._id,
        status: { $in: ["ACTIVE", "UNAVAILABLE"] },
      })
        .populate({ path: "batch", populate: { path: "course" } })
        .lean(),
      P3.P3LearningModule.find({ batch: { $in: batches } })
        .sort({ order: 1 })
        .lean(),
      P3.P3Question.find({ author: req.user._id })
        .populate("course competency reviewer")
        .lean(),
      P3.P3Assessment.find({ batch: { $in: batches } })
        .populate("batch competency")
        .lean(),
      P3.P3AssessmentSubmission.find({
        assessment: {
          $in: await P3.P3Assessment.find({
            assignedEvaluators: req.user._id,
          }).distinct("_id"),
        },
      })
        .populate("trainee assessment")
        .lean(),
      P3.P3HumanEvaluation.find({ evaluator: req.user._id }).lean(),
    ]);
    return ok(res, {
      role: "trainer",
      profile,
      expertise,
      availability,
      assignments,
      modules,
      questions,
      assessments,
      submissions,
      evaluations,
    });
  }
  const resultBatches = await P3.P3BatchPermission.find({
    user: req.user._id,
    actions: "PUBLISH_RESULT",
  }).distinct("batch");
  const [assignments, expertise, assessments, readyResults] = await Promise.all(
    [
      P3.P3TrainerAssignment.find()
        .populate("trainer batch")
        .sort({ assignedAt: -1 })
        .lean(),
      P3.P3TrainerExpertise.find()
        .populate("trainer competency reviewedBy")
        .lean(),
      P3.P3Assessment.find()
        .populate("batch createdBy")
        .sort({ createdAt: -1 })
        .lean(),
      P3.P3ResultVersion.find({
        status: "READY_FOR_REVIEW",
        batch: { $in: resultBatches },
      })
        .populate("trainee batch")
        .lean(),
    ],
  );
  return ok(res, {
    role: "admin",
    assignments,
    expertise,
    assessments,
    readyResults,
  });
});

router.get("/trainer-profile", trainer, async (req, res) =>
  ok(res, {
    profile: await P3.P3TrainerProfile.findOne({
      trainer: req.user._id,
    }).lean(),
    expertise: await P3.P3TrainerExpertise.find({ trainer: req.user._id })
      .populate("competency reviewedBy")
      .lean(),
  }),
);
router.put(
  "/trainer-profile",
  trainer,
  body({
    professionalExperienceYears: z.number().min(0).max(60),
    teachingExperienceYears: z.number().min(0).max(60),
    domains: z.array(short).max(20),
    deliveryModes: z.array(z.enum(["ONLINE", "IN_PERSON", "BLENDED"])).min(1),
    locations: z.array(short).max(20),
  }),
  async (req, res) =>
    ok(
      res,
      await saveTrainerProfile(req.user, req.body),
      "Trainer profile saved",
    ),
);
router.get("/expertise", trainerOrAdmin, async (req, res) => {
  const query = req.user.role === "trainer" ? { trainer: req.user._id } : {};
  ok(
    res,
    await P3.P3TrainerExpertise.find(query)
      .populate("trainer competency reviewedBy")
      .sort({ updatedAt: -1 })
      .lean(),
  );
});
router.post(
  "/expertise",
  trainer,
  body({
    competency: objectId,
    frameworkVersion: z.number().int().positive(),
    claimedLevel: z.number().int().min(1).max(5),
    qualifications: z.array(short).max(20),
    domains: z.array(short).max(20),
    relevantExperienceYears: z.number().min(0).max(60),
    teachingYears: z.number().min(0).max(60),
    supportingResources: z.array(objectId).max(10).default([]),
  }),
  async (req, res) =>
    ok(
      res,
      await submitExpertise(req.user, req.body),
      "Expertise submitted for review",
      201,
    ),
);
router.post(
  "/expertise/:id/review",
  admin,
  validate(
    z
      .object({
        status: z.enum(["REVIEWED", "REJECTED"]),
        approvedLevel: z.number().int().min(1).max(5).nullable(),
        reason: text,
        source: short,
      })
      .strict()
      .superRefine((value, ctx) => {
        if (value.status === "REVIEWED" && !value.approvedLevel)
          ctx.addIssue({
            code: "custom",
            path: ["approvedLevel"],
            message: "Reviewed expertise requires an approved level",
          });
      }),
  ),
  async (req, res) =>
    ok(
      res,
      await reviewExpertise(req.user, objectId.parse(req.params.id), req.body),
      "Expertise review recorded",
    ),
);

router.get("/availability", trainer, async (req, res) =>
  ok(
    res,
    await P3.P3TrainerAvailability.find({ trainer: req.user._id })
      .sort({ start: 1 })
      .lean(),
  ),
);
router.post(
  "/availability",
  trainer,
  body({
    start: isoDate,
    end: isoDate,
    available: z.boolean(),
    reason: text,
    deliveryModes: z.array(z.enum(["ONLINE", "IN_PERSON", "BLENDED"])).min(1),
    locations: z.array(short).max(20),
    preferenceScore: z.number().min(0).max(1),
  }),
  async (req, res) =>
    ok(
      res,
      await addAvailability(req.user, req.body),
      "Availability saved",
      201,
    ),
);

router.get(
  "/trainer-suitability/:batchId/:sessionId",
  admin,
  async (req, res) =>
    ok(
      res,
      await calculateSuitability(
        objectId.parse(req.params.batchId),
        objectId.parse(req.params.sessionId),
      ),
    ),
);
router.get("/trainer-assignments", trainerOrAdmin, async (req, res) => {
  const query = req.user.role === "trainer" ? { trainer: req.user._id } : {};
  ok(
    res,
    await P3.P3TrainerAssignment.find(query)
      .populate("trainer batch assignedBy replaces")
      .sort({ assignedAt: -1 })
      .lean(),
  );
});
router.post(
  "/trainer-assignments",
  admin,
  body({
    batch: objectId,
    sessionId: objectId,
    trainer: objectId,
    reason: text,
    rankingDepartureReason: z.string().trim().max(2000).default(""),
    shortlistCalculatedAt: isoDate,
    replaces: objectId.optional(),
  }),
  async (req, res) =>
    ok(
      res,
      await confirmAssignment({
        actor: req.user,
        batchId: req.body.batch,
        sessionId: req.body.sessionId,
        trainerId: req.body.trainer,
        reason: req.body.reason,
        rankingDepartureReason: req.body.rankingDepartureReason,
        shortlistCalculatedAt: req.body.shortlistCalculatedAt,
        replaces: req.body.replaces,
      }),
      "Trainer assignment confirmed",
      201,
    ),
);

router.get("/learning", all, async (req, res) =>
  ok(res, await learningFor(req.user)),
);
router.post(
  "/learning/modules",
  trainerOrAdmin,
  body({
    course: objectId,
    batch: objectId.optional(),
    order: z.number().int().positive(),
    title: short,
    summary: text,
    announcement: z.string().trim().max(2000).default(""),
    deadline: isoDate.optional(),
    sessionLink: z.string().url().optional(),
    completionRule: z.enum(["VIEW", "MANUAL"]),
    version: z.number().int().positive().default(1),
    resources: z
      .array(
        z
          .object({
            title: short,
            type: z.enum(["PDF", "PRESENTATION", "VIDEO", "LINK"]),
            privateResource: objectId.optional(),
            externalUrl: z.string().url().optional(),
            restricted: z.boolean().default(true),
          })
          .strict(),
      )
      .max(20),
  }),
  async (req, res) =>
    ok(
      res,
      await saveLearningModule(req.user, req.body),
      "Learning module created",
      201,
    ),
);
router.patch(
  "/learning/modules/:id",
  trainerOrAdmin,
  body({
    order: z.number().int().positive().optional(),
    title: short.optional(),
    summary: text.optional(),
    announcement: z.string().trim().max(2000).optional(),
    deadline: isoDate.nullable().optional(),
    sessionLink: z.string().url().nullable().optional(),
    completionRule: z.enum(["VIEW", "MANUAL"]).optional(),
    resources: z
      .array(
        z
          .object({
            title: short,
            type: z.enum(["PDF", "PRESENTATION", "VIDEO", "LINK"]),
            privateResource: objectId.optional(),
            externalUrl: z.string().url().optional(),
            restricted: z.boolean().default(true),
          })
          .strict(),
      )
      .max(20)
      .optional(),
  }),
  async (req, res) =>
    ok(
      res,
      await updateLearningModule(
        req.user,
        objectId.parse(req.params.id),
        req.body,
      ),
      "Learning module saved",
    ),
);
router.post("/learning/modules/:id/publish", trainerOrAdmin, async (req, res) =>
  ok(
    res,
    await changeLearningModuleStatus(
      req.user,
      objectId.parse(req.params.id),
      "publish",
    ),
    "Learning module published",
  ),
);
router.post("/learning/modules/:id/archive", trainerOrAdmin, async (req, res) =>
  ok(
    res,
    await changeLearningModuleStatus(
      req.user,
      objectId.parse(req.params.id),
      "archive",
    ),
    "Learning module archived",
  ),
);
router.post(
  "/learning/modules/:id/revisions",
  trainerOrAdmin,
  async (req, res) =>
    ok(
      res,
      await reviseLearningModule(req.user, objectId.parse(req.params.id)),
      "Learning module revision created",
      201,
    ),
);
router.post(
  "/learning/modules/:id/progress",
  roles(["trainee"]),
  body({ enrollment: objectId, status: z.enum(["IN_PROGRESS", "COMPLETED"]) }),
  async (req, res) =>
    ok(
      res,
      await recordLearningProgress(
        req.user,
        objectId.parse(req.params.id),
        req.body,
      ),
      "Learning progress saved",
    ),
);

router.get("/questions", trainerOrAdmin, async (req, res) => {
  const query = req.user.role === "trainer" ? { author: req.user._id } : {};
  ok(
    res,
    await P3.P3Question.find(query)
      .populate("course competency author reviewer")
      .sort({ updatedAt: -1 })
      .lean(),
  );
});
router.post(
  "/questions",
  trainerOrAdmin,
  body({
    batch: objectId,
    course: objectId,
    subject: short,
    competency: objectId.optional(),
    frameworkVersion: z.number().int().positive().optional(),
    questionKey: z
      .string()
      .trim()
      .regex(/^[A-Z0-9_-]{3,80}$/),
    text,
    options: z
      .array(
        z
          .object({
            optionId: z
              .string()
              .trim()
              .regex(/^[A-Za-z0-9_-]{1,30}$/),
            text: short,
          })
          .strict(),
      )
      .min(2)
      .max(6),
    correctOptionId: short,
    marks: z.number().positive().max(100),
    explanation: text,
    sourceReference: short,
    provenance: z.record(z.unknown()).optional(),
  }),
  async (req, res) =>
    ok(
      res,
      await createQuestion(req.user, req.body),
      "Question draft created",
      201,
    ),
);
router.post(
  "/questions/:id/review",
  trainerOrAdmin,
  body({ reason: text }),
  async (req, res) =>
    ok(
      res,
      await reviewQuestion(
        req.user,
        objectId.parse(req.params.id),
        req.body.reason,
      ),
      "Question reviewed",
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
  let find = P3.P3Assessment.find(query)
    .populate("batch course competency assignedEvaluators")
    .sort({ createdAt: -1 });
  if (req.user.role === "trainee")
    find = find.select(
      "-questionVersions.correctOptionId -questionVersions.explanation",
    );
  ok(res, await find.lean());
});
router.post(
  "/assessments",
  trainerOrAdmin,
  body({
    batch: objectId,
    course: objectId,
    title: short,
    type: z.enum(["MCQ", "PRACTICAL", "WRITTEN_ASSIGNMENT"]),
    instructions: text,
    opensAt: isoDate,
    closesAt: isoDate,
    durationMinutes: z.number().int().min(1).max(1440),
    attemptLimit: z.number().int().min(1).max(20),
    passingScore: z.number().min(0).max(100),
    negativeMarking: z.number().min(0).max(100).default(0),
    resultReleasePolicy: z.enum(["ON_PUBLICATION", "AFTER_CLOSE", "NEVER"]),
    questionIds: z.array(objectId).max(100).default([]),
    rubric: z
      .array(
        z
          .object({
            criterionId: short,
            label: short,
            description: short,
            maxMarks: z.number().positive().max(100),
          })
          .strict(),
      )
      .max(30)
      .default([]),
    assignedEvaluators: z.array(objectId).max(20).default([]),
    competency: objectId.optional(),
    frameworkVersion: z.number().int().positive().optional(),
    rubricVersion: short.optional(),
  }),
  async (req, res) =>
    ok(
      res,
      await createAssessmentDraft(req.user, req.body),
      "Assessment draft created",
      201,
    ),
);
router.post(
  "/assessments/:id/publish",
  trainerOrAdmin,
  body({ reason: text }),
  async (req, res) =>
    ok(
      res,
      await publishAssessmentVersion(
        req.user,
        objectId.parse(req.params.id),
        req.body.reason,
      ),
      "Assessment published",
    ),
);

router.post(
  "/assessments/:id/attempts/start",
  roles(["trainee"]),
  async (req, res) =>
    ok(
      res,
      await startAttempt(req.user, objectId.parse(req.params.id)),
      "Attempt ready",
      201,
    ),
);
router.put(
  "/attempts/:id/answers",
  roles(["trainee"]),
  body({
    answers: z
      .array(z.object({ questionId: short, optionId: short }).strict())
      .max(100),
  }),
  async (req, res) =>
    ok(
      res,
      await saveAttempt(
        req.user,
        objectId.parse(req.params.id),
        req.body.answers,
      ),
      "Answers saved",
    ),
);
router.post(
  "/attempts/:id/submit",
  roles(["trainee"]),
  body({ submissionKey: z.string().uuid() }),
  async (req, res) =>
    ok(
      res,
      await submitAttempt(
        req.user,
        objectId.parse(req.params.id),
        req.body.submissionKey,
      ),
      "Attempt submitted",
    ),
);
router.post(
  "/submissions",
  roles(["trainee"]),
  body({
    enrollment: objectId,
    assessment: objectId,
    responseText: text,
    privateResources: z.array(objectId).max(10).default([]),
  }),
  async (req, res) =>
    ok(
      res,
      await submitPractical(req.user, req.body),
      "Submission receipt created",
      201,
    ),
);
router.get("/submissions", trainerOrAdmin, async (req, res) => {
  let query = {};
  if (req.user.role === "trainer") {
    const assessments = await P3.P3Assessment.find({
      assignedEvaluators: req.user._id,
    }).distinct("_id");
    query = { assessment: { $in: assessments } };
  } else {
    const batches = await P3.P3BatchPermission.find({
      user: req.user._id,
    }).distinct("batch");
    const assessments = await P3.P3Assessment.find({
      batch: { $in: batches },
    }).distinct("_id");
    query = { assessment: { $in: assessments } };
  }
  ok(
    res,
    await P3.P3AssessmentSubmission.find(query)
      .populate("trainee assessment")
      .sort({ submittedAt: -1 })
      .lean(),
  );
});
router.post(
  "/submissions/:id/evaluations",
  trainerOrAdmin,
  body({
    status: z.enum(["EVALUATED", "RETURNED_FOR_REVISION"]),
    criterionMarks: z
      .array(
        z
          .object({
            criterionId: short,
            marks: z.number().min(0),
            comment: z.string().trim().max(2000).default(""),
          })
          .strict(),
      )
      .max(30),
    comments: text,
  }),
  async (req, res) =>
    ok(
      res,
      await completeEvaluation(
        req.user,
        objectId.parse(req.params.id),
        req.body,
      ),
      "Human evaluation recorded",
      201,
    ),
);

router.get("/results", all, async (req, res) =>
  ok(res, await resultsFor(req.user)),
);
router.post(
  "/results/prepare",
  trainerOrAdmin,
  body({ enrollment: objectId, reason: text }),
  async (req, res) =>
    ok(
      res,
      await prepareResult(req.user, req.body.enrollment, req.body.reason),
      "Result prepared for review",
      201,
    ),
);
router.post(
  "/results/:id/publish",
  trainerOrAdmin,
  body({ reason: text }),
  async (req, res) =>
    ok(
      res,
      await publishResultVersion(
        req.user,
        objectId.parse(req.params.id),
        req.body.reason,
      ),
      "Result published",
    ),
);

const fileTypes = new Set([
  "application/pdf",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
  "text/plain",
]);
const contentMatches = (mime, buffer) => {
  if (mime === "application/pdf")
    return buffer.subarray(0, 5).toString() === "%PDF-";
  if (mime === "image/png")
    return buffer
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mime === "image/jpeg")
    return (
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer.at(-2) === 0xff &&
      buffer.at(-1) === 0xd9
    );
  if (
    mime ===
    "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  )
    return buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  if (mime === "application/vnd.ms-powerpoint")
    return buffer
      .subarray(0, 8)
      .equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
  return !buffer.includes(0);
};
const canAccessBatch = async (user, batch) => {
  if (!batch) return false;
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
const canManageCourse = async (user, courseId) => {
  if (user.role === "admin") return true;
  if (user.role !== "trainer") return false;
  return Boolean(
    await P2.P2Course.exists({ _id: courseId, createdBy: user._id }),
  );
};
const storeFile = async ({ req, res, course, batch }) => {
  const mimeType = String(req.headers["content-type"] || "").split(";")[0];
  if (
    !fileTypes.has(mimeType) ||
    !Buffer.isBuffer(req.body) ||
    !req.body.length ||
    !contentMatches(mimeType, req.body)
  )
    fail(
      400,
      "File content must be a valid PDF, PPT, PPTX, PNG, JPEG or UTF-8 text file",
    );
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
      course: course ? new mongoose.Types.ObjectId(course) : undefined,
      batch: batch ? new mongoose.Types.ObjectId(batch) : undefined,
      mimeType,
    },
  });
  try {
    await pipeline(Readable.from(req.body), upload);
    const row = await P3.P3PrivateResource.create({
      owner: req.user._id,
      course,
      batch,
      storageId: upload.id,
      filename,
      mimeType,
      size: req.body.length,
      sha256: crypto.createHash("sha256").update(req.body).digest("hex"),
      purpose,
    });
    ok(res, row, "Private file stored", 201);
  } catch (error) {
    if (upload.id) await bucket.delete(upload.id).catch(() => {});
    throw error;
  }
};
router.get("/course-files/:courseId", trainerOrAdmin, async (req, res) => {
  const course = objectId.parse(req.params.courseId);
  if (!(await canManageCourse(req.user, course)))
    fail(403, "Course content access is not permitted");
  ok(
    res,
    await P3.P3PrivateResource.find({ course, purpose: "LEARNING" })
      .sort({ createdAt: -1 })
      .lean(),
  );
});
router.post(
  "/course-files/:courseId",
  trainerOrAdmin,
  express.raw({ type: () => true, limit: "5mb" }),
  async (req, res) => {
    const course = objectId.parse(req.params.courseId);
    if (!(await canManageCourse(req.user, course)))
      fail(403, "Course content access is not permitted");
    req.headers["x-file-purpose"] = "LEARNING";
    await storeFile({ req, res, course });
  },
);
router.post(
  "/files/:batchId",
  all,
  express.raw({ type: () => true, limit: "5mb" }),
  async (req, res) => {
    const batch = objectId.parse(req.params.batchId);
    if (!(await canAccessBatch(req.user, batch)))
      fail(403, "Batch file access is not permitted");
    await storeFile({ req, res, batch });
  },
);
router.get("/files/:id", all, async (req, res) => {
  const row = await P3.P3PrivateResource.findById(
    objectId.parse(req.params.id),
  );
  let permitted = row && same(row.owner, req.user);
  if (row && !permitted && row.batch)
    permitted = await canAccessBatch(req.user, row.batch);
  if (row && !permitted && row.course && req.user.role === "trainee") {
    const enrolled = await P2.P2Enrollment.exists({
      trainee: req.user._id,
      status: "CONFIRMED",
      batch: {
        $in: await P2.P2Batch.find({ course: row.course }).distinct("_id"),
      },
    });
    const publishedReference = await P3.P3LearningModule.exists({
      course: row.course,
      status: "PUBLISHED",
      "resources.privateResource": row._id,
    });
    permitted = Boolean(enrolled && publishedReference);
  }
  if (!row || !permitted) fail(404, "Private file not found");
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
    .on("error", () =>
      res.headersSent ? res.destroy() : res.status(404).end(),
    )
    .pipe(res);
});

export default router;
