import mongoose from "mongoose";

const { Schema, model } = mongoose;
const oid = (name, required = true) => ({
  type: Schema.Types.ObjectId,
  ref: name,
  required,
});
const synthetic = {
  isSynthetic: { type: Boolean, default: false, index: true },
  demoNamespace: { type: String, trim: true, index: true },
};
const options = { timestamps: true, strict: "throw" };
const make = (name, fields, indexes = []) => {
  const schema = new Schema(fields, options);
  indexes.forEach(([keys, value]) => schema.index(keys, value));
  return model(name, schema);
};

export const P2JobRole = make(
  "P2JobRole",
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    status: { type: String, enum: ["ACTIVE", "ARCHIVED"], default: "ACTIVE" },
    createdBy: oid("User"),
    ...synthetic,
  },
  [[{ title: 1, demoNamespace: 1 }, { unique: true }]],
);

export const P2Competency = make(
  "P2Competency",
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true },
    description: String,
    domain: { type: String, required: true, trim: true },
    version: { type: Number, required: true, min: 1 },
    levels: [
      {
        value: { type: Number, min: 1, max: 5 },
        label: String,
        definition: String,
        criteria: [
          {
            criterionId: { type: String, required: true },
            description: { type: String, required: true },
            evidenceTypes: [
              {
                type: String,
                enum: [
                  "CERTIFICATE",
                  "PROJECT",
                  "ASSESSMENT",
                  "PRACTICAL_TASK",
                  "TRAINER_RECOMMENDATION",
                  "OTHER",
                ],
              },
            ],
            rubricVersion: { type: String, required: true },
            foundationalCriteria: [String],
          },
        ],
      },
    ],
    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED", "ARCHIVED"],
      default: "DRAFT",
    },
    createdBy: oid("User"),
    ...synthetic,
  },
  [[{ code: 1, version: 1 }, { unique: true }], [{ domain: 1, status: 1 }]],
);

export const P2RoleRequirement = make(
  "P2RoleRequirement",
  {
    jobRole: oid("P2JobRole"),
    competency: oid("P2Competency"),
    competencyVersion: Number,
    requiredLevel: { type: Number, min: 1, max: 5, required: true },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "MEDIUM",
    },
    version: { type: Number, min: 1, required: true },
    effectiveAt: Date,
    createdBy: oid("User"),
    ...synthetic,
  },
  [[{ jobRole: 1, competency: 1, version: 1 }, { unique: true }]],
);

export const P2CompetencyRecord = make(
  "P2CompetencyRecord",
  {
    trainee: oid("User"),
    competency: oid("P2Competency"),
    frameworkVersion: Number,
    demonstratedLevel: { type: Number, min: 1, max: 5, default: null },
    selfAssessedLevel: { type: Number, min: 1, max: 5, default: null },
    status: {
      type: String,
      enum: ["NOT_ASSESSED", "UNDER_REVIEW", "DEMONSTRATED", "NEEDS_PRACTICE"],
      required: true,
    },
    sourceType: {
      type: String,
      enum: ["HISTORICAL_REVIEW", "PART3_REVIEW", "NONE"],
      default: "NONE",
    },
    sourceReference: String,
    assessedAt: Date,
    reviewDueAt: Date,
    reviewer: oid("User", false),
    notes: String,
    ...synthetic,
  },
  [
    [{ trainee: 1, competency: 1, frameworkVersion: 1 }, { unique: true }],
    [{ trainee: 1, status: 1 }],
  ],
);

const eventHistory = [
  {
    from: String,
    to: String,
    actor: oid("User"),
    at: { type: Date, default: Date.now },
    reason: String,
  },
];
export const P2TrainingNeed = make(
  "P2TrainingNeed",
  {
    title: { type: String, required: true },
    description: String,
    requestedBy: oid("User"),
    beneficiary: oid("User"),
    targetJobRole: oid("P2JobRole"),
    competencyGoals: [oid("P2Competency")],
    justification: { type: String, required: true },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "MEDIUM",
    },
    status: {
      type: String,
      enum: [
        "DRAFT",
        "SUBMITTED",
        "UNDER_REVIEW",
        "APPROVED",
        "RETURNED",
        "RESUBMITTED",
        "REJECTED",
        "CLOSED",
        "WITHDRAWN",
      ],
      default: "DRAFT",
    },
    reviewedBy: oid("User", false),
    reviewedAt: Date,
    reviewReason: String,
    revision: { type: Number, default: 0 },
    history: eventHistory,
    ...synthetic,
  },
  [[{ beneficiary: 1, status: 1, createdAt: -1 }]],
);

export const P2Course = make(
  "P2Course",
  {
    title: { type: String, required: true },
    code: { type: String, required: true },
    description: String,
    domain: String,
    category: String,
    duration: {
      value: Number,
      unit: { type: String, enum: ["HOURS", "DAYS", "WEEKS"] },
    },
    difficulty: {
      type: String,
      enum: ["FOUNDATION", "INTERMEDIATE", "ADVANCED"],
    },
    targetJobRoles: [oid("P2JobRole")],
    competencyOutcomes: [
      {
        competency: oid("P2Competency"),
        frameworkVersion: Number,
        targetLevel: Number,
      },
    ],
    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED", "ARCHIVED"],
      default: "DRAFT",
    },
    resourceMetadata: [
      { title: String, type: String, privateReference: String },
    ],
    createdBy: oid("User"),
    ...synthetic,
  },
  [
    [{ code: 1 }, { unique: true }],
    [{ status: 1, domain: 1 }],
    [{ title: "text", description: "text", domain: "text" }, {}],
  ],
);

export const P2CourseRuleVersion = make(
  "P2CourseRuleVersion",
  {
    course: oid("P2Course"),
    version: { type: Number, min: 1, required: true },
    status: { type: String, enum: ["DRAFT", "PUBLISHED"], default: "DRAFT" },
    eligibilityRules: [
      {
        type: {
          type: String,
          enum: [
            "JOB_ROLE",
            "DEPARTMENT",
            "DESIGNATION",
            "COURSE_COMPLETION",
            "DEMONSTRATED_COMPETENCY",
          ],
        },
        value: Schema.Types.Mixed,
        explanation: String,
      },
    ],
    requiresApprovedTrainingNeed: { type: Boolean, default: false },
    allowIncompleteForReview: { type: Boolean, default: false },
    nominationRequirements: [String],
    approvalPolicy: String,
    futureAssessmentPolicyMetadata: Schema.Types.Mixed,
    futureCertificatePolicyMetadata: Schema.Types.Mixed,
    certificatePolicy: {
      enabled: { type: Boolean, default: false },
      requireLearningCompletion: { type: Boolean, default: true },
      requirePublishedPass: { type: Boolean, default: true },
      additionalRequirements: [String],
    },
    createdBy: oid("User"),
    publishedAt: Date,
    ...synthetic,
  },
  [[{ course: 1, version: 1 }, { unique: true }]],
);

export const P2Batch = make(
  "P2Batch",
  {
    course: oid("P2Course"),
    ruleVersion: oid("P2CourseRuleVersion"),
    name: String,
    description: String,
    startDate: Date,
    endDate: Date,
    timezone: { type: String, default: "Asia/Kolkata" },
    nominationOpensAt: Date,
    nominationClosesAt: Date,
    capacity: { type: Number, min: 1, required: true },
    seatsAllocated: { type: Number, min: 0, default: 0 },
    revision: { type: Number, default: 0 },
    deliveryMode: {
      type: String,
      enum: ["ONLINE", "IN_PERSON", "BLENDED"],
      required: true,
    },
    location: String,
    waitlistEnabled: { type: Boolean, default: true },
    sessions: [
      {
        title: { type: String, required: true },
        subject: { type: String, required: true },
        competency: oid("P2Competency", false),
        frameworkVersion: { type: Number, min: 1, default: 1 },
        requiredProficiency: { type: Number, min: 1, max: 5 },
        requiredQualifications: [String],
        start: { type: Date, required: true },
        end: { type: Date, required: true },
      },
    ],
    status: {
      type: String,
      enum: ["DRAFT", "OPEN", "CLOSED", "ONGOING", "COMPLETED", "CANCELLED"],
      default: "DRAFT",
    },
    createdBy: oid("User"),
    ...synthetic,
  },
  [[{ course: 1, startDate: 1 }], [{ status: 1, startDate: 1 }]],
);

export const P2LearningPath = make(
  "P2LearningPath",
  {
    title: String,
    description: String,
    targetJobRoles: [oid("P2JobRole")],
    competencyGoals: [oid("P2Competency")],
    orderedCourseSteps: [
      { order: Number, course: oid("P2Course"), explanation: String },
    ],
    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED", "ARCHIVED"],
      default: "DRAFT",
    },
    version: Number,
    createdBy: oid("User"),
    ...synthetic,
  },
  [[{ title: 1, version: 1 }, { unique: true }]],
);

export const P2LearningPathAssignment = make(
  "P2LearningPathAssignment",
  {
    trainee: oid("User"),
    trainingNeed: oid("P2TrainingNeed"),
    learningPath: oid("P2LearningPath"),
    learningPathVersion: Number,
    assignedBy: oid("User"),
    assignedAt: Date,
    status: {
      type: String,
      enum: ["ACTIVE", "COMPLETED", "CANCELLED"],
      default: "ACTIVE",
    },
    ...synthetic,
  },
  [[{ trainee: 1, trainingNeed: 1 }, { unique: true }]],
);

const snapshot = {
  status: {
    type: String,
    enum: ["ELIGIBLE", "INELIGIBLE", "NEEDS_INFORMATION"],
  },
  ruleVersion: Number,
  checkedAt: Date,
  checks: [
    {
      rule: String,
      outcome: String,
      explanation: String,
      sourceReference: String,
    },
  ],
  blockingReasons: [String],
  missingInformation: [String],
  allowIncompleteForReview: Boolean,
};
export const P2Nomination = make(
  "P2Nomination",
  {
    trainee: oid("User"),
    course: oid("P2Course"),
    batch: oid("P2Batch"),
    trainingNeed: oid("P2TrainingNeed"),
    learningPathAssignment: oid("P2LearningPathAssignment", false),
    ruleVersion: oid("P2CourseRuleVersion"),
    reason: String,
    correctionResponse: String,
    eligibilitySnapshot: snapshot,
    status: {
      type: String,
      enum: [
        "DRAFT",
        "SUBMITTED",
        "UNDER_REVIEW",
        "RETURNED",
        "RESUBMITTED",
        "APPROVED",
        "WAITLISTED",
        "REJECTED",
        "WITHDRAWN",
        "ADMISSION_CANCELLED",
      ],
      default: "DRAFT",
    },
    submittedAt: Date,
    reviewedAt: Date,
    reviewedBy: oid("User", false),
    decisionReason: String,
    revision: { type: Number, default: 0 },
    history: eventHistory,
    ...synthetic,
  },
  [
    [
      { trainee: 1, batch: 1 },
      {
        unique: true,
        partialFilterExpression: {
          status: {
            $in: [
              "DRAFT",
              "SUBMITTED",
              "UNDER_REVIEW",
              "RETURNED",
              "RESUBMITTED",
              "APPROVED",
              "WAITLISTED",
            ],
          },
        },
      },
    ],
    [{ batch: 1, status: 1 }],
  ],
);

export const P2Enrollment = make(
  "P2Enrollment",
  {
    trainee: oid("User"),
    batch: oid("P2Batch"),
    nomination: oid("P2Nomination"),
    status: {
      type: String,
      enum: ["CONFIRMED", "CANCELLED"],
      default: "CONFIRMED",
    },
    admittedBy: oid("User"),
    admittedAt: Date,
    cancelledBy: oid("User", false),
    cancelledAt: Date,
    cancellationReason: String,
    ...synthetic,
  },
  [
    [{ trainee: 1, batch: 1 }, { unique: true }],
    [{ nomination: 1 }, { unique: true }],
  ],
);

export const P2CourseCompletion = make(
  "P2CourseCompletion",
  {
    trainee: oid("User"),
    course: oid("P2Course"),
    completedAt: Date,
    sourceReference: String,
    recordedBy: oid("User"),
    readOnly: { type: Boolean, default: true },
    ...synthetic,
  },
  [[{ trainee: 1, course: 1 }, { unique: true }]],
);

export const P2Notification = make(
  "P2Notification",
  {
    recipient: oid("User"),
    type: String,
    title: String,
    message: String,
    entityReference: {
      entityType: String,
      entityId: Schema.Types.ObjectId,
      path: String,
    },
    readAt: Date,
    eventId: { type: String, required: true },
    ...synthetic,
  },
  [
    [{ recipient: 1, eventId: 1 }, { unique: true }],
    [{ recipient: 1, readAt: 1, createdAt: -1 }],
  ],
);

export const P2AuditLog = make(
  "P2AuditLog",
  {
    actor: oid("User"),
    action: String,
    entityType: String,
    entityId: Schema.Types.ObjectId,
    previousStatus: String,
    newStatus: String,
    changes: Schema.Types.Mixed,
    reason: String,
    correlationId: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    ...synthetic,
  },
  [
    [{ entityType: 1, entityId: 1, timestamp: -1 }],
    [{ correlationId: 1, action: 1 }, { unique: true }],
  ],
);
