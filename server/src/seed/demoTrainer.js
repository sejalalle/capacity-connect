import * as P2 from "../models/Part2.js";
import * as P3 from "../models/Part3.js";
import { SUITABILITY_VERSION } from "../services/part3aService.js";
import { DEMO_NAMESPACE } from "./demoPart2.js";

// Additive synthetic dataset for the trainer workspace. It runs after the
// Part 2 and Part 3 seeds so that every trainer page has a populated, coherent
// roster without changing the records the Part 2/3 seeds already guarantee.
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

export async function seedTrainerWorkspace(admin, part2, part3) {
  // The trainer who holds the active session assignment and batch permission.
  const head = part3.trainers[1];
  const primaryBatch = part2.batches[0];
  const secondaryBatch = part2.batches[1];

  await upsert(
    P3.P3BatchPermission,
    { batch: secondaryBatch._id, user: head._id },
    {
      batch: secondaryBatch._id,
      user: head._id,
      actions: [
        "CREATE_ASSESSMENT",
        "EVALUATE_SUBMISSION",
        "MANAGE_LEARNING",
        "MANAGE_QUESTION_BANK",
        "PUBLISH_RESULT",
      ],
      grantedBy: admin._id,
      reason: "Explicit synthetic delivery duties for a second demonstration batch.",
    },
  );

  const secondaryBatchDoc = await P2.P2Batch.findById(secondaryBatch._id);
  for (const [offsetDays, title] of [
    [16, "Advanced Radar Pattern Workshop"],
    [23, "Advanced Radar Case Review Session"],
  ])
    if (!secondaryBatchDoc.sessions.some((row) => row.title === title))
      secondaryBatchDoc.sessions.push({
        title,
        subject: "Weather Radar",
        competency: part2.competencies[0]._id,
        frameworkVersion: 1,
        requiredProficiency: 4,
        requiredQualifications: ["Synthetic advanced radar qualification"],
        start: days(offsetDays),
        end: new Date(days(offsetDays).getTime() + 3 * 60 * 60 * 1000),
      });
  await secondaryBatchDoc.save();
  const workshop = secondaryBatchDoc.sessions.find(
    (row) => row.title === "Advanced Radar Pattern Workshop",
  );
  await upsert(
    P3.P3TrainerAssignment,
    { batch: secondaryBatch._id, sessionId: workshop._id, status: "ACTIVE" },
    {
      trainer: head._id,
      batch: secondaryBatch._id,
      sessionId: workshop._id,
      start: workshop.start,
      end: workshop.end,
      status: "ACTIVE",
      scopeTitle: workshop.title,
      assignedBy: admin._id,
      assignedAt: days(-12),
      recommendationPoints: 91,
      explanation:
        "Synthetic reviewed expertise, qualification and confirmed availability.",
      decisionReason:
        "Synthetic coordinator-approved delivery for the advanced workshop.",
      rankingDepartureReason: "",
      requirementVersion: `batch-rule:${secondaryBatch.ruleVersion}`,
      scoringVersion: SUITABILITY_VERSION,
      history: [
        {
          status: "ACTIVE",
          actor: admin._id,
          at: days(-12),
          reason: "Synthetic coordinator-approved delivery.",
        },
      ],
    },
  );

  const secondaryModules = [];
  for (const [order, title, summary] of [
    [
      1,
      "Advanced Radar Pattern Recognition",
      "Synthetic advanced module covering pattern recognition and quality checks.",
    ],
    [
      2,
      "Advanced Radar Case Review",
      "Synthetic case-review module applied before the advanced practical.",
    ],
  ])
    secondaryModules.push(
      await upsert(
        P3.P3LearningModule,
        { course: secondaryBatch.course, batch: secondaryBatch._id, order, version: 1 },
        {
          course: secondaryBatch.course,
          batch: secondaryBatch._id,
          order,
          title,
          summary,
          announcement: "Demonstration content only.",
          deadline: days(70 + order),
          completionRule: "MANUAL",
          version: 1,
          status: "PUBLISHED",
          resources: [
            {
              title: `${title} — synthetic reading`,
              type: "LINK",
              externalUrl: "https://example.test/synthetic-advanced-reading",
              restricted: true,
            },
          ],
          createdBy: head._id,
        },
      ),
    );

  const ensureNeed = (trainee) =>
    upsert(
      P2.P2TrainingNeed,
      { beneficiary: trainee._id, title: "Synthetic trainer roster development need" },
      {
        title: "Synthetic trainer roster development need",
        description:
          "Synthetic approved need supporting the trainer roster demonstration.",
        requestedBy: trainee._id,
        beneficiary: trainee._id,
        targetJobRole: part2.role._id,
        competencyGoals: [part2.competencies[0]._id],
        justification:
          "Synthetic record used only to demonstrate the trainer roster page.",
        priority: "MEDIUM",
        status: "APPROVED",
        reviewedBy: admin._id,
        reviewedAt: days(-20),
        reviewReason: "Approved synthetic demonstration request.",
      },
    );

  const enroll = async (trainee, batch) => {
    const need = await ensureNeed(trainee);
    const nomination = await upsert(
      P2.P2Nomination,
      { trainee: trainee._id, batch: batch._id },
      {
        trainee: trainee._id,
        course: batch.course,
        batch: batch._id,
        trainingNeed: need._id,
        ruleVersion: batch.ruleVersion,
        reason: "Synthetic roster application.",
        eligibilitySnapshot: {
          status: "ELIGIBLE",
          ruleVersion: 1,
          checkedAt: days(-22),
          checks: [],
          blockingReasons: [],
          missingInformation: [],
        },
        status: "APPROVED",
        submittedAt: days(-24),
        reviewedAt: days(-22),
        reviewedBy: admin._id,
        decisionReason:
          "Eligibility confirmed and a seat allocated for the demonstration.",
        revision: 1,
      },
    );
    return upsert(
      P2.P2Enrollment,
      { trainee: trainee._id, batch: batch._id },
      {
        trainee: trainee._id,
        batch: batch._id,
        nomination: nomination._id,
        status: "CONFIRMED",
        admittedBy: admin._id,
        admittedAt: days(-22),
      },
    );
  };

  const primaryRoster = [part2.trainees[3], part2.trainees[4], part2.trainees[5]];
  const secondaryRoster = [
    part2.trainees[6],
    part2.trainees[7],
    part2.trainees[8],
  ];
  const primaryEnrollments = new Map();
  for (const trainee of primaryRoster)
    primaryEnrollments.set(String(trainee._id), await enroll(trainee, primaryBatch));
  const secondaryEnrollments = new Map();
  for (const trainee of secondaryRoster)
    secondaryEnrollments.set(
      String(trainee._id),
      await enroll(trainee, secondaryBatch),
    );

  for (const batch of [primaryBatch, secondaryBatch]) {
    const confirmed = await P2.P2Enrollment.countDocuments({
      batch: batch._id,
      status: "CONFIRMED",
    });
    await P2.P2Batch.updateOne(
      { _id: batch._id },
      {
        $set: {
          seatsAllocated: confirmed,
          capacity: Math.max(batch.capacity, confirmed),
        },
      },
    );
  }

  const recordProgress = async (enrollment, module, status, at) =>
    upsert(
      P3.P3LearningProgress,
      { enrollment: enrollment._id, module: module._id },
      {
        enrollment: enrollment._id,
        module: module._id,
        trainee: enrollment.trainee,
        status,
        viewedAt: at,
        completedAt: status === "COMPLETED" ? at : undefined,
      },
    );

  const primaryModules = part3.modules;
  const primary = (index) =>
    primaryEnrollments.get(String(primaryRoster[index]._id));
  const secondary = (index) =>
    secondaryEnrollments.get(String(secondaryRoster[index]._id));

  await recordProgress(primary(0), primaryModules[0], "COMPLETED", days(-8));
  await recordProgress(primary(0), primaryModules[1], "COMPLETED", days(-7));
  await recordProgress(primary(1), primaryModules[0], "COMPLETED", days(-6));
  await recordProgress(primary(1), primaryModules[1], "IN_PROGRESS", days(-3));
  await recordProgress(primary(2), primaryModules[0], "IN_PROGRESS", days(-2));
  await recordProgress(secondary(0), secondaryModules[0], "COMPLETED", days(-9));
  await recordProgress(secondary(0), secondaryModules[1], "COMPLETED", days(-6));
  await recordProgress(secondary(1), secondaryModules[0], "COMPLETED", days(-5));
  await recordProgress(
    secondary(1),
    secondaryModules[1],
    "IN_PROGRESS",
    days(-2),
  );

  const question = await upsert(
    P3.P3Question,
    { questionKey: "SYN-RAD-Q02", version: 1 },
    {
      course: secondaryBatch.course,
      subject: "Weather Radar",
      competency: part2.competencies[0]._id,
      frameworkVersion: 1,
      questionKey: "SYN-RAD-Q02",
      version: 1,
      text: "Which record must accompany an advanced synthetic radar interpretation before it is submitted for evaluation?",
      options: [
        { optionId: "A", text: "The quality-control context" },
        { optionId: "B", text: "A competency level decision" },
        { optionId: "C", text: "A completion certificate" },
      ],
      correctOptionId: "A",
      marks: 10,
      explanation:
        "Approved practice requires the quality-control context to be recorded with the interpretation.",
      sourceReference: "Synthetic advanced radar learning material, page 7",
      provenance: {
        type: "MANUAL",
        note: "Written by the synthetic demonstration trainer.",
      },
      status: "REVIEWED",
      author: head._id,
      reviewer: part3.trainers[0]._id,
      reviewedAt: days(-9),
      reviewReason: "Synthetic independent question review.",
    },
  );
  const frozenQuestion = await P3.P3Question.findById(question._id)
    .select("+correctOptionId")
    .lean();
  const commonAssessment = {
    batch: secondaryBatch._id,
    course: secondaryBatch.course,
    ruleVersion: secondaryBatch.ruleVersion,
    createdBy: head._id,
    version: 1,
    status: "PUBLISHED",
    opensAt: days(-15),
    closesAt: days(75),
    durationMinutes: 30,
    attemptLimit: 2,
    passingScore: 60,
    resultReleasePolicy: "ON_PUBLICATION",
    competency: part2.competencies[0]._id,
    frameworkVersion: 1,
    publishedBy: head._id,
    publishedAt: days(-15),
  };
  const advancedMcq = await upsert(
    P3.P3Assessment,
    {
      batch: secondaryBatch._id,
      title: "Advanced Radar Interpretation Knowledge Check",
      version: 1,
    },
    {
      ...commonAssessment,
      title: "Advanced Radar Interpretation Knowledge Check",
      type: "MCQ",
      instructions:
        "Answer the reviewed question using the advanced synthetic material.",
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
      assignedEvaluators: [head._id],
    },
  );
  const advancedPractical = await upsert(
    P3.P3Assessment,
    {
      batch: secondaryBatch._id,
      title: "Advanced Radar Interpretation Practical",
      version: 1,
    },
    {
      ...commonAssessment,
      title: "Advanced Radar Interpretation Practical",
      type: "PRACTICAL",
      instructions:
        "Interpret the supplied advanced synthetic radar product and state uncertainty.",
      durationMinutes: 120,
      maxScore: 100,
      questionVersions: [],
      rubricVersion: "SYN-ADV-RUBRIC-v1",
      rubric: [
        {
          criterionId: "ANALYSIS",
          label: "Analysis",
          description: "Identifies the advanced synthetic features.",
          maxMarks: 50,
        },
        {
          criterionId: "JUDGEMENT",
          label: "Judgement",
          description: "States uncertainty and limitations.",
          maxMarks: 50,
        },
      ],
      assignedEvaluators: [head._id],
    },
  );

  await upsert(
    P3.P3AssessmentAttempt,
    {
      enrollment: secondary(0)._id,
      assessment: advancedMcq._id,
      attemptNumber: 1,
    },
    {
      enrollment: secondary(0)._id,
      assessment: advancedMcq._id,
      trainee: secondary(0).trainee,
      assessmentVersion: 1,
      attemptNumber: 1,
      questionOrder: ["SYN-RAD-Q02"],
      answers: [{ questionId: "SYN-RAD-Q02", optionId: "A", savedAt: days(-9) }],
      startedAt: days(-9),
      effectiveDeadline: days(-8),
      submittedAt: days(-9),
      status: "SUBMITTED",
      rawScore: 10,
      maxScore: 10,
      percentage: 100,
      submissionKey: "5f0d1c2a-0000-4000-8000-000000000001",
    },
  );

  const evaluatedSubmission = await upsert(
    P3.P3AssessmentSubmission,
    { enrollment: secondary(0)._id, assessment: advancedPractical._id, version: 1 },
    {
      enrollment: secondary(0)._id,
      assessment: advancedPractical._id,
      trainee: secondary(0).trainee,
      version: 1,
      responseText:
        "Synthetic advanced practical response already reviewed by the demonstration trainer.",
      privateResources: [],
      submittedAt: days(-11),
      status: "EVALUATED",
    },
  );
  await upsert(
    P3.P3HumanEvaluation,
    { submission: evaluatedSubmission._id, version: 1 },
    {
      submission: evaluatedSubmission._id,
      assessment: advancedPractical._id,
      evaluator: head._id,
      version: 1,
      status: "EVALUATED",
      criterionMarks: [
        { criterionId: "ANALYSIS", marks: 42, comment: "Features identified." },
        {
          criterionId: "JUDGEMENT",
          marks: 38,
          comment: "Uncertainty stated for the synthetic case.",
        },
      ],
      score: 80,
      outcome: "PASS",
      comments: "Synthetic evaluation recorded by the demonstration trainer.",
      evaluatedAt: days(-10),
    },
  );
  await upsert(
    P3.P3AssessmentSubmission,
    { enrollment: secondary(1)._id, assessment: advancedPractical._id, version: 1 },
    {
      enrollment: secondary(1)._id,
      assessment: advancedPractical._id,
      trainee: secondary(1).trainee,
      version: 1,
      responseText:
        "Synthetic advanced practical response awaiting the demonstration trainer's evaluation.",
      privateResources: [],
      submittedAt: days(-2),
      status: "SUBMITTED",
    },
  );

  const resultEnrollment = primary(0);
  await upsert(
    P3.P3ResultVersion,
    { enrollment: resultEnrollment._id, version: 1 },
    {
      enrollment: resultEnrollment._id,
      batch: primaryBatch._id,
      trainee: resultEnrollment.trainee,
      version: 1,
      assessmentAttempts: [],
      evaluations: [],
      totalScore: 80,
      maximumScore: 100,
      percentage: 80,
      outcome: "PASS",
      status: "PUBLISHED",
      preparedBy: admin._id,
      publishedBy: admin._id,
      publishedAt: days(-5),
      reason: "Synthetic published result for the demonstration trainer roster.",
    },
  );

  const feedbackPlan = [
    {
      targetType: "COURSE",
      target: primaryBatch.course,
      rating: 5,
      comment: "The synthetic course structure was clear.",
    },
    {
      targetType: "EXPERIENCE",
      target: primaryBatch._id,
      rating: 4,
      comment: "Well-paced synthetic delivery.",
    },
    {
      targetType: "RESOURCE",
      target: primaryModules[0]._id,
      rating: 4,
      comment: "The synthetic reading supported the practical task.",
    },
    {
      targetType: "TRAINER",
      target: head._id,
      rating: 5,
      comment: "Explained the synthetic procedure clearly.",
    },
  ];
  for (const [index, trainee] of primaryRoster.entries()) {
    const enrollment = primaryEnrollments.get(String(trainee._id));
    for (const item of feedbackPlan)
      await upsert(
        P3.P3Feedback,
        {
          enrollment: enrollment._id,
          targetType: item.targetType,
          target: item.target,
        },
        {
          trainee: trainee._id,
          enrollment: enrollment._id,
          batch: primaryBatch._id,
          targetType: item.targetType,
          target: item.target,
          rating: Math.max(1, item.rating - (index % 2)),
          comment: item.comment,
        },
      );
  }

  return {
    head,
    primaryBatch,
    secondaryBatch,
    primaryEnrollments: [...primaryEnrollments.values()],
    secondaryEnrollments: [...secondaryEnrollments.values()],
    modules: secondaryModules,
    question,
    advancedMcq,
    advancedPractical,
  };
}
