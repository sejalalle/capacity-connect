import User from "../models/User.js";
import * as M from "../models/Lifecycle.js";
import { execute } from "../services/lifecycleService.js";
export async function seedLifecycle(admin) {
  for (const Model of Object.values(M.lifecycleModels)) await Model.init();
  const existing = await M.Course.findOne({
    title: "Sample Training Programme — Weather Radar Interpretation",
  });
  if (existing?.demoSeedComplete) return;
  if (existing)
    throw new Error(
      "An incomplete demo seed exists. Use a new dedicated demo database or inspect the existing records; no records were overwritten.",
    );
  const trainees = [],
    trainers = [];
  for (let i = 1; i <= 10; i++) {
    const email = `trainee${i}@example.test`;
    let user = await User.findOne({ email });
    if (!user)
      user = await User.create({
        name: `Synthetic Trainee ${String(i).padStart(2, "0")}`,
        email,
        password: "DemoOnly!2026",
        role: "trainee",
        accountStatus: "approved",
        department: "Synthetic Meteorological Training",
        designation: "Proposed observation analyst",
        qualifications: ["Synthetic foundation qualification"],
      });
    trainees.push(user);
  }
  for (let i = 1; i <= 3; i++) {
    const email = `trainer${i}@example.test`;
    let user = await User.findOne({ email });
    if (!user)
      user = await User.create({
        name: `Synthetic Trainer ${i}`,
        email,
        password: "DemoOnly!2026",
        role: "trainer",
        accountStatus: "approved",
        department: "Synthetic Meteorological Training",
        designation: "Demonstration instructor",
      });
    trainers.push(user);
  }
  const competency = await M.Competency.create({
    title: "Interpret a synthetic radar echo",
    rubricVersion: "SYN-RADAR-1",
    task: "Identify the echo pattern, state one interpretation and explain uncertainty. Synthetic task, not an official IMD/WMO framework.",
    levels: [
      { level: 1, definition: "Identify the labelled pattern with guidance." },
      {
        level: 2,
        definition:
          "Independently interpret the sample and explain one limitation.",
      },
      {
        level: 3,
        definition:
          "Justify the interpretation across multiple samples and discuss uncertainty.",
      },
    ],
  });
  const jobRole = await M.JobRole.create({
    title: "Proposed observation analyst",
    description: M.POLICY_LABEL,
  });
  await M.RoleRequirement.create({
    jobRole: jobRole._id,
    competency: competency._id,
    rubricVersion: competency.rubricVersion,
    requiredLevel: 2,
  });
  await User.updateMany(
    { _id: { $in: trainees.map((u) => u._id) } },
    { jobRole: jobRole._id },
  );
  const course = await execute(admin, "createCourse", {
    title: "Sample Training Programme — Weather Radar Interpretation",
    description:
      "Synthetic course: connect knowledge, practical evidence and human review. No claim about existing IMD practices.",
    subject: "Radar interpretation",
    intendedCompetencies: [competency._id],
  });
  const rules = await execute(admin, "defineRules", {
    course: course._id,
    version: 1,
    eligibility: {
      requiredQualifications: ["Synthetic foundation qualification"],
      instructions:
        "Coordinator reviews submitted professional information and supporting evidence. PROPOSED — TO BE VALIDATED WITH IMD.",
    },
    assessmentKinds: ["MCQ", "PRACTICAL"],
    passing: { MCQ: 60, PRACTICAL: 60 },
    certificate: {
      requireCompletion: true,
      requirePublishedPass: true,
      requireDemonstratedEvidence: false,
    },
    trainerPrerequisites: ["Synthetic teaching qualification"],
  });
  const sessions = [
    {
      title: "Synthetic radar interpretation practical",
      subject: "Radar interpretation",
      start: new Date("2026-11-12T04:30:00Z"),
      end: new Date("2026-11-12T06:30:00Z"),
    },
  ];
  const batch = await execute(admin, "createBatch", {
    ruleVersion: rules._id,
    title: "Synthetic Batch A — Learning & evidence",
    capacity: 10,
    sessions,
  });
  for (let i = 0; i < 3; i++) {
    await execute(admin, "expertise", {
      trainer: trainers[i]._id,
      subject: "Radar interpretation",
      qualifications: ["Synthetic teaching qualification"],
      teachingYears: 6 - i,
      status: "APPROVED",
      basis:
        "Synthetic approved expertise fixture; coordinator approval is proposed, not an IMD policy claim.",
    });
    await execute(trainers[i], "availability", {
      trainer: trainers[i]._id,
      start: new Date("2026-11-01T00:00:00Z"),
      end: new Date("2026-12-01T00:00:00Z"),
      available: true,
      reason: "Synthetic session availability",
    });
  }
  await execute(admin, "assignTrainer", {
    batch: batch._id,
    sessionId: batch.sessions[0]._id,
    trainer: trainers[0]._id,
    reason: "Highest eligible recommendation points",
  });
  await execute(admin, "grantPermission", {
    batch: batch._id,
    user: trainers[1]._id,
    actions: ["CREATE_ASSESSMENT", "EVALUATE", "REVIEW_EVIDENCE"],
    reason: "Explicit synthetic task reviewer and assessment author assignment",
  });
  await execute(admin, "grantPermission", {
    batch: batch._id,
    user: admin._id,
    actions: ["PUBLISH_RESULT"],
    reason:
      "Coordinator assigned official result publication; no expertise review permission",
  });
  await execute(admin, "batchState", {
    batch: batch._id,
    state: "NOMINATIONS_OPEN",
    reason: "Approved proposed rules and seat capacity defined",
  });
  const enrollments = [];
  for (const trainee of trainees) {
    const need = await execute(trainee, "createNeed", {
      course: course._id,
      competency: competency._id,
      reason:
        "No reviewed evidence for this synthetic task; request assessment.",
      action: "ASSESSMENT",
    });
    const nomination = await execute(trainee, "nominate", {
      batch: batch._id,
      need: need._id,
      information:
        "Synthetic professional information reviewed for demonstration.",
      qualifications: ["Synthetic foundation qualification"],
      resources: [],
    });
    await execute(trainee, "nominationState", {
      nomination: nomination._id,
      state: "SUBMITTED",
      reason: "Applicant submitted information",
    });
    await execute(admin, "nominationState", {
      nomination: nomination._id,
      state: "UNDER_REVIEW",
      reason: "Coordinator begins eligibility review",
    });
    await execute(admin, "reviewEligibility", {
      nomination: nomination._id,
      eligibility: "ELIGIBLE",
      reason: "Synthetic submitted qualification checked against version 1",
    });
    await execute(admin, "nominationState", {
      nomination: nomination._id,
      state: "APPROVED",
      reason: "Eligibility satisfied and seat confirmed",
    });
    enrollments.push(
      await M.Enrollment.findOne({ nomination: nomination._id }),
    );
  }
  await execute(trainers[0], "availability", {
    trainer: trainers[0]._id,
    start: sessions[0].start,
    end: sessions[0].end,
    available: false,
    reason:
      "Synthetic scheduling change; affected session requires replacement",
  });
  await execute(admin, "assignTrainer", {
    batch: batch._id,
    sessionId: batch.sessions[0]._id,
    trainer: trainers[1]._id,
    reason:
      "Coordinator approves highest eligible replacement after original trainer became unavailable",
  });
  await execute(admin, "batchState", {
    batch: batch._id,
    state: "IN_PROGRESS",
    reason: "Assigned replacement approved; learning starts",
  });
  const mcq = await execute(trainers[1], "createAssessment", {
    batch: batch._id,
    title: "Synthetic radar knowledge check",
    kind: "MCQ",
    instructions: "Select the answer supported by the sample passage.",
    questions: [
      {
        prompt:
          "In this synthetic example, what should accompany an interpretation?",
        options: ["A stated uncertainty", "An unsupported certainty"],
        correctIndex: 0,
        sourcePassage:
          "Synthetic teaching passage: an interpretation should include a stated uncertainty.",
        sourcePage: "Synthetic handout, page 1",
      },
    ],
  });
  const practical = await execute(trainers[1], "createAssessment", {
    batch: batch._id,
    title: "Interpret a synthetic radar echo",
    kind: "PRACTICAL",
    instructions: competency.task,
    competency: competency._id,
    rubricVersion: competency.rubricVersion,
    questions: [],
  });
  for (const assessment of [mcq, practical])
    await execute(trainers[1], "publishAssessment", {
      assessment: assessment._id,
      reason: "Trainer reviewed synthetic content and source references",
    });
  const mcqSubmission = await execute(trainees[0], "submit", {
    assessment: mcq._id,
    text: "",
    answers: [0],
    resources: [],
  });
  const practicalSubmission = await execute(trainees[0], "submit", {
    assessment: practical._id,
    text: "Synthetic interpretation: identify a coherent echo; consider uncertainty from sampling and attenuation.",
    answers: [],
    resources: [],
  });
  for (const submission of [mcqSubmission, practicalSubmission])
    await execute(trainers[1], "evaluate", {
      submission: submission._id,
      score: 75,
      comments:
        "Synthetic evaluation against the published task; not workforce performance evidence.",
    });
  await execute(admin, "completeLearning", {
    enrollment: enrollments[0]._id,
    reason:
      "Coordinator records completion separately from results and competency",
  });
  await execute(admin, "publishResult", {
    enrollment: enrollments[0]._id,
    reason:
      "Authorized publication after checking both evaluations and pinned passing thresholds",
  });
  const evidence = await execute(trainees[0], "submitEvidence", {
    submission: practicalSubmission._id,
    competency: competency._id,
    rubricVersion: competency.rubricVersion,
  });
  await execute(trainers[1], "reviewEvidence", {
    evidence: evidence._id,
    status: "ACCEPTED",
    outcome: "DEMONSTRATED",
    demonstratedLevel: 2,
    comments:
      "Synthetic sample independently interpreted with one limitation; meets synthetic level 2 only.",
    reviewDueAt: new Date("2027-05-01T00:00:00Z"),
  });
  await execute(admin, "issueCertificate", {
    enrollment: enrollments[0]._id,
    reason:
      "Configured course completion and published-pass conditions satisfied",
  });
  await execute(trainees[0], "feedback", {
    enrollment: enrollments[0]._id,
    rating: 4,
    comments:
      "Synthetic identified feedback: more uncertainty examples would be useful.",
  });
  await execute(admin, "followUp", {
    enrollment: enrollments[0]._id,
    evidence: evidence._id,
    action:
      "Submit a new multi-sample interpretation for a separate review; do not infer a training gap from missing evidence.",
    dueAt: new Date("2027-01-12T00:00:00Z"),
    nextAction: "EVIDENCE_SUBMISSION",
  });
  const upcoming = await execute(admin, "createBatch", {
    ruleVersion: rules._id,
    title: "Synthetic Batch B — Nominations",
    capacity: 2,
    sessions: [
      {
        title: "Additional radar practice",
        subject: "Radar interpretation",
        start: new Date("2026-11-20T04:30:00Z"),
        end: new Date("2026-11-20T06:30:00Z"),
      },
    ],
  });
  await execute(admin, "batchState", {
    batch: upcoming._id,
    state: "NOMINATIONS_OPEN",
    reason: "Proposed nomination window opened",
  });
  const need = await execute(trainees[1], "createNeed", {
    course: course._id,
    reason: "Synthetic request for a later practice session",
    action: "TRAINING",
  });
  const returned = await execute(trainees[1], "nominate", {
    batch: upcoming._id,
    need: need._id,
    information: "Synthetic application missing qualification details.",
    qualifications: [],
    resources: [],
  });
  await execute(trainees[1], "nominationState", {
    nomination: returned._id,
    state: "SUBMITTED",
    reason: "Applicant submits nomination",
  });
  await execute(admin, "nominationState", {
    nomination: returned._id,
    state: "UNDER_REVIEW",
    reason: "Review submitted information",
  });
  await execute(admin, "reviewEligibility", {
    nomination: returned._id,
    eligibility: "NEEDS_INFORMATION",
    reason: "Required qualification evidence is missing",
  });
  await execute(admin, "nominationState", {
    nomination: returned._id,
    state: "RETURNED",
    reason:
      "Please add the synthetic foundation qualification and supporting information, then resubmit.",
  });
  await M.Course.updateOne({ _id: course._id }, { demoSeedComplete: true });
  return { course, batch, upcoming, trainees, trainers, competency };
}
