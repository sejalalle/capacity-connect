import mongoose from "mongoose";
import User from "../models/User.js";
import * as P2 from "../models/Part2.js";
import * as P3 from "../models/Part3.js";
import {
  DEFAULT_WEIGHTS,
  SUITABILITY_VERSION,
  ensureSuitabilityConfig,
} from "../services/part3aService.js";
import { DEMO_NAMESPACE } from "./demoPart2.js";

const synthetic = { isSynthetic: true, demoNamespace: DEMO_NAMESPACE };
const reference = () =>
  new Date(process.env.DEMO_REFERENCE_DATE || "2026-10-01T00:00:00.000Z");
const days = (count) => new Date(reference().getTime() + count * 86400000);
const upsert = (Model, query, values) =>
  Model.findOneAndUpdate(
    { ...query, demoNamespace: DEMO_NAMESPACE },
    { $setOnInsert: { ...values, ...synthetic } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

export async function seedPart3(admin, part2) {
  await ensureSuitabilityConfig(admin);
  const batch = await P2.P2Batch.findById(part2.batches[0]._id);
  if (!batch.sessions.length)
    batch.sessions.push({
      title: "Sample Radar Interpretation — guided session",
      subject: "Weather Radar",
      competency: part2.competencies[0]._id,
      frameworkVersion: 1,
      requiredProficiency: 3,
      requiredQualifications: ["Synthetic radar training qualification"],
      start: batch.startDate,
      end: new Date(batch.startDate.getTime() + 3 * 60 * 60 * 1000),
    });
  else {
    batch.sessions[0].frameworkVersion = 1;
    batch.sessions[0].requiredProficiency = 3;
    batch.sessions[0].requiredQualifications = [
      "Synthetic radar training qualification",
    ];
  }
  if (
    !batch.sessions.some(
      (item) => item.title === "Sample Radar Interpretation — practice review",
    )
  )
    batch.sessions.push({
      title: "Sample Radar Interpretation — practice review",
      subject: "Weather Radar",
      competency: part2.competencies[0]._id,
      frameworkVersion: 1,
      requiredProficiency: 3,
      requiredQualifications: ["Synthetic radar training qualification"],
      start: new Date(batch.startDate.getTime() + 24 * 60 * 60 * 1000),
      end: new Date(batch.startDate.getTime() + 27 * 60 * 60 * 1000),
    });
  await batch.save();
  const session = batch.sessions[0];
  const assignmentSession = batch.sessions.find(
    (item) => item.title === "Sample Radar Interpretation — practice review",
  );
  const trainers = await User.find({
    email: {
      $in: [
        "trainer1@example.test",
        "trainer2@example.test",
        "trainer3@example.test",
      ],
    },
  }).sort({ email: 1 });

  for (let index = 0; index < trainers.length; index++) {
    const reviewed = index < 2;
    await upsert(
      P3.P3TrainerProfile,
      { trainer: trainers[index]._id },
      {
        trainer: trainers[index]._id,
        professionalExperienceYears: 9 - index,
        teachingExperienceYears: 6 - index,
        domains: ["Weather Radar"],
        deliveryModes: ["ONLINE", "BLENDED"],
        locations: [batch.location || "Demonstration Training Centre"],
        reviewStatus: reviewed ? "REVIEWED" : "SELF_DECLARED",
        reviewedBy: reviewed ? admin._id : undefined,
        reviewedAt: reviewed ? days(-30) : undefined,
        reviewReason: reviewed
          ? "Synthetic historical profile review for demonstration."
          : "",
        reviewHistory: reviewed
          ? [
              {
                status: "REVIEWED",
                actor: admin._id,
                at: days(-30),
                reason:
                  "Synthetic historical profile review for demonstration.",
              },
            ]
          : [],
      },
    );
    await upsert(
      P3.P3TrainerExpertise,
      {
        trainer: trainers[index]._id,
        competency: part2.competencies[0]._id,
        frameworkVersion: 1,
      },
      {
        trainer: trainers[index]._id,
        competency: part2.competencies[0]._id,
        frameworkVersion: 1,
        claimedLevel: index < 2 ? 4 : 2,
        approvedLevel: reviewed ? 4 - index : undefined,
        qualifications: reviewed
          ? ["Synthetic radar training qualification"]
          : [],
        domains: ["Weather Radar"],
        relevantExperienceYears: 8 - index,
        teachingYears: 6 - index,
        status: reviewed ? "REVIEWED" : "PENDING_REVIEW",
        reviewedBy: reviewed ? admin._id : undefined,
        reviewedAt: reviewed ? days(-30) : undefined,
        reviewBasis: reviewed
          ? "Synthetic historical reviewed expertise; demonstration only."
          : "Awaiting review.",
        reviewHistory: reviewed
          ? [
              {
                status: "REVIEWED",
                actor: admin._id,
                at: days(-30),
                reason:
                  "Synthetic historical reviewed expertise; demonstration only.",
                source: "SYNTHETIC_HISTORICAL_RECORD",
              },
            ]
          : [],
      },
    );
    await upsert(
      P3.P3TrainerAvailability,
      { trainer: trainers[index]._id, start: session.start, end: session.end },
      {
        trainer: trainers[index]._id,
        start: session.start,
        end: session.end,
        available: index < 2,
        reason:
          index < 2
            ? "Synthetic confirmed session availability."
            : "Synthetic unavailable trainer example.",
        deliveryModes: ["ONLINE", "BLENDED"],
        locations: [batch.location || "Demonstration Training Centre"],
        preferenceScore: index === 0 ? 1 : index === 1 ? 0.8 : 0,
        createdBy: trainers[index]._id,
        revision: 1,
      },
    );
    await upsert(
      P3.P3TrainerAvailability,
      {
        trainer: trainers[index]._id,
        start: assignmentSession.start,
        end: assignmentSession.end,
      },
      {
        trainer: trainers[index]._id,
        start: assignmentSession.start,
        end: assignmentSession.end,
        available: index < 2,
        reason:
          index < 2
            ? "Synthetic confirmed practice-review availability."
            : "Synthetic unavailable trainer example.",
        deliveryModes: ["ONLINE", "BLENDED"],
        locations: [batch.location || "Demonstration Training Centre"],
        preferenceScore: index === 0 ? 1 : index === 1 ? 0.8 : 0,
        createdBy: trainers[index]._id,
        revision: 1,
      },
    );
  }

  const replaced = await upsert(
    P3.P3TrainerAssignment,
    { batch: batch._id, sessionId: session._id, status: "REPLACED" },
    {
      trainer: trainers[0]._id,
      batch: batch._id,
      sessionId: session._id,
      start: session.start,
      end: session.end,
      status: "REPLACED",
      scopeTitle: session.title,
      assignedBy: admin._id,
      assignedAt: days(-10),
      recommendationPoints: 94,
      explanation: "Synthetic historical assignment snapshot.",
      decisionReason: "Initial synthetic assignment.",
      rankingDepartureReason: "",
      requirementVersion: `batch-rule:${batch.ruleVersion}`,
      scoringVersion: SUITABILITY_VERSION,
      suitabilitySnapshot: {
        configurationVersion: SUITABILITY_VERSION,
        totalPoints: 94,
        calculatedAt: days(-10),
        weights: DEFAULT_WEIGHTS,
      },
      history: [
        {
          status: "ACTIVE",
          actor: admin._id,
          at: days(-10),
          reason: "Initial synthetic assignment.",
        },
        {
          status: "REPLACED",
          actor: admin._id,
          at: days(-8),
          reason: "Synthetic trainer unavailability.",
        },
      ],
    },
  );
  const assignment = await upsert(
    P3.P3TrainerAssignment,
    { batch: batch._id, sessionId: session._id, status: "ACTIVE" },
    {
      trainer: trainers[1]._id,
      batch: batch._id,
      sessionId: session._id,
      start: session.start,
      end: session.end,
      status: "ACTIVE",
      scopeTitle: session.title,
      assignedBy: admin._id,
      assignedAt: days(-8),
      recommendationPoints: 87,
      explanation:
        "Synthetic reviewed expertise, confirmed availability and compatible delivery profile.",
      decisionReason: "Synthetic coordinator-approved replacement.",
      rankingDepartureReason: "The original trainer became unavailable.",
      replaces: replaced._id,
      requirementVersion: `batch-rule:${batch.ruleVersion}`,
      scoringVersion: SUITABILITY_VERSION,
      suitabilitySnapshot: {
        configurationVersion: SUITABILITY_VERSION,
        totalPoints: 87,
        calculatedAt: days(-8),
        weights: DEFAULT_WEIGHTS,
      },
      history: [
        {
          status: "ACTIVE",
          actor: admin._id,
          at: days(-8),
          reason: "Synthetic coordinator-approved replacement.",
        },
      ],
    },
  );
  const permission = await upsert(
    P3.P3BatchPermission,
    { batch: batch._id, user: trainers[1]._id },
    {
      batch: batch._id,
      user: trainers[1]._id,
      actions: [
        "CREATE_ASSESSMENT",
        "EVALUATE_SUBMISSION",
        "PUBLISH_RESULT",
        "MANAGE_LEARNING",
        "MANAGE_QUESTION_BANK",
      ],
      grantedBy: admin._id,
      reason: "Explicit synthetic Part 3A duties for this batch.",
    },
  );
  await P3.P3BatchPermission.updateOne(
    { _id: permission._id },
    {
      $addToSet: {
        actions: {
          $each: [
            "REVIEW_EVIDENCE",
            "DECIDE_COMPETENCY",
            "MANAGE_FOLLOW_UP",
            "USE_AI",
          ],
        },
      },
    },
  );
  await upsert(
    P3.P3BatchPermission,
    { batch: batch._id, user: admin._id },
    {
      batch: batch._id,
      user: admin._id,
      actions: ["PUBLISH_RESULT"],
      grantedBy: admin._id,
      reason:
        "Explicit synthetic result-publication authority for the demonstration coordinator.",
    },
  );

  const modules = [];
  modules.push(
    await upsert(
      P3.P3LearningModule,
      { batch: batch._id, order: 1, version: 1 },
      {
        course: batch.course,
        batch: batch._id,
        order: 1,
        title: "Sample Radar Product Foundations",
        summary:
          "Synthetic learning module covering interpretation context and quality checks.",
        announcement: "Demonstration content only.",
        deadline: days(40),
        sessionLink: "https://example.test/synthetic-session",
        completionRule: "VIEW",
        version: 1,
        status: "PUBLISHED",
        resources: [
          {
            title: "Synthetic radar reading",
            type: "LINK",
            externalUrl: "https://example.test/synthetic-radar-reading",
            restricted: true,
          },
        ],
        createdBy: trainers[1]._id,
      },
    ),
  );
  modules.push(
    await upsert(
      P3.P3LearningModule,
      { batch: batch._id, order: 2, version: 1 },
      {
        course: batch.course,
        batch: batch._id,
        order: 2,
        title: "Guided Interpretation Practice",
        summary:
          "Apply the supplied synthetic procedure before the practical submission.",
        announcement: "Complete after the foundation module.",
        deadline: days(42),
        completionRule: "MANUAL",
        version: 1,
        status: "PUBLISHED",
        resources: [],
        createdBy: trainers[1]._id,
      },
    ),
  );

  const question = await upsert(
    P3.P3Question,
    { questionKey: "SYN-RAD-Q01", version: 1 },
    {
      course: batch.course,
      subject: "Weather Radar",
      competency: part2.competencies[0]._id,
      frameworkVersion: 1,
      questionKey: "SYN-RAD-Q01",
      version: 1,
      text: "Which step should be recorded before interpreting a synthetic radar feature?",
      options: [
        { optionId: "A", text: "Quality-control context" },
        { optionId: "B", text: "A competency decision" },
        { optionId: "C", text: "A certificate decision" },
      ],
      correctOptionId: "A",
      marks: 10,
      explanation:
        "The source requires quality-control context to be reviewed first.",
      sourceReference: "Synthetic approved radar learning material, page 4",
      provenance: {
        type: "MANUAL",
        note: "Written and reviewed by synthetic demonstration users.",
      },
      status: "REVIEWED",
      author: trainers[0]._id,
      reviewer: trainers[1]._id,
      reviewedAt: days(-7),
      reviewReason: "Synthetic independent question review.",
    },
  );
  const frozenQuestion = await P3.P3Question.findById(question._id)
    .select("+correctOptionId")
    .lean();
  const commonAssessment = {
    batch: batch._id,
    course: batch.course,
    ruleVersion: batch.ruleVersion,
    createdBy: trainers[1]._id,
    version: 1,
    status: "PUBLISHED",
    opensAt: days(-30),
    closesAt: days(90),
    durationMinutes: 30,
    attemptLimit: 2,
    passingScore: 60,
    resultReleasePolicy: "ON_PUBLICATION",
    competency: part2.competencies[0]._id,
    frameworkVersion: 1,
    publishedBy: trainers[1]._id,
    publishedAt: days(-30),
  };
  const mcq = await upsert(
    P3.P3Assessment,
    {
      batch: batch._id,
      title: "Sample Radar Interpretation Knowledge Check",
      version: 1,
    },
    {
      ...commonAssessment,
      title: "Sample Radar Interpretation Knowledge Check",
      type: "MCQ",
      instructions:
        "Answer the reviewed question using the synthetic learning material.",
      maxScore: 10,
      negativeMarking: 0,
      questionVersions: [
        {
          question: frozenQuestion._id,
          questionKey: frozenQuestion.questionKey,
          version: frozenQuestion.version,
          text: frozenQuestion.text,
          options: frozenQuestion.options,
          correctOptionId: frozenQuestion.correctOptionId,
          marks: frozenQuestion.marks,
          explanation: frozenQuestion.explanation,
          sourceReference: frozenQuestion.sourceReference,
        },
      ],
      rubric: [],
      assignedEvaluators: [],
    },
  );
  const practical = await upsert(
    P3.P3Assessment,
    {
      batch: batch._id,
      title: "Sample Radar Interpretation Practical",
      version: 1,
    },
    {
      ...commonAssessment,
      title: "Sample Radar Interpretation Practical",
      type: "PRACTICAL",
      instructions:
        "Interpret the supplied synthetic radar product and state uncertainty.",
      durationMinutes: 120,
      maxScore: 100,
      questionVersions: [],
      rubricVersion: "SYN-RAD-RUBRIC-v1",
      rubric: [
        {
          criterionId: "OBSERVATION",
          label: "Observation",
          description: "Records the relevant synthetic features.",
          maxMarks: 40,
        },
        {
          criterionId: "REASONING",
          label: "Reasoning",
          description: "Explains interpretation and uncertainty.",
          maxMarks: 60,
        },
      ],
      assignedEvaluators: [trainers[1]._id],
    },
  );

  const enrollment = await P2.P2Enrollment.findOne({
    batch: batch._id,
    status: "CONFIRMED",
  });

  const returnedPracticalSubmission = await upsert(
    P3.P3AssessmentSubmission,
    { enrollment: enrollment._id, assessment: practical._id, version: 1 },
    {
      enrollment: enrollment._id,
      assessment: practical._id,
      trainee: enrollment.trainee,
      version: 1,
      responseText:
        "Synthetic initial practical response retained for the revision demonstration.",
      privateResources: [],
      submittedAt: days(-3),
      status: "RETURNED_FOR_REVISION",
    },
  );
  await upsert(
    P3.P3HumanEvaluation,
    { submission: returnedPracticalSubmission._id, version: 1 },
    {
      submission: returnedPracticalSubmission._id,
      assessment: practical._id,
      evaluator: trainers[1]._id,
      version: 1,
      status: "RETURNED_FOR_REVISION",
      criterionMarks: [
        {
          criterionId: "OBSERVATION",
          marks: 20,
          comment: "Add the missing synthetic observation context.",
        },
        {
          criterionId: "REASONING",
          marks: 20,
          comment: "Explain uncertainty before resubmission.",
        },
      ],
      score: 40,
      outcome: "REVISION_REQUIRED",
      comments:
        "Synthetic evaluator requested a clearer interpretation and uncertainty statement.",
      evaluatedAt: days(-2),
    },
  );

  const revisionEvidence = await upsert(
    P3.P3Evidence,
    { owner: part2.trainees[3]._id, evidenceKey: "SYN-REVISION-EVIDENCE" },
    {
      owner: part2.trainees[3]._id,
      evidenceKey: "SYN-REVISION-EVIDENCE",
      version: 1,
      evidenceType: "OTHER",
      claimedCompetencies: [
        {
          competency: part2.competencies[1]._id,
          frameworkVersion: 1,
          rubricVersion: "SYN-RAD-QC-RUBRIC-v1",
          targetLevel: 2,
        },
      ],
      competency: part2.competencies[1]._id,
      frameworkVersion: 1,
      rubricVersion: "SYN-RAD-QC-RUBRIC-v1",
      status: "NEEDS_REVISION",
      submittedAt: days(-6),
      description:
        "Synthetic evidence with insufficient task context, retained for revision demonstration.",
      assignedReviewer: trainers[1]._id,
      reviewedBy: trainers[1]._id,
      reviewedAt: days(-5),
      reviewReason:
        "Add the task context and identify which quality-control criterion the source supports.",
      reviewComments:
        "The evidence has not been rejected and no competency decision was made.",
    },
  );

  // Part 3B historical records are synthetic and remain separate from the
  // live Part 3A journey completed by browser tests.
  await upsert(
    P3.P3TrainerExpertise,
    {
      trainer: trainers[1]._id,
      competency: part2.competencies[2]._id,
      frameworkVersion: 1,
    },
    {
      trainer: trainers[1]._id,
      competency: part2.competencies[2]._id,
      frameworkVersion: 1,
      claimedLevel: 3,
      approvedLevel: 3,
      qualifications: ["Synthetic numerical weather prediction qualification"],
      domains: ["Forecasting"],
      relevantExperienceYears: 7,
      teachingYears: 5,
      status: "REVIEWED",
      reviewedBy: admin._id,
      reviewedAt: days(-30),
      reviewBasis:
        "Synthetic historical reviewed expertise; demonstration only.",
      reviewHistory: [
        {
          status: "REVIEWED",
          actor: admin._id,
          at: days(-30),
          reason: "Synthetic historical review.",
          source: "SYNTHETIC_HISTORICAL_RECORD",
        },
      ],
    },
  );
  const demonstratedEvidence = await upsert(
    P3.P3Evidence,
    { owner: part2.asha._id, evidenceKey: "SYN-ASHA-NWP-EVIDENCE" },
    {
      owner: part2.asha._id,
      submission: new mongoose.Types.ObjectId("000000000000000000000301"),
      evidenceKey: "SYN-ASHA-NWP-EVIDENCE",
      version: 1,
      evidenceType: "PROJECT",
      claimedCompetencies: [
        {
          competency: part2.competencies[2]._id,
          frameworkVersion: 1,
          rubricVersion: "SYN-NWP-RUBRIC-v1",
          targetLevel: 2,
        },
      ],
      competency: part2.competencies[2]._id,
      frameworkVersion: 1,
      rubricVersion: "SYN-NWP-RUBRIC-v1",
      status: "VERIFIED",
      submittedAt: days(-25),
      description: "Synthetic historical project evidence for demonstration.",
      assignedReviewer: trainers[1]._id,
      reviewedBy: trainers[1]._id,
      reviewedAt: days(-23),
      reviewReason: "Accepted for the stated synthetic project-review purpose.",
      reviewComments:
        "Evidence acceptance remained separate from the competency decision.",
    },
  );
  const demonstratedDecision = await upsert(
    P3.P3CompetencyDecision,
    { idempotencyKey: "00000000-0000-4000-8000-000000000301" },
    {
      trainee: part2.asha._id,
      competency: part2.competencies[2]._id,
      frameworkVersion: 1,
      rubricVersion: "SYN-NWP-RUBRIC-v1",
      targetLevel: 2,
      demonstratedLevel: 2,
      outcome: "DEMONSTRATED",
      criterionResults: [
        {
          criterionId: "SYN-NWP-TASK",
          met: true,
          comments: "Synthetic criterion met.",
        },
      ],
      evidence: demonstratedEvidence._id,
      evidenceVersion: 1,
      reviewer: trainers[1]._id,
      decidedAt: days(-22),
      reason: "Synthetic historical human decision against the task rubric.",
      decisionVersion: 1,
      status: "ACTIVE",
      idempotencyKey: "00000000-0000-4000-8000-000000000301",
    },
  );
  await upsert(
    P3.P3CompetencyHistory,
    { decision: demonstratedDecision._id },
    {
      trainee: part2.asha._id,
      competency: part2.competencies[2]._id,
      frameworkVersion: 1,
      previousStatus: "NOT_ASSESSED",
      newStatus: "DEMONSTRATED",
      previousLevel: null,
      newLevel: 2,
      targetLevel: 2,
      outcome: "DEMONSTRATED",
      reason: demonstratedDecision.reason,
      decision: demonstratedDecision._id,
      evidence: demonstratedEvidence._id,
      evidenceVersion: 1,
      reviewer: trainers[1]._id,
      recordedAt: days(-22),
    },
  );
  await P2.P2CompetencyRecord.findOneAndUpdate(
    {
      trainee: part2.asha._id,
      competency: part2.competencies[2]._id,
      frameworkVersion: 1,
    },
    {
      $setOnInsert: {
        trainee: part2.asha._id,
        competency: part2.competencies[2]._id,
        frameworkVersion: 1,
        demonstratedLevel: 2,
        status: "DEMONSTRATED",
        sourceType: "PART3_REVIEW",
        sourceReference: `P3CompetencyDecision:${demonstratedDecision._id}`,
        assessedAt: days(-22),
        reviewer: trainers[1]._id,
        notes: "Synthetic historical human competency decision.",
        ...synthetic,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  const practiceEvidence = await upsert(
    P3.P3Evidence,
    { owner: part2.asha._id, evidenceKey: "SYN-ASHA-RADAR-L4-EVIDENCE" },
    {
      owner: part2.asha._id,
      submission: new mongoose.Types.ObjectId("000000000000000000000302"),
      evidenceKey: "SYN-ASHA-RADAR-L4-EVIDENCE",
      version: 1,
      evidenceType: "PRACTICAL_TASK",
      claimedCompetencies: [
        {
          competency: part2.competencies[0]._id,
          frameworkVersion: 1,
          rubricVersion: "SYN-RAD-RUBRIC-v1",
          targetLevel: 4,
        },
      ],
      competency: part2.competencies[0]._id,
      frameworkVersion: 1,
      rubricVersion: "SYN-RAD-RUBRIC-v1",
      status: "VERIFIED",
      submittedAt: days(-20),
      description: "Synthetic higher-level radar task evidence.",
      assignedReviewer: trainers[1]._id,
      reviewedBy: trainers[1]._id,
      reviewedAt: days(-19),
      reviewReason: "Accepted as reviewable evidence for the stated task only.",
    },
  );
  const practiceDecision = await upsert(
    P3.P3CompetencyDecision,
    { idempotencyKey: "00000000-0000-4000-8000-000000000302" },
    {
      trainee: part2.asha._id,
      competency: part2.competencies[0]._id,
      frameworkVersion: 1,
      rubricVersion: "SYN-RAD-RUBRIC-v1",
      targetLevel: 4,
      demonstratedLevel: null,
      outcome: "NEEDS_PRACTICE",
      criterionResults: [
        {
          criterionId: "REASONING",
          met: false,
          comments:
            "Further guided practice recorded in this synthetic example.",
        },
      ],
      evidence: practiceEvidence._id,
      evidenceVersion: 1,
      reviewer: trainers[1]._id,
      decidedAt: days(-18),
      reason:
        "The synthetic L4 task criteria were not fully demonstrated; the valid historical L2 remains unchanged.",
      decisionVersion: 1,
      status: "ACTIVE",
      idempotencyKey: "00000000-0000-4000-8000-000000000302",
    },
  );
  await upsert(
    P3.P3CompetencyHistory,
    { decision: practiceDecision._id },
    {
      trainee: part2.asha._id,
      competency: part2.competencies[0]._id,
      frameworkVersion: 1,
      previousStatus: "DEMONSTRATED",
      newStatus: "DEMONSTRATED",
      previousLevel: 2,
      newLevel: 2,
      targetLevel: 4,
      outcome: "NEEDS_PRACTICE",
      reason: practiceDecision.reason,
      decision: practiceDecision._id,
      evidence: practiceEvidence._id,
      evidenceVersion: 1,
      reviewer: trainers[1]._id,
      recordedAt: days(-18),
    },
  );
  await upsert(
    P3.P3FollowUp,
    { sourceDecision: practiceDecision._id, actionType: "PRACTICE" },
    {
      trainee: part2.asha._id,
      sourceDecision: practiceDecision._id,
      competency: part2.competencies[0]._id,
      goalLevel: 4,
      actionType: "PRACTICE",
      recommendedAction:
        "Complete guided radar interpretation practice and submit a new task sample.",
      explanation:
        "The higher-level task needs practice; the reviewed L2 record remains valid.",
      recommendedCourse: part2.courses[1]._id,
      responsibleUser: trainers[1]._id,
      dueDate: days(60),
      status: "OPEN",
      comments: "Synthetic follow-up learning need.",
      createdBy: trainers[1]._id,
    },
  );

  const tttProgram = await upsert(
    P3.P3TTTProgram,
    { title: "Train-the-Trainer: Weather Radar Interpretation" },
    {
      title: "Train-the-Trainer: Weather Radar Interpretation",
      competency: part2.competencies[0]._id,
      frameworkVersion: 1,
      targetLevel: 2,
      courses: [part2.courses[0]._id],
      teachingPracticeRequirements:
        "Deliver one observed radar-interpretation session and a short teaching practice.",
      defaultEvaluator: trainers[0]._id,
      status: "ACTIVE",
      createdBy: admin._id,
    },
  );

  const tttCandidate = part2.trainees[1];
  await upsert(
    P2.P2CompetencyRecord,
    {
      trainee: tttCandidate._id,
      competency: part2.competencies[0]._id,
      frameworkVersion: 1,
    },
    {
      trainee: tttCandidate._id,
      competency: part2.competencies[0]._id,
      frameworkVersion: 1,
      demonstratedLevel: 2,
      status: "DEMONSTRATED",
      sourceType: "PART3_REVIEW",
      reviewer: trainers[1]._id,
      assessedAt: days(-20),
      reviewDueAt: days(345),
    },
  );

  const tttNominated = await upsert(
    P3.P3TTTNomination,
    { candidate: part2.asha._id, program: tttProgram._id },
    {
      candidate: part2.asha._id,
      program: tttProgram._id,
      competency: part2.competencies[0]._id,
      frameworkVersion: 1,
      targetLevel: 2,
      nominatedBy: admin._id,
      rationale:
        "Synthetic demonstration nomination: reviewed radar competence at the target level.",
      status: "NOMINATED",
      revision: 0,
      requestId: "d3b1f1a2-0000-4000-8000-000000000001",
      history: [
        {
          status: "NOMINATED",
          actor: admin._id,
          at: days(-6),
          reason: "Synthetic demonstration nomination.",
        },
      ],
    },
  );

  const tttReady = await upsert(
    P3.P3TTTNomination,
    { candidate: tttCandidate._id, program: tttProgram._id },
    {
      candidate: tttCandidate._id,
      program: tttProgram._id,
      competency: part2.competencies[0]._id,
      frameworkVersion: 1,
      targetLevel: 2,
      nominatedBy: admin._id,
      rationale:
        "Synthetic demonstration: subject expert proposed for teaching development.",
      status: "EVALUATED",
      revision: 2,
      requestId: "d3b1f1a2-0000-4000-8000-000000000002",
      history: [
        {
          status: "NOMINATED",
          actor: admin._id,
          at: days(-12),
          reason: "Synthetic demonstration nomination.",
        },
        {
          status: "ACCEPTED",
          actor: tttCandidate._id,
          at: days(-11),
          reason: "Candidate accepted the nomination.",
        },
        {
          status: "TEACHING_PRACTICE",
          actor: tttCandidate._id,
          at: days(-8),
          reason: "Teaching practice submitted.",
        },
        {
          status: "EVALUATED",
          actor: trainers[0]._id,
          at: days(-5),
          reason: "Teaching practice evaluated: DEMONSTRATED.",
        },
      ],
    },
  );

  const tttPractice = await upsert(
    P3.P3TTTPractice,
    { nomination: tttReady._id, version: 1 },
    {
      nomination: tttReady._id,
      candidate: tttCandidate._id,
      program: tttProgram._id,
      sessionTitle: "Synthetic radar interpretation teaching session",
      scheduledAt: days(-8),
      observers: [trainers[0]._id],
      responseText:
        "Synthetic teaching practice: explained radar pattern interpretation and checked trainee understanding.",
      rubric: [
        { criterionId: "SUBJECT_ACCURACY", label: "Subject accuracy", maxMarks: 30 },
        { criterionId: "STRUCTURE", label: "Structure and clarity", maxMarks: 30 },
        { criterionId: "ENGAGEMENT", label: "Trainee engagement", maxMarks: 20 },
        { criterionId: "ASSESSMENT", label: "Assessment of learning", maxMarks: 20 },
      ],
      version: 1,
      status: "EVALUATED",
      submittedAt: days(-8),
    },
  );

  await upsert(
    P3.P3TTTEvaluation,
    { practice: tttPractice._id },
    {
      practice: tttPractice._id,
      nomination: tttReady._id,
      evaluator: trainers[0]._id,
      criterionMarks: [
        { criterionId: "SUBJECT_ACCURACY", marks: 26, comment: "Accurate content." },
        { criterionId: "STRUCTURE", marks: 24, comment: "Clear structure." },
        { criterionId: "ENGAGEMENT", marks: 17, comment: "Good interaction." },
        { criterionId: "ASSESSMENT", marks: 16, comment: "Checked understanding." },
      ],
      score: 83,
      outcome: "DEMONSTRATED",
      comments:
        "Synthetic teaching-practice evaluation; awaiting coordinator verification.",
      evaluatedAt: days(-5),
    },
  );

  const announcements = [
    {
      title: "New radar interpretation course published",
      body: "A new radar interpretation course is now available in the catalogue. Enrol from the Courses workspace.",
      category: "NEW_CONTENT",
      audience: "ALL",
      pinned: true,
    },
    {
      title: "Quarterly competency review window opens",
      body: "Coordinators will review recorded evidence this quarter. Ensure your evidence portfolio is up to date.",
      category: "ANNOUNCEMENT",
      audience: "TRAINEE",
      pinned: false,
    },
    {
      title: "Trainer capacity planning reminder",
      body: "Review trainer capacity and training demand before the next batch cycle.",
      category: "NOTIFICATION",
      audience: "TRAINER",
      pinned: false,
    },
  ];
  for (const item of announcements)
    await upsert(
      P2.P2Announcement,
      { title: item.title },
      {
        ...item,
        status: "PUBLISHED",
        showOnHomepage: true,
        publishAt: days(-3),
        createdBy: admin._id,
        history: [
          {
            action: "PUBLISHED",
            actor: admin._id,
            at: days(-3),
            reason: "Synthetic demonstration announcement.",
          },
        ],
      },
    );
  await upsert(
    P2.P2Announcement,
    { title: "Draft: upcoming monsoon preparedness workshop" },
    {
      title: "Draft: upcoming monsoon preparedness workshop",
      body: "Draft announcement pending coordinator publication.",
      category: "ANNOUNCEMENT",
      audience: "ALL",
      status: "DRAFT",
      showOnHomepage: true,
      createdBy: admin._id,
    },
  );

  return {
    batch,
    session,
    assignmentSession,
    trainers,
    assignment,
    replaced,
    permission,
    enrollment,
    modules,
    question,
    practical,
    mcq,
    returnedPracticalSubmission,
    revisionEvidence,
    demonstratedEvidence,
    demonstratedDecision,
    practiceEvidence,
    practiceDecision,
    tttProgram,
    tttNominated,
    tttReady,
  };
}
