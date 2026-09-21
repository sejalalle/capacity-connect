import mongoose from "mongoose";
const { Schema } = mongoose;
const ref = (model, required = true) => ({
  type: Schema.Types.ObjectId,
  ref: model,
  required,
});
const text = { type: String, trim: true, maxlength: 4000 };
const status = (values, initial) => ({
  type: String,
  enum: values,
  default: initial,
  required: true,
});
const owner = { owner: ref("User") };
const history = [
  {
    from: String,
    to: String,
    actor: ref("User"),
    at: { type: Date, default: Date.now },
    reason: { type: String, required: true },
  },
];
const model = (name, fields, indexes = []) => {
  const schema = new Schema(fields, { timestamps: true, strict: "throw" });
  if (["CourseRuleVersion", "Competency", "RoleRequirement"].includes(name)) {
    schema.pre("save", function () {
      if (!this.isNew) throw new Error("Approved rule versions are immutable");
    });
    for (const operation of [
      "updateOne",
      "updateMany",
      "findOneAndUpdate",
      "replaceOne",
      "deleteOne",
      "deleteMany",
      "findOneAndDelete",
    ])
      schema.pre(operation, function () {
        throw new Error("Approved rule versions are immutable");
      });
  }
  for (const [keys, options] of indexes) schema.index(keys, options);
  return mongoose.model(name, schema);
};
export const POLICY_LABEL = "PROPOSED — TO BE VALIDATED WITH IMD";
export const JobRole = model("JobRole", {
  title: { type: String, required: true },
  description: text,
  synthetic: { type: Boolean, default: true },
});
export const Competency = model(
  "Competency",
  {
    title: String,
    rubricVersion: { type: String, required: true },
    task: text,
    levels: [{ level: Number, definition: { type: String, required: true } }],
    synthetic: { type: Boolean, default: true },
  },
  [[{ title: 1, rubricVersion: 1 }, { unique: true }]],
);
export const RoleRequirement = model(
  "RoleRequirement",
  {
    jobRole: ref("JobRole"),
    competency: ref("Competency"),
    rubricVersion: String,
    requiredLevel: Number,
  },
  [[{ jobRole: 1, competency: 1, rubricVersion: 1 }, { unique: true }]],
);
export const Course = model("Course", {
  demoSeedComplete: { type: Boolean, default: false },
  title: { type: String, required: true },
  description: text,
  subject: String,
  intendedCompetencies: [ref("Competency")],
  synthetic: { type: Boolean, default: true },
  ...owner,
});
export const CourseRuleVersion = model(
  "CourseRuleVersion",
  {
    course: ref("Course"),
    version: Number,
    label: { type: String, default: POLICY_LABEL },
    eligibility: { requiredQualifications: [String], instructions: text },
    assessmentKinds: [
      { type: String, enum: ["MCQ", "PRACTICAL", "WRITTEN", "VIVA"] },
    ],
    passing: { MCQ: Number, PRACTICAL: Number, WRITTEN: Number, VIVA: Number },
    certificate: {
      requireCompletion: Boolean,
      requirePublishedPass: Boolean,
      requireDemonstratedEvidence: Boolean,
    },
    trainerPrerequisites: [String],
    approvedBy: ref("User"),
    approvedAt: { type: Date, default: Date.now },
    ...owner,
  },
  [[{ course: 1, version: 1 }, { unique: true }]],
);
// Approved versions are append-only; service routes expose create/read, never update.
export const Batch = model(
  "Batch",
  {
    course: ref("Course"),
    ruleVersion: ref("CourseRuleVersion"),
    title: String,
    coordinator: ref("User"),
    capacity: { type: Number, min: 1, required: true },
    admitted: { type: Number, min: 0, default: 0 },
    workflowVersion: { type: Number, default: 0 },
    state: status(
      ["PLANNED", "NOMINATIONS_OPEN", "IN_PROGRESS", "COMPLETED"],
      "PLANNED",
    ),
    sessions: [{ title: String, subject: String, start: Date, end: Date }],
    permissions: [
      {
        user: ref("User"),
        actions: [
          {
            type: String,
            enum: [
              "CREATE_ASSESSMENT",
              "EVALUATE",
              "PUBLISH_RESULT",
              "REVIEW_EVIDENCE",
            ],
          },
        ],
      },
    ],
    history,
    synthetic: { type: Boolean, default: true },
  },
  [[{ coordinator: 1, state: 1 }]],
);
export const TrainingNeed = model(
  "TrainingNeed",
  {
    ...owner,
    course: ref("Course", false),
    competency: ref("Competency", false),
    reason: text,
    action: status(
      ["ASSESSMENT", "EVIDENCE_SUBMISSION", "TRAINING"],
      "ASSESSMENT",
    ),
    followUp: ref("FollowUp", false),
  },
  [[{ owner: 1, createdAt: -1 }]],
);
export const Nomination = model(
  "Nomination",
  {
    ...owner,
    batch: ref("Batch"),
    need: ref("TrainingNeed"),
    state: status(
      [
        "DRAFT",
        "SUBMITTED",
        "UNDER_REVIEW",
        "RETURNED",
        "RESUBMITTED",
        "WAITLISTED",
        "APPROVED",
        "REJECTED",
        "WITHDRAWN",
      ],
      "DRAFT",
    ),
    eligibility: status(
      ["NOT_CHECKED", "NEEDS_INFORMATION", "ELIGIBLE", "INELIGIBLE"],
      "NOT_CHECKED",
    ),
    eligibilityReview: { actor: ref("User", false), at: Date, reason: text },
    information: text,
    qualifications: [String],
    resources: [ref("Resource")],
    history,
  },
  [[{ owner: 1, batch: 1 }, { unique: true }], [{ batch: 1, state: 1 }]],
);
export const Enrollment = model(
  "Enrollment",
  {
    ...owner,
    batch: ref("Batch"),
    nomination: ref("Nomination"),
    completion: status(
      ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "WITHDRAWN"],
      "NOT_STARTED",
    ),
    completedAt: Date,
    completedBy: ref("User", false),
  },
  [
    [{ owner: 1, batch: 1 }, { unique: true }],
    [{ nomination: 1 }, { unique: true }],
  ],
);
export const TrainerExpertise = model(
  "TrainerExpertise",
  {
    trainer: ref("User"),
    subject: String,
    qualifications: [String],
    teachingYears: { type: Number, min: 0 },
    status: status(["PENDING", "APPROVED", "REJECTED"], "PENDING"),
    approvedBy: ref("User", false),
    approvedAt: Date,
    basis: text,
  },
  [[{ trainer: 1, subject: 1 }, { unique: true }]],
);
export const TrainerAvailability = model(
  "TrainerAvailability",
  {
    trainer: ref("User"),
    start: Date,
    end: Date,
    available: Boolean,
    reason: text,
  },
  [[{ trainer: 1, start: 1, end: 1 }]],
);
export const TrainerAssignment = model(
  "TrainerAssignment",
  {
    trainer: ref("User"),
    batch: ref("Batch"),
    sessionId: Schema.Types.ObjectId,
    start: Date,
    end: Date,
    state: status(["ACTIVE", "UNAVAILABLE", "REPLACED"], "ACTIVE"),
    assignedBy: ref("User"),
    reason: text,
    recommendationPoints: Number,
    replaces: ref("TrainerAssignment", false),
  },
  [
    [
      { batch: 1, sessionId: 1 },
      { unique: true, partialFilterExpression: { state: "ACTIVE" } },
    ],
    [{ trainer: 1, start: 1, end: 1 }],
  ],
);
export const Resource = model(
  "Resource",
  {
    ...owner,
    batch: ref("Batch"),
    filename: String,
    mime: String,
    size: Number,
    storageId: { type: Schema.Types.ObjectId, required: true },
    sha256: String,
    purpose: status(
      ["NOMINATION", "LEARNING", "SUBMISSION", "CERTIFICATE"],
      "SUBMISSION",
    ),
  },
  [[{ owner: 1, batch: 1 }], [{ storageId: 1 }, { unique: true }]],
);
export const Assessment = model(
  "Assessment",
  {
    batch: ref("Batch"),
    ruleVersion: ref("CourseRuleVersion"),
    ...owner,
    title: String,
    kind: status(["MCQ", "PRACTICAL", "WRITTEN", "VIVA"], "PRACTICAL"),
    instructions: text,
    published: { type: Boolean, default: false },
    questions: [
      {
        prompt: String,
        options: [String],
        correctIndex: Number,
        sourcePassage: String,
        sourcePage: String,
      },
    ],
    competency: ref("Competency", false),
    rubricVersion: String,
  },
  [[{ batch: 1, kind: 1 }]],
);
export const Submission = model(
  "Submission",
  {
    ...owner,
    batch: ref("Batch"),
    enrollment: ref("Enrollment"),
    assessment: ref("Assessment"),
    text,
    resources: [ref("Resource")],
    answers: [Number],
    automaticScore: Number,
  },
  [[{ owner: 1, assessment: 1 }, { unique: true }]],
);
export const Evaluation = model(
  "Evaluation",
  {
    submission: ref("Submission"),
    batch: ref("Batch"),
    evaluator: ref("User"),
    score: { type: Number, min: 0, max: 100 },
    comments: text,
  },
  [[{ submission: 1 }, { unique: true }]],
);
export const Result = model(
  "Result",
  {
    ...owner,
    enrollment: ref("Enrollment"),
    batch: ref("Batch"),
    ruleVersion: ref("CourseRuleVersion"),
    outcome: status(["PASS", "FAIL"], "FAIL"),
    evaluations: [ref("Evaluation")],
    publishedBy: ref("User"),
    publishedAt: Date,
  },
  [[{ enrollment: 1 }, { unique: true }]],
);
export const Evidence = model(
  "Evidence",
  {
    ...owner,
    batch: ref("Batch"),
    submission: ref("Submission"),
    competency: ref("Competency"),
    rubricVersion: String,
    status: status(
      ["SUBMITTED", "ACCEPTED", "RETURNED", "REJECTED"],
      "SUBMITTED",
    ),
    supplement: { text, resources: [ref("Resource")] },
    review: { reviewer: ref("User", false), at: Date, comments: text },
    history,
  },
  [
    [
      { owner: 1, submission: 1, competency: 1, rubricVersion: 1 },
      { unique: true },
    ],
  ],
);
export const CompetencyRecord = model(
  "CompetencyRecord",
  {
    ...owner,
    batch: ref("Batch"),
    competency: ref("Competency"),
    rubricVersion: String,
    evidence: ref("Evidence"),
    outcome: status(
      ["NOT_ASSESSED", "UNDER_REVIEW", "DEMONSTRATED", "NEEDS_PRACTICE"],
      "UNDER_REVIEW",
    ),
    demonstratedLevel: Number,
    reviewer: ref("User", false),
    reviewedAt: Date,
    comments: text,
    reviewDueAt: Date,
  },
  [
    [{ evidence: 1 }, { unique: true }],
    [{ owner: 1, competency: 1, rubricVersion: 1, reviewedAt: -1 }],
  ],
);
export const Certificate = model(
  "Certificate",
  {
    ...owner,
    batch: ref("Batch"),
    enrollment: ref("Enrollment"),
    result: ref("Result"),
    ruleVersion: ref("CourseRuleVersion"),
    issuedBy: ref("User"),
    issuedAt: Date,
    serial: { type: String, unique: true },
    statement: text,
  },
  [[{ enrollment: 1 }, { unique: true }]],
);
// Identified feedback is explicit. There is no claim or implementation of anonymity.
export const Feedback = model(
  "Feedback",
  {
    ...owner,
    batch: ref("Batch"),
    enrollment: ref("Enrollment"),
    rating: { type: Number, min: 1, max: 5 },
    comments: text,
    mode: { type: String, enum: ["IDENTIFIED"], default: "IDENTIFIED" },
  },
  [[{ enrollment: 1 }, { unique: true }]],
);
export const FollowUp = model(
  "FollowUp",
  {
    ...owner,
    batch: ref("Batch"),
    enrollment: ref("Enrollment"),
    evidence: ref("Evidence", false),
    createdBy: ref("User"),
    action: text,
    dueAt: Date,
    state: status(["OPEN", "DONE"], "OPEN"),
    newNeed: ref("TrainingNeed", false),
  },
  [[{ owner: 1, state: 1 }]],
);
export const Notification = model(
  "Notification",
  { ...owner, batch: ref("Batch", false), message: text, readAt: Date },
  [[{ owner: 1, createdAt: -1 }]],
);
export const AuditLog = model(
  "AuditLog",
  {
    actor: ref("User"),
    batch: ref("Batch", false),
    action: { type: String, required: true },
    entityType: String,
    entityId: Schema.Types.ObjectId,
    from: String,
    to: String,
    reason: { type: String, required: true },
    at: { type: Date, default: Date.now },
  },
  [[{ batch: 1, at: -1 }], [{ actor: 1, at: -1 }]],
);
export const lifecycleModels = {
  JobRole,
  Competency,
  RoleRequirement,
  Course,
  CourseRuleVersion,
  Batch,
  TrainingNeed,
  Nomination,
  Enrollment,
  TrainerExpertise,
  TrainerAvailability,
  TrainerAssignment,
  Resource,
  Assessment,
  Submission,
  Evaluation,
  Result,
  Evidence,
  CompetencyRecord,
  Certificate,
  Feedback,
  FollowUp,
  Notification,
  AuditLog,
};
