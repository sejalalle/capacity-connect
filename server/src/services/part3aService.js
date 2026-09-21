import crypto from "node:crypto";
import mongoose from "mongoose";
import User from "../models/User.js";
import * as P2 from "../models/Part2.js";
import * as P3 from "../models/Part3.js";
import { HttpError } from "../middleware/errorHandler.js";
import { recordPart3Audit, requirePermission } from "./part3Service.js";

const fail = (status, message) => {
  throw new HttpError(status, message);
};
const id = (value) => String(value?._id || value || "");
const same = (a, b) => id(a) === id(b);
const now = () => new Date();
const get = async (Model, value, session = null) => {
  const row = await Model.findById(value).session(session);
  if (!row) fail(404, `${Model.modelName} not found`);
  return row;
};
const notify = (recipient, type, title, message, entityType, entityId, path) =>
  P2.P2Notification.updateOne(
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

export const SUITABILITY_VERSION = "PROPOSED-3A-SUITABILITY-v1";
export const DEFAULT_WEIGHTS = Object.freeze({
  competencyMatch: 35,
  proficiency: 20,
  qualification: 10,
  relevantExperience: 10,
  teachingExperience: 10,
  domainRelevance: 10,
  availabilityFit: 5,
});

export async function ensureSuitabilityConfig(actor) {
  return P3.P3SuitabilityConfig.findOneAndUpdate(
    { version: SUITABILITY_VERSION },
    {
      $setOnInsert: {
        version: SUITABILITY_VERSION,
        weights: DEFAULT_WEIGHTS,
        active: true,
        createdBy: actor._id,
        isSynthetic: true,
        demoNamespace: "samarthya-part2-v1",
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

export async function saveTrainerProfile(actor, data) {
  if (actor.role !== "trainer") fail(403, "Trainer access required");
  const previous = await P3.P3TrainerProfile.findOne({ trainer: actor._id });
  const profile = await P3.P3TrainerProfile.findOneAndUpdate(
    { trainer: actor._id },
    {
      $set: {
        professionalExperienceYears: data.professionalExperienceYears,
        teachingExperienceYears: data.teachingExperienceYears,
        domains: data.domains,
        deliveryModes: data.deliveryModes,
        locations: data.locations,
        reviewStatus: "SELF_DECLARED",
        reviewedBy: null,
        reviewedAt: null,
        reviewReason: "",
      },
      $setOnInsert: { trainer: actor._id },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  await recordPart3Audit(
    actor,
    "TRAINER_PROFILE_UPDATED",
    profile,
    "Trainer updated self-declared profile",
    { previousReviewStatus: previous?.reviewStatus || null },
  );
  return profile;
}

export async function submitExpertise(actor, data) {
  if (actor.role !== "trainer") fail(403, "Trainer access required");
  const competency = await get(P2.P2Competency, data.competency);
  if (competency.version !== data.frameworkVersion)
    fail(409, "Framework version does not match the selected competency");
  const expertise = await P3.P3TrainerExpertise.findOneAndUpdate(
    {
      trainer: actor._id,
      competency: competency._id,
      frameworkVersion: data.frameworkVersion,
    },
    {
      $set: {
        claimedLevel: data.claimedLevel,
        approvedLevel: null,
        qualifications: data.qualifications,
        domains: data.domains,
        relevantExperienceYears: data.relevantExperienceYears,
        teachingYears: data.teachingYears,
        supportingResources: data.supportingResources,
        status: "PENDING_REVIEW",
        reviewedBy: null,
        reviewedAt: null,
        reviewBasis: "",
      },
      $setOnInsert: { trainer: actor._id },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  expertise.reviewHistory.push({
    status: "PENDING_REVIEW",
    actor: actor._id,
    at: now(),
    reason: "Submitted for coordinator review",
    source: "SELF_DECLARATION",
  });
  await expertise.save();
  await recordPart3Audit(
    actor,
    "TRAINER_EXPERTISE_SUBMITTED",
    expertise,
    "Submitted for coordinator review",
  );
  return expertise;
}

export async function reviewExpertise(actor, expertiseId, data) {
  if (actor.role !== "admin") fail(403, "Coordinator permission required");
  const expertise = await get(P3.P3TrainerExpertise, expertiseId);
  if (expertise.status !== "PENDING_REVIEW")
    fail(409, "Only pending expertise can be reviewed");
  expertise.status = data.status;
  expertise.approvedLevel =
    data.status === "REVIEWED" ? data.approvedLevel : null;
  expertise.reviewedBy = actor._id;
  expertise.reviewedAt = now();
  expertise.reviewBasis = data.reason;
  expertise.reviewHistory.push({
    status: data.status,
    actor: actor._id,
    at: expertise.reviewedAt,
    reason: data.reason,
    source: data.source,
  });
  await expertise.save();
  await recordPart3Audit(
    actor,
    "TRAINER_EXPERTISE_REVIEWED",
    expertise,
    data.reason,
    {
      status: data.status,
      source: data.source,
    },
  );
  await notify(
    expertise.trainer,
    "TRAINER_EXPERTISE_REVIEWED",
    "Expertise review completed",
    `Your expertise submission is ${data.status.toLowerCase().replaceAll("_", " ")}.`,
    "P3TrainerExpertise",
    expertise._id,
    "/trainer/expertise",
  );
  return expertise;
}

export async function addAvailability(actor, data) {
  if (actor.role !== "trainer") fail(403, "Trainer access required");
  if (data.end <= data.start) fail(400, "Availability end must be after start");
  const row = await P3.P3TrainerAvailability.findOneAndUpdate(
    { trainer: actor._id, start: data.start, end: data.end },
    {
      $set: {
        available: data.available,
        reason: data.reason,
        deliveryModes: data.deliveryModes,
        locations: data.locations,
        preferenceScore: data.preferenceScore,
        createdBy: actor._id,
      },
      $inc: { revision: 1 },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  if (!data.available) {
    const affected = await P3.P3TrainerAssignment.find({
      trainer: actor._id,
      status: "ACTIVE",
      start: { $lt: data.end },
      end: { $gt: data.start },
    });
    for (const assignment of affected) {
      assignment.status = "UNAVAILABLE";
      assignment.history.push({
        status: "UNAVAILABLE",
        actor: actor._id,
        at: now(),
        reason: data.reason,
      });
      await assignment.save();
      const admins = await User.find({
        role: "admin",
        accountStatus: "approved",
      }).select("_id");
      await Promise.all(
        admins.map((admin) =>
          notify(
            admin._id,
            "TRAINER_UNAVAILABLE",
            "Trainer assignment needs review",
            "An assigned trainer became unavailable. Refresh suitability before approving a replacement.",
            "P3TrainerAssignment",
            assignment._id,
            "/admin/trainer-assignments",
          ),
        ),
      );
    }
  }
  await recordPart3Audit(
    actor,
    "TRAINER_AVAILABILITY_UPDATED",
    row,
    data.reason,
    {
      available: data.available,
    },
  );
  return row;
}

const factor = (key, normalized, weight, source, missingBehavior, cap = 1) => ({
  key,
  source,
  normalized: Math.max(0, Math.min(cap, normalized)),
  cap,
  missingDataBehavior: missingBehavior,
  weight,
  contribution: Number(
    (Math.max(0, Math.min(cap, normalized)) * weight).toFixed(2),
  ),
});

export async function calculateSuitability(
  batchId,
  sessionId,
  dbSession = null,
) {
  const batch = await P2.P2Batch.findById(batchId).session(dbSession).lean();
  if (!batch) fail(404, "Batch not found");
  const sessionRow = batch.sessions?.find((item) => same(item._id, sessionId));
  if (!sessionRow) fail(404, "Batch session not found");
  const config = await P3.P3SuitabilityConfig.findOne({ active: true })
    .sort({ createdAt: -1 })
    .session(dbSession)
    .lean();
  if (!config) fail(409, "Suitability configuration is unavailable");
  const trainers = await User.find({ role: "trainer" })
    .select("name accountStatus qualifications workExperience")
    .session(dbSession)
    .lean();
  const calculatedAt = now();
  const results = [];
  for (const trainer of trainers) {
    const [profile, expertise, windows, conflict] = await Promise.all([
      P3.P3TrainerProfile.findOne({ trainer: trainer._id })
        .session(dbSession)
        .lean(),
      sessionRow.competency
        ? P3.P3TrainerExpertise.findOne({
            trainer: trainer._id,
            competency: sessionRow.competency,
            frameworkVersion: sessionRow.frameworkVersion || 1,
            status: { $in: ["REVIEWED", "APPROVED"] },
          })
            .session(dbSession)
            .lean()
        : null,
      P3.P3TrainerAvailability.find({
        trainer: trainer._id,
        start: { $lte: sessionRow.start },
        end: { $gte: sessionRow.end },
      })
        .session(dbSession)
        .lean(),
      P3.P3TrainerAssignment.exists({
        trainer: trainer._id,
        status: "ACTIVE",
        start: { $lt: sessionRow.end },
        end: { $gt: sessionRow.start },
        $or: [
          { batch: { $ne: batch._id } },
          { sessionId: { $ne: sessionRow._id } },
        ],
      }).session(dbSession),
    ]);
    const availableWindow = windows.find((window) => window.available);
    const unavailableWindow = windows.find((window) => !window.available);
    const requiredQualifications = sessionRow.requiredQualifications || [];
    const qualifications =
      expertise?.qualifications || trainer.qualifications || [];
    const qualificationMatches = requiredQualifications.filter((required) =>
      qualifications.some((value) =>
        value.toLowerCase().includes(required.toLowerCase()),
      ),
    ).length;
    const requiredLevel = sessionRow.requiredProficiency || 1;
    const deliveryKnown = Boolean(profile?.deliveryModes?.length);
    const deliveryMatch = profile?.deliveryModes?.includes(batch.deliveryMode);
    const locationRequired =
      batch.deliveryMode !== "ONLINE" && Boolean(batch.location);
    const locationKnown =
      !locationRequired || Boolean(profile?.locations?.length);
    const locationMatch =
      !locationRequired || profile?.locations?.includes(batch.location);
    const checks = [
      {
        key: "ACTIVE_ACCOUNT",
        outcome: trainer.accountStatus === "approved" ? "PASS" : "FAIL",
        explanation:
          trainer.accountStatus === "approved"
            ? "Approved active trainer account."
            : "Trainer account is not approved and active.",
      },
      {
        key: "REVIEWED_EXPERTISE",
        outcome: expertise ? "PASS" : "UNKNOWN",
        explanation: expertise
          ? "Reviewed expertise matches the competency and framework version."
          : "Reviewed matching expertise is missing.",
      },
      {
        key: "QUALIFICATION",
        outcome: !requiredQualifications.length
          ? "PASS"
          : !qualifications.length
            ? "UNKNOWN"
            : qualificationMatches === requiredQualifications.length
              ? "PASS"
              : "FAIL",
        explanation: !requiredQualifications.length
          ? "No mandatory qualification is configured."
          : `${qualificationMatches} of ${requiredQualifications.length} required qualifications matched.`,
      },
      {
        key: "PROFICIENCY",
        outcome: !expertise
          ? "UNKNOWN"
          : expertise.approvedLevel >= requiredLevel
            ? "PASS"
            : "FAIL",
        explanation: expertise
          ? `Reviewed level ${expertise.approvedLevel}; required level ${requiredLevel}.`
          : "Reviewed proficiency is unavailable.",
      },
      {
        key: "AVAILABILITY",
        outcome: availableWindow
          ? "PASS"
          : unavailableWindow
            ? "FAIL"
            : "UNKNOWN",
        explanation: availableWindow
          ? "Confirmed availability covers the complete session."
          : unavailableWindow
            ? "Trainer recorded unavailability for the session."
            : "Availability has not been confirmed for the complete session.",
      },
      {
        key: "NO_CONFLICT",
        outcome: conflict ? "FAIL" : "PASS",
        explanation: conflict
          ? "A conflicting active assignment exists."
          : "No conflicting active assignment was found.",
      },
      {
        key: "DELIVERY_COMPATIBILITY",
        outcome:
          !deliveryKnown || !locationKnown
            ? "UNKNOWN"
            : deliveryMatch && locationMatch
              ? "PASS"
              : "FAIL",
        explanation:
          !deliveryKnown || !locationKnown
            ? "Delivery mode or location compatibility information is missing."
            : deliveryMatch && locationMatch
              ? "Delivery mode and location are compatible."
              : "Delivery mode or location is incompatible.",
      },
    ];
    const hasFail = checks.some((check) => check.outcome === "FAIL");
    const hasUnknown = checks.some((check) => check.outcome === "UNKNOWN");
    const status = hasFail
      ? "INELIGIBLE"
      : hasUnknown
        ? "NEEDS_INFORMATION"
        : "ELIGIBLE";
    const domainMatch = Boolean(
      profile?.domains?.some((domain) =>
        [sessionRow.subject, expertise?.domains?.[0]]
          .filter(Boolean)
          .some(
            (value) =>
              value.toLowerCase().includes(domain.toLowerCase()) ||
              domain.toLowerCase().includes(value.toLowerCase()),
          ),
      ),
    );
    const weights = config.weights;
    const factors = [
      factor(
        "competencyMatch",
        expertise ? 1 : 0,
        weights.competencyMatch,
        "Reviewed trainer expertise",
        "Zero until matching expertise is reviewed",
      ),
      factor(
        "proficiency",
        expertise
          ? expertise.approvedLevel /
              Math.max(requiredLevel, expertise.approvedLevel)
          : 0,
        weights.proficiency,
        "Reviewed level compared with configured required level",
        "Zero when reviewed level is unavailable",
      ),
      factor(
        "qualification",
        requiredQualifications.length
          ? qualificationMatches / requiredQualifications.length
          : 1,
        weights.qualification,
        "Configured qualification requirements and reviewed basis",
        "Full contribution when no qualification is required; zero when required data is absent",
      ),
      factor(
        "relevantExperience",
        (expertise?.relevantExperienceYears || 0) / 10,
        weights.relevantExperience,
        "Reviewed relevant experience years",
        "Zero when absent; capped at 10 years",
      ),
      factor(
        "teachingExperience",
        (profile?.teachingExperienceYears ?? expertise?.teachingYears ?? 0) /
          10,
        weights.teachingExperience,
        "Trainer profile teaching experience",
        "Zero when absent; capped at 10 years",
      ),
      factor(
        "domainRelevance",
        domainMatch ? 1 : 0,
        weights.domainRelevance,
        "Trainer profile domains and session subject",
        "Zero when domain information is missing",
      ),
      factor(
        "availabilityFit",
        availableWindow?.preferenceScore ?? 0,
        weights.availabilityFit,
        "Preference within a confirmed availability window",
        "Zero when availability is not confirmed",
      ),
    ];
    results.push({
      trainer: { _id: trainer._id, name: trainer.name },
      status,
      eligible: status === "ELIGIBLE",
      totalPoints:
        status === "ELIGIBLE"
          ? Number(
              factors
                .reduce((sum, item) => sum + item.contribution, 0)
                .toFixed(2),
            )
          : null,
      recommendationPoints:
        status === "ELIGIBLE"
          ? Number(
              factors
                .reduce((sum, item) => sum + item.contribution, 0)
                .toFixed(2),
            )
          : null,
      factors,
      checks,
      supportingFacts: {
        reviewedLevel: expertise?.approvedLevel ?? null,
        requiredLevel,
        qualifications,
        requiredQualifications,
        relevantExperienceYears: expertise?.relevantExperienceYears ?? null,
        teachingExperienceYears:
          profile?.teachingExperienceYears ?? expertise?.teachingYears ?? null,
        domains: profile?.domains || [],
        deliveryModes: profile?.deliveryModes || [],
      },
      configurationVersion: config.version,
      calculatedAt,
      explanation:
        status === "ELIGIBLE"
          ? factors
              .map((item) => `${item.key}: ${item.contribution}/${item.weight}`)
              .join("; ")
          : checks
              .filter((check) => check.outcome !== "PASS")
              .map((check) => check.explanation)
              .join(" "),
      missingInformation: checks
        .filter((check) => check.outcome === "UNKNOWN")
        .map((check) => check.key),
    });
  }
  const rank = { ELIGIBLE: 0, NEEDS_INFORMATION: 1, INELIGIBLE: 2 };
  return results.sort(
    (a, b) =>
      rank[a.status] - rank[b.status] ||
      (b.totalPoints ?? -1) - (a.totalPoints ?? -1) ||
      a.trainer.name.localeCompare(b.trainer.name) ||
      id(a.trainer).localeCompare(id(b.trainer)),
  );
}

export async function confirmAssignment({
  actor,
  batchId,
  sessionId,
  trainerId,
  reason,
  rankingDepartureReason,
  shortlistCalculatedAt,
  replaces,
}) {
  if (actor.role !== "admin") fail(403, "Coordinator permission required");
  if (!shortlistCalculatedAt)
    fail(400, "A shortlist calculation timestamp is required");
  if (Date.now() - new Date(shortlistCalculatedAt).getTime() > 15 * 60 * 1000)
    fail(409, "The shortlist is stale; calculate suitability again");
  const dbSession = await mongoose.startSession();
  let created;
  try {
    await dbSession.withTransaction(async () => {
      const trainer = await User.findById(trainerId)
        .select("+scheduleVersion")
        .session(dbSession);
      if (!trainer) fail(404, "Trainer not found");
      const lock = await User.updateOne(
        { _id: trainer._id, scheduleVersion: trainer.scheduleVersion },
        { $inc: { scheduleVersion: 1 } },
        { session: dbSession },
      );
      if (lock.modifiedCount !== 1)
        fail(409, "Trainer schedule changed; refresh suitability");
      const recommendations = await calculateSuitability(
        batchId,
        sessionId,
        dbSession,
      );
      const selected = recommendations.find((item) =>
        same(item.trainer, trainerId),
      );
      if (!selected || selected.status !== "ELIGIBLE")
        fail(409, selected?.explanation || "No eligible trainer available");
      const highest = recommendations.find(
        (item) => item.status === "ELIGIBLE",
      );
      if (
        highest &&
        !same(highest.trainer, trainerId) &&
        !rankingDepartureReason?.trim()
      )
        fail(
          400,
          "Explain the departure from the highest-ranked eligible trainer",
        );
      const batch = await get(P2.P2Batch, batchId, dbSession);
      const sessionRow = batch.sessions.id(sessionId);
      if (!sessionRow) fail(404, "Batch session not found");
      if (replaces) {
        const previous = await get(P3.P3TrainerAssignment, replaces, dbSession);
        if (previous.status !== "UNAVAILABLE")
          fail(409, "Only an unavailable assignment can be replaced");
        previous.status = "REPLACED";
        previous.history.push({
          status: "REPLACED",
          actor: actor._id,
          at: now(),
          reason,
        });
        await previous.save({ session: dbSession });
      }
      [created] = await P3.P3TrainerAssignment.create(
        [
          {
            trainer: trainerId,
            batch: batchId,
            sessionId,
            start: sessionRow.start,
            end: sessionRow.end,
            status: "ACTIVE",
            scopeTitle: sessionRow.title,
            assignedBy: actor._id,
            assignedAt: now(),
            recommendationPoints: selected.totalPoints,
            explanation: selected.explanation,
            decisionReason: reason,
            rankingDepartureReason: rankingDepartureReason || "",
            requirementVersion: `batch-rule:${batch.ruleVersion}`,
            scoringVersion: selected.configurationVersion,
            suitabilitySnapshot: selected,
            replaces: replaces || undefined,
            history: [
              { status: "ACTIVE", actor: actor._id, at: now(), reason },
            ],
            isSynthetic: batch.isSynthetic,
            demoNamespace: batch.demoNamespace,
          },
        ],
        { session: dbSession },
      );
      await recordPart3Audit(
        actor,
        replaces ? "TRAINER_REPLACED" : "TRAINER_ASSIGNED",
        created,
        reason,
        {
          scoringVersion: selected.configurationVersion,
          totalPoints: selected.totalPoints,
          rankingDepartureReason: rankingDepartureReason || null,
        },
        dbSession,
      );
    });
  } catch (error) {
    if (
      error?.code === 11000 ||
      error?.errorLabels?.includes("TransientTransactionError")
    )
      fail(
        409,
        "The session or trainer schedule was assigned concurrently; refresh suitability",
      );
    throw error;
  } finally {
    await dbSession.endSession();
  }
  await notify(
    trainerId,
    "TRAINER_ASSIGNED",
    "Training session assigned",
    "A coordinator confirmed your session assignment.",
    "P3TrainerAssignment",
    created._id,
    "/trainer/assigned-batches",
  );
  return created;
}

async function ownEnrollment(actor, enrollmentId, batchId = null) {
  const enrollment = await get(P2.P2Enrollment, enrollmentId);
  if (
    !same(enrollment.trainee, actor) ||
    enrollment.status !== "CONFIRMED" ||
    (batchId && !same(enrollment.batch, batchId))
  )
    fail(403, "A confirmed own enrollment is required");
  return enrollment;
}

export async function learningFor(actor) {
  if (actor.role === "trainee") {
    const enrollments = await P2.P2Enrollment.find({
      trainee: actor._id,
      status: "CONFIRMED",
    }).lean();
    const batches = await P2.P2Batch.find({
      _id: { $in: enrollments.map((row) => row.batch) },
    })
      .select("course")
      .lean();
    const modules = await P3.P3LearningModule.find({
      status: "PUBLISHED",
      $or: [
        { batch: { $in: enrollments.map((row) => row.batch) } },
        { batch: null, course: { $in: batches.map((row) => row.course) } },
      ],
    })
      .sort({ order: 1 })
      .lean();
    const progress = await P3.P3LearningProgress.find({
      trainee: actor._id,
    }).lean();
    return { enrollments, modules, progress };
  }
  const batches =
    actor.role === "admin"
      ? await P2.P2Batch.find().distinct("_id")
      : await P3.P3BatchPermission.find({
          user: actor._id,
          actions: "MANAGE_LEARNING",
        }).distinct("batch");
  const ownCourses =
    actor.role === "trainer"
      ? await P2.P2Course.find({ createdBy: actor._id }).distinct("_id")
      : await P2.P2Course.find().distinct("_id");
  return {
    modules: await P3.P3LearningModule.find({
      $or: [
        { batch: { $in: batches } },
        { batch: null, course: { $in: ownCourses } },
      ],
    })
      .sort({ batch: 1, order: 1 })
      .lean(),
  };
}

export async function saveLearningModule(actor, data) {
  const course = await get(P2.P2Course, data.course);
  let batch = null;
  const ownsCourse = actor.role === "trainer" && same(course.createdBy, actor);
  if (data.batch) {
    batch = await get(P2.P2Batch, data.batch);
    if (!same(batch.course, data.course))
      fail(409, "Course does not match the batch");
    if (actor.role !== "admin" && !ownsCourse)
      await requirePermission(actor, data.batch, "MANAGE_LEARNING");
  } else if (actor.role !== "admin" && !ownsCourse) {
    fail(403, "Only the course owner can manage course-level learning content");
  }
  await validateLearningResources(
    actor,
    data.resources || [],
    course._id,
    batch?._id,
  );
  const module = await P3.P3LearningModule.create({
    ...data,
    status: "DRAFT",
    createdBy: actor._id,
    isSynthetic: batch?.isSynthetic || course.isSynthetic,
    demoNamespace: batch?.demoNamespace || course.demoNamespace,
  });
  await recordPart3Audit(
    actor,
    "LEARNING_MODULE_CREATED",
    module,
    "Learning module created",
  );
  return module;
}

async function validateLearningResources(actor, resources, courseId, batchId) {
  for (const resource of resources) {
    if (!resource.privateResource) continue;
    const file = await get(P3.P3PrivateResource, resource.privateResource);
    if (actor.role !== "admin" && !same(file.owner, actor))
      fail(
        403,
        "A learning module can only attach private files owned by the editor",
      );
    if (file.purpose !== "LEARNING")
      fail(
        409,
        "Submission or evidence files cannot be attached as learning resources",
      );
    if (file.course && !same(file.course, courseId))
      fail(409, "Private resource belongs to another course");
    if (file.batch && (!batchId || !same(file.batch, batchId)))
      fail(409, "Private resource belongs to another batch");
  }
}

async function canManageLearningModule(actor, module) {
  if (actor.role === "admin") return true;
  const course = await get(P2.P2Course, module.course);
  if (same(course.createdBy, actor)) return true;
  if (module.batch) {
    await requirePermission(actor, module.batch, "MANAGE_LEARNING");
    return true;
  }
  return false;
}

export async function updateLearningModule(actor, moduleId, data) {
  const module = await get(P3.P3LearningModule, moduleId);
  if (!(await canManageLearningModule(actor, module)))
    fail(403, "Learning content access is not permitted");
  if (module.status !== "DRAFT")
    fail(
      409,
      "Published learning content is immutable; create a revision instead",
    );
  if (data.resources)
    await validateLearningResources(
      actor,
      data.resources,
      module.course,
      module.batch,
    );
  for (const key of [
    "order",
    "title",
    "summary",
    "announcement",
    "deadline",
    "sessionLink",
    "completionRule",
    "resources",
  ])
    if (data[key] !== undefined) module[key] = data[key];
  await module.save();
  return module;
}

export async function changeLearningModuleStatus(actor, moduleId, action) {
  const module = await get(P3.P3LearningModule, moduleId);
  if (!(await canManageLearningModule(actor, module)))
    fail(403, "Learning content access is not permitted");
  const expected = action === "publish" ? "DRAFT" : "PUBLISHED";
  if (module.status !== expected)
    fail(
      409,
      `Only ${expected.toLowerCase()} learning content can be ${action === "publish" ? "published" : "archived"}`,
    );
  if (
    action === "publish" &&
    (!module.title?.trim() || !module.summary?.trim())
  )
    throw new HttpError(
      400,
      "Complete the required learning content before publishing",
      [
        ...(!module.title?.trim()
          ? [{ field: "title", message: "Module title is required." }]
          : []),
        ...(!module.summary?.trim()
          ? [{ field: "summary", message: "Module summary is required." }]
          : []),
      ],
    );
  module.status = action === "publish" ? "PUBLISHED" : "ARCHIVED";
  await module.save();
  await recordPart3Audit(
    actor,
    `LEARNING_MODULE_${module.status}`,
    module,
    `Course owner ${action}ed learning content`,
  );
  return module;
}

export async function reviseLearningModule(actor, moduleId) {
  const source = await get(P3.P3LearningModule, moduleId);
  if (!(await canManageLearningModule(actor, source)))
    fail(403, "Learning content access is not permitted");
  if (source.status === "DRAFT")
    fail(409, "Edit the existing draft before creating another revision");
  const copy = source.toObject();
  for (const key of ["_id", "createdAt", "updatedAt", "__v"]) delete copy[key];
  copy.version = source.version + 1;
  copy.status = "DRAFT";
  copy.createdBy = actor._id;
  return P3.P3LearningModule.create(copy);
}

export async function recordLearningProgress(actor, moduleId, data) {
  const module = await get(P3.P3LearningModule, moduleId);
  const enrollment = await ownEnrollment(actor, data.enrollment, module.batch);
  const progress = await P3.P3LearningProgress.findOneAndUpdate(
    { enrollment: enrollment._id, module: module._id },
    {
      $set: {
        trainee: actor._id,
        status: data.status,
        viewedAt: now(),
        ...(data.status === "COMPLETED" && { completedAt: now() }),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return progress;
}

const validateQuestion = (data) => {
  const ids = data.options.map((option) => option.optionId);
  const texts = data.options.map((option) => option.text.trim().toLowerCase());
  if (new Set(ids).size !== ids.length || new Set(texts).size !== texts.length)
    fail(400, "Question options must have distinct IDs and text");
  if (!ids.includes(data.correctOptionId))
    fail(400, "Correct option ID must reference exactly one option");
};

export async function createQuestion(actor, data) {
  await requirePermission(actor, data.batch, "MANAGE_QUESTION_BANK");
  validateQuestion(data);
  const latest = await P3.P3Question.findOne({ questionKey: data.questionKey })
    .sort({ version: -1 })
    .lean();
  const question = await P3.P3Question.create({
    ...data,
    version: (latest?.version || 0) + 1,
    author: actor._id,
    status: "DRAFT",
  });
  await recordPart3Audit(
    actor,
    "QUESTION_CREATED",
    question,
    "Question draft created",
    { answerKey: "redacted" },
  );
  return question;
}

export async function reviewQuestion(actor, questionId, reason) {
  const question =
    await P3.P3Question.findById(questionId).select("+correctOptionId");
  if (!question) fail(404, "Question not found");
  if (same(question.author, actor))
    fail(403, "Question author cannot perform the independent review");
  const batch = await P2.P2Batch.findOne({ course: question.course });
  if (!batch) fail(404, "Course batch not found");
  await requirePermission(actor, batch._id, "MANAGE_QUESTION_BANK");
  question.status = "REVIEWED";
  question.reviewer = actor._id;
  question.reviewedAt = now();
  question.reviewReason = reason;
  await question.save();
  await recordPart3Audit(actor, "QUESTION_REVIEWED", question, reason, {
    answerKey: "redacted",
  });
  return question;
}

export async function createAssessmentDraft(actor, data) {
  await requirePermission(actor, data.batch, "CREATE_ASSESSMENT");
  const batch = await get(P2.P2Batch, data.batch);
  if (!same(batch.course, data.course))
    fail(409, "Course does not match the batch");
  if (data.closesAt <= data.opensAt)
    fail(400, "Assessment closing time must be after opening time");
  const previous = await P3.P3Assessment.findOne({
    batch: batch._id,
    title: data.title,
  })
    .sort({ version: -1 })
    .lean();
  const questions = data.questionIds?.length
    ? await P3.P3Question.find({ _id: { $in: data.questionIds } })
        .select("+correctOptionId")
        .lean()
    : [];
  if (
    data.type === "MCQ" &&
    (questions.length !== data.questionIds.length ||
      questions.some((question) => question.status !== "REVIEWED"))
  )
    fail(409, "Every assessment question must be reviewed");
  const questionVersions = questions.map((question) => ({
    question: question._id,
    questionKey: question.questionKey,
    version: question.version,
    text: question.text,
    options: question.options,
    correctOptionId: question.correctOptionId,
    marks: question.marks,
    explanation: question.explanation,
    sourceReference: question.sourceReference,
  }));
  const assessment = await P3.P3Assessment.create({
    batch: batch._id,
    course: batch.course,
    ruleVersion: batch.ruleVersion,
    createdBy: actor._id,
    title: data.title,
    type: data.type,
    instructions: data.instructions,
    version: (previous?.version || 0) + 1,
    status: "DRAFT",
    opensAt: data.opensAt,
    closesAt: data.closesAt,
    durationMinutes: data.durationMinutes,
    attemptLimit: data.attemptLimit,
    passingScore: data.passingScore,
    negativeMarking: data.negativeMarking,
    resultReleasePolicy: data.resultReleasePolicy,
    questionVersions,
    rubric: data.rubric || [],
    assignedEvaluators: data.assignedEvaluators || [],
    competency: data.competency,
    frameworkVersion: data.frameworkVersion,
    rubricVersion: data.rubricVersion,
    maxScore:
      data.type === "MCQ"
        ? questionVersions.reduce((sum, question) => sum + question.marks, 0)
        : (data.rubric || []).reduce((sum, item) => sum + item.maxMarks, 0),
    isSynthetic: batch.isSynthetic,
    demoNamespace: batch.demoNamespace,
  });
  await recordPart3Audit(
    actor,
    "ASSESSMENT_CREATED",
    assessment,
    "Versioned assessment draft created",
  );
  return assessment;
}

export async function publishAssessmentVersion(actor, assessmentId, reason) {
  const assessment = await get(P3.P3Assessment, assessmentId);
  await requirePermission(actor, assessment.batch, "CREATE_ASSESSMENT");
  if (assessment.status !== "DRAFT")
    fail(409, "Only a draft assessment can be published");
  const batch = await get(P2.P2Batch, assessment.batch);
  if (!same(assessment.ruleVersion, batch.ruleVersion))
    fail(
      409,
      "Assessment rule version does not match the batch-pinned rule version",
    );
  if (assessment.type === "MCQ" && !assessment.questionVersions.length)
    fail(409, "A published MCQ assessment requires reviewed questions");
  if (assessment.type !== "MCQ" && !assessment.rubric.length)
    fail(409, "A practical or written assessment requires a rubric");
  assessment.status = "PUBLISHED";
  assessment.publishedBy = actor._id;
  assessment.publishedAt = now();
  await assessment.save();
  await recordPart3Audit(actor, "ASSESSMENT_PUBLISHED", assessment, reason, {
    version: assessment.version,
  });
  const trainees = await P2.P2Enrollment.find({
    batch: assessment.batch,
    status: "CONFIRMED",
  }).select("trainee");
  await Promise.all(
    trainees.map((row) =>
      notify(
        row.trainee,
        "ASSESSMENT_PUBLISHED",
        "Assessment available",
        `${assessment.title} is available.`,
        "P3Assessment",
        assessment._id,
        "/trainee/assessments",
      ),
    ),
  );
  return assessment;
}

const sanitizeAssessment = (assessment) => {
  const value = assessment.toObject
    ? assessment.toObject()
    : structuredClone(assessment);
  value.questionVersions = (value.questionVersions || []).map(
    ({ correctOptionId, explanation, ...question }) => question,
  );
  return value;
};

export async function startAttempt(actor, assessmentId) {
  const assessment = await get(P3.P3Assessment, assessmentId);
  if (assessment.type !== "MCQ" || assessment.status !== "PUBLISHED")
    fail(409, "This MCQ assessment is not available");
  const current = now();
  if (current < assessment.opensAt || current > assessment.closesAt)
    fail(409, "Assessment is outside its open period");
  const enrollment = await P2.P2Enrollment.findOne({
    trainee: actor._id,
    batch: assessment.batch,
    status: "CONFIRMED",
  });
  if (!enrollment) fail(403, "Approved enrollment is required");
  let active = await P3.P3AssessmentAttempt.findOne({
    enrollment: enrollment._id,
    assessment: assessment._id,
    status: "IN_PROGRESS",
  });
  if (active && active.effectiveDeadline <= current) {
    const scoringVersion = await P3.P3Assessment.findById(
      assessment._id,
    ).select("+questionVersions.correctOptionId");
    await finalizeAttempt(active, scoringVersion, true);
    active = null;
  }
  if (active)
    return { attempt: active, assessment: sanitizeAssessment(assessment) };
  const attemptNumber =
    (await P3.P3AssessmentAttempt.countDocuments({
      enrollment: enrollment._id,
      assessment: assessment._id,
    })) + 1;
  if (attemptNumber > assessment.attemptLimit)
    fail(409, "Attempt limit reached");
  const durationEnd = new Date(
    current.getTime() + assessment.durationMinutes * 60000,
  );
  const effectiveDeadline =
    durationEnd < assessment.closesAt ? durationEnd : assessment.closesAt;
  const questionOrder = assessment.questionVersions.map(
    (question) => question.questionKey,
  );
  for (let i = questionOrder.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [questionOrder[i], questionOrder[j]] = [questionOrder[j], questionOrder[i]];
  }
  const attempt = await P3.P3AssessmentAttempt.create({
    enrollment: enrollment._id,
    assessment: assessment._id,
    trainee: actor._id,
    assessmentVersion: assessment.version,
    attemptNumber,
    questionOrder,
    startedAt: current,
    effectiveDeadline,
    status: "IN_PROGRESS",
    isSynthetic: assessment.isSynthetic,
    demoNamespace: assessment.demoNamespace,
  });
  return { attempt, assessment: sanitizeAssessment(assessment) };
}

async function ownedAttempt(actor, attemptId) {
  const attempt = await get(P3.P3AssessmentAttempt, attemptId);
  if (!same(attempt.trainee, actor)) fail(403, "Attempt ownership required");
  return attempt;
}

export async function saveAttempt(actor, attemptId, answers) {
  const attempt = await ownedAttempt(actor, attemptId);
  const assessment = await get(P3.P3Assessment, attempt.assessment);
  if (attempt.status !== "IN_PROGRESS")
    return { attempt, assessment: sanitizeAssessment(assessment) };
  if (now() >= attempt.effectiveDeadline) {
    await finalizeAttempt(attempt, assessment, true);
    return { attempt, assessment: sanitizeAssessment(assessment) };
  }
  const allowedQuestions = new Set(attempt.questionOrder);
  for (const answer of answers) {
    const question = assessment.questionVersions.find(
      (item) => item.questionKey === answer.questionId,
    );
    if (
      !allowedQuestions.has(answer.questionId) ||
      !question?.options.some((option) => option.optionId === answer.optionId)
    )
      fail(400, "Answer references an invalid question or option");
  }
  attempt.answers = answers.map((answer) => ({ ...answer, savedAt: now() }));
  await attempt.save();
  return { attempt, assessment: sanitizeAssessment(assessment) };
}

async function finalizeAttempt(
  attempt,
  assessment,
  timedOut = false,
  submissionKey = "",
) {
  let rawScore = 0;
  const maxScore = assessment.questionVersions.reduce(
    (sum, question) => sum + question.marks,
    0,
  );
  for (const question of assessment.questionVersions) {
    const answer = attempt.answers.find(
      (item) => item.questionId === question.questionKey,
    );
    if (!answer) continue;
    if (answer.optionId === question.correctOptionId)
      rawScore += question.marks;
    else rawScore -= assessment.negativeMarking || 0;
  }
  attempt.rawScore = Math.max(0, rawScore);
  attempt.maxScore = maxScore;
  attempt.percentage = maxScore
    ? Number(((attempt.rawScore / maxScore) * 100).toFixed(2))
    : 0;
  attempt.status = timedOut ? "TIMED_OUT" : "SUBMITTED";
  attempt.submittedAt = now();
  attempt.submissionKey = submissionKey || attempt.submissionKey;
  await attempt.save();
  return attempt;
}

export async function submitAttempt(actor, attemptId, submissionKey) {
  const attempt = await ownedAttempt(actor, attemptId);
  if (attempt.status !== "IN_PROGRESS") return attempt;
  const assessment = await P3.P3Assessment.findById(attempt.assessment).select(
    "+questionVersions.correctOptionId",
  );
  if (!assessment || assessment.version !== attempt.assessmentVersion)
    fail(409, "Frozen assessment version is unavailable");
  await finalizeAttempt(
    attempt,
    assessment,
    now() >= attempt.effectiveDeadline,
    submissionKey,
  );
  await recordPart3Audit(
    actor,
    "ASSESSMENT_ATTEMPT_SUBMITTED",
    attempt,
    "Attempt submitted",
    { score: "redacted", timedOut: attempt.status === "TIMED_OUT" },
  );
  return attempt;
}

export async function submitPractical(actor, data) {
  const assessment = await get(P3.P3Assessment, data.assessment);
  if (
    !["PRACTICAL", "WRITTEN_ASSIGNMENT"].includes(assessment.type) ||
    assessment.status !== "PUBLISHED"
  )
    fail(409, "Submission assessment is not available");
  const enrollment = await ownEnrollment(
    actor,
    data.enrollment,
    assessment.batch,
  );
  const previous = await P3.P3AssessmentSubmission.findOne({
    enrollment: enrollment._id,
    assessment: assessment._id,
  }).sort({ version: -1 });
  if (previous && previous.status !== "RETURNED_FOR_REVISION")
    fail(409, "A new revision was not requested");
  const version = (previous?.version || 0) + 1;
  const submission = await P3.P3AssessmentSubmission.create({
    enrollment: enrollment._id,
    assessment: assessment._id,
    trainee: actor._id,
    version,
    previousSubmission: previous?._id,
    responseText: data.responseText,
    privateResources: data.privateResources,
    submittedAt: now(),
    status: "SUBMITTED",
    isSynthetic: assessment.isSynthetic,
    demoNamespace: assessment.demoNamespace,
  });
  await recordPart3Audit(
    actor,
    "PRACTICAL_SUBMITTED",
    submission,
    "Practical submission recorded",
    { version },
  );
  for (const evaluator of assessment.assignedEvaluators)
    await notify(
      evaluator,
      "EVALUATION_ASSIGNED",
      "Submission ready for evaluation",
      assessment.title,
      "P3AssessmentSubmission",
      submission._id,
      "/trainer/evaluations",
    );
  return submission;
}

export async function completeEvaluation(actor, submissionId, data) {
  const submission = await get(P3.P3AssessmentSubmission, submissionId);
  const assessment = await get(P3.P3Assessment, submission.assessment);
  if (
    !assessment.assignedEvaluators.some((evaluator) => same(evaluator, actor))
  )
    fail(403, "Explicit evaluator assignment required");
  if (same(submission.trainee, actor))
    fail(403, "Self-evaluation is not permitted");
  const expected = new Map(
    assessment.rubric.map((item) => [item.criterionId, item.maxMarks]),
  );
  if (data.criterionMarks.length !== expected.size)
    fail(400, "Marks are required for every rubric criterion");
  let score = 0;
  for (const mark of data.criterionMarks) {
    const limit = expected.get(mark.criterionId);
    if (limit == null || mark.marks < 0 || mark.marks > limit)
      fail(400, "Criterion marks exceed the configured rubric");
    score += mark.marks;
  }
  const maxScore = [...expected.values()].reduce(
    (sum, value) => sum + value,
    0,
  );
  const outcome =
    data.status === "RETURNED_FOR_REVISION"
      ? "REVISION_REQUIRED"
      : (maxScore ? (score / maxScore) * 100 : 0) >= assessment.passingScore
        ? "PASS"
        : "FAIL";
  const previous = await P3.P3HumanEvaluation.findOne({
    submission: submission._id,
  }).sort({ version: -1 });
  const evaluation = await P3.P3HumanEvaluation.create({
    submission: submission._id,
    assessment: assessment._id,
    evaluator: actor._id,
    version: (previous?.version || 0) + 1,
    status: data.status,
    criterionMarks: data.criterionMarks,
    score,
    outcome,
    comments: data.comments,
    evaluatedAt: now(),
    isSynthetic: submission.isSynthetic,
    demoNamespace: submission.demoNamespace,
  });
  submission.status =
    data.status === "RETURNED_FOR_REVISION"
      ? "RETURNED_FOR_REVISION"
      : "EVALUATED";
  await submission.save();
  await recordPart3Audit(
    actor,
    "SUBMISSION_EVALUATED",
    evaluation,
    data.comments,
    { score, outcome, version: evaluation.version },
  );
  if (data.status === "RETURNED_FOR_REVISION")
    await notify(
      submission.trainee,
      "SUBMISSION_REVISION_REQUESTED",
      "Submission revision requested",
      data.comments,
      "P3AssessmentSubmission",
      submission._id,
      "/trainee/assessments",
    );
  return evaluation;
}

export async function prepareResult(actor, enrollmentId, reason) {
  const enrollment = await get(P2.P2Enrollment, enrollmentId);
  await requirePermission(actor, enrollment.batch, "PUBLISH_RESULT");
  const assessments = await P3.P3Assessment.find({
    batch: enrollment.batch,
    status: { $in: ["PUBLISHED", "CLOSED"] },
  });
  const attempts = await P3.P3AssessmentAttempt.find({
    enrollment: enrollment._id,
    status: { $in: ["SUBMITTED", "TIMED_OUT"] },
  });
  const submissions = await P3.P3AssessmentSubmission.find({
    enrollment: enrollment._id,
    status: "EVALUATED",
  });
  const evaluations = await P3.P3HumanEvaluation.find({
    submission: { $in: submissions.map((row) => row._id) },
    status: "EVALUATED",
  });
  for (const assessment of assessments) {
    if (
      assessment.type === "MCQ" &&
      !attempts.some((attempt) => same(attempt.assessment, assessment))
    )
      fail(409, `MCQ assessment is incomplete: ${assessment.title}`);
    if (
      assessment.type !== "MCQ" &&
      !evaluations.some((evaluation) => same(evaluation.assessment, assessment))
    )
      fail(409, `Human evaluation is incomplete: ${assessment.title}`);
  }
  const totalScore =
    attempts.reduce((sum, row) => sum + row.rawScore, 0) +
    evaluations.reduce((sum, row) => sum + row.score, 0);
  const maximumScore =
    attempts.reduce((sum, row) => sum + row.maxScore, 0) +
    evaluations.reduce((sum, row) => {
      const assessment = assessments.find((item) =>
        same(item._id, row.assessment),
      );
      return sum + (assessment?.maxScore || 0);
    }, 0);
  const percentage = maximumScore
    ? Number(((totalScore / maximumScore) * 100).toFixed(2))
    : 0;
  const threshold = Math.max(
    ...assessments.map((row) => row.passingScore || 0),
    0,
  );
  const latest = await P3.P3ResultVersion.findOne({
    enrollment: enrollment._id,
  }).sort({ version: -1 });
  const result = await P3.P3ResultVersion.create({
    enrollment: enrollment._id,
    batch: enrollment.batch,
    trainee: enrollment.trainee,
    version: (latest?.version || 0) + 1,
    previousResult: latest?._id,
    assessmentAttempts: attempts.map((row) => row._id),
    evaluations: evaluations.map((row) => row._id),
    totalScore,
    maximumScore,
    percentage,
    outcome: percentage >= threshold ? "PASS" : "FAIL",
    status: "READY_FOR_REVIEW",
    preparedBy: actor._id,
    reason,
    isSynthetic: enrollment.isSynthetic,
    demoNamespace: enrollment.demoNamespace,
  });
  return result;
}

export async function publishResultVersion(actor, resultId, reason) {
  const result = await get(P3.P3ResultVersion, resultId);
  await requirePermission(actor, result.batch, "PUBLISH_RESULT");
  if (same(result.trainee, actor))
    fail(403, "Self-publication is not permitted");
  if (result.status !== "READY_FOR_REVIEW")
    fail(409, "Only a ready result can be published");
  const previous = result.previousResult
    ? await P3.P3ResultVersion.findById(result.previousResult)
    : null;
  if (previous?.status === "PUBLISHED") {
    previous.status = "SUPERSEDED";
    await previous.save();
  }
  result.status = "PUBLISHED";
  result.publishedBy = actor._id;
  result.publishedAt = now();
  result.reason = reason;
  await result.save();
  await recordPart3Audit(
    actor,
    previous ? "RESULT_CORRECTED" : "RESULT_PUBLISHED",
    result,
    reason,
    { version: result.version, previousResult: previous?._id || null },
  );
  await notify(
    result.trainee,
    previous ? "RESULT_CORRECTED" : "RESULT_PUBLISHED",
    previous ? "Result correction published" : "Result published",
    "An authorized publisher released your result.",
    "P3ResultVersion",
    result._id,
    "/trainee/results",
  );
  return result;
}

export async function resultsFor(actor) {
  const query =
    actor.role === "trainee"
      ? { trainee: actor._id, status: "PUBLISHED" }
      : {
          ...(actor.role === "trainer" && { status: "PUBLISHED" }),
          batch: {
            $in: await P3.P3BatchPermission.find({
              user: actor._id,
              ...(actor.role === "admin" && {
                actions: "PUBLISH_RESULT",
              }),
            }).distinct("batch"),
          },
        };
  return P3.P3ResultVersion.find(query)
    .populate("trainee batch publishedBy")
    .sort({ enrollment: 1, version: -1 })
    .lean();
}

export async function recoverExpiredAttempts() {
  const attempts = await P3.P3AssessmentAttempt.find({
    status: "IN_PROGRESS",
    effectiveDeadline: { $lte: now() },
  });
  for (const attempt of attempts) {
    const assessment = await P3.P3Assessment.findById(
      attempt.assessment,
    ).select("+questionVersions.correctOptionId");
    if (assessment) await finalizeAttempt(attempt, assessment, true);
  }
  return attempts.length;
}
