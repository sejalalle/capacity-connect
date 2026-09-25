import { validateCriterionDecision } from "./criterionService.js";
import crypto from "node:crypto";
import mongoose from "mongoose";
import User from "../models/User.js";
import * as P2 from "../models/Part2.js";
import * as P3 from "../models/Part3.js";
import { HttpError } from "../middleware/errorHandler.js";
import { gapsFor, notify } from "./part2Service.js";
import { aiSettings, requestStructuredAI } from "./aiService.js";

const id = (value) => String(value?._id || value || "");
const fail = (status, message) => {
  throw new HttpError(status, message);
};
const get = async (Model, value, session) => {
  const row = await Model.findById(value).session(session || null);
  if (!row) fail(404, `${Model.modelName.replace(/^P[23]/, "")} not found`);
  return row;
};
const audit = (data, session) =>
  P2.P2AuditLog.create(
    [
      {
        ...data,
        correlationId: data.correlationId || crypto.randomUUID(),
        timestamp: new Date(),
      },
    ],
    { session, ordered: true },
  );

async function evidenceContext(evidence, session = null) {
  const enrollment = evidence.enrollment
    ? await get(P2.P2Enrollment, evidence.enrollment, session)
    : null;
  return { enrollment, batch: enrollment?.batch };
}
async function hasAction(userId, batch, action, session = null) {
  return Boolean(
    batch &&
    (await P3.P3BatchPermission.exists({
      batch,
      user: userId,
      actions: action,
    }).session(session)),
  );
}
async function validateEvidenceSources(owner, data) {
  const enrollment = data.enrollment
    ? await get(P2.P2Enrollment, data.enrollment)
    : null;
  if (enrollment && id(enrollment.trainee) !== id(owner))
    fail(403, "Evidence enrollment ownership is required");
  if (data.assessmentSubmission) {
    const row = await get(P3.P3AssessmentSubmission, data.assessmentSubmission);
    if (
      id(row.trainee) !== id(owner) ||
      (enrollment && id(row.enrollment) !== id(enrollment))
    )
      fail(403, "Assessment submission does not belong to this evidence owner");
  }
  if (data.evaluation) {
    const row = await get(P3.P3HumanEvaluation, data.evaluation);
    const submission = await get(P3.P3AssessmentSubmission, row.submission);
    if (id(submission.trainee) !== id(owner))
      fail(403, "Evaluation does not belong to this evidence owner");
  }
  if (data.resultVersion) {
    const row = await get(P3.P3ResultVersion, data.resultVersion);
    if (row.status !== "PUBLISHED" || id(row.trainee) !== id(owner))
      fail(403, "Only the owner's published result version can be referenced");
  }
  for (const resourceId of data.privateResources || []) {
    const resource = await get(P3.P3PrivateResource, resourceId);
    if (id(resource.owner) !== id(owner))
      fail(403, "Private evidence file ownership is required");
    if (enrollment && id(resource.batch) !== id(enrollment.batch))
      fail(400, "Private evidence file belongs to another batch");
  }
  for (const claim of data.claimedCompetencies) {
    const competency = await get(P2.P2Competency, claim.competency);
    if (competency.version !== claim.frameworkVersion)
      fail(
        409,
        "Claimed competency framework version does not match the catalogue",
      );
    if (data.assessmentSubmission) {
      const submission = await P3.P3AssessmentSubmission.findById(
        data.assessmentSubmission,
      ).lean();
      const assessment = await P3.P3Assessment.findById(
        submission.assessment,
      ).lean();
      if (
        id(assessment.competency) !== id(claim.competency) ||
        assessment.frameworkVersion !== claim.frameworkVersion ||
        assessment.rubricVersion !== claim.rubricVersion
      )
        fail(
          409,
          "Evidence claim must match the assessment competency and rubric mapping",
        );
    }
  }
  return enrollment;
}

export async function submitEvidence(actor, data) {
  const enrollment = await validateEvidenceSources(actor._id, data);
  const evidenceKey = data.evidenceKey || crypto.randomUUID();
  const existing = await P3.P3Evidence.findOne({
    owner: actor._id,
    evidenceKey,
  });
  if (existing) return existing;
  // Existing Part 3A databases may still have the legacy unique index that
  // included `submission`. This deterministic token prevents collisions; the
  // actual Part 3A source is held in `assessmentSubmission`.
  const legacySubmissionToken = new mongoose.Types.ObjectId(
    crypto.createHash("sha256").update(evidenceKey).digest("hex").slice(0, 24),
  );
  const row = await P3.P3Evidence.create({
    ...data,
    evidenceKey,
    submission: legacySubmissionToken,
    owner: actor._id,
    status: "SUBMITTED",
    submittedAt: new Date(),
    competency: data.claimedCompetencies[0]?.competency,
    frameworkVersion: data.claimedCompetencies[0]?.frameworkVersion,
    rubricVersion: data.claimedCompetencies[0]?.rubricVersion,
    isSynthetic: Boolean(enrollment?.isSynthetic),
    demoNamespace: enrollment?.demoNamespace,
  });
  await audit({
    actor: actor._id,
    action: "EVIDENCE_SUBMITTED",
    entityType: "P3Evidence",
    entityId: row._id,
    newStatus: "SUBMITTED",
    changes: {
      evidenceType: row.evidenceType,
      claimCount: row.claimedCompetencies.length,
      sourceReferences: [
        row.assessmentSubmission,
        row.evaluation,
        row.resultVersion,
      ].filter(Boolean),
    },
    reason: "Evidence submitted for human review",
  });
  return row;
}

export async function reviseEvidence(actor, evidenceId, data) {
  const row = await get(P3.P3Evidence, evidenceId);
  if (id(row.owner) !== id(actor)) fail(403, "Evidence ownership is required");
  if (row.status !== "NEEDS_REVISION")
    fail(409, "Only evidence returned for revision can be revised");
  await validateEvidenceSources(actor._id, {
    ...row.toObject(),
    ...data,
    claimedCompetencies: row.claimedCompetencies,
  });
  row.versionHistory.push({
    version: row.version,
    status: row.status,
    description: row.description,
    privateResources: row.privateResources,
    submittedAt: row.submittedAt,
    reviewer: row.reviewedBy,
    reviewedAt: row.reviewedAt,
    reason: row.reviewReason,
  });
  row.version += 1;
  row.description = data.description;
  row.privateResources = data.privateResources;
  row.status = "SUBMITTED";
  row.submittedAt = new Date();
  row.reviewedBy = undefined;
  row.reviewedAt = undefined;
  row.reviewReason = undefined;
  row.reviewComments = data.comments || "";
  await row.save();
  await audit({
    actor: actor._id,
    action: "EVIDENCE_REVISED",
    entityType: "P3Evidence",
    entityId: row._id,
    previousStatus: "NEEDS_REVISION",
    newStatus: "SUBMITTED",
    changes: { version: row.version },
    reason: data.comments || "Evidence revised",
  });
  return row;
}

export async function assignReviewer(actor, evidenceId, reviewerId, reason) {
  const row = await get(P3.P3Evidence, evidenceId);
  if (!["SUBMITTED", "UNDER_REVIEW"].includes(row.status))
    fail(409, "Evidence is not awaiting reviewer assignment");
  const reviewer = await User.findOne({
    _id: reviewerId,
    accountStatus: "approved",
    role: { $in: ["trainer", "admin"] },
  });
  if (!reviewer)
    fail(400, "Reviewer must be an approved trainer or coordinator");
  if (id(reviewer) === id(row.owner))
    fail(409, "Users cannot review their own evidence");
  const { batch } = await evidenceContext(row);
  if (!(await hasAction(reviewer._id, batch, "REVIEW_EVIDENCE")))
    fail(403, "Reviewer lacks evidence-review scope for this batch");
  row.assignedReviewer = reviewer._id;
  row.status = "UNDER_REVIEW";
  await row.save();
  await audit({
    actor: actor._id,
    action: "EVIDENCE_REVIEWER_ASSIGNED",
    entityType: "P3Evidence",
    entityId: row._id,
    previousStatus: "SUBMITTED",
    newStatus: "UNDER_REVIEW",
    changes: { reviewer: reviewer._id },
    reason,
  });
  await notify({
    recipient: reviewer._id,
    type: "EVIDENCE_REVIEW_ASSIGNED",
    title: "Evidence review assigned",
    message: "A competency evidence submission is awaiting your review.",
    entityReference: {
      entityType: "P3Evidence",
      entityId: row._id,
      path: "/trainer/evidence-review",
    },
    eventId: `evidence:${row._id}:reviewer:${reviewer._id}:v${row.version}`,
    isSynthetic: row.isSynthetic,
    demoNamespace: row.demoNamespace,
  });
  return row;
}

export async function reviewEvidence(actor, evidenceId, data) {
  const row = await get(P3.P3Evidence, evidenceId);
  if (id(row.assignedReviewer) !== id(actor))
    fail(403, "This evidence review is not assigned to you");
  if (id(row.owner) === id(actor))
    fail(409, "Users cannot review their own evidence");
  if (row.status !== "UNDER_REVIEW") fail(409, "Evidence is not under review");
  if (
    ["REJECTED", "NEEDS_REVISION"].includes(data.status) &&
    !data.reason?.trim()
  )
    fail(400, "A reason is required for rejection or revision");
  row.status = data.status;
  row.reviewedBy = actor._id;
  row.reviewedAt = new Date();
  row.reviewReason = data.reason;
  row.reviewComments = data.comments;
  await row.save();
  await audit({
    actor: actor._id,
    action: "EVIDENCE_REVIEWED",
    entityType: "P3Evidence",
    entityId: row._id,
    previousStatus: "UNDER_REVIEW",
    newStatus: row.status,
    changes: { version: row.version },
    reason: data.reason || data.comments,
  });
  await notify({
    recipient: row.owner,
    type: "EVIDENCE_REVIEW_COMPLETED",
    title: `Evidence ${row.status.toLowerCase().replace("_", " ")}`,
    message:
      "Your evidence review has been updated. Evidence acceptance does not itself establish competency.",
    entityReference: {
      entityType: "P3Evidence",
      entityId: row._id,
      path: "/trainee/evidence",
    },
    eventId: `evidence:${row._id}:review:v${row.version}:${row.status}`,
    isSynthetic: row.isSynthetic,
    demoNamespace: row.demoNamespace,
  });
  return row;
}

async function assertDecisionScope(actor, evidence, claim, session) {
  if (id(evidence.owner) === id(actor))
    fail(409, "Users cannot decide their own competency");
  if (id(evidence.assignedReviewer) !== id(actor))
    fail(
      403,
      "Only the assigned evidence reviewer can make this competency decision",
    );
  const { batch } = await evidenceContext(evidence, session);
  if (!(await hasAction(actor._id, batch, "DECIDE_COMPETENCY", session)))
    fail(403, "Competency-decision scope is required for this batch");
  const expertise = await P3.P3TrainerExpertise.exists({
    trainer: actor._id,
    competency: claim.competency,
    frameworkVersion: claim.frameworkVersion,
    status: { $in: ["REVIEWED", "APPROVED"] },
    approvedLevel: { $gte: claim.targetLevel },
  }).session(session);
  if (!expertise)
    fail(
      403,
      "A reviewed subject-expertise assignment is required for this decision",
    );
}

async function recomputeRecord(trainee, competency, frameworkVersion, session) {
  const active = await P3.P3CompetencyDecision.find({
    trainee,
    competency,
    frameworkVersion,
    status: "ACTIVE",
  })
    .session(session)
    .lean();
  const current = await P2.P2CompetencyRecord.findOne({
    trainee,
    competency,
    frameworkVersion,
  })
    .session(session)
    .lean();
  const firstHistory = await P3.P3CompetencyHistory.findOne({
    trainee,
    competency,
    frameworkVersion,
  })
    .sort({ recordedAt: 1 })
    .session(session)
    .lean();
  const baselineLevel =
    firstHistory?.previousStatus === "DEMONSTRATED"
      ? firstHistory.previousLevel
      : current?.sourceType !== "PART3_REVIEW" &&
          current?.status === "DEMONSTRATED"
        ? current.demonstratedLevel
        : null;
  const demonstrated = active
    .filter((x) => x.outcome === "DEMONSTRATED" && x.demonstratedLevel != null)
    .sort((a, b) => b.demonstratedLevel - a.demonstratedLevel)[0];
  const latestPractice = active
    .filter((x) => x.outcome === "NEEDS_PRACTICE")
    .sort((a, b) => new Date(b.decidedAt) - new Date(a.decidedAt))[0];
  const source = demonstrated || latestPractice;
  const currentLevel =
    Math.max(baselineLevel || 0, demonstrated?.demonstratedLevel || 0) || null;
  return P2.P2CompetencyRecord.findOneAndUpdate(
    { trainee, competency, frameworkVersion },
    {
      $set: {
        demonstratedLevel: currentLevel,
        status: currentLevel
          ? "DEMONSTRATED"
          : latestPractice
            ? "NEEDS_PRACTICE"
            : "NOT_ASSESSED",
        sourceType: source
          ? "PART3_REVIEW"
          : currentLevel
            ? "HISTORICAL_REVIEW"
            : "NONE",
        sourceReference: source
          ? `P3CompetencyDecision:${source._id}`
          : currentLevel
            ? "Preserved historical reviewed level"
            : "",
        assessedAt: source?.decidedAt || current?.assessedAt || null,
        reviewer: source?.reviewer || current?.reviewer || null,
        notes:
          latestPractice && currentLevel
            ? `${latestPractice.reason} A valid lower demonstrated level remains recorded.`
            : source?.reason || current?.notes || "",
      },
    },
    { upsert: true, new: true, session, setDefaultsOnInsert: true },
  );
}

export async function decideCompetency(actor, evidenceId, data) {
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const evidence = await get(P3.P3Evidence, evidenceId, session);
      if (evidence.status !== "VERIFIED")
        fail(409, "Evidence must be verified before a competency decision");
      if (evidence.version !== data.evidenceVersion)
        fail(409, "Evidence version is stale");
      const claim = evidence.claimedCompetencies.find(
        (x) =>
          id(x.competency) === id(data.competency) &&
          x.frameworkVersion === data.frameworkVersion &&
          x.rubricVersion === data.rubricVersion,
      );
      if (!claim)
        fail(
          409,
          "The requested competency and rubric are not claimed by this evidence",
        );
      if (claim.targetLevel !== data.targetLevel)
        fail(409, "Decision target level must match the evidence claim");
      await assertDecisionScope(actor, evidence, claim, session);
      if (
        !data.criterionResults.length ||
        data.criterionResults.some((x) => typeof x.met !== "boolean")
      )
        fail(400, "Complete criterion results are required");
      const frameworkConfigured = (
        await P2.P2Competency.findById(data.competency).session(session)
      ).levels.some((level) => level.criteria?.length);
      if (
        data.outcome === "DEMONSTRATED" &&
        (!data.demonstratedLevel ||
          data.demonstratedLevel > data.targetLevel ||
          (!frameworkConfigured && data.criterionResults.some((x) => !x.met)))
      )
        fail(
          400,
          "A demonstrated decision requires complete criteria and a valid demonstrated level",
        );
      const framework = await get(P2.P2Competency, data.competency, session);
      validateCriterionDecision(
        framework.toObject(),
        data,
        evidence.evidenceType,
      );
      const key = data.idempotencyKey;
      const existing = await P3.P3CompetencyDecision.findOne({
        idempotencyKey: key,
      }).session(session);
      if (existing) {
        result = existing;
        return;
      }
      const previous = await P2.P2CompetencyRecord.findOne({
        trainee: evidence.owner,
        competency: data.competency,
        frameworkVersion: data.frameworkVersion,
      })
        .session(session)
        .lean();
      const [decision] = await P3.P3CompetencyDecision.create(
        [
          {
            trainee: evidence.owner,
            competency: data.competency,
            frameworkVersion: data.frameworkVersion,
            rubricVersion: data.rubricVersion,
            targetLevel: data.targetLevel,
            demonstratedLevel:
              data.outcome === "DEMONSTRATED" ? data.demonstratedLevel : null,
            outcome: data.outcome,
            criterionResults: data.criterionResults,
            evidence: evidence._id,
            evidenceVersion: evidence.version,
            evaluation: evidence.evaluation,
            reviewer: actor._id,
            decidedAt: new Date(),
            reason: data.reason,
            decisionVersion: 1,
            idempotencyKey: key,
            isSynthetic: evidence.isSynthetic,
            demoNamespace: evidence.demoNamespace,
          },
        ],
        { session, ordered: true },
      );
      const record = await recomputeRecord(
        evidence.owner,
        data.competency,
        data.frameworkVersion,
        session,
      );
      await P3.P3CompetencyHistory.create(
        [
          {
            trainee: evidence.owner,
            competency: data.competency,
            frameworkVersion: data.frameworkVersion,
            previousStatus: previous?.status || "NOT_ASSESSED",
            newStatus: record.status,
            previousLevel: previous?.demonstratedLevel ?? null,
            newLevel: record.demonstratedLevel,
            targetLevel: data.targetLevel,
            outcome: data.outcome,
            reason: data.reason,
            decision: decision._id,
            evidence: evidence._id,
            evidenceVersion: evidence.version,
            reviewer: actor._id,
            recordedAt: new Date(),
            isSynthetic: evidence.isSynthetic,
            demoNamespace: evidence.demoNamespace,
          },
        ],
        { session, ordered: true },
      );
      if (data.outcome === "NEEDS_PRACTICE") {
        const course = await P2.P2Course.findOne({
          status: "PUBLISHED",
          competencyOutcomes: {
            $elemMatch: {
              competency: data.competency,
              frameworkVersion: data.frameworkVersion,
            },
          },
        }).session(session);
        await P3.P3FollowUp.findOneAndUpdate(
          { sourceDecision: decision._id, actionType: "PRACTICE" },
          {
            $setOnInsert: {
              trainee: evidence.owner,
              sourceDecision: decision._id,
              competency: data.competency,
              goalLevel: data.targetLevel,
              actionType: "PRACTICE",
              recommendedAction:
                "Complete targeted practice and submit new task evidence for human review.",
              explanation:
                "The reviewed higher-level task needs further practice; any valid lower demonstrated level remains recorded.",
              recommendedCourse: course?._id,
              responsibleUser: actor._id,
              dueDate: data.followUpDueDate,
              status: "OPEN",
              comments: data.followUpComments || "",
              createdBy: actor._id,
              isSynthetic: evidence.isSynthetic,
              demoNamespace: evidence.demoNamespace,
            },
          },
          { upsert: true, new: true, session },
        );
      }
      await audit(
        {
          actor: actor._id,
          action: "COMPETENCY_DECIDED",
          entityType: "P3CompetencyDecision",
          entityId: decision._id,
          previousStatus: previous?.status || "NOT_ASSESSED",
          newStatus: record.status,
          changes: {
            evidence: evidence._id,
            evidenceVersion: evidence.version,
            outcome: data.outcome,
            previousLevel: previous?.demonstratedLevel ?? null,
            newLevel: record.demonstratedLevel,
            targetLevel: data.targetLevel,
          },
          reason: data.reason,
          isSynthetic: evidence.isSynthetic,
          demoNamespace: evidence.demoNamespace,
        },
        session,
      );
      result = decision;
    });
  } finally {
    await session.endSession();
  }
  await notify({
    recipient: result.trainee,
    type: "COMPETENCY_DECISION_RECORDED",
    title: "Competency review completed",
    message: `A human reviewer recorded ${result.outcome.toLowerCase().replace("_", " ")}.`,
    entityReference: {
      entityType: "P3CompetencyDecision",
      entityId: result._id,
      path: "/trainee/competency-history",
    },
    eventId: `competency-decision:${result._id}`,
    isSynthetic: result.isSynthetic,
    demoNamespace: result.demoNamespace,
  });
  return result;
}

export async function supersedeDecision(actor, decisionId, data) {
  const old = await get(P3.P3CompetencyDecision, decisionId);
  if (old.status !== "ACTIVE")
    fail(409, "Only an active decision can be corrected or revoked");
  const evidence = await get(P3.P3Evidence, old.evidence);
  const { batch } = await evidenceContext(evidence);
  if (!(await hasAction(actor._id, batch, "DECIDE_COMPETENCY")))
    fail(403, "Competency-decision scope is required");
  const claim = evidence.claimedCompetencies.find(
    (item) =>
      id(item.competency) === id(old.competency) &&
      item.frameworkVersion === old.frameworkVersion &&
      item.rubricVersion === old.rubricVersion,
  );
  if (!claim)
    fail(409, "The original competency mapping is no longer applicable");
  await assertDecisionScope(actor, evidence, claim);
  if (
    data.action === "CORRECT" &&
    (!data.outcome ||
      (data.outcome === "DEMONSTRATED" &&
        (!data.demonstratedLevel || data.demonstratedLevel > old.targetLevel)))
  )
    fail(400, "A correction requires a valid outcome and demonstrated level");
  const session = await mongoose.startSession();
  let record;
  try {
    await session.withTransaction(async () => {
      const previousRecord = await P2.P2CompetencyRecord.findOne({
        trainee: old.trainee,
        competency: old.competency,
        frameworkVersion: old.frameworkVersion,
      })
        .session(session)
        .lean();
      old.status = data.action === "REVOKE" ? "REVOKED" : "SUPERSEDED";
      await old.save({ session });
      let changeDecision;
      if (data.action === "CORRECT") {
        [changeDecision] = await P3.P3CompetencyDecision.create(
          [
            {
              ...old.toObject(),
              _id: undefined,
              status: "ACTIVE",
              supersedes: old._id,
              outcome: data.outcome,
              demonstratedLevel:
                data.outcome === "DEMONSTRATED" ? data.demonstratedLevel : null,
              reason: data.reason,
              decisionVersion: old.decisionVersion + 1,
              decidedAt: new Date(),
              reviewer: actor._id,
              idempotencyKey: data.idempotencyKey,
            },
          ],
          { session, ordered: true },
        );
      } else {
        [changeDecision] = await P3.P3CompetencyDecision.create(
          [
            {
              ...old.toObject(),
              _id: undefined,
              status: "REVOKED",
              supersedes: old._id,
              reason: data.reason,
              decisionVersion: old.decisionVersion + 1,
              decidedAt: new Date(),
              reviewer: actor._id,
              idempotencyKey: data.idempotencyKey,
            },
          ],
          { session, ordered: true },
        );
      }
      record = await recomputeRecord(
        old.trainee,
        old.competency,
        old.frameworkVersion,
        session,
      );
      await P3.P3CompetencyHistory.create(
        [
          {
            trainee: old.trainee,
            competency: old.competency,
            frameworkVersion: old.frameworkVersion,
            previousStatus: previousRecord?.status || "NOT_ASSESSED",
            newStatus: record.status,
            previousLevel: previousRecord?.demonstratedLevel ?? null,
            newLevel: record.demonstratedLevel,
            targetLevel: old.targetLevel,
            outcome: data.action === "REVOKE" ? "REVOKED" : data.outcome,
            eventType: data.action,
            reason: data.reason,
            decision: changeDecision._id,
            evidence: old.evidence,
            evidenceVersion: old.evidenceVersion,
            reviewer: actor._id,
            recordedAt: new Date(),
            isSynthetic: old.isSynthetic,
            demoNamespace: old.demoNamespace,
          },
        ],
        { session, ordered: true },
      );
      await audit(
        {
          actor: actor._id,
          action:
            data.action === "REVOKE"
              ? "COMPETENCY_DECISION_REVOKED"
              : "COMPETENCY_DECISION_CORRECTED",
          entityType: "P3CompetencyDecision",
          entityId: old._id,
          previousStatus: "ACTIVE",
          newStatus: old.status,
          changes: {
            recomputedStatus: record.status,
            recomputedLevel: record.demonstratedLevel,
          },
          reason: data.reason,
        },
        session,
      );
    });
  } finally {
    await session.endSession();
  }
  await notify({
    recipient: old.trainee,
    type: "COMPETENCY_DECISION_CHANGED",
    title: "Competency record updated",
    message:
      "A prior competency decision was corrected or revoked with retained history.",
    entityReference: {
      entityType: "P3CompetencyDecision",
      entityId: old._id,
      path: "/trainee/competency-history",
    },
    eventId: `competency-decision:${old._id}:${old.status}`,
  });
  return record;
}

export async function evidenceFor(actor, filters = {}) {
  const query = {};
  if (actor.role === "trainee") query.owner = actor._id;
  else if (actor.role === "trainer") query.assignedReviewer = actor._id;
  else if (filters.owner) query.owner = filters.owner;
  if (filters.status) query.status = filters.status;
  return P3.P3Evidence.find(query)
    .populate(
      "owner assignedReviewer claimedCompetencies.competency assessmentSubmission evaluation resultVersion privateResources",
    )
    .sort({ updatedAt: -1 })
    .limit(100)
    .lean();
}

export async function passportFor(actor, traineeId) {
  const trainee = traineeId || actor._id;
  if (actor.role !== "admin" && id(trainee) !== id(actor))
    fail(403, "You can only view your own competency passport");
  const [records, history, decisions, gaps, followUps] = await Promise.all([
    P2.P2CompetencyRecord.find({ trainee })
      .populate("competency reviewer")
      .lean(),
    P3.P3CompetencyHistory.find({ trainee })
      .populate("competency reviewer evidence")
      .sort({ recordedAt: -1 })
      .lean(),
    P3.P3CompetencyDecision.find({ trainee })
      .populate("competency reviewer evidence")
      .sort({ decidedAt: -1 })
      .lean(),
    gapsFor(trainee),
    P3.P3FollowUp.find({ trainee })
      .populate("competency recommendedCourse responsibleUser")
      .sort({ createdAt: -1 })
      .lean(),
  ]);
  return { records, history, decisions, gaps, followUps };
}

export async function recordWorkplaceEntry(actor, followUpId, data) {
  const session = await mongoose.startSession();
  let row;
  try {
    await session.withTransaction(async () => {
      row = await get(P3.P3FollowUp, followUpId, session);
      const allowed =
        data.type === "APPLICATION"
          ? id(row.trainee) === id(actor)
          : id(row.responsibleUser) === id(actor) &&
            id(row.trainee) !== id(actor);
      if (!allowed)
        fail(
          403,
          "Only the trainee can record application; only the assigned supervisor can record an observation",
        );
      if (row.workplaceEntries.some((x) => x.requestId === data.requestId))
        return;
      if (["COMPLETED", "CANCELLED"].includes(row.status))
        fail(409, "This follow-up is closed");
      if (
        data.evidence &&
        !(await P3.P3Evidence.exists({
          _id: data.evidence,
          owner: row.trainee,
        }).session(session))
      )
        fail(403, "Linked evidence must belong to the follow-up trainee");
      row.workplaceEntries.push({
        ...data,
        actor: actor._id,
        recordedAt: new Date(),
      });
      await row.save({ session });
      await audit(
        {
          actor: actor._id,
          action: "WORKPLACE_ENTRY_RECORDED",
          entityType: "P3FollowUp",
          entityId: row._id,
          changes: { type: data.type },
          reason:
            "Workplace record added; no competency verification performed",
          correlationId: data.requestId,
        },
        session,
      );
      const recipient =
        data.type === "APPLICATION" ? row.responsibleUser : row.trainee;
      if (recipient)
        await P2.P2Notification.create(
          [
            {
              recipient,
              type: "FOLLOW_UP_ENTRY",
              title: "Workplace follow-up updated",
              message:
                "An application record or supervisor observation is ready to review.",
              eventId: `follow-up:${row._id}:${data.requestId}`,
              entityReference: { entityType: "P3FollowUp", entityId: row._id },
            },
          ],
          { session, ordered: true },
        );
    });
    return row;
  } finally {
    await session.endSession();
  }
}

export async function updateFollowUp(actor, followUpId, data) {
  const row = await get(P3.P3FollowUp, followUpId);
  const allowed =
    actor.role === "admin" ||
    id(row.trainee) === id(actor) ||
    id(row.responsibleUser) === id(actor);
  if (!allowed) fail(403, "Follow-up access is not permitted");
  const transitions = {
    OPEN: ["IN_PROGRESS", "CANCELLED"],
    IN_PROGRESS: ["COMPLETED", "CANCELLED"],
    COMPLETED: [],
    CANCELLED: [],
  };
  if (!transitions[row.status].includes(data.status))
    fail(
      409,
      `Follow-up transition ${row.status} → ${data.status} is not allowed`,
    );
  const previous = row.status;
  row.status = data.status;
  row.comments = data.comments;
  row.history.push({
    from: previous,
    to: row.status,
    actor: actor._id,
    at: new Date(),
    reason: data.comments,
  });
  await row.save();
  await audit({
    actor: actor._id,
    action: "FOLLOW_UP_STATUS_CHANGED",
    entityType: "P3FollowUp",
    entityId: row._id,
    previousStatus: previous,
    newStatus: row.status,
    changes: {},
    reason: data.comments,
  });
  return row;
}

export async function capabilityReport(actor, filters = {}) {
  const users = await User.find({
    role: "trainee",
    accountStatus: "approved",
    ...(filters.department && { department: filters.department }),
  })
    .select("name department jobRole")
    .lean();
  const requirements = await P2.P2RoleRequirement.find(
    filters.competency ? { competency: filters.competency } : {},
  )
    .populate("competency jobRole")
    .lean();
  const records = await P2.P2CompetencyRecord.find({
    trainee: { $in: users.map((x) => x._id) },
  }).lean();
  const pending = await P3.P3Evidence.countDocuments({
    status: { $in: ["SUBMITTED", "UNDER_REVIEW"] },
    owner: { $in: users.map((x) => x._id) },
  });
  const demand = await P2.P2TrainingNeed.find({
    status: { $in: ["SUBMITTED", "RESUBMITTED", "UNDER_REVIEW", "APPROVED"] },
    beneficiary: { $in: users.map((user) => user._id) },
  })
    .select("competencyGoals")
    .lean();
  const now = new Date();
  const expertise = await P3.P3TrainerExpertise.aggregate([
    { $match: { status: { $in: ["REVIEWED", "APPROVED"] } } },
    { $group: { _id: "$competency", trainers: { $addToSet: "$trainer" } } },
  ]);
  const allTrainerIds = expertise.flatMap((item) => item.trainers);
  const availability =
    filters.start && filters.end
      ? await P3.P3TrainerAvailability.find({
          trainer: { $in: allTrainerIds },
          available: true,
          start: { $lte: new Date(filters.start) },
          end: { $gte: new Date(filters.end) },
        }).lean()
      : [];
  const coverage = requirements.map((requirement) => {
    const people = users.filter(
      (user) => id(user.jobRole) === id(requirement.jobRole),
    );
    const applicable = people.map((user) =>
      records.find(
        (record) =>
          id(record.trainee) === id(user) &&
          id(record.competency) === id(requirement.competency) &&
          record.frameworkVersion === requirement.competencyVersion,
      ),
    );
    const anyVersion = people.map((user) =>
      records.find(
        (record) =>
          id(record.trainee) === id(user) &&
          id(record.competency) === id(requirement.competency),
      ),
    );
    const meeting = applicable.filter(
      (record) =>
        record?.status === "DEMONSTRATED" &&
        record.demonstratedLevel >= requirement.requiredLevel,
    ).length;
    const below = applicable.filter(
      (record) =>
        record?.status === "DEMONSTRATED" &&
        record.demonstratedLevel != null &&
        record.demonstratedLevel < requirement.requiredLevel,
    ).length;
    const notComparable = applicable.filter(
      (record, index) => !record && anyVersion[index],
    ).length;
    const notAssessed = applicable.filter(
      (record, index) =>
        (!record && !anyVersion[index]) ||
        record?.status === "NOT_ASSESSED" ||
        record?.status === "NEEDS_PRACTICE",
    ).length;
    const reviewDue = applicable.filter(
      (record) => record?.reviewDueAt && new Date(record.reviewDueAt) < now,
    ).length;
    const reviewedTrainers =
      expertise.find((x) => id(x._id) === id(requirement.competency))
        ?.trainers || [];
    const availableTrainers =
      filters.start && filters.end
        ? reviewedTrainers.filter((trainer) =>
            availability.some((window) => id(window.trainer) === id(trainer)),
          ).length
        : null;
    return {
      competency: requirement.competency,
      jobRole: requirement.jobRole,
      requiredLevel: requirement.requiredLevel,
      frameworkVersion: requirement.competencyVersion,
      denominator: people.length,
      meetingCount: meeting,
      belowRequiredCount: below,
      notAssessedCount: notAssessed,
      notComparableCount: notComparable,
      reviewDueCount: reviewDue,
      pendingTrainingDemand: demand.filter((need) =>
        need.competencyGoals.some(
          (goal) => id(goal) === id(requirement.competency),
        ),
      ).length,
      reviewedTrainerCount: reviewedTrainers.length,
      availableTrainerCount: availableTrainers,
      coveragePercent: people.length
        ? Number(((meeting / people.length) * 100).toFixed(1))
        : null,
      definition:
        "Active approved trainees with valid compatible demonstrated evidence meeting the requirement / active approved trainees for whom the competency is required.",
    };
  });
  const minCoverage = Number(
    process.env.CAPABILITY_EVIDENCE_THRESHOLD_PERCENT || 70,
  );
  const risks = [];
  for (const item of coverage) {
    if (item.denominator && item.coveragePercent < minCoverage)
      risks.push({
        scope: item.competency.name,
        indicator: "Insufficient evidence coverage",
        counts: { meeting: item.meetingCount, denominator: item.denominator },
        threshold: `${minCoverage}% application threshold`,
        reason:
          "Recorded applicable evidence meeting the requirement is below the configured coverage threshold.",
        timeWindow: "Current records",
        suggestedAction:
          "Prioritize assessment or evidence review; do not infer zero ability.",
      });
    const trainers = item.reviewedTrainerCount;
    if (trainers <= 1)
      risks.push({
        scope: item.competency.name,
        indicator: trainers
          ? "Single-trainer dependency in recorded eligible profiles"
          : "No eligible trainer recorded",
        counts: { reviewedEligibleProfiles: trainers },
        threshold: "At most one reviewed eligible profile",
        reason:
          "This indicator uses reviewed trainer profiles and remains separate from trainee competency coverage.",
        timeWindow:
          filters.start && filters.end
            ? `${filters.start} to ${filters.end}`
            : "No availability window selected",
        suggestedAction: "Review trainer expertise and availability records.",
      });
    if (filters.start && filters.end && item.availableTrainerCount < 1)
      risks.push({
        scope: item.competency.name,
        indicator: "Insufficient available trainers for the selected period",
        counts: {
          availableReviewedProfiles: item.availableTrainerCount,
          reviewedProfiles: trainers,
        },
        threshold: "At least one recorded available reviewed profile",
        reason:
          "No reviewed trainer profile has a confirmed availability window covering the selected dates.",
        timeWindow: `${filters.start} to ${filters.end}`,
        suggestedAction:
          "Refresh availability or identify an eligible replacement; do not relax mandatory criteria.",
      });
  }
  return {
    scope: {
      department: filters.department || "All authorized departments",
      competency: filters.competency || "All configured requirements",
    },
    calculatedAt: now,
    pendingReviewCount: pending,
    coverage,
    risks,
    label: "Application-level analytical indicators — proposed rules",
  };
}

async function recordAI(actor, feature, sourceReferenceIds, result, error) {
  return P3.P3AIRequestMetadata.create({
    actor: actor._id,
    feature,
    provider: result?.provider || aiSettings().provider,
    model: result?.model || aiSettings().model,
    sourceReferenceIds,
    outcome: result
      ? "SUCCEEDED"
      : error?.status === 503
        ? "DISABLED"
        : error?.name === "AIOutputValidationError"
          ? "INVALID_OUTPUT"
          : "FAILED",
    errorType: error ? error.name || "PROVIDER_ERROR" : "",
    requestId: result?.requestId || crypto.randomUUID(),
  });
}
export async function aiAssist(actor, feature, input) {
  const settings = aiSettings();
  const since = new Date(Date.now() - 60 * 60 * 1000);
  if (
    (await P3.P3AIRequestMetadata.countDocuments({
      actor: actor._id,
      feature,
      createdAt: { $gte: since },
    })) >= settings.maxRequests
  )
    fail(429, "AI request limit reached. Manual workflows remain available.");
  try {
    const result = await requestStructuredAI(feature, input);
    const metadata = await recordAI(
      actor,
      feature,
      input.sourceReferenceIds || [],
      result,
    );
    return {
      ...result.output,
      requestId: metadata.requestId,
      disclaimer:
        "AI suggestions require human review and do not establish expertise or competency.",
    };
  } catch (error) {
    await recordAI(actor, feature, input.sourceReferenceIds || [], null, error);
    throw error;
  }
}
export async function deterministicCompetencyMatch(text) {
  const terms = text
    .toLowerCase()
    .split(/\W+/)
    .filter((x) => x.length > 2);
  const catalogue = await P2.P2Competency.find({ status: "PUBLISHED" }).lean();
  return catalogue
    .map((competency) => ({
      competency,
      score: terms.filter((term) =>
        `${competency.name} ${competency.description} ${competency.domain}`
          .toLowerCase()
          .includes(term),
      ).length,
    }))
    .filter((x) => x.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || a.competency.code.localeCompare(b.competency.code),
    )
    .slice(0, 10)
    .map((x) => ({
      suggestedCompetency: x.competency,
      sourcePhrase: text.slice(0, 200),
      explanation: `${x.score} catalogue term match${x.score === 1 ? "" : "es"}; human confirmation required.`,
      uncertainty: x.score > 2 ? "MEDIUM" : "HIGH",
    }));
}

// Achievements are learning milestones derived from stored records. They are
// deliberately separate from completion certificates and never substitute for a
// verified competency decision.
export async function achievementsFor(user, filters = {}) {
  const traineeId = user.role === "trainee" ? user._id : filters.trainee;
  if (!traineeId) fail(400, "A trainee is required");

  const [certificates, records, history, results, verifications] =
    await Promise.all([
      P3.P3CompletionCertificate.find({
        trainee: traineeId,
        status: "ISSUED",
      }).lean(),
      P2.P2CompetencyRecord.find({
        trainee: traineeId,
        status: "DEMONSTRATED",
      })
        .populate("competency", "name code")
        .lean(),
      P3.P3CompetencyHistory.find({
        trainee: traineeId,
        newLevel: { $ne: null },
      })
        .populate("competency", "name code")
        .lean(),
      P3.P3ResultVersion.find({
        trainee: traineeId,
        status: "PUBLISHED",
        outcome: "PASS",
      }).lean(),
      P3.P3TTTVerification.find({
        candidate: traineeId,
        outcome: "VERIFIED",
      })
        .populate("competency", "name code")
        .lean(),
    ]);

  const items = [
    ...certificates.map((c) => ({
      key: `certificate:${c._id}`,
      title: "Certificate earned",
      description: `${c.courseTitle || "Course"} completion certificate issued`,
      achievedAt: c.completedAt || c.createdAt,
      tone: "teal",
      sourceType: "P3CompletionCertificate",
      sourceId: c._id,
    })),
    ...records.map((r) => ({
      key: `competency:${r._id}`,
      title: "Competency demonstrated",
      description: `${r.competency?.name || "Competency"} demonstrated at L${r.demonstratedLevel}`,
      achievedAt: r.assessedAt || r.updatedAt,
      tone: "teal",
      sourceType: "P2CompetencyRecord",
      sourceId: r._id,
    })),
    ...history.map((h) => ({
      key: `levelup:${h._id}`,
      title: "New level achieved",
      description: `${h.competency?.name || "Competency"} moved to L${h.newLevel}`,
      achievedAt: h.recordedAt,
      tone: "blue",
      sourceType: "P3CompetencyHistory",
      sourceId: h._id,
    })),
    ...results.map((r) => ({
      key: `result:${r._id}`,
      title: "Assessment passed",
      description: `Published assessment result: PASS${r.percentage != null ? ` (${r.percentage}%)` : ""}`,
      achievedAt: r.publishedAt,
      tone: "blue",
      sourceType: "P3ResultVersion",
      sourceId: r._id,
    })),
    ...verifications.map((v) => ({
      key: `ttt:${v._id}`,
      title: "Verified as trainer",
      description: `Verified to deliver ${v.competency?.name || "competency"} at L${v.targetLevel}`,
      achievedAt: v.verifiedAt,
      tone: "teal",
      sourceType: "P3TTTVerification",
      sourceId: v._id,
    })),
  ];

  return {
    items: items
      .filter((x) => x.achievedAt)
      .sort((a, b) => new Date(b.achievedAt) - new Date(a.achievedAt)),
    label:
      "Learning milestones derived from stored records. Separate from completion certificates and from verified competency.",
  };
}
