import crypto from "node:crypto";
import mongoose from "mongoose";
import { HttpError } from "../middleware/errorHandler.js";
import * as M from "../models/Part2.js";

const id = (value) => String(value?._id || value || "");
const fail = (status, message) => {
  throw new HttpError(status, message);
};
const now = () => new Date();
const correlation = () => crypto.randomUUID();

export async function gapsFor(traineeId) {
  const user = await mongoose.model("User").findById(traineeId).lean();
  if (!user) fail(404, "User not found");
  if (!user.jobRole) return [];
  const requirements = await M.P2RoleRequirement.find({ jobRole: user.jobRole })
    .populate("competency")
    .sort({ priority: -1 })
    .lean();
  const records = await M.P2CompetencyRecord.find({
    trainee: traineeId,
  }).lean();
  return requirements
    .map((requirement) => {
      const record = records
        .filter((item) => id(item.competency) === id(requirement.competency))
        .sort(
          (a, b) => new Date(b.assessedAt || 0) - new Date(a.assessedAt || 0),
        )[0];
      const base = {
        competency: requirement.competency,
        frameworkVersion: requirement.competencyVersion,
        requiredLevel: requirement.requiredLevel,
        demonstratedLevel: record?.demonstratedLevel ?? null,
        evidenceStatus: record?.status || "NOT_ASSESSED",
        sourceType: record?.sourceType || "NONE",
        assessedAt: record?.assessedAt || null,
      };
      if (!record || record.status === "NOT_ASSESSED")
        return {
          ...base,
          gap: null,
          category: "NOT_ASSESSED",
          explanation: "No reviewed evidence is recorded for this requirement.",
          nextAction: "Assessment or evidence required",
        };
      if (record.frameworkVersion !== requirement.competencyVersion)
        return {
          ...base,
          gap: null,
          category: "NOT_COMPARABLE",
          explanation: `Recorded framework version ${record.frameworkVersion} is not compatible with required version ${requirement.competencyVersion}.`,
          nextAction: "Review framework compatibility",
        };
      if (record.status !== "DEMONSTRATED" || record.demonstratedLevel == null)
        return {
          ...base,
          gap: null,
          category: record.status,
          explanation:
            "A pending or needs-practice record does not establish a demonstrated level.",
          nextAction: "Assessment or evidence required",
        };
      const gap = Math.max(
        0,
        requirement.requiredLevel - record.demonstratedLevel,
      );
      return {
        ...base,
        gap,
        category:
          gap === 0
            ? "REQUIREMENT_MET"
            : gap === 1
              ? "ONE_LEVEL_GAP"
              : gap === 2
                ? "TWO_LEVEL_GAP"
                : "THREE_OR_MORE_LEVEL_GAP",
        explanation:
          gap === 0
            ? "The reviewed demonstrated level meets this proposed role requirement."
            : `The reviewed demonstrated level is ${gap} level${gap === 1 ? "" : "s"} below this proposed requirement.`,
        nextAction:
          gap === 0 ? "Keep evidence current" : "Create training need",
      };
    })
    .sort((a, b) => {
      const order = {
        THREE_OR_MORE_LEVEL_GAP: 0,
        TWO_LEVEL_GAP: 1,
        ONE_LEVEL_GAP: 2,
        NOT_COMPARABLE: 3,
        NOT_ASSESSED: 4,
        REQUIREMENT_MET: 5,
      };
      return (order[a.category] ?? 9) - (order[b.category] ?? 9);
    });
}

export async function checkEligibility({ traineeId, batchId, session = null }) {
  const batch = await M.P2Batch.findById(batchId).session(session).lean();
  if (!batch) fail(404, "Batch not found");
  const [course, rules, user] = await Promise.all([
    M.P2Course.findById(batch.course).session(session).lean(),
    M.P2CourseRuleVersion.findById(batch.ruleVersion).session(session).lean(),
    mongoose.model("User").findById(traineeId).session(session).lean(),
  ]);
  if (!course || !rules || !user) fail(404, "Eligibility context not found");
  const checks = [],
    blockingReasons = [],
    missingInformation = [];
  for (const rule of rules.eligibilityRules || []) {
    let outcome = "PASS",
      explanation = rule.explanation || "Requirement satisfied",
      sourceReference = "profile";
    if (rule.type === "JOB_ROLE" && id(user.jobRole) !== id(rule.value)) {
      outcome = user.jobRole ? "FAIL" : "MISSING";
      explanation = user.jobRole
        ? "Your current job role does not match this rule."
        : "Add a job role to your profile.";
    }
    if (rule.type === "DEPARTMENT" && user.department !== rule.value) {
      outcome = user.department ? "FAIL" : "MISSING";
      explanation = user.department
        ? "Your department does not match this rule."
        : "Department information is required.";
    }
    if (rule.type === "DESIGNATION" && !user.designation) {
      outcome = "MISSING";
      explanation = "Designation information is required.";
    }
    if (rule.type === "COURSE_COMPLETION") {
      const found = await M.P2CourseCompletion.exists({
        trainee: traineeId,
        course: rule.value,
      }).session(session);
      outcome = found ? "PASS" : "MISSING";
      explanation = found
        ? "A recorded historical completion was found."
        : "A prerequisite completion record is required.";
      sourceReference = "historical-course-completion";
    }
    if (rule.type === "DEMONSTRATED_COMPETENCY") {
      const found = await M.P2CompetencyRecord.findOne({
        trainee: traineeId,
        competency: rule.value.competency,
        frameworkVersion: rule.value.frameworkVersion,
        status: "DEMONSTRATED",
        demonstratedLevel: { $gte: rule.value.minimumLevel },
      })
        .session(session)
        .lean();
      outcome = found ? "PASS" : "MISSING";
      explanation = found
        ? "Compatible reviewed evidence meets the required level."
        : "Compatible reviewed competency evidence is required.";
      sourceReference = found
        ? `competency-record:${found._id}`
        : "competency-record";
    }
    if (outcome === "FAIL") blockingReasons.push(explanation);
    if (outcome === "MISSING") missingInformation.push(explanation);
    checks.push({ rule: rule.type, outcome, explanation, sourceReference });
  }
  if (rules.requiresApprovedTrainingNeed) {
    const found = await M.P2TrainingNeed.exists({
      beneficiary: traineeId,
      status: "APPROVED",
      competencyGoals: {
        $in: course.competencyOutcomes.map((x) => x.competency),
      },
    }).session(session);
    const explanation = found
      ? "An approved relevant training need was found."
      : "An approved relevant training need is required.";
    checks.push({
      rule: "APPROVED_TRAINING_NEED",
      outcome: found ? "PASS" : "MISSING",
      explanation,
      sourceReference: "training-need",
    });
    if (!found) missingInformation.push(explanation);
  }
  const status = blockingReasons.length
    ? "INELIGIBLE"
    : missingInformation.length
      ? "NEEDS_INFORMATION"
      : "ELIGIBLE";
  return {
    status,
    ruleVersion: rules.version,
    checkedAt: now(),
    checks,
    blockingReasons,
    missingInformation,
    allowIncompleteForReview: rules.allowIncompleteForReview,
  };
}

export const needTransitions = {
  DRAFT: ["SUBMITTED", "WITHDRAWN"],
  SUBMITTED: ["UNDER_REVIEW", "WITHDRAWN"],
  UNDER_REVIEW: ["APPROVED", "RETURNED", "REJECTED"],
  RETURNED: ["RESUBMITTED", "WITHDRAWN"],
  RESUBMITTED: ["UNDER_REVIEW", "WITHDRAWN"],
  APPROVED: ["CLOSED", "WITHDRAWN"],
};
export const nominationTransitions = {
  DRAFT: ["SUBMITTED", "WITHDRAWN"],
  SUBMITTED: ["UNDER_REVIEW", "WITHDRAWN"],
  UNDER_REVIEW: ["RETURNED", "APPROVED", "WAITLISTED", "REJECTED"],
  RETURNED: ["RESUBMITTED", "WITHDRAWN"],
  RESUBMITTED: ["UNDER_REVIEW", "WITHDRAWN"],
  WAITLISTED: ["APPROVED", "REJECTED", "WITHDRAWN"],
  APPROVED: ["ADMISSION_CANCELLED"],
};
export function assertTransition(map, from, to) {
  if (!map[from]?.includes(to))
    fail(409, `Transition ${from} → ${to} is not allowed`);
}

async function audit(data, session) {
  return M.P2AuditLog.create(
    [{ ...data, correlationId: data.correlationId || correlation() }],
    { session },
  );
}
export async function recordAudit(data) {
  return audit(data);
}
export async function notify(data) {
  return M.P2Notification.updateOne(
    { recipient: data.recipient, eventId: data.eventId },
    { $setOnInsert: data },
    { upsert: true },
  );
}

export async function approveNomination({
  nominationId,
  expectedRevision,
  actor,
  reason,
}) {
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const nomination =
        await M.P2Nomination.findById(nominationId).session(session);
      if (!nomination) fail(404, "Nomination not found");
      if (!["UNDER_REVIEW", "WAITLISTED"].includes(nomination.status))
        fail(409, "Nomination is not awaiting an admission decision");
      if (nomination.revision !== expectedRevision)
        fail(409, "This decision is stale. Refresh and try again.");
      const eligibility = await checkEligibility({
        traineeId: nomination.trainee,
        batchId: nomination.batch,
        session,
      });
      if (eligibility.status !== "ELIGIBLE")
        fail(
          409,
          `Admission requires ELIGIBLE status. Current status: ${eligibility.status}`,
        );
      const batch = await M.P2Batch.findOneAndUpdate(
        {
          _id: nomination.batch,
          status: { $in: ["OPEN", "CLOSED"] },
          $expr: { $lt: ["$seatsAllocated", "$capacity"] },
        },
        { $inc: { seatsAllocated: 1, revision: 1 } },
        { new: true, session },
      );
      if (!batch)
        fail(409, "No seat is available or the batch cannot accept admission");
      const enrollment = await M.P2Enrollment.findOneAndUpdate(
        { trainee: nomination.trainee, batch: nomination.batch },
        {
          $setOnInsert: {
            nomination: nomination._id,
            admittedBy: actor._id,
            admittedAt: now(),
            ...(nomination.isSynthetic && {
              isSynthetic: true,
              demoNamespace: nomination.demoNamespace,
            }),
          },
          $set: {
            status: "CONFIRMED",
            cancelledAt: null,
            cancellationReason: null,
          },
        },
        { upsert: true, new: true, session },
      );
      const previousStatus = nomination.status;
      nomination.status = "APPROVED";
      nomination.reviewedAt = now();
      nomination.reviewedBy = actor._id;
      nomination.decisionReason = reason;
      nomination.eligibilitySnapshot = eligibility;
      nomination.revision += 1;
      nomination.history.push({
        from: previousStatus,
        to: "APPROVED",
        actor: actor._id,
        at: now(),
        reason,
      });
      await nomination.save({ session });
      await audit(
        {
          actor: actor._id,
          action: "NOMINATION_APPROVED_AND_SEAT_ALLOCATED",
          entityType: "Nomination",
          entityId: nomination._id,
          previousStatus,
          newStatus: "APPROVED",
          changes: {
            enrollment: enrollment._id,
            seatsAllocated: batch.seatsAllocated,
          },
          reason,
          isSynthetic: nomination.isSynthetic,
          demoNamespace: nomination.demoNamespace,
        },
        session,
      );
      result = { nomination, enrollment, batch };
    });
  } finally {
    await session.endSession();
  }
  await notify({
    recipient: result.nomination.trainee,
    type: "ADMISSION_CONFIRMED",
    title: "Admission confirmed",
    message: "Your nomination was approved and a seat was allocated.",
    entityReference: {
      entityType: "Nomination",
      entityId: result.nomination._id,
      path: `/trainee/nominations/${result.nomination._id}`,
    },
    eventId: `nomination:${result.nomination._id}:approved:${result.nomination.revision}`,
    isSynthetic: result.nomination.isSynthetic,
    demoNamespace: result.nomination.demoNamespace,
  });
  return result;
}

export async function cancelAdmission({ nominationId, actor, reason }) {
  const session = await mongoose.startSession();
  let nomination;
  try {
    await session.withTransaction(async () => {
      nomination = await M.P2Nomination.findOne({
        _id: nominationId,
        status: "APPROVED",
      }).session(session);
      if (!nomination) fail(409, "Admission is not active");
      const enrollment = await M.P2Enrollment.findOneAndUpdate(
        { nomination: nomination._id, status: "CONFIRMED" },
        {
          status: "CANCELLED",
          cancelledBy: actor._id,
          cancelledAt: now(),
          cancellationReason: reason,
        },
        { new: true, session },
      );
      if (!enrollment) fail(409, "Admission was already cancelled");
      await M.P2Batch.updateOne(
        { _id: nomination.batch, seatsAllocated: { $gt: 0 } },
        { $inc: { seatsAllocated: -1, revision: 1 } },
        { session },
      );
      nomination.status = "ADMISSION_CANCELLED";
      nomination.revision += 1;
      nomination.history.push({
        from: "APPROVED",
        to: "ADMISSION_CANCELLED",
        actor: actor._id,
        at: now(),
        reason,
      });
      await nomination.save({ session });
      await audit(
        {
          actor: actor._id,
          action: "ADMISSION_CANCELLED",
          entityType: "Nomination",
          entityId: nomination._id,
          previousStatus: "APPROVED",
          newStatus: "ADMISSION_CANCELLED",
          changes: {},
          reason,
        },
        session,
      );
    });
  } finally {
    await session.endSession();
  }
  return nomination;
}
