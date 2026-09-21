import mongoose from "mongoose";

const { Schema, model } = mongoose;
const oid = (name, required = true) => ({
  type: Schema.Types.ObjectId,
  ref: name,
  required,
});
const options = { timestamps: true, strict: "throw" };
const synthetic = {
  isSynthetic: { type: Boolean, default: false, index: true },
  demoNamespace: { type: String, index: true },
};
const make = (name, fields, indexes = []) => {
  const schema = new Schema(fields, options);
  indexes.forEach(([keys, value]) => schema.index(keys, value));
  return model(name, schema);
};
const optionSchema = {
  optionId: { type: String, required: true },
  text: { type: String, required: true },
};

export const P3TrainerExpertise = make(
  "P3TrainerExpertise",
  {
    trainer: oid("User"),
    competency: oid("P2Competency"),
    frameworkVersion: Number,
    approvedLevel: { type: Number, min: 1, max: 5 },
    qualifications: [String],
    teachingYears: { type: Number, min: 0, max: 60 },
    status: {
      type: String,
      enum: [
        "SELF_DECLARED",
        "PENDING_REVIEW",
        "REVIEWED",
        "REJECTED",
        // Retained so existing Part 3 records remain readable.
        "PENDING",
        "APPROVED",
      ],
      default: "SELF_DECLARED",
    },
    claimedLevel: { type: Number, min: 1, max: 5 },
    domains: [String],
    relevantExperienceYears: { type: Number, min: 0, max: 60 },
    supportingResources: [oid("P3PrivateResource", false)],
    reviewedBy: oid("User", false),
    reviewedAt: Date,
    reviewBasis: String,
    reviewHistory: [
      {
        status: String,
        actor: oid("User"),
        at: Date,
        reason: String,
        source: String,
      },
    ],
    ...synthetic,
  },
  [[{ trainer: 1, competency: 1, frameworkVersion: 1 }, { unique: true }]],
);

export const P3TrainerAvailability = make(
  "P3TrainerAvailability",
  {
    trainer: oid("User"),
    start: Date,
    end: Date,
    available: Boolean,
    deliveryModes: [String],
    locations: [String],
    preferenceScore: { type: Number, min: 0, max: 1, default: 1 },
    revision: { type: Number, default: 0 },
    reason: String,
    createdBy: oid("User"),
    ...synthetic,
  },
  [[{ trainer: 1, start: 1, end: 1 }, { unique: true }]],
);

export const P3TrainerAssignment = make(
  "P3TrainerAssignment",
  {
    trainer: oid("User"),
    batch: oid("P2Batch"),
    sessionId: { type: Schema.Types.ObjectId, required: true },
    start: Date,
    end: Date,
    status: {
      type: String,
      enum: ["ACTIVE", "UNAVAILABLE", "REPLACED", "CANCELLED"],
      default: "ACTIVE",
    },
    assignedBy: oid("User"),
    assignedAt: Date,
    recommendationPoints: Number,
    explanation: String,
    decisionReason: String,
    rankingDepartureReason: String,
    replaces: oid("P3TrainerAssignment", false),
    scopeTitle: String,
    requirementVersion: String,
    scoringVersion: String,
    suitabilitySnapshot: Schema.Types.Mixed,
    history: [
      {
        status: String,
        actor: oid("User"),
        at: Date,
        reason: String,
      },
    ],
    ...synthetic,
  },
  [
    [
      { batch: 1, sessionId: 1, status: 1 },
      { unique: true, partialFilterExpression: { status: "ACTIVE" } },
    ],
    [{ trainer: 1, start: 1, end: 1 }],
  ],
);

export const P3BatchPermission = make(
  "P3BatchPermission",
  {
    batch: oid("P2Batch"),
    user: oid("User"),
    actions: [
      {
        type: String,
        enum: [
          "CREATE_ASSESSMENT",
          "EVALUATE_SUBMISSION",
          "PUBLISH_RESULT",
          "REVIEW_EVIDENCE",
          "DECIDE_COMPETENCY",
          "VIEW_CAPABILITY",
          "MANAGE_FOLLOW_UP",
          "USE_AI",
          "MANAGE_LEARNING",
          "MANAGE_QUESTION_BANK",
        ],
      },
    ],
    grantedBy: oid("User"),
    reason: String,
    ...synthetic,
  },
  [[{ batch: 1, user: 1 }, { unique: true }]],
);

export const P3Assessment = make(
  "P3Assessment",
  {
    batch: oid("P2Batch"),
    ruleVersion: oid("P2CourseRuleVersion"),
    createdBy: oid("User"),
    title: String,
    course: oid("P2Course", false),
    version: { type: Number, min: 1, default: 1 },
    type: {
      type: String,
      enum: [
        "MCQ",
        "PRACTICAL",
        "WRITTEN_ASSIGNMENT",
        "ASSIGNMENT",
        "WRITTEN",
        "VIVA",
      ],
      required: true,
    },
    instructions: String,
    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED", "CLOSED", "ARCHIVED"],
      default: "DRAFT",
    },
    competency: oid("P2Competency", false),
    frameworkVersion: Number,
    rubricVersion: String,
    maxScore: { type: Number, min: 1, default: 100 },
    passingScore: { type: Number, min: 0, max: 100 },
    opensAt: Date,
    closesAt: Date,
    durationMinutes: { type: Number, min: 1, max: 1440 },
    attemptLimit: { type: Number, min: 1, max: 20, default: 1 },
    negativeMarking: { type: Number, min: 0, default: 0 },
    resultReleasePolicy: {
      type: String,
      enum: ["ON_PUBLICATION", "AFTER_CLOSE", "NEVER"],
      default: "ON_PUBLICATION",
    },
    questionVersions: [
      {
        question: oid("P3Question"),
        questionKey: String,
        version: Number,
        text: String,
        options: [optionSchema],
        correctOptionId: { type: String, select: false },
        marks: Number,
        explanation: String,
        sourceReference: String,
      },
    ],
    rubric: [
      {
        criterionId: String,
        label: String,
        description: String,
        maxMarks: Number,
      },
    ],
    assignedEvaluators: [oid("User", false)],
    questions: [
      {
        prompt: String,
        options: [String],
        correctIndex: Number,
        points: Number,
        sourcePassage: String,
        sourcePage: String,
      },
    ],
    publishedBy: oid("User", false),
    publishedAt: Date,
    ...synthetic,
  },
  [[{ batch: 1, status: 1 }]],
);

export const P3Submission = make(
  "P3Submission",
  {
    enrollment: oid("P2Enrollment"),
    assessment: oid("P3Assessment"),
    trainee: oid("User"),
    answers: [Number],
    responseText: String,
    resourceReferences: [String],
    submittedAt: Date,
    automaticScore: Number,
    status: {
      type: String,
      enum: ["SUBMITTED", "EVALUATED"],
      default: "SUBMITTED",
    },
    ...synthetic,
  },
  [
    [{ enrollment: 1, assessment: 1 }, { unique: true }],
    [{ trainee: 1, submittedAt: -1 }],
  ],
);

export const P3Evaluation = make(
  "P3Evaluation",
  {
    submission: oid("P3Submission"),
    evaluator: oid("User"),
    score: { type: Number, min: 0, max: 100 },
    comments: String,
    evaluatedAt: Date,
    ...synthetic,
  },
  [[{ submission: 1 }, { unique: true }]],
);

export const P3Result = make(
  "P3Result",
  {
    enrollment: oid("P2Enrollment"),
    batch: oid("P2Batch"),
    trainee: oid("User"),
    ruleVersion: oid("P2CourseRuleVersion"),
    outcome: { type: String, enum: ["PASS", "FAIL"], required: true },
    evaluationReferences: [oid("P3Evaluation")],
    status: { type: String, enum: ["DRAFT", "PUBLISHED"], default: "DRAFT" },
    publishedBy: oid("User", false),
    publishedAt: Date,
    publicationReason: String,
    ...synthetic,
  },
  [[{ enrollment: 1 }, { unique: true }], [{ trainee: 1, status: 1 }]],
);

export const P3Evidence = make(
  "P3Evidence",
  {
    owner: oid("User"),
    enrollment: oid("P2Enrollment", false),
    evidenceKey: { type: String, required: true },
    version: { type: Number, min: 1, default: 1 },
    evidenceType: {
      type: String,
      enum: [
        "CERTIFICATE",
        "PROJECT",
        "ASSESSMENT",
        "PRACTICAL_TASK",
        "TRAINER_RECOMMENDATION",
        "OTHER",
      ],
      required: true,
    },
    claimedCompetencies: [
      {
        competency: oid("P2Competency"),
        frameworkVersion: Number,
        rubricVersion: String,
        targetLevel: Number,
      },
    ],
    submission: oid("P3Submission", false),
    assessmentSubmission: oid("P3AssessmentSubmission", false),
    evaluation: oid("P3HumanEvaluation", false),
    resultVersion: oid("P3ResultVersion", false),
    competency: oid("P2Competency", false),
    frameworkVersion: Number,
    rubricVersion: String,
    status: {
      type: String,
      enum: [
        "SUBMITTED",
        "UNDER_REVIEW",
        "VERIFIED",
        "REJECTED",
        "NEEDS_REVISION",
        // Legacy values remain readable.
        "ACCEPTED",
        "RETURNED",
      ],
      default: "SUBMITTED",
    },
    submittedAt: Date,
    description: String,
    supplementText: String,
    resourceReferences: [String],
    privateResources: [oid("P3PrivateResource", false)],
    assignedReviewer: oid("User", false),
    reviewedBy: oid("User", false),
    reviewedAt: Date,
    reviewComments: String,
    reviewReason: String,
    versionHistory: [
      {
        version: Number,
        status: String,
        description: String,
        privateResources: [oid("P3PrivateResource", false)],
        submittedAt: Date,
        reviewer: oid("User", false),
        reviewedAt: Date,
        reason: String,
      },
    ],
    ...synthetic,
  },
  [
    [{ owner: 1, evidenceKey: 1 }, { unique: true }],
    [{ assignedReviewer: 1, status: 1, updatedAt: -1 }],
  ],
);

export const P3CompetencyDecision = make(
  "P3CompetencyDecision",
  {
    trainee: oid("User"),
    competency: oid("P2Competency"),
    frameworkVersion: { type: Number, required: true },
    rubricVersion: { type: String, required: true },
    targetLevel: { type: Number, min: 1, max: 5, required: true },
    demonstratedLevel: { type: Number, min: 1, max: 5, default: null },
    outcome: {
      type: String,
      enum: ["DEMONSTRATED", "NEEDS_PRACTICE"],
      required: true,
    },
    criterionResults: [
      {
        criterionId: String,
        met: Boolean,
        comments: String,
      },
    ],
    evidence: oid("P3Evidence"),
    evidenceVersion: { type: Number, required: true },
    evaluation: oid("P3HumanEvaluation", false),
    reviewer: oid("User"),
    decidedAt: Date,
    reason: { type: String, required: true },
    decisionVersion: { type: Number, min: 1, default: 1 },
    status: {
      type: String,
      enum: ["ACTIVE", "SUPERSEDED", "REVOKED"],
      default: "ACTIVE",
    },
    supersedes: oid("P3CompetencyDecision", false),
    idempotencyKey: { type: String, required: true, unique: true },
    ...synthetic,
  },
  [
    [{ trainee: 1, competency: 1, frameworkVersion: 1, status: 1 }],
    [{ evidence: 1, evidenceVersion: 1 }],
  ],
);

export const P3CompetencyHistory = make(
  "P3CompetencyHistory",
  {
    trainee: oid("User"),
    competency: oid("P2Competency"),
    frameworkVersion: Number,
    previousStatus: String,
    newStatus: String,
    previousLevel: Number,
    newLevel: Number,
    targetLevel: Number,
    outcome: String,
    eventType: { type: String, default: "DECISION" },
    reason: String,
    decision: oid("P3CompetencyDecision"),
    evidence: oid("P3Evidence"),
    evidenceVersion: Number,
    reviewer: oid("User"),
    recordedAt: Date,
    ...synthetic,
  },
  [
    [{ decision: 1, eventType: 1 }, { unique: true }],
    [{ trainee: 1, recordedAt: -1 }],
  ],
);

export const P3FollowUp = make(
  "P3FollowUp",
  {
    trainee: oid("User"),
    sourceDecision: oid("P3CompetencyDecision", false),
    sourceResult: oid("P3ResultVersion", false),
    sourceTrainingNeed: oid("P2TrainingNeed", false),
    linkedTrainingNeed: oid("P2TrainingNeed", false),
    competency: oid("P2Competency"),
    goalLevel: { type: Number, min: 1, max: 5 },
    actionType: {
      type: String,
      enum: [
        "PRACTICE",
        "ADDITIONAL_LEARNING",
        "REASSESSMENT",
        "EVIDENCE_SUBMISSION",
      ],
      required: true,
    },
    recommendedAction: { type: String, required: true },
    explanation: String,
    recommendedCourse: oid("P2Course", false),
    responsibleUser: oid("User", false),
    dueDate: Date,
    status: {
      type: String,
      enum: ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
      default: "OPEN",
    },
    comments: String,
    createdBy: oid("User"),
    history: [
      {
        from: String,
        to: String,
        actor: oid("User"),
        at: Date,
        reason: String,
      },
    ],
    ...synthetic,
  },
  [
    [
      { sourceDecision: 1, actionType: 1 },
      { unique: true, sparse: true },
    ],
    [{ trainee: 1, status: 1, dueDate: 1 }],
  ],
);

export const P3AIRequestMetadata = make(
  "P3AIRequestMetadata",
  {
    actor: oid("User"),
    feature: {
      type: String,
      enum: ["SKILL_EXTRACTION", "COMPETENCY_MATCHING", "MCQ_DRAFTING"],
      required: true,
    },
    provider: String,
    model: String,
    sourceReferenceIds: [String],
    outcome: {
      type: String,
      enum: ["SUCCEEDED", "DISABLED", "FAILED", "INVALID_OUTPUT"],
    },
    errorType: String,
    humanAction: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "EDITED", "REJECTED"],
      default: "PENDING",
    },
    requestId: { type: String, required: true, unique: true },
    ...synthetic,
  },
  [[{ actor: 1, createdAt: -1 }], [{ feature: 1, outcome: 1 }]],
);

export const P3EvidenceReview = make(
  "P3EvidenceReview",
  {
    evidence: oid("P3Evidence"),
    reviewer: oid("User"),
    reviewedAt: Date,
    outcome: {
      type: String,
      enum: ["NOT_ASSESSED", "DEMONSTRATED", "NEEDS_PRACTICE"],
      required: true,
    },
    demonstratedLevel: { type: Number, min: 1, max: 5, default: null },
    comments: String,
    rubricVersion: String,
    ...synthetic,
  },
  [[{ evidence: 1 }, { unique: true }]],
);

export const P3CapabilitySnapshot = make(
  "P3CapabilitySnapshot",
  {
    competency: oid("P2Competency"),
    frameworkVersion: Number,
    jobRole: oid("P2JobRole", false),
    denominator: Number,
    demonstratedCount: Number,
    notAssessedCount: Number,
    needsPracticeCount: Number,
    coveragePercent: Number,
    evidenceAsOf: Date,
    calculatedAt: Date,
    calculatedBy: oid("User"),
    ...synthetic,
  },
  [[{ competency: 1, frameworkVersion: 1, jobRole: 1, calculatedAt: -1 }]],
);

export const P3AiDraft = make(
  "P3AiDraft",
  {
    requestedBy: oid("User"),
    assessment: oid("P3Assessment", false),
    sourceReference: String,
    sourcePage: String,
    sourcePassage: String,
    prompt: String,
    output: Schema.Types.Mixed,
    mode: {
      type: String,
      enum: ["AI_ASSISTED", "MANUAL_FALLBACK"],
      required: true,
    },
    status: {
      type: String,
      enum: ["DRAFT", "REVIEWED", "DISCARDED"],
      default: "DRAFT",
    },
    provider: String,
    errorCode: String,
    ...synthetic,
  },
  [[{ requestedBy: 1, createdAt: -1 }]],
);

export const P3PrivateResource = make(
  "P3PrivateResource",
  {
    owner: oid("User"),
    course: oid("P2Course", false),
    batch: oid("P2Batch", false),
    storageId: { type: Schema.Types.ObjectId, required: true, unique: true },
    filename: String,
    mimeType: String,
    size: Number,
    sha256: String,
    purpose: {
      type: String,
      enum: ["LEARNING", "SUBMISSION", "EVIDENCE"],
      required: true,
    },
    ...synthetic,
  },
  [
    [{ owner: 1, batch: 1, createdAt: -1 }],
    [{ owner: 1, course: 1, createdAt: -1 }],
  ],
);

export const P3TrainerProfile = make(
  "P3TrainerProfile",
  {
    trainer: oid("User"),
    professionalExperienceYears: { type: Number, min: 0, max: 60, default: 0 },
    teachingExperienceYears: { type: Number, min: 0, max: 60, default: 0 },
    domains: [String],
    deliveryModes: [{ type: String, enum: ["ONLINE", "IN_PERSON", "BLENDED"] }],
    locations: [String],
    reviewStatus: {
      type: String,
      enum: ["SELF_DECLARED", "PENDING_REVIEW", "REVIEWED"],
      default: "SELF_DECLARED",
    },
    reviewedBy: oid("User", false),
    reviewedAt: Date,
    reviewReason: String,
    reviewHistory: [
      {
        status: String,
        actor: oid("User"),
        at: Date,
        reason: String,
      },
    ],
    ...synthetic,
  },
  [[{ trainer: 1 }, { unique: true }], [{ reviewStatus: 1 }]],
);

export const P3SuitabilityConfig = make(
  "P3SuitabilityConfig",
  {
    version: { type: String, required: true, unique: true },
    weights: {
      competencyMatch: Number,
      proficiency: Number,
      qualification: Number,
      relevantExperience: Number,
      teachingExperience: Number,
      domainRelevance: Number,
      availabilityFit: Number,
    },
    active: { type: Boolean, default: true },
    createdBy: oid("User"),
    ...synthetic,
  },
  [[{ active: 1, createdAt: -1 }]],
);

export const P3LearningModule = make(
  "P3LearningModule",
  {
    course: oid("P2Course"),
    batch: oid("P2Batch", false),
    order: { type: Number, min: 1, required: true },
    title: { type: String, required: true },
    summary: String,
    announcement: String,
    deadline: Date,
    sessionLink: String,
    completionRule: { type: String, enum: ["VIEW", "MANUAL"], default: "VIEW" },
    version: { type: Number, min: 1, default: 1 },
    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED", "ARCHIVED"],
      default: "DRAFT",
    },
    resources: [
      {
        title: String,
        type: { type: String, enum: ["PDF", "PRESENTATION", "VIDEO", "LINK"] },
        privateResource: oid("P3PrivateResource", false),
        externalUrl: String,
        restricted: { type: Boolean, default: true },
      },
    ],
    createdBy: oid("User"),
    ...synthetic,
  },
  [
    [{ course: 1, batch: 1, order: 1, version: 1 }, { unique: true }],
    [{ batch: 1, status: 1 }],
  ],
);

export const P3LearningProgress = make(
  "P3LearningProgress",
  {
    enrollment: oid("P2Enrollment"),
    module: oid("P3LearningModule"),
    trainee: oid("User"),
    status: {
      type: String,
      enum: ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"],
      default: "NOT_STARTED",
    },
    viewedAt: Date,
    completedAt: Date,
    ...synthetic,
  },
  [
    [{ enrollment: 1, module: 1 }, { unique: true }],
    [{ trainee: 1, status: 1 }],
  ],
);

export const P3Question = make(
  "P3Question",
  {
    course: oid("P2Course"),
    subject: String,
    competency: oid("P2Competency", false),
    frameworkVersion: Number,
    questionKey: { type: String, required: true },
    version: { type: Number, min: 1, required: true },
    text: { type: String, required: true },
    options: [optionSchema],
    correctOptionId: { type: String, required: true, select: false },
    marks: { type: Number, min: 0.01, required: true },
    explanation: String,
    sourceReference: { type: String, required: true },
    provenance: Schema.Types.Mixed,
    status: {
      type: String,
      enum: ["DRAFT", "REVIEWED", "ARCHIVED"],
      default: "DRAFT",
    },
    author: oid("User"),
    reviewer: oid("User", false),
    reviewedAt: Date,
    reviewReason: String,
    ...synthetic,
  },
  [
    [{ questionKey: 1, version: 1 }, { unique: true }],
    [{ course: 1, status: 1 }],
  ],
);

export const P3AssessmentAttempt = make(
  "P3AssessmentAttempt",
  {
    enrollment: oid("P2Enrollment"),
    assessment: oid("P3Assessment"),
    trainee: oid("User"),
    assessmentVersion: Number,
    attemptNumber: { type: Number, min: 1 },
    questionOrder: [String],
    answers: [{ questionId: String, optionId: String, savedAt: Date }],
    startedAt: Date,
    effectiveDeadline: Date,
    submittedAt: Date,
    status: {
      type: String,
      enum: ["IN_PROGRESS", "SUBMITTED", "TIMED_OUT"],
      default: "IN_PROGRESS",
    },
    rawScore: Number,
    maxScore: Number,
    percentage: Number,
    submissionKey: String,
    ...synthetic,
  },
  [
    [{ enrollment: 1, assessment: 1, attemptNumber: 1 }, { unique: true }],
    [
      { enrollment: 1, assessment: 1, status: 1 },
      { unique: true, partialFilterExpression: { status: "IN_PROGRESS" } },
    ],
    [{ effectiveDeadline: 1, status: 1 }],
  ],
);

export const P3AssessmentSubmission = make(
  "P3AssessmentSubmission",
  {
    enrollment: oid("P2Enrollment"),
    assessment: oid("P3Assessment"),
    trainee: oid("User"),
    version: { type: Number, min: 1 },
    previousSubmission: oid("P3AssessmentSubmission", false),
    responseText: String,
    privateResources: [oid("P3PrivateResource", false)],
    submittedAt: Date,
    status: {
      type: String,
      enum: [
        "SUBMITTED",
        "UNDER_EVALUATION",
        "EVALUATED",
        "RETURNED_FOR_REVISION",
      ],
      default: "SUBMITTED",
    },
    ...synthetic,
  },
  [[{ enrollment: 1, assessment: 1, version: 1 }, { unique: true }]],
);

export const P3HumanEvaluation = make(
  "P3HumanEvaluation",
  {
    submission: oid("P3AssessmentSubmission"),
    assessment: oid("P3Assessment"),
    evaluator: oid("User"),
    version: { type: Number, min: 1, default: 1 },
    status: {
      type: String,
      enum: ["PENDING", "IN_REVIEW", "EVALUATED", "RETURNED_FOR_REVISION"],
      default: "PENDING",
    },
    criterionMarks: [{ criterionId: String, marks: Number, comment: String }],
    score: Number,
    outcome: { type: String, enum: ["PASS", "FAIL", "REVISION_REQUIRED"] },
    comments: String,
    evaluatedAt: Date,
    ...synthetic,
  },
  [
    [{ submission: 1, version: 1 }, { unique: true }],
    [{ evaluator: 1, status: 1 }],
  ],
);

export const P3ResultVersion = make(
  "P3ResultVersion",
  {
    enrollment: oid("P2Enrollment"),
    batch: oid("P2Batch"),
    trainee: oid("User"),
    version: { type: Number, min: 1 },
    previousResult: oid("P3ResultVersion", false),
    assessmentAttempts: [oid("P3AssessmentAttempt", false)],
    evaluations: [oid("P3HumanEvaluation", false)],
    totalScore: Number,
    maximumScore: Number,
    percentage: Number,
    outcome: { type: String, enum: ["PASS", "FAIL"] },
    status: {
      type: String,
      enum: ["DRAFT", "READY_FOR_REVIEW", "PUBLISHED", "SUPERSEDED"],
      default: "DRAFT",
    },
    preparedBy: oid("User"),
    publishedBy: oid("User", false),
    publishedAt: Date,
    reason: String,
    ...synthetic,
  },
  [
    [{ enrollment: 1, version: 1 }, { unique: true }],
    [{ trainee: 1, status: 1 }],
  ],
);
