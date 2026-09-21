import { Router } from "express";
import express from "express";
import { z } from "zod";
import mongoose from "mongoose";
import crypto from "node:crypto";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import auth from "../middleware/authMiddleware.js";
import roles from "../middleware/roleMiddleware.js";
import validate from "../middleware/validate.js";
import { HttpError } from "../middleware/errorHandler.js";
import User from "../models/User.js";
import * as M from "../models/Lifecycle.js";
import {
  execute,
  matching,
  permitted,
  requireCoordinator,
  same,
} from "../services/lifecycleService.js";
const id = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID");
const text = z.string().trim().min(1).max(4000);
const short = z.string().trim().min(1).max(200);
const reason = text;
const date = z
  .string()
  .datetime({ offset: true })
  .transform((v) => new Date(v));
const ids = z.array(id).max(10).default([]);
const strings = z.array(short).max(30).default([]);
const kinds = z.enum(["MCQ", "PRACTICAL", "WRITTEN", "VIVA"]);
const permissions = z
  .array(
    z.enum([
      "CREATE_ASSESSMENT",
      "EVALUATE",
      "PUBLISH_RESULT",
      "REVIEW_EVIDENCE",
    ]),
  )
  .max(4);
const obj = (fields) => z.object(fields).strict();
const score = z.number().min(0).max(100);
export const actionSchemas = {
  defineCompetency: obj({
    title: short,
    rubricVersion: short,
    task: text,
    levels: z
      .array(obj({ level: z.number().int().min(1).max(100), definition: text }))
      .max(10),
  }).refine(
    (d) => new Set(d.levels.map((l) => l.level)).size === d.levels.length,
    "Levels must be unique",
  ),
  defineJobRole: obj({ title: short, description: text }),
  defineRequirement: obj({
    jobRole: id,
    competency: id,
    rubricVersion: short,
    requiredLevel: z.number().int().min(1).max(100),
  }),
  assignJobRole: obj({ user: id, jobRole: id, reason }),
  createCourse: obj({
    title: short,
    description: text,
    subject: short,
    intendedCompetencies: ids,
  }),
  defineRules: obj({
    course: id,
    version: z.number().int().min(1),
    eligibility: obj({ requiredQualifications: strings, instructions: text }),
    assessmentKinds: z.array(kinds).min(1).max(4),
    passing: obj({
      MCQ: score.optional(),
      PRACTICAL: score.optional(),
      WRITTEN: score.optional(),
      VIVA: score.optional(),
    }),
    certificate: obj({
      requireCompletion: z.boolean(),
      requirePublishedPass: z.boolean(),
      requireDemonstratedEvidence: z.boolean(),
    }),
    trainerPrerequisites: strings,
  }).refine(
    (d) => d.assessmentKinds.every((k) => d.passing[k] !== undefined),
    "Every enabled assessment type requires a passing threshold",
  ),
  createBatch: obj({
    ruleVersion: id,
    title: short,
    capacity: z.number().int().min(1).max(10000),
    sessions: z
      .array(
        obj({ title: short, subject: short, start: date, end: date }).refine(
          (d) => d.end > d.start,
          "Session end must follow start",
        ),
      )
      .min(1)
      .max(50),
  }),
  batchState: obj({
    batch: id,
    state: z.enum(["NOMINATIONS_OPEN", "IN_PROGRESS", "COMPLETED"]),
    reason,
  }),
  grantPermission: obj({ batch: id, user: id, actions: permissions, reason }),
  createNeed: obj({
    course: id.optional(),
    competency: id.optional(),
    reason,
    action: z.enum(["ASSESSMENT", "EVIDENCE_SUBMISSION", "TRAINING"]),
  }),
  nominate: obj({
    batch: id,
    need: id,
    information: text,
    qualifications: strings,
    resources: ids,
  }),
  editNomination: obj({
    nomination: id,
    information: text,
    qualifications: strings,
    resources: ids,
  }),
  nominationState: obj({
    nomination: id,
    state: z.enum([
      "SUBMITTED",
      "UNDER_REVIEW",
      "RETURNED",
      "RESUBMITTED",
      "WAITLISTED",
      "APPROVED",
      "REJECTED",
      "WITHDRAWN",
    ]),
    reason,
  }),
  reviewEligibility: obj({
    nomination: id,
    eligibility: z.enum(["NEEDS_INFORMATION", "ELIGIBLE", "INELIGIBLE"]),
    reason,
  }),
  expertise: obj({
    trainer: id,
    subject: short,
    qualifications: strings,
    teachingYears: z.number().min(0).max(60),
    status: z.enum(["APPROVED", "REJECTED"]),
    basis: text,
  }),
  availability: obj({
    trainer: id,
    start: date,
    end: date,
    available: z.boolean(),
    reason,
  }).refine((d) => d.end > d.start, "End must follow start"),
  assignTrainer: obj({ batch: id, sessionId: id, trainer: id, reason }),
  createAssessment: obj({
    batch: id,
    title: short,
    kind: kinds,
    instructions: text,
    competency: id.optional(),
    rubricVersion: short.optional(),
    questions: z
      .array(
        obj({
          prompt: text,
          options: z.array(short).min(2).max(6),
          correctIndex: z.number().int().min(0),
          sourcePassage: text,
          sourcePage: short,
        }),
      )
      .max(50)
      .default([]),
  })
    .refine(
      (d) =>
        d.kind !== "MCQ" ||
        (d.questions.length > 0 &&
          d.questions.every((q) => q.correctIndex < q.options.length)),
      "MCQs require valid answers and source passages/pages",
    )
    .refine(
      (d) => Boolean(d.competency) === Boolean(d.rubricVersion),
      "Competency and rubric version must be specified together",
    ),
  publishAssessment: obj({ assessment: id, reason }),
  submit: obj({
    assessment: id,
    text: z.string().trim().max(10000).default(""),
    answers: z.array(z.number().int()).max(50).default([]),
    resources: ids,
  }),
  evaluate: obj({ submission: id, score, comments: text }),
  completeLearning: obj({ enrollment: id, reason }),
  publishResult: obj({ enrollment: id, reason }),
  submitEvidence: obj({ submission: id, competency: id, rubricVersion: short }),
  reviewEvidence: obj({
    evidence: id,
    status: z.enum(["ACCEPTED", "RETURNED", "REJECTED"]),
    outcome: z.enum(["NOT_ASSESSED", "DEMONSTRATED", "NEEDS_PRACTICE"]),
    demonstratedLevel: z.number().int().min(1).max(100).optional(),
    comments: text,
    reviewDueAt: date.optional(),
  }),
  resubmitEvidence: obj({ evidence: id, text, resources: ids, reason }),
  issueCertificate: obj({ enrollment: id, reason }),
  feedback: obj({
    enrollment: id,
    rating: z.number().int().min(1).max(5),
    comments: text,
  }),
  followUp: obj({
    enrollment: id,
    evidence: id.optional(),
    action: text,
    dueAt: date,
    nextAction: z.enum(["ASSESSMENT", "EVIDENCE_SUBMISSION", "TRAINING"]),
  }),
  completeFollowUp: obj({ followUp: id, reason }),
  readNotification: obj({ notification: id }),
};
const router = Router();
router.use(auth, roles(["trainee", "trainer", "admin"]));
router.get("/", async (req, res) => {
  const actor = req.user;
  const [courses, rules, batches, competencies, jobRoles, requirements] =
    await Promise.all([
      M.Course.find().lean(),
      M.CourseRuleVersion.find().lean(),
      M.Batch.find().lean(),
      M.Competency.find().lean(),
      M.JobRole.find().lean(),
      M.RoleRequirement.find().lean(),
    ]);
  const coordinated = batches
    .filter((b) => actor.role === "admin" && same(b.coordinator, actor))
    .map((b) => b._id);
  const withAction = (action) =>
    batches.filter((b) => permitted(actor, b, action)).map((b) => b._id);
  const subjectBatches = [
    ...new Set(
      [...withAction("EVALUATE"), ...withAction("REVIEW_EVIDENCE")].map(String),
    ),
  ];
  const ownOr = (scope) => ({
    $or: [{ owner: actor._id }, { batch: { $in: scope } }],
  });
  const adminOrOwn = ownOr(coordinated),
    learningScope = [
      ...coordinated,
      ...subjectBatches,
      ...withAction("PUBLISH_RESULT"),
    ];
  const [
    nominations,
    enrollments,
    needs,
    assessments,
    submissions,
    evaluations,
    results,
    evidence,
    records,
    certificates,
    feedback,
    followUps,
    notifications,
    auditLogs,
    expertise,
    availability,
    assignments,
    resources,
    directory,
  ] = await Promise.all([
    M.Nomination.find(adminOrOwn).lean(),
    M.Enrollment.find(ownOr(learningScope)).lean(),
    M.TrainingNeed.find(
      actor.role === "admin"
        ? {
            owner: {
              $in: await M.Nomination.distinct("owner", {
                batch: { $in: coordinated },
              }),
            },
          }
        : { owner: actor._id },
    ).lean(),
    M.Assessment.find({
      $or: [
        { published: true },
        { batch: { $in: withAction("CREATE_ASSESSMENT") } },
      ],
    }).lean(),
    M.Submission.find(ownOr(learningScope)).lean(),
    M.Evaluation.find({
      $or: [
        { batch: { $in: learningScope } },
        {
          submission: {
            $in: await M.Submission.distinct("_id", { owner: actor._id }),
          },
        },
      ],
    }).lean(),
    M.Result.find(ownOr(learningScope)).lean(),
    M.Evidence.find(
      ownOr([...coordinated, ...withAction("REVIEW_EVIDENCE")]),
    ).lean(),
    M.CompetencyRecord.find(
      ownOr([...coordinated, ...withAction("REVIEW_EVIDENCE")]),
    ).lean(),
    M.Certificate.find(adminOrOwn).lean(),
    M.Feedback.find(adminOrOwn).lean(),
    M.FollowUp.find(adminOrOwn).lean(),
    M.Notification.find({ owner: actor._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean(),
    M.AuditLog.find({
      $or: [{ actor: actor._id }, { batch: { $in: coordinated } }],
    })
      .sort({ at: -1 })
      .limit(100)
      .lean(),
    M.TrainerExpertise.find(
      actor.role === "admin" ? {} : { trainer: actor._id },
    ).lean(),
    M.TrainerAvailability.find(
      actor.role === "admin" ? {} : { trainer: actor._id },
    ).lean(),
    M.TrainerAssignment.find({
      $or: [{ trainer: actor._id }, { batch: { $in: coordinated } }],
    }).lean(),
    M.Resource.find({
      $or: [
        { owner: actor._id },
        { batch: { $in: learningScope } },
        {
          purpose: "LEARNING",
          batch: {
            $in: await M.Enrollment.distinct("batch", {
              owner: actor._id,
              completion: { $ne: "WITHDRAWN" },
            }),
          },
        },
      ],
    })
      .select("-storageId")
      .lean(),
    User.find(
      actor.role === "admin"
        ? {}
        : {
            $or: [
              { _id: actor._id },
              {
                _id: {
                  $in: await M.Enrollment.distinct("owner", {
                    batch: { $in: learningScope },
                  }),
                },
              },
            ],
          },
    )
      .select("_id name role jobRole")
      .lean(),
  ]);
  const allowedAssessmentBatches = new Set([
    ...enrollments.map((e) => String(e.batch)),
    ...coordinated.map(String),
    ...subjectBatches,
    ...withAction("CREATE_ASSESSMENT").map(String),
    ...withAction("PUBLISH_RESULT").map(String),
  ]);
  const safeAssessments = assessments
    .filter((a) => allowedAssessmentBatches.has(String(a.batch)))
    .map((a) => {
      const batch = batches.find((b) => same(b, a.batch));
      if (!permitted(actor, batch, "CREATE_ASSESSMENT"))
        a.questions = a.questions.map(({ correctIndex, ...q }) => q);
      return a;
    });
  // Staff assignments and coordinator IDs are visible only for own scoped batches.
  const safeBatches = batches.map((b) => ({
    ...b,
    permissions: b.permissions.filter(
      (p) => same(p.user, actor) || same(b.coordinator, actor),
    ),
    history: same(b.coordinator, actor) ? b.history : [],
  }));
  res.json({
    success: true,
    data: {
      label: M.POLICY_LABEL,
      courses,
      rules,
      batches: safeBatches,
      competencies,
      jobRoles,
      requirements,
      nominations,
      enrollments,
      needs,
      assessments: safeAssessments,
      submissions,
      evaluations,
      results,
      evidence,
      records,
      certificates,
      feedback,
      followUps,
      notifications,
      auditLogs,
      expertise,
      availability,
      assignments,
      resources,
      directory,
    },
  });
});
router.get(
  "/batches/:id/matching/:sessionId",
  validate(obj({ id, sessionId: id }), "params"),
  async (req, res) => {
    const batch = await M.Batch.findById(req.params.id);
    if (!batch) throw new HttpError(404, "Batch not found");
    requireCoordinator(req.user, batch);
    res.json({
      success: true,
      data: { recommendations: await matching(batch, req.params.sessionId) },
    });
  },
);
router.post(
  "/actions/:action",
  (req, res, next) => {
    const schema = actionSchemas[req.params.action];
    if (!schema) throw new HttpError(404, "Unknown lifecycle action");
    return validate(schema)(req, res, next);
  },
  async (req, res) => {
    const row = await execute(req.user, req.params.action, req.validated.body);
    res.json({
      success: true,
      data: { record: row },
      message: "Action recorded.",
    });
  },
);
// Files are in a private GridFS bucket. No static directory or public file URL is exposed.
const bucket = () =>
  new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: "privateFiles",
  });
router.post(
  "/files/:batch",
  validate(obj({ batch: id }), "params"),
  express.raw({ type: "application/octet-stream", limit: "5mb" }),
  async (req, res) => {
    const batch = await M.Batch.findById(req.params.batch);
    if (!batch) throw new HttpError(404, "Batch not found");
    const purpose = z
      .enum(["NOMINATION", "LEARNING", "SUBMISSION", "CERTIFICATE"])
      .safeParse(req.headers["x-file-purpose"]);
    if (!purpose.success)
      throw new HttpError(400, "Choose a valid file purpose");
    const coordinator =
        req.user.role === "admin" && same(batch.coordinator, req.user),
      staff = batch.permissions.some((p) => same(p.user, req.user));
    const enrollment = await M.Enrollment.exists({
      owner: req.user._id,
      batch: batch._id,
      completion: { $ne: "WITHDRAWN" },
    });
    if (!(
      coordinator ||
      staff ||
      enrollment ||
      (req.user.role === "trainee" &&
        batch.state === "NOMINATIONS_OPEN" &&
        purpose.data === "NOMINATION")
    ))
      throw new HttpError(403, "No upload access to this batch");
    if (
      purpose.data === "LEARNING" &&
      !coordinator &&
      !permitted(req.user, batch, "CREATE_ASSESSMENT")
    )
      throw new HttpError(403, "Learning resource author assignment required");
    if (!Buffer.isBuffer(req.body) || !req.body.length)
      throw new HttpError(
        400,
        "Upload a nonempty file as application/octet-stream",
      );
    const mime = req.headers["x-file-type"];
    const bytes = req.body;
    const signatures = {
      "application/pdf": () => bytes.subarray(0, 5).toString() === "%PDF-",
      "image/png": () =>
        bytes
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
      "image/jpeg": () =>
        bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255,
      "text/plain": () => {
        try {
          const value = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
          return (
            !value.includes("\0") && !/<(?:html|script|svg)\b/i.test(value)
          );
        } catch {
          return false;
        }
      },
    };
    if (!signatures[mime]?.())
      throw new HttpError(
        400,
        "Allowed types: PDF, PNG, JPEG and UTF-8 text; content must match the type",
      );
    const filename = String(req.headers["x-file-name"] || "attachment")
      .replace(/[^a-zA-Z0-9._ -]/g, "_")
      .slice(0, 120);
    const upload = bucket().openUploadStream(filename, {
      metadata: { owner: req.user._id, batch: batch._id },
    });
    try {
      await pipeline(Readable.from(bytes), upload);
      const resource = await mongoose.connection.transaction(
        async (session) => {
          const [row] = await M.Resource.create(
            [
              {
                owner: req.user._id,
                batch: batch._id,
                filename,
                mime,
                size: bytes.length,
                storageId: upload.id,
                sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
                purpose: purpose.data,
              },
            ],
            { session },
          );
          await M.AuditLog.create(
            [
              {
                actor: req.user._id,
                batch: batch._id,
                action: "PRIVATE_FILE_UPLOADED",
                entityType: "Resource",
                entityId: row._id,
                reason: "Type and size validated; private attachment stored",
              },
            ],
            { session },
          );
          return row;
        },
      );
      const safe = resource.toObject();
      delete safe.storageId;
      res.status(201).json({ success: true, data: { resource: safe } });
    } catch (e) {
      await bucket()
        .delete(upload.id)
        .catch(() => {});
      throw e;
    }
  },
);
router.get("/files/:id", validate(obj({ id }), "params"), async (req, res) => {
  const resource = await M.Resource.findById(req.params.id);
  if (!resource) throw new HttpError(404, "File not found");
  const batch = await M.Batch.findById(resource.batch);
  const coordinator =
      req.user.role === "admin" && same(batch.coordinator, req.user),
    reviewer =
      permitted(req.user, batch, "EVALUATE") ||
      permitted(req.user, batch, "REVIEW_EVIDENCE");
  const learner =
    resource.purpose === "LEARNING" &&
    (await M.Enrollment.exists({
      batch: batch._id,
      owner: req.user._id,
      completion: { $ne: "WITHDRAWN" },
    }));
  const submitted =
    reviewer &&
    ((await M.Submission.exists({
      batch: batch._id,
      resources: resource._id,
    })) ||
      (await M.Evidence.exists({
        batch: batch._id,
        "supplement.resources": resource._id,
      })));
  if (!same(resource.owner, req.user) && !coordinator && !submitted && !learner)
    throw new HttpError(403, "No access to this private attachment");
  await M.AuditLog.create({
    actor: req.user._id,
    batch: batch._id,
    action: "PRIVATE_FILE_DOWNLOADED",
    entityType: "Resource",
    entityId: resource._id,
    reason: "Authorized private download",
  });
  res.set({
    "Content-Type": resource.mime,
    "Content-Disposition": `attachment; filename="${resource.filename}"`,
    "Content-Length": resource.size,
    "X-Content-Type-Options": "nosniff",
  });
  await pipeline(bucket().openDownloadStream(resource.storageId), res);
});
export default router;
