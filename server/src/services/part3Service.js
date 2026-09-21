import crypto from "node:crypto";
import mongoose from "mongoose";
import { HttpError } from "../middleware/errorHandler.js";
import * as P2 from "../models/Part2.js";
import * as P3 from "../models/Part3.js";

const fail = (status, message) => {
  throw new HttpError(status, message);
};
const id = (value) => String(value?._id || value || "");
const same = (a, b) => id(a) === id(b);
const eventId = () => crypto.randomUUID();
const get = async (Model, value, session = null) => {
  const row = await Model.findById(value).session(session);
  if (!row) fail(404, `${Model.modelName} not found`);
  return row;
};

export async function recordPart3Audit(
  actor,
  action,
  row,
  reason,
  changes = {},
  session = null,
) {
  return (
    await P2.P2AuditLog.create(
      [
        {
          actor: actor._id,
          action,
          entityType: row.constructor.modelName,
          entityId: row._id,
          changes,
          reason,
          correlationId: eventId(),
          timestamp: new Date(),
          isSynthetic: row.isSynthetic,
          demoNamespace: row.demoNamespace,
        },
      ],
      { session },
    )
  )[0];
}
async function sendNotification(
  recipient,
  type,
  title,
  message,
  entityType,
  entityId,
  path,
) {
  return P2.P2Notification.updateOne(
    { recipient, eventId: `${type}:${entityId}` },
    {
      $setOnInsert: {
        recipient,
        type,
        title,
        message,
        entityReference: { entityType, entityId, path },
        eventId: `${type}:${entityId}`,
      },
    },
    { upsert: true },
  );
}
export async function requirePermission(actor, batchId, action) {
  const permission = await P3.P3BatchPermission.findOne({
    batch: batchId,
    user: actor._id,
    actions: action,
  }).lean();
  if (!permission) fail(403, `Explicit batch permission required: ${action}`);
  return permission;
}

export async function trainerSuitability(batchId, sessionId) {
  const batch = await P2.P2Batch.findById(batchId).lean();
  if (!batch) fail(404, "Batch not found");
  const session = batch.sessions?.find(
    (item) => id(item._id) === id(sessionId),
  );
  if (!session) fail(404, "Batch session not found");
  const User = mongoose.model("User");
  const trainers = await User.find({
    role: "trainer",
    accountStatus: "approved",
  })
    .select("name department designation qualifications")
    .lean();
  const output = [];
  for (const trainer of trainers) {
    const expertise = session.competency
      ? await P3.P3TrainerExpertise.findOne({
          trainer: trainer._id,
          competency: session.competency,
          status: "APPROVED",
        }).lean()
      : null;
    const availability = await P3.P3TrainerAvailability.find({
      trainer: trainer._id,
      start: { $lte: session.start },
      end: { $gte: session.end },
    }).lean();
    const conflict = await P3.P3TrainerAssignment.exists({
      trainer: trainer._id,
      status: "ACTIVE",
      start: { $lt: session.end },
      end: { $gt: session.start },
      $or: [{ batch: { $ne: batch._id } }, { sessionId: { $ne: session._id } }],
    });
    const mandatory = [
      {
        check: "Approved relevant expertise",
        passed: Boolean(expertise),
        explanation: expertise
          ? "Approved expertise matches the session competency."
          : "Approved relevant expertise is missing.",
      },
      {
        check: "Required qualifications",
        passed: Boolean(expertise?.qualifications?.length),
        explanation: expertise?.qualifications?.length
          ? "An approved qualification basis is recorded."
          : "Required qualification information is missing.",
      },
      {
        check: "Session availability",
        passed: availability.some((window) => window.available),
        explanation: availability.some((window) => window.available)
          ? "Availability covers the complete session."
          : "Availability does not cover the complete session.",
      },
      {
        check: "No scheduling conflict",
        passed: !conflict,
        explanation: conflict
          ? "A conflicting active assignment exists."
          : "No conflicting assignment was found.",
      },
    ];
    const eligible = mandatory.every((check) => check.passed);
    const subjectPoints = eligible ? 10 : 0;
    const experiencePoints = eligible
      ? Math.min(10, Math.floor(expertise?.teachingYears || 0))
      : 0;
    output.push({
      trainer,
      eligible,
      recommendationPoints: eligible ? subjectPoints + experiencePoints : null,
      factors: {
        subjectRelevance: subjectPoints,
        teachingExperience: experiencePoints,
      },
      checks: mandatory,
      explanation: eligible
        ? `Exact approved subject relevance: ${subjectPoints} points; relevant teaching experience: ${experiencePoints} points.`
        : mandatory
            .filter((check) => !check.passed)
            .map((check) => check.explanation)
            .join(" "),
      missingInformation: mandatory
        .filter((check) => !check.passed)
        .map((check) => check.check),
    });
  }
  return output.sort(
    (a, b) =>
      (b.recommendationPoints ?? -1) - (a.recommendationPoints ?? -1) ||
      a.trainer.name.localeCompare(b.trainer.name),
  );
}

export async function assignTrainer({
  actor,
  batchId,
  sessionId,
  trainerId,
  reason,
  rankingDepartureReason,
}) {
  if (actor.role !== "admin") fail(403, "Coordinator permission required");
  const recommendations = await trainerSuitability(batchId, sessionId);
  const selected = recommendations.find((item) =>
    same(item.trainer, trainerId),
  );
  if (!selected?.eligible)
    fail(409, selected?.explanation || "No eligible trainer available");
  const batch = await get(P2.P2Batch, batchId);
  const session = batch.sessions.id(sessionId);
  const highest = recommendations.find((item) => item.eligible);
  if (
    highest &&
    !same(highest.trainer, trainerId) &&
    !rankingDepartureReason?.trim()
  )
    fail(400, "Explain the departure from the highest-ranked eligible trainer");
  const assignment = await P3.P3TrainerAssignment.create({
    trainer: trainerId,
    batch: batchId,
    sessionId,
    start: session.start,
    end: session.end,
    status: "ACTIVE",
    assignedBy: actor._id,
    assignedAt: new Date(),
    recommendationPoints: selected.recommendationPoints,
    explanation: selected.explanation,
    decisionReason: reason,
    rankingDepartureReason: rankingDepartureReason || "",
    isSynthetic: batch.isSynthetic,
    demoNamespace: batch.demoNamespace,
  });
  await recordPart3Audit(actor, "TRAINER_ASSIGNED", assignment, reason, {
    recommendationPoints: selected.recommendationPoints,
    rankingDepartureReason: rankingDepartureReason || null,
  });
  await sendNotification(
    trainerId,
    "TRAINER_ASSIGNED",
    "Training session assigned",
    `You were assigned to ${session.title}.`,
    "P3TrainerAssignment",
    assignment._id,
    "/trainer/assignments",
  );
  return assignment;
}

export async function replaceTrainer({
  actor,
  assignmentId,
  trainerId,
  reason,
  rankingDepartureReason,
}) {
  const current = await get(P3.P3TrainerAssignment, assignmentId);
  if (current.status !== "UNAVAILABLE")
    fail(409, "Only an unavailable assignment can be replaced");
  const replacement = await assignTrainer({
    actor,
    batchId: current.batch,
    sessionId: current.sessionId,
    trainerId,
    reason,
    rankingDepartureReason,
  });
  current.status = "REPLACED";
  await current.save();
  replacement.replaces = current._id;
  await replacement.save();
  await recordPart3Audit(actor, "TRAINER_REPLACED", replacement, reason, {
    replaces: current._id,
  });
  return replacement;
}

export async function createAssessment(actor, data) {
  await requirePermission(actor, data.batch, "CREATE_ASSESSMENT");
  const batch = await get(P2.P2Batch, data.batch);
  if (!["ONGOING", "CLOSED", "OPEN"].includes(batch.status))
    fail(409, "Assessment cannot be created for this batch status");
  if (data.type === "MCQ")
    for (const question of data.questions || [])
      if (
        !question.sourcePassage ||
        !question.sourcePage ||
        question.correctIndex >= question.options.length
      )
        fail(
          400,
          "Each MCQ requires a valid answer and supporting source passage/page",
        );
  const assessment = await P3.P3Assessment.create({
    ...data,
    ruleVersion: batch.ruleVersion,
    createdBy: actor._id,
    status: "DRAFT",
    isSynthetic: batch.isSynthetic,
    demoNamespace: batch.demoNamespace,
  });
  await recordPart3Audit(
    actor,
    "ASSESSMENT_CREATED",
    assessment,
    "Assessment draft created",
  );
  return assessment;
}

export async function publishAssessment(actor, assessmentId, reason) {
  const assessment = await get(P3.P3Assessment, assessmentId);
  await requirePermission(actor, assessment.batch, "CREATE_ASSESSMENT");
  if (assessment.status !== "DRAFT")
    fail(409, "Only a draft assessment can be published");
  assessment.status = "PUBLISHED";
  assessment.publishedBy = actor._id;
  assessment.publishedAt = new Date();
  await assessment.save();
  await recordPart3Audit(actor, "ASSESSMENT_PUBLISHED", assessment, reason);
  return assessment;
}

export async function submitAssessment(actor, data) {
  const [assessment, enrollment] = await Promise.all([
    get(P3.P3Assessment, data.assessment),
    get(P2.P2Enrollment, data.enrollment),
  ]);
  if (assessment.status !== "PUBLISHED") fail(409, "Assessment is not open");
  if (
    !same(enrollment.trainee, actor) ||
    enrollment.status !== "CONFIRMED" ||
    !same(enrollment.batch, assessment.batch)
  )
    fail(403, "A confirmed own enrollment is required");
  let automaticScore = null;
  if (assessment.type === "MCQ") {
    if ((data.answers || []).length !== assessment.questions.length)
      fail(400, "Answer every MCQ question");
    const earned = assessment.questions.reduce(
      (sum, question, index) =>
        sum +
        (data.answers[index] === question.correctIndex
          ? question.points || 1
          : 0),
      0,
    );
    const possible = assessment.questions.reduce(
      (sum, question) => sum + (question.points || 1),
      0,
    );
    automaticScore = possible ? Math.round((earned / possible) * 100) : 0;
  }
  const submission = await P3.P3Submission.create({
    enrollment: enrollment._id,
    assessment: assessment._id,
    trainee: actor._id,
    answers: data.answers || [],
    responseText: data.responseText || "",
    resourceReferences: data.resourceReferences || [],
    submittedAt: new Date(),
    automaticScore,
    status: "SUBMITTED",
    isSynthetic: assessment.isSynthetic,
    demoNamespace: assessment.demoNamespace,
  });
  await recordPart3Audit(
    actor,
    "ASSESSMENT_SUBMITTED",
    submission,
    "Submission recorded",
    { automaticScore: automaticScore == null ? null : "provisional" },
  );
  return submission;
}

export async function evaluateSubmission(actor, data) {
  const submission = await get(P3.P3Submission, data.submission);
  const assessment = await get(P3.P3Assessment, submission.assessment);
  await requirePermission(actor, assessment.batch, "EVALUATE_SUBMISSION");
  if (same(submission.trainee, actor))
    fail(403, "You cannot evaluate your own submission");
  const evaluation = await P3.P3Evaluation.create({
    submission: submission._id,
    evaluator: actor._id,
    score: data.score,
    comments: data.comments,
    evaluatedAt: new Date(),
    isSynthetic: submission.isSynthetic,
    demoNamespace: submission.demoNamespace,
  });
  submission.status = "EVALUATED";
  await submission.save();
  await recordPart3Audit(
    actor,
    "SUBMISSION_EVALUATED",
    evaluation,
    data.comments,
    { score: data.score },
  );
  return evaluation;
}

export async function publishResult(actor, data) {
  const enrollment = await get(P2.P2Enrollment, data.enrollment);
  await requirePermission(actor, enrollment.batch, "PUBLISH_RESULT");
  if (same(enrollment.trainee, actor))
    fail(403, "You cannot publish your own result");
  const assessments = await P3.P3Assessment.find({
    batch: enrollment.batch,
    status: { $in: ["PUBLISHED", "CLOSED"] },
  }).lean();
  const submissions = await P3.P3Submission.find({
    enrollment: enrollment._id,
    assessment: { $in: assessments.map((item) => item._id) },
    status: "EVALUATED",
  }).lean();
  if (!assessments.length || submissions.length !== assessments.length)
    fail(
      409,
      "Every published assessment requires a human evaluation before result publication",
    );
  const evaluations = await P3.P3Evaluation.find({
    submission: { $in: submissions.map((item) => item._id) },
  }).lean();
  const passed = assessments.every((assessment) => {
    const submission = submissions.find((item) =>
      same(item.assessment, assessment._id),
    );
    const evaluation = evaluations.find((item) =>
      same(item.submission, submission?._id),
    );
    return evaluation && evaluation.score >= (assessment.passingScore ?? 60);
  });
  const batch = await get(P2.P2Batch, enrollment.batch);
  const result = await P3.P3Result.create({
    enrollment: enrollment._id,
    batch: batch._id,
    trainee: enrollment.trainee,
    ruleVersion: batch.ruleVersion,
    outcome: passed ? "PASS" : "FAIL",
    evaluationReferences: evaluations.map((item) => item._id),
    status: "PUBLISHED",
    publishedBy: actor._id,
    publishedAt: new Date(),
    publicationReason: data.reason,
    isSynthetic: batch.isSynthetic,
    demoNamespace: batch.demoNamespace,
  });
  await recordPart3Audit(actor, "RESULT_PUBLISHED", result, data.reason, {
    outcome: result.outcome,
  });
  await sendNotification(
    enrollment.trainee,
    "RESULT_PUBLISHED",
    "Official result published",
    `Your batch result is ${result.outcome}.`,
    "P3Result",
    result._id,
    "/trainee/results",
  );
  return result;
}

export async function submitEvidence(actor, data) {
  const submission = await get(P3.P3Submission, data.submission);
  const assessment = await get(P3.P3Assessment, submission.assessment);
  const enrollment = await get(P2.P2Enrollment, submission.enrollment);
  if (!same(submission.trainee, actor) || !same(enrollment.trainee, actor))
    fail(403, "Evidence owner required");
  if (
    !same(assessment.competency, data.competency) ||
    assessment.frameworkVersion !== data.frameworkVersion
  )
    fail(
      400,
      "Evidence must match the assessment competency and framework version",
    );
  const evidence = await P3.P3Evidence.create({
    owner: actor._id,
    enrollment: enrollment._id,
    submission: submission._id,
    competency: data.competency,
    frameworkVersion: data.frameworkVersion,
    rubricVersion: data.rubricVersion,
    status: "SUBMITTED",
    submittedAt: new Date(),
    supplementText: data.supplementText || "",
    resourceReferences: data.resourceReferences || [],
    isSynthetic: submission.isSynthetic,
    demoNamespace: submission.demoNamespace,
  });
  await recordPart3Audit(
    actor,
    "EVIDENCE_SUBMITTED",
    evidence,
    "Assessment submission reused as competency evidence",
  );
  return evidence;
}

export async function reviewEvidence(actor, data) {
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const evidence = await get(P3.P3Evidence, data.evidence, session);
      const enrollment = await get(
        P2.P2Enrollment,
        evidence.enrollment,
        session,
      );
      await requirePermission(actor, enrollment.batch, "REVIEW_EVIDENCE");
      if (same(evidence.owner, actor))
        fail(403, "You cannot review your own evidence");
      if (
        data.status === "ACCEPTED" &&
        data.outcome === "DEMONSTRATED" &&
        data.demonstratedLevel == null
      )
        fail(400, "A demonstrated level is required");
      if (data.status !== "ACCEPTED" && data.outcome === "DEMONSTRATED")
        fail(400, "Only accepted evidence can support a demonstrated outcome");
      const review = (
        await P3.P3EvidenceReview.create(
          [
            {
              evidence: evidence._id,
              reviewer: actor._id,
              reviewedAt: new Date(),
              outcome: data.outcome,
              demonstratedLevel: data.demonstratedLevel ?? null,
              comments: data.comments,
              rubricVersion: evidence.rubricVersion,
              isSynthetic: evidence.isSynthetic,
              demoNamespace: evidence.demoNamespace,
            },
          ],
          { session },
        )
      )[0];
      evidence.status = data.status;
      await evidence.save({ session });
      await P2.P2CompetencyRecord.findOneAndUpdate(
        {
          trainee: evidence.owner,
          competency: evidence.competency,
          frameworkVersion: evidence.frameworkVersion,
        },
        {
          $set: {
            demonstratedLevel:
              data.outcome === "DEMONSTRATED" ? data.demonstratedLevel : null,
            status: data.outcome,
            sourceType: "PART3_REVIEW",
            sourceReference: `evidence:${evidence._id}`,
            assessedAt: new Date(),
            reviewer: actor._id,
            notes: data.comments,
            isSynthetic: evidence.isSynthetic,
            demoNamespace: evidence.demoNamespace,
          },
        },
        { upsert: true, new: true, session },
      );
      await recordPart3Audit(
        actor,
        "EVIDENCE_REVIEWED",
        review,
        data.comments,
        {
          evidenceStatus: data.status,
          competencyOutcome: data.outcome,
          demonstratedLevel: data.demonstratedLevel ?? null,
        },
        session,
      );
      result = { evidence, review };
    });
  } finally {
    await session.endSession();
  }
  await sendNotification(
    result.evidence.owner,
    "EVIDENCE_REVIEWED",
    "Competency evidence reviewed",
    data.comments,
    "P3Evidence",
    result.evidence._id,
    "/trainee/evidence",
  );
  return result;
}

export async function calculateCapability(
  actor,
  { competency, frameworkVersion, jobRole = null },
) {
  if (actor.role !== "admin") fail(403, "Coordinator permission required");
  const User = mongoose.model("User");
  const userQuery = {
    role: "trainee",
    accountStatus: "approved",
    ...(jobRole && { jobRole }),
  };
  const traineeIds = await User.find(userQuery).distinct("_id");
  const records = await P2.P2CompetencyRecord.find({
    trainee: { $in: traineeIds },
    competency,
    frameworkVersion,
  }).lean();
  const latest = new Map();
  for (const record of records.sort(
    (a, b) => new Date(b.assessedAt || 0) - new Date(a.assessedAt || 0),
  ))
    if (!latest.has(id(record.trainee))) latest.set(id(record.trainee), record);
  const denominator = traineeIds.length,
    demonstratedCount = [...latest.values()].filter(
      (item) => item.status === "DEMONSTRATED",
    ).length,
    needsPracticeCount = [...latest.values()].filter(
      (item) => item.status === "NEEDS_PRACTICE",
    ).length;
  const notAssessedCount = denominator - demonstratedCount - needsPracticeCount;
  const evidenceDates = [...latest.values()]
    .map((item) => item.assessedAt)
    .filter(Boolean);
  const snapshot = await P3.P3CapabilitySnapshot.create({
    competency,
    frameworkVersion,
    jobRole: jobRole || undefined,
    denominator,
    demonstratedCount,
    notAssessedCount,
    needsPracticeCount,
    coveragePercent: denominator
      ? Math.round((demonstratedCount / denominator) * 1000) / 10
      : 0,
    evidenceAsOf: evidenceDates.length
      ? new Date(Math.max(...evidenceDates.map(Number)))
      : null,
    calculatedAt: new Date(),
    calculatedBy: actor._id,
  });
  await recordPart3Audit(
    actor,
    "CAPABILITY_SNAPSHOT_CALCULATED",
    snapshot,
    "Current reviewed-evidence coverage calculated",
    { denominator, demonstratedCount, notAssessedCount },
  );
  return snapshot;
}

export async function createMcqDraft(actor, data) {
  await requirePermission(actor, data.batch, "CREATE_ASSESSMENT");
  if (!data.sourcePassage?.trim() || !data.sourcePage?.trim())
    fail(400, "An approved supporting source passage and page are required");
  const aiEnabled =
    process.env.AI_ASSISTANCE_ENABLED === "true" &&
    Boolean(process.env.AI_PROVIDER_URL);
  const mode = aiEnabled ? "AI_ASSISTED" : "MANUAL_FALLBACK";
  const output = aiEnabled
    ? { status: "PROVIDER_NOT_CONFIGURED_IN_DEMO", questions: [] }
    : {
        questions: [],
        guidance:
          "Create and review MCQ items manually from the approved passage. Nothing has been published.",
      };
  const draft = await P3.P3AiDraft.create({
    requestedBy: actor._id,
    sourceReference: data.sourceReference,
    sourcePage: data.sourcePage,
    sourcePassage: data.sourcePassage,
    prompt: data.prompt,
    output,
    mode: aiEnabled ? "MANUAL_FALLBACK" : mode,
    status: "DRAFT",
    provider: aiEnabled ? "configured-provider" : "none",
    errorCode: aiEnabled ? "SAFE_FALLBACK" : "AI_DISABLED",
    isSynthetic: Boolean(data.isSynthetic),
    demoNamespace: data.demoNamespace,
  });
  return {
    available: false,
    mode: draft.mode,
    draft,
    message:
      "AI assistance is unavailable. The manual assessment workflow remains available.",
  };
}
