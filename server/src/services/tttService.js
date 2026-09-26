import crypto from "node:crypto";
import mongoose from "mongoose";
import { HttpError } from "../middleware/errorHandler.js";
import User from "../models/User.js";
import * as P2 from "../models/Part2.js";
import * as P3 from "../models/Part3.js";
import { notify, recordAudit } from "./part2Service.js";

const id = (value) => String(value?._id || value || "");
const fail = (status, message) => {
  throw new HttpError(status, message);
};
const now = () => new Date();
const correlation = () => crypto.randomUUID();

const ACTIVE_STATES = [
  "NOMINATED",
  "ACCEPTED",
  "IN_PROGRESS",
  "TEACHING_PRACTICE",
  "EVALUATED",
];

const DEFAULT_RUBRIC = [
  {
    criterionId: "SUBJECT_ACCURACY",
    label: "Subject accuracy",
    description: "The delivered content is technically correct.",
    maxMarks: 30,
  },
  {
    criterionId: "STRUCTURE",
    label: "Structure and clarity",
    description: "The session is organised and clearly explained.",
    maxMarks: 30,
  },
  {
    criterionId: "ENGAGEMENT",
    label: "Trainee engagement",
    description: "Explains, checks and responds to trainee understanding.",
    maxMarks: 20,
  },
  {
    criterionId: "ASSESSMENT",
    label: "Assessment of learning",
    description: "Uses checks for understanding during delivery.",
    maxMarks: 20,
  },
];

const TRANSITIONS = {
  ACCEPT: { from: ["NOMINATED"], to: "ACCEPTED", actor: "candidate" },
  START: { from: ["ACCEPTED"], to: "IN_PROGRESS", actor: "candidate" },
  RETURN: {
    from: ACTIVE_STATES,
    to: "RETURNED",
    actor: "admin",
  },
  WITHDRAW: {
    from: [...ACTIVE_STATES, "RETURNED"],
    to: "WITHDRAWN",
    actor: "candidate",
  },
  REJECT: { from: ["NOMINATED", "ACCEPTED"], to: "REJECTED", actor: "admin" },
};

function populatedNomination(query) {
  return query
    .populate("candidate", "name email department role")
    .populate("program", "title competency targetLevel status")
    .populate("competency", "name code")
    .populate("nominatedBy", "name role");
}

export async function tttEligibility({
  candidateId,
  competency,
  frameworkVersion,
  targetLevel,
}) {
  const threshold = Number(process.env.TTT_MIN_EXPERT_LEVEL || targetLevel);
  const candidate = await User.findById(candidateId).lean();
  if (!candidate) fail(404, "Candidate not found");

  const expertise = await P3.P3TrainerExpertise.findOne({
    trainer: candidateId,
    competency,
    frameworkVersion,
    status: { $in: ["REVIEWED", "APPROVED"] },
  }).lean();
  const record = await P2.P2CompetencyRecord.findOne({
    trainee: candidateId,
    competency,
    frameworkVersion,
    status: "DEMONSTRATED",
  }).lean();

  const expertiseLevelOk =
    expertise?.approvedLevel != null && expertise.approvedLevel >= threshold;
  const recordLevelOk =
    record?.demonstratedLevel != null && record.demonstratedLevel >= threshold;
  const hasAnyEvidence = Boolean(expertise || record);
  const meetsLevel = expertiseLevelOk || recordLevelOk;
  const alreadyVerified = Boolean(expertise);

  const checks = [
    {
      key: "APPROVED_ACCOUNT",
      met: candidate.accountStatus === "approved",
      detail: `Account ${candidate.accountStatus}`,
    },
    {
      key: "DEMONSTRATED_SUBJECT_COMPETENCE",
      met: meetsLevel,
      detail: hasAnyEvidence
        ? `Required at least L${threshold}`
        : "No reviewed expertise or demonstrated competency record found",
    },
    {
      key: "NOT_ALREADY_VERIFIED_TRAINER",
      met: !alreadyVerified,
      detail: alreadyVerified
        ? "Already holds reviewed expertise for this competency"
        : "Not yet in the verified trainer pool for this competency",
    },
  ];
  const missingInformation = hasAnyEvidence
    ? []
    : [
        {
          key: "SUBJECT_COMPETENCE_EVIDENCE",
          detail:
            "Missing reviewed expertise or a demonstrated competency record at the target level.",
        },
      ];

  let status = "ELIGIBLE";
  if (!checks[0].met || alreadyVerified) status = "INELIGIBLE";
  else if (missingInformation.length) status = "NEEDS_INFORMATION";
  else if (!meetsLevel) status = "INELIGIBLE";

  return {
    candidate: {
      _id: candidate._id,
      name: candidate.name,
      email: candidate.email,
      role: candidate.role,
      department: candidate.department,
    },
    competency,
    frameworkVersion,
    targetLevel,
    threshold,
    status,
    checks,
    missingInformation,
    basis: {
      sourceExpertise: expertise?._id || null,
      sourceRecord: record?._id || null,
    },
  };
}

export async function eligibleCandidates({
  competency,
  frameworkVersion,
  targetLevel,
  department,
}) {
  const threshold = Number(process.env.TTT_MIN_EXPERT_LEVEL || targetLevel);
  const users = await User.find({
    accountStatus: "approved",
    ...(department && { department }),
  })
    .select("name email role department")
    .lean();
  const [records, expertise] = await Promise.all([
    P2.P2CompetencyRecord.find({
      competency,
      frameworkVersion,
      status: "DEMONSTRATED",
      demonstratedLevel: { $gte: threshold },
    })
      .select("trainee")
      .lean(),
    P3.P3TrainerExpertise.find({
      competency,
      frameworkVersion,
      status: { $in: ["REVIEWED", "APPROVED"] },
    })
      .select("trainer")
      .lean(),
  ]);
  const pool = new Set([
    ...records.map((r) => id(r.trainee)),
    ...expertise.map((e) => id(e.trainer)),
  ]);
  const rows = [];
  for (const user of users) {
    if (!pool.has(id(user._id))) continue;
    rows.push(
      await tttEligibility({
        candidateId: user._id,
        competency,
        frameworkVersion,
        targetLevel,
      }),
    );
  }
  return rows.sort((a, b) => a.candidate.name.localeCompare(b.candidate.name));
}

export async function listPrograms(actor) {
  const query = actor.role === "admin" ? {} : { status: "ACTIVE" };
  return P3.P3TTTProgram.find(query)
    .populate("competency", "name code")
    .populate("defaultEvaluator", "name")
    .sort({ createdAt: -1 })
    .lean();
}

export async function saveProgram(actor, body) {
  if (body.id) {
    const program = await P3.P3TTTProgram.findById(body.id);
    if (!program) fail(404, "TTT program not found");
    Object.assign(program, {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.competency !== undefined && { competency: body.competency }),
      ...(body.frameworkVersion !== undefined && {
        frameworkVersion: body.frameworkVersion,
      }),
      ...(body.targetLevel !== undefined && { targetLevel: body.targetLevel }),
      ...(body.teachingPracticeRequirements !== undefined && {
        teachingPracticeRequirements: body.teachingPracticeRequirements,
      }),
      ...(body.defaultEvaluator !== undefined && {
        defaultEvaluator: body.defaultEvaluator,
      }),
      ...(body.status !== undefined && { status: body.status }),
    });
    await program.save();
    return program.toObject();
  }
  const program = await P3.P3TTTProgram.create({
    title: body.title,
    competency: body.competency,
    frameworkVersion: body.frameworkVersion,
    targetLevel: body.targetLevel,
    courses: body.courses || [],
    teachingPracticeRequirements: body.teachingPracticeRequirements,
    defaultEvaluator: body.defaultEvaluator,
    status: body.status || "DRAFT",
    createdBy: actor._id,
  });
  await recordAudit({
    actor: actor._id,
    action: "TTT_PROGRAM_SAVED",
    entityType: "P3TTTProgram",
    entityId: program._id,
    newStatus: program.status,
    reason: `Train-the-Trainer program "${program.title}" saved`,
  });
  return program.toObject();
}

export async function nominateCandidate(
  actor,
  { program: programId, candidate, rationale, requestId },
) {
  const existing = await P3.P3TTTNomination.findOne({ requestId });
  if (existing) return populatedNomination(P3.P3TTTNomination.findById(existing._id)).lean();
  const program = await P3.P3TTTProgram.findById(programId).lean();
  if (!program) fail(404, "TTT program not found");
  if (program.status !== "ACTIVE")
    fail(409, "The Train-the-Trainer program is not active");

  const duplicate = await P3.P3TTTNomination.findOne({
    candidate,
    competency: program.competency,
    frameworkVersion: program.frameworkVersion,
    status: { $in: ACTIVE_STATES },
  }).lean();
  if (duplicate)
    fail(
      409,
      "An active Train-the-Trainer nomination already exists for this candidate and competency",
    );

  const eligibility = await tttEligibility({
    candidateId: candidate,
    competency: program.competency,
    frameworkVersion: program.frameworkVersion,
    targetLevel: program.targetLevel,
  });
  if (eligibility.status !== "ELIGIBLE")
    fail(
      409,
      `Nomination requires ELIGIBLE status. Current status: ${eligibility.status}`,
    );

  const nomination = await P3.P3TTTNomination.create({
    candidate,
    program: program._id,
    competency: program.competency,
    frameworkVersion: program.frameworkVersion,
    targetLevel: program.targetLevel,
    nominatedBy: actor._id,
    rationale,
    eligibilitySnapshot: {
      status: eligibility.status,
      threshold: eligibility.threshold,
      checks: eligibility.checks,
      missingInformation: eligibility.missingInformation,
      basis: eligibility.basis,
    },
    status: "NOMINATED",
    requestId,
    history: [{ status: "NOMINATED", actor: actor._id, at: now(), reason: rationale }],
    ...(program.isSynthetic && {
      isSynthetic: true,
      demoNamespace: program.demoNamespace,
    }),
  });
  await recordAudit({
    actor: actor._id,
    action: "TTT_NOMINATED",
    entityType: "P3TTTNomination",
    entityId: nomination._id,
    newStatus: "NOMINATED",
    changes: {
      candidate,
      competency: program.competency,
      targetLevel: program.targetLevel,
    },
    reason: rationale,
  });
  await notify({
    recipient: candidate,
    type: "TTT_NOMINATED",
    title: "You were nominated for Train-the-Trainer",
    message:
      "Review and accept the nomination to begin the teaching-development programme.",
    entityReference: {
      entityType: "P3TTTNomination",
      entityId: nomination._id,
      path: "/trainee/train-the-trainer",
    },
    eventId: `ttt:${nomination._id}:nominated`,
    isSynthetic: nomination.isSynthetic,
    demoNamespace: nomination.demoNamespace,
  });
  return populatedNomination(P3.P3TTTNomination.findById(nomination._id)).lean();
}

export async function nominationFor(actor, nominationId) {
  const nomination = await populatedNomination(
    P3.P3TTTNomination.findById(nominationId),
  ).lean();
  if (!nomination) fail(404, "TTT nomination not found");
  if (actor.role === "trainee" && id(nomination.candidate?._id) !== id(actor._id))
    fail(403, "You can only view your own nomination");
  return nomination;
}

export async function practicesFor(actor, nominationId) {
  await nominationFor(actor, nominationId);
  const practices = await P3.P3TTTPractice.find({ nomination: nominationId })
    .sort({ version: 1 })
    .lean();
  const evaluations = await P3.P3TTTEvaluation.find({
    practice: { $in: practices.map((p) => p._id) },
  })
    .populate("evaluator", "name role")
    .lean();
  return practices.map((practice) => ({
    ...practice,
    evaluation:
      evaluations.find((e) => id(e.practice) === id(practice._id)) || null,
  }));
}

export async function candidatesFor(actor) {
  if (actor.role === "admin")
    return populatedNomination(P3.P3TTTNomination.find()).sort({
      createdAt: -1,
    }).lean();
  if (actor.role === "trainer") {
    const programs = await P3.P3TTTProgram.find({
      defaultEvaluator: actor._id,
    }).distinct("_id");
    return populatedNomination(
      P3.P3TTTNomination.find({ program: { $in: programs } }),
    )
      .sort({ createdAt: -1 })
      .lean();
  }
  return populatedNomination(
    P3.P3TTTNomination.find({ candidate: actor._id }),
  )
    .sort({ createdAt: -1 })
    .lean();
}

export async function transitionNomination(
  actor,
  nominationId,
  { action, reason, expectedRevision },
) {
  const rule = TRANSITIONS[action];
  if (!rule) fail(400, "Unknown transition");
  const nomination = await P3.P3TTTNomination.findById(nominationId);
  if (!nomination) fail(404, "TTT nomination not found");
  if (rule.actor === "candidate" && id(nomination.candidate) !== id(actor._id))
    fail(403, "Only the nominated candidate can perform this action");
  if (rule.actor === "admin" && actor.role !== "admin")
    fail(403, "Only a coordinator can perform this action");
  if (expectedRevision != null && nomination.revision !== expectedRevision)
    fail(409, "This decision is stale. Refresh and try again.");
  if (!rule.from.includes(nomination.status))
    fail(409, `This nomination cannot move from ${nomination.status} via ${action}`);

  const previous = nomination.status;
  nomination.status = rule.to;
  nomination.revision += 1;
  nomination.history.push({
    status: rule.to,
    actor: actor._id,
    at: now(),
    reason,
  });
  await nomination.save();

  await recordAudit({
    actor: actor._id,
    action: "TTT_NOMINATION_TRANSITION",
    entityType: "P3TTTNomination",
    entityId: nomination._id,
    previousStatus: previous,
    newStatus: rule.to,
    reason,
  });
  await notify({
    recipient: id(nomination.candidate) === id(actor._id)
      ? nomination.nominatedBy
      : nomination.candidate,
    type: `TTT_${rule.to}`,
    title: `Train-the-Trainer nomination ${rule.to.toLowerCase()}`,
    message: reason || `The nomination moved to ${rule.to}.`,
    entityReference: {
      entityType: "P3TTTNomination",
      entityId: nomination._id,
      path:
        id(nomination.candidate) === id(actor._id)
          ? "/admin/train-the-trainer"
          : "/trainee/train-the-trainer",
    },
    eventId: `ttt:${nomination._id}:${rule.to}:${nomination.revision}`,
    isSynthetic: nomination.isSynthetic,
    demoNamespace: nomination.demoNamespace,
  });
  return populatedNomination(P3.P3TTTNomination.findById(nomination._id)).lean();
}

// Train-the-Trainer learning. The program's courses are the TTT curriculum; a
// candidate records progress, and teaching practice opens only once every
// program course is complete. Completion is learning activity, never reviewed
// expertise.
async function requiredLearning(nomination) {
  const program = await P3.P3TTTProgram.findById(nomination.program)
    .select("courses")
    .lean();
  return program?.courses || [];
}

export async function tttLearningFor(actor, nominationId) {
  const nomination = await P3.P3TTTNomination.findById(nominationId).lean();
  if (!nomination) fail(404, "TTT nomination not found");
  if (id(nomination.candidate) !== id(actor._id) && actor.role !== "admin")
    fail(403, "You can only read your own Train-the-Trainer learning");
  const program = await P3.P3TTTProgram.findById(nomination.program)
    .select("title courses")
    .lean();
  const courseIds = program?.courses || [];
  const courses = courseIds.length
    ? await P2.P2Course.find({ _id: { $in: courseIds } })
        .select("title code status")
        .lean()
    : [];
  const rows = await P3.P3TTTLearning.find({ nomination: nomination._id }).lean();
  const items = courseIds
    .map((courseId) => {
      const course = courses.find((row) => id(row._id) === id(courseId));
      const record = rows.find((row) => id(row.course) === id(courseId));
      return {
        course: course
          ? {
              _id: course._id,
              title: course.title,
              code: course.code,
              status: course.status,
            }
          : { _id: courseId, title: "Course no longer available", code: "" },
        status: record?.status || "NOT_STARTED",
        progressPercent: record?.progressPercent || 0,
        completedAt: record?.completedAt || null,
      };
    });
  return {
    nomination: nomination._id,
    program: program
      ? { _id: program._id, title: program.title }
      : null,
    items,
    completed: items.filter((item) => item.status === "COMPLETED").length,
    total: items.length,
    gate: !items.length
      ? "NO_LEARNING_REQUIRED"
      : items.every((item) => item.status === "COMPLETED")
        ? "READY_FOR_TEACHING_PRACTICE"
        : "TTT_LEARNING_REQUIRED",
    note: "Train-the-Trainer learning completion is recorded learning activity. It never creates reviewed expertise; only coordinator verification does.",
  };
}

export async function recordTttLearning(
  actor,
  nominationId,
  { course, progressPercent },
) {
  const nomination = await P3.P3TTTNomination.findById(nominationId);
  if (!nomination) fail(404, "TTT nomination not found");
  if (id(nomination.candidate) !== id(actor._id))
    fail(403, "Only the nominated candidate can record Train-the-Trainer learning");
  if (![...ACTIVE_STATES, "RETURNED"].includes(nomination.status))
    fail(
      409,
      `Train-the-Trainer learning is not available while the nomination is ${nomination.status}`,
    );
  const required = await requiredLearning(nomination);
  if (!required.some((row) => id(row) === id(course)))
    fail(400, "This course is not part of the Train-the-Trainer program");
  const percent = Number(progressPercent);
  if (!Number.isFinite(percent) || percent < 0 || percent > 100)
    fail(400, "Progress must be a number between 0 and 100");

  const existing = await P3.P3TTTLearning.findOne({
    nomination: nomination._id,
    course,
  }).lean();
  const status =
    percent >= 100 ? "COMPLETED" : percent > 0 ? "IN_PROGRESS" : "NOT_STARTED";
  const row = await P3.P3TTTLearning.findOneAndUpdate(
    { nomination: nomination._id, course },
    {
      $set: {
        status,
        progressPercent: percent,
        completedAt:
          status === "COMPLETED" ? existing?.completedAt || now() : null,
        ...(percent > 0 && !existing?.startedAt && { startedAt: now() }),
      },
      $setOnInsert: {
        nomination: nomination._id,
        candidate: actor._id,
        program: nomination.program,
        course,
        ...(nomination.isSynthetic && {
          isSynthetic: true,
          demoNamespace: nomination.demoNamespace,
        }),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  await recordAudit({
    actor: actor._id,
    action: "TTT_LEARNING_RECORDED",
    entityType: "P3TTTLearning",
    entityId: row._id,
    newStatus: status,
    changes: { nomination: String(nomination._id), course: String(course) },
    reason: `Train-the-Trainer learning progress recorded at ${percent}%`,
  });
  return tttLearningFor(actor, nomination._id);
}

export async function savePractice(actor, nominationId, body) {
  const nomination = await P3.P3TTTNomination.findById(nominationId);
  if (!nomination) fail(404, "TTT nomination not found");
  if (id(nomination.candidate) !== id(actor._id))
    fail(403, "Only the nominated candidate can record teaching practice");
  if (!["ACCEPTED", "IN_PROGRESS", "TEACHING_PRACTICE"].includes(nomination.status))
    fail(
      409,
      `Teaching practice is not available while the nomination is ${nomination.status}`,
    );

  const required = await requiredLearning(nomination);
  if (required.length) {
    const completed = await P3.P3TTTLearning.countDocuments({
      nomination: nomination._id,
      course: { $in: required },
      status: "COMPLETED",
    });
    if (completed < required.length)
      fail(
        409,
        `Complete the Train-the-Trainer learning before teaching practice (${completed}/${required.length} courses complete)`,
      );
  }

  const latest = await P3.P3TTTPractice.findOne({ nomination: nominationId })
    .sort({ version: -1 })
    .lean();
  const submitted = Boolean(body.responseText);
  const practice = await P3.P3TTTPractice.create({
    nomination: nomination._id,
    candidate: actor._id,
    program: nomination.program,
    sessionTitle: body.sessionTitle,
    scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : now(),
    observers: body.observers || [],
    responseText: body.responseText || "",
    privateResources: body.privateResources || [],
    rubric: body.rubric?.length ? body.rubric : DEFAULT_RUBRIC,
    version: (latest?.version || 0) + 1,
    status: submitted ? "SUBMITTED" : "SCHEDULED",
    ...(submitted && { submittedAt: now() }),
    ...(nomination.isSynthetic && {
      isSynthetic: true,
      demoNamespace: nomination.demoNamespace,
    }),
  });

  if (nomination.status !== "TEACHING_PRACTICE" || submitted) {
    const previous = nomination.status;
    nomination.status = "TEACHING_PRACTICE";
    nomination.revision += 1;
    nomination.history.push({
      status: "TEACHING_PRACTICE",
      actor: actor._id,
      at: now(),
      reason: submitted ? "Teaching practice submitted" : "Teaching practice scheduled",
    });
    await nomination.save();
    await recordAudit({
      actor: actor._id,
      action: "TTT_PRACTICE_SAVED",
      entityType: "P3TTTNomination",
      entityId: nomination._id,
      previousStatus: previous,
      newStatus: "TEACHING_PRACTICE",
      reason: "Teaching practice recorded by candidate",
    });
  }

  if (submitted) {
    const reviewers = await P3.P3TTTProgram.findById(nomination.program)
      .select("defaultEvaluator")
      .lean();
    if (reviewers?.defaultEvaluator)
      await notify({
        recipient: reviewers.defaultEvaluator,
        type: "TTT_PRACTICE_SUBMITTED",
        title: "Teaching practice awaits evaluation",
        message: "A Train-the-Trainer candidate submitted teaching practice.",
        entityReference: {
          entityType: "P3TTTPractice",
          entityId: practice._id,
          path: "/trainer/ttt-candidates",
        },
        eventId: `ttt:practice:${practice._id}:submitted`,
      });
  }
  return practice.toObject();
}

export async function evaluatePractice(actor, practiceId, body) {
  const practice = await P3.P3TTTPractice.findById(practiceId);
  if (!practice) fail(404, "Teaching practice not found");
  if (id(practice.candidate) === id(actor._id))
    fail(403, "A candidate cannot evaluate their own teaching practice");
  if (!["SUBMITTED", "UNDER_EVALUATION"].includes(practice.status))
    fail(409, "This teaching practice is not awaiting evaluation");
  if (await P3.P3TTTEvaluation.exists({ practice: practice._id }))
    fail(409, "This teaching practice has already been evaluated");

  const allowed = new Map(
    practice.rubric.map((r) => [r.criterionId, r.maxMarks]),
  );
  for (const mark of body.criterionMarks) {
    const max = allowed.get(mark.criterionId);
    if (max == null)
      fail(400, `Unknown rubric criterion: ${mark.criterionId}`);
    if (mark.marks > max)
      fail(400, `Marks for ${mark.criterionId} exceed the rubric maximum of ${max}`);
  }
  const total = body.criterionMarks.reduce((n, m) => n + m.marks, 0);

  const evaluation = await P3.P3TTTEvaluation.create({
    practice: practice._id,
    nomination: practice.nomination,
    evaluator: actor._id,
    criterionMarks: body.criterionMarks,
    score: total,
    outcome: body.outcome,
    comments: body.comments,
    evaluatedAt: now(),
    ...(practice.isSynthetic && {
      isSynthetic: true,
      demoNamespace: practice.demoNamespace,
    }),
  });

  const nomination = await P3.P3TTTNomination.findById(practice.nomination);
  practice.status =
    body.outcome === "DEMONSTRATED" ? "EVALUATED" : "RETURNED_FOR_REVISION";
  await practice.save();
  if (nomination) {
    const previous = nomination.status;
    nomination.status =
      body.outcome === "DEMONSTRATED" ? "EVALUATED" : "TEACHING_PRACTICE";
    nomination.revision += 1;
    nomination.history.push({
      status: nomination.status,
      actor: actor._id,
      at: now(),
      reason: `Teaching practice evaluated: ${body.outcome}`,
    });
    await nomination.save();
    await recordAudit({
      actor: actor._id,
      action: "TTT_PRACTICE_EVALUATED",
      entityType: "P3TTTNomination",
      entityId: nomination._id,
      previousStatus: previous,
      newStatus: nomination.status,
      changes: { outcome: body.outcome, score: total },
      reason: body.comments || "Teaching practice evaluated",
    });
    await notify({
      recipient: nomination.candidate,
      type: "TTT_PRACTICE_EVALUATED",
      title: "Teaching practice evaluated",
      message:
        body.outcome === "DEMONSTRATED"
          ? "Your teaching practice was demonstrated. Awaiting coordinator verification."
          : "Further teaching practice is required.",
      entityReference: {
        entityType: "P3TTTNomination",
        entityId: nomination._id,
        path: "/trainee/train-the-trainer",
      },
      eventId: `ttt:${nomination._id}:evaluated:${nomination.revision}`,
      isSynthetic: nomination.isSynthetic,
      demoNamespace: nomination.demoNamespace,
    });
  }
  return evaluation.toObject();
}

export async function verifyTrainer(
  actor,
  nominationId,
  { outcome, reason, expectedRevision },
) {
  const session = await mongoose.startSession();
  let nomination, verification, expertise, promotedToTrainer = false;
  try {
    await session.withTransaction(async () => {
      nomination = await P3.P3TTTNomination.findById(nominationId).session(session);
      if (!nomination) fail(404, "TTT nomination not found");
      if (expectedRevision != null && nomination.revision !== expectedRevision)
        fail(409, "This decision is stale. Refresh and try again.");
      if (
        outcome === "VERIFIED" &&
        !["EVALUATED", "IN_PROGRESS"].includes(nomination.status)
      )
        fail(
          409,
          "Verification requires a demonstrated teaching-practice evaluation",
        );

      if (outcome === "VERIFIED") {
        const practice = await P3.P3TTTPractice.findOne({
          nomination: nomination._id,
          status: "EVALUATED",
        })
          .sort({ version: -1 })
          .session(session);
        const evaluation = practice
          ? await P3.P3TTTEvaluation.findOne({ practice: practice._id }).session(
              session,
            )
          : null;
        if (!evaluation || evaluation.outcome !== "DEMONSTRATED")
          fail(409, "A demonstrated teaching-practice evaluation is required");
      }

      if (outcome === "VERIFIED") {
        expertise = await P3.P3TrainerExpertise.findOneAndUpdate(
          {
            trainer: nomination.candidate,
            competency: nomination.competency,
            frameworkVersion: nomination.frameworkVersion,
          },
          {
            $set: {
              approvedLevel: nomination.targetLevel,
              claimedLevel: nomination.targetLevel,
              status: "REVIEWED",
              reviewedBy: actor._id,
              reviewedAt: now(),
              reviewBasis: `Train-the-Trainer verification ${nomination._id}`,
            },
            $push: {
              reviewHistory: {
                status: "REVIEWED",
                actor: actor._id,
                at: now(),
                reason,
                source: "TTT",
              },
            },
            $setOnInsert: {
              qualifications: [],
              domains: [],
              ...(nomination.isSynthetic && {
                isSynthetic: true,
                demoNamespace: nomination.demoNamespace,
              }),
            },
          },
          { upsert: true, new: true, session, setDefaultsOnInsert: true },
        );
        // A verified candidate enters the trainer pool. Application access roles
        // stay separate from professional roles; only a trainee is promoted, and
        // an administrator is never changed.
        promotedToTrainer = Boolean(
          await User.findOneAndUpdate(
            { _id: nomination.candidate, role: "trainee" },
            { $set: { role: "trainer" } },
            { session, new: true },
          ),
        );
      }

      const previous = nomination.status;
      nomination.status = outcome === "VERIFIED" ? "VERIFIED" : "RETURNED";
      nomination.revision += 1;
      nomination.history.push({
        status: nomination.status,
        actor: actor._id,
        at: now(),
        reason,
      });
      await nomination.save({ session });

      [verification] = await P3.P3TTTVerification.create(
        [
          {
            nomination: nomination._id,
            candidate: nomination.candidate,
            competency: nomination.competency,
            frameworkVersion: nomination.frameworkVersion,
            targetLevel: nomination.targetLevel,
            verifiedBy: actor._id,
            outcome,
            reason,
            verifiedAt: now(),
            expertiseCreated: expertise?._id,
            ...(nomination.isSynthetic && {
              isSynthetic: true,
              demoNamespace: nomination.demoNamespace,
            }),
          },
        ],
        { session },
      );

      await P2.P2AuditLog.create(
        [
          {
            actor: actor._id,
            action: "TTT_VERIFICATION",
            entityType: "P3TTTNomination",
            entityId: nomination._id,
            previousStatus: previous,
            newStatus: nomination.status,
            changes: {
              outcome,
              expertise: expertise?._id || null,
              targetLevel: nomination.targetLevel,
              promotedToTrainer,
            },
            reason,
            correlationId: correlation(),
          },
        ],
        { session },
      );
    });
  } finally {
    await session.endSession();
  }

  await notify({
    recipient: nomination.candidate,
    type: outcome === "VERIFIED" ? "TTT_VERIFIED" : "TTT_RETURNED",
    title:
      outcome === "VERIFIED"
        ? "You are now a verified trainer"
        : "Train-the-Trainer returned for further development",
    message:
      outcome === "VERIFIED"
        ? "A coordinator verified your teaching capability. You are now in the trainer pool."
        : reason,
    entityReference: {
      entityType: "P3TTTNomination",
      entityId: nomination._id,
      path:
        outcome === "VERIFIED"
          ? "/trainer/ttt-candidates"
          : "/trainee/train-the-trainer",
    },
    eventId: `ttt:${nomination._id}:${outcome}:${nomination.revision}`,
    isSynthetic: nomination.isSynthetic,
    demoNamespace: nomination.demoNamespace,
  });

  return {
    nomination: await populatedNomination(
      P3.P3TTTNomination.findById(nomination._id),
    ).lean(),
    verification: verification.toObject(),
    expertise: expertise?.toObject() || null,
    promotedToTrainer,
  };
}
