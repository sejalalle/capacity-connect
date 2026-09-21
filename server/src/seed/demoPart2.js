import User from "../models/User.js";
import * as M from "../models/Part2.js";

export const DEMO_NAMESPACE = "samarthya-part2-v1";
const password = "DemoOnly!2026";
const reference = () =>
  new Date(process.env.DEMO_REFERENCE_DATE || "2026-10-01T00:00:00.000Z");
const days = (n) => new Date(reference().getTime() + n * 86400000);
const synthetic = { isSynthetic: true, demoNamespace: DEMO_NAMESPACE };
const upsert = async (Model, key, values) =>
  Model.findOneAndUpdate(
    { ...key, demoNamespace: DEMO_NAMESPACE },
    { $setOnInsert: { ...values, ...synthetic } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

export async function seedPart2(admin) {
  const role = await upsert(
    M.P2JobRole,
    { title: "Synthetic Radar Operations Learner" },
    {
      title: "Synthetic Radar Operations Learner",
      description:
        "Demonstration professional role used only for the sample competency journey.",
      status: "ACTIVE",
      createdBy: admin._id,
    },
  );
  const levelDefinitions = [
    [1, "Awareness", "Can explain the task purpose and key terms."],
    [2, "Basic", "Can complete a guided task using an approved procedure."],
    [3, "Working", "Can complete the task independently in routine scenarios."],
    [4, "Advanced", "Can handle complex scenarios and explain decisions."],
    [5, "Expert", "Can review complex work and improve task practice."],
  ].map(([value, label, definition]) => ({ value, label, definition }));
  const competencyNames = [
    ["SYN-RAD-01", "Radar Product Interpretation", "Weather Radar"],
    ["SYN-RAD-02", "Radar Quality Control", "Weather Radar"],
    [
      "SYN-NWP-01",
      "Numerical Weather Prediction Interpretation",
      "Forecasting",
    ],
    ["SYN-SAT-01", "Satellite Image Interpretation", "Satellite Meteorology"],
    ["SYN-SYN-01", "Synoptic Chart Analysis", "Synoptic Meteorology"],
    [
      "SYN-HYD-01",
      "Hydrometeorological Observation Review",
      "Hydrometeorology",
    ],
    ["SYN-CLI-01", "Climate Data Quality Review", "Climate Data"],
    ["SYN-INS-01", "Instrument Observation Checks", "Instruments"],
    [
      "SYN-AGR-01",
      "Agrometeorological Advisory Inputs",
      "Agricultural Meteorology",
    ],
    ["SYN-VER-01", "Forecast Verification", "Forecasting"],
  ];
  const competencies = [];
  for (const [code, name, domain] of competencyNames)
    competencies.push(
      await upsert(
        M.P2Competency,
        { code, version: 1 },
        {
          code,
          name,
          domain,
          version: 1,
          description: `Synthetic task competency for ${name.toLowerCase()}.`,
          levels: levelDefinitions,
          status: "PUBLISHED",
          createdBy: admin._id,
        },
      ),
    );
  for (let i = 0; i < competencies.length; i++)
    await upsert(
      M.P2RoleRequirement,
      { jobRole: role._id, competency: competencies[i]._id, version: 1 },
      {
        jobRole: role._id,
        competency: competencies[i]._id,
        competencyVersion: 1,
        requiredLevel: i === 0 ? 4 : i === 1 ? 3 : 2,
        priority: i < 2 ? "HIGH" : "MEDIUM",
        version: 1,
        effectiveAt: reference(),
        createdBy: admin._id,
      },
    );

  const people = [];
  const names = [
    "Asha Sharma",
    "Neha Verma",
    "Rohan Iyer",
    "Kavya Rao",
    "Arjun Mehta",
    "Meera Nair",
    "Vikram Das",
    "Isha Sen",
    "Rahul Bose",
    "Tara Jain",
  ];
  for (let i = 0; i < names.length; i++) {
    const email =
      i === 0 ? "asha.sharma@example.test" : `trainee${i + 1}@example.test`;
    let user = await User.findOne({ email });
    if (!user)
      user = await User.create({
        name: names[i],
        email,
        password,
        role: "trainee",
        accountStatus: "approved",
        department: "Synthetic Meteorological Training Unit",
        designation: "Demonstration learner",
        jobRole: role._id,
      });
    else if (!user.jobRole) {
      user.jobRole = role._id;
      await user.save();
    }
    people.push(user);
  }
  for (let i = 1; i <= 3; i++)
    if (!(await User.exists({ email: `trainer${i}@example.test` })))
      await User.create({
        name: `Synthetic Trainer ${i}`,
        email: `trainer${i}@example.test`,
        password,
        role: "trainer",
        accountStatus: "approved",
        department: "Synthetic Training Faculty",
        designation: "Demonstration trainer",
      });
  await upsert(
    M.P2CompetencyRecord,
    {
      trainee: people[0]._id,
      competency: competencies[0]._id,
      frameworkVersion: 1,
    },
    {
      trainee: people[0]._id,
      competency: competencies[0]._id,
      frameworkVersion: 1,
      demonstratedLevel: 2,
      selfAssessedLevel: 3,
      status: "DEMONSTRATED",
      sourceType: "HISTORICAL_REVIEW",
      sourceReference: "Synthetic reviewed task record",
      assessedAt: days(-90),
      reviewer: admin._id,
      notes: "Synthetic demonstration record.",
    },
  );
  await upsert(
    M.P2CompetencyRecord,
    {
      trainee: people[0]._id,
      competency: competencies[1]._id,
      frameworkVersion: 1,
    },
    {
      trainee: people[0]._id,
      competency: competencies[1]._id,
      frameworkVersion: 1,
      demonstratedLevel: null,
      selfAssessedLevel: 2,
      status: "NOT_ASSESSED",
      sourceType: "NONE",
      notes: "No reviewed evidence in this synthetic record.",
    },
  );

  const courseSpecs = [
    [
      "SYN-CRS-RAD-FND",
      "Sample Radar Interpretation Foundations",
      "Weather Radar",
      competencies[0],
      2,
    ],
    [
      "SYN-CRS-RAD-ADV",
      "Sample Advanced Radar Interpretation",
      "Weather Radar",
      competencies[0],
      4,
    ],
    [
      "SYN-CRS-NWP-FND",
      "Sample Numerical Weather Prediction Fundamentals",
      "Forecasting",
      competencies[2],
      2,
    ],
    [
      "SYN-CRS-SAT",
      "Sample Satellite Meteorology Applications",
      "Satellite Meteorology",
      competencies[3],
      3,
    ],
    [
      "SYN-CRS-VER",
      "Sample Forecast Verification Practice",
      "Forecasting",
      competencies[9],
      3,
    ],
  ];
  const courses = [];
  for (const [code, title, domain, competency, targetLevel] of courseSpecs)
    courses.push(
      await upsert(
        M.P2Course,
        { code },
        {
          code,
          title,
          domain,
          category: "Sample Training Programme",
          description: "Synthetic course metadata for workflow demonstration.",
          duration: { value: 3, unit: "DAYS" },
          difficulty: targetLevel >= 4 ? "ADVANCED" : "FOUNDATION",
          targetJobRoles: [role._id],
          competencyOutcomes: [
            { competency: competency._id, frameworkVersion: 1, targetLevel },
          ],
          status: "PUBLISHED",
          createdBy: admin._id,
        },
      ),
    );
  const rules = [];
  for (const course of courses)
    rules.push(
      await upsert(
        M.P2CourseRuleVersion,
        { course: course._id, version: 1 },
        {
          course: course._id,
          version: 1,
          status: "PUBLISHED",
          eligibilityRules: [
            {
              type: "JOB_ROLE",
              value: role._id,
              explanation:
                "Applicant job role must match the synthetic target role.",
            },
          ],
          requiresApprovedTrainingNeed: true,
          allowIncompleteForReview: false,
          nominationRequirements: ["Current profile", "Approved training need"],
          approvalPolicy:
            "PROPOSED — TO BE VALIDATED WITH IMD. Eligibility review and coordinator seat decision required.",
          createdBy: admin._id,
          publishedAt: days(-30),
        },
      ),
    );
  await upsert(
    M.P2CourseRuleVersion,
    { course: courses[1]._id, version: 2 },
    {
      course: courses[1]._id,
      version: 2,
      status: "PUBLISHED",
      eligibilityRules: [
        {
          type: "JOB_ROLE",
          value: role._id,
          explanation: "Synthetic future rule.",
        },
      ],
      requiresApprovedTrainingNeed: true,
      allowIncompleteForReview: true,
      nominationRequirements: [
        "Approved need",
        "Additional information may be reviewed",
      ],
      approvalPolicy: "PROPOSED — TO BE VALIDATED WITH IMD.",
      createdBy: admin._id,
      publishedAt: days(-5),
    },
  );
  const batches = [];
  for (let i = 0; i < courses.length; i++)
    batches.push(
      await upsert(
        M.P2Batch,
        { course: courses[i]._id, name: `Demonstration Batch ${i + 1}` },
        {
          course: courses[i]._id,
          ruleVersion: rules[i]._id,
          name: `Demonstration Batch ${i + 1}`,
          description: "Synthetic future batch.",
          startDate: days(30 + i * 8),
          endDate: days(33 + i * 8),
          nominationOpensAt: days(-20),
          nominationClosesAt: days(20 + i * 8),
          capacity: i === 0 ? 2 : 20,
          seatsAllocated: i === 0 ? 1 : 0,
          deliveryMode: i % 2 ? "ONLINE" : "BLENDED",
          location: i % 2 ? "Online" : "Demonstration Training Centre",
          waitlistEnabled: true,
          status: "OPEN",
          sessions: [
            {
              title: `${courses[i].title} — guided session`,
              subject: courses[i].domain,
              competency: courses[i].competencyOutcomes[0]?.competency,
              start: days(30 + i * 8),
              end: new Date(days(30 + i * 8).getTime() + 3 * 60 * 60 * 1000),
            },
          ],
          createdBy: admin._id,
        },
      ),
    );
  const paths = [];
  const pathSpecs = [
    [
      "Radar Interpretation Development Path",
      [courses[0], courses[1]],
      competencies[0],
    ],
    ["Forecast Practice Path", [courses[2], courses[4]], competencies[2]],
    ["Satellite Applications Path", [courses[3]], competencies[3]],
  ];
  for (const [title, steps, goal] of pathSpecs)
    paths.push(
      await upsert(
        M.P2LearningPath,
        { title, version: 1 },
        {
          title,
          description: "Synthetic rule-based learning path.",
          targetJobRoles: [role._id],
          competencyGoals: [goal._id],
          orderedCourseSteps: steps.map((course, index) => ({
            order: index + 1,
            course: course._id,
            explanation: index
              ? "Builds toward the higher intended course outcome; completion does not verify competence."
              : "Provides prerequisite task knowledge.",
          })),
          status: "PUBLISHED",
          version: 1,
          createdBy: admin._id,
        },
      ),
    );

  const approvedNeed = await upsert(
    M.P2TrainingNeed,
    {
      beneficiary: people[0]._id,
      title: "Develop radar interpretation practice",
    },
    {
      title: "Develop radar interpretation practice",
      description: "Synthetic need supporting the complete demo journey.",
      requestedBy: people[0]._id,
      beneficiary: people[0]._id,
      targetJobRole: role._id,
      competencyGoals: [competencies[0]._id],
      justification:
        "Reviewed L2 record is below the proposed L4 role requirement.",
      priority: "HIGH",
      status: "APPROVED",
      reviewedBy: admin._id,
      reviewedAt: days(-10),
      reviewReason: "Relevant development request approved for demonstration.",
      history: [
        {
          from: "UNDER_REVIEW",
          to: "APPROVED",
          actor: admin._id,
          at: days(-10),
          reason: "Relevant development request approved for demonstration.",
        },
      ],
    },
  );
  await upsert(
    M.P2LearningPathAssignment,
    { trainee: people[0]._id, trainingNeed: approvedNeed._id },
    {
      trainee: people[0]._id,
      trainingNeed: approvedNeed._id,
      learningPath: paths[0]._id,
      learningPathVersion: 1,
      assignedBy: admin._id,
      assignedAt: days(-9),
      status: "ACTIVE",
    },
  );
  const returned = await upsert(
    M.P2Nomination,
    { trainee: people[0]._id, batch: batches[0]._id },
    {
      trainee: people[0]._id,
      course: courses[0]._id,
      batch: batches[0]._id,
      trainingNeed: approvedNeed._id,
      ruleVersion: rules[0]._id,
      reason: "Build guided radar interpretation practice.",
      correctionResponse: "",
      eligibilitySnapshot: {
        status: "ELIGIBLE",
        ruleVersion: 1,
        checkedAt: days(-4),
        checks: [
          {
            rule: "APPROVED_TRAINING_NEED",
            outcome: "PASS",
            explanation: "Approved synthetic need found.",
            sourceReference: "training-need",
          },
        ],
        blockingReasons: [],
        missingInformation: [],
      },
      status: "RETURNED",
      submittedAt: days(-5),
      reviewedAt: days(-4),
      reviewedBy: admin._id,
      decisionReason:
        "Please clarify how this batch supports the stated task goal.",
      revision: 3,
      history: [
        {
          from: "UNDER_REVIEW",
          to: "RETURNED",
          actor: admin._id,
          at: days(-4),
          reason:
            "Please clarify how this batch supports the stated task goal.",
        },
      ],
    },
  );
  const secondNeed = await upsert(
    M.P2TrainingNeed,
    { beneficiary: people[1]._id, title: "Radar foundation request" },
    {
      title: "Radar foundation request",
      requestedBy: people[1]._id,
      beneficiary: people[1]._id,
      targetJobRole: role._id,
      competencyGoals: [competencies[0]._id],
      justification: "Synthetic request for guided foundation practice.",
      status: "APPROVED",
      reviewedBy: admin._id,
      reviewedAt: days(-8),
      reviewReason: "Approved demonstration request.",
    },
  );
  await upsert(
    M.P2Nomination,
    { trainee: people[1]._id, batch: batches[0]._id },
    {
      trainee: people[1]._id,
      course: courses[0]._id,
      batch: batches[0]._id,
      trainingNeed: secondNeed._id,
      ruleVersion: rules[0]._id,
      reason: "Synthetic application.",
      eligibilitySnapshot: {
        status: "ELIGIBLE",
        ruleVersion: 1,
        checkedAt: days(-2),
        checks: [],
        blockingReasons: [],
        missingInformation: [],
      },
      status: "WAITLISTED",
      submittedAt: days(-3),
      reviewedAt: days(-2),
      reviewedBy: admin._id,
      decisionReason: "Eligible; awaiting an available seat.",
      revision: 3,
    },
  );
  const pendingNeed = await upsert(
    M.P2TrainingNeed,
    {
      beneficiary: people[2]._id,
      title: "Pending satellite applications request",
    },
    {
      title: "Pending satellite applications request",
      description:
        "Synthetic approved need supporting a nomination awaiting review.",
      requestedBy: people[2]._id,
      beneficiary: people[2]._id,
      targetJobRole: role._id,
      competencyGoals: [competencies[3]._id],
      justification:
        "Synthetic request for guided satellite interpretation practice.",
      priority: "MEDIUM",
      status: "APPROVED",
      reviewedBy: admin._id,
      reviewedAt: days(-5),
      reviewReason: "Approved synthetic request for the pending queue.",
    },
  );
  const pendingNomination = await upsert(
    M.P2Nomination,
    { trainee: people[2]._id, batch: batches[3]._id },
    {
      trainee: people[2]._id,
      course: courses[3]._id,
      batch: batches[3]._id,
      trainingNeed: pendingNeed._id,
      ruleVersion: rules[3]._id,
      reason: "Synthetic nomination awaiting coordinator review.",
      eligibilitySnapshot: {
        status: "ELIGIBLE",
        ruleVersion: 1,
        checkedAt: days(-1),
        checks: [
          {
            rule: "APPROVED_TRAINING_NEED",
            outcome: "PASS",
            explanation: "Approved synthetic need found.",
            sourceReference: "training-need",
          },
        ],
        blockingReasons: [],
        missingInformation: [],
      },
      status: "SUBMITTED",
      submittedAt: days(-1),
      revision: 1,
      history: [
        {
          from: "DRAFT",
          to: "SUBMITTED",
          actor: people[2]._id,
          at: days(-1),
          reason: "Submitted synthetic nomination for review.",
        },
      ],
    },
  );
  const reservedNeed = await upsert(
    M.P2TrainingNeed,
    { beneficiary: people[9]._id, title: "Existing sample admission need" },
    {
      title: "Existing sample admission need",
      requestedBy: people[9]._id,
      beneficiary: people[9]._id,
      targetJobRole: role._id,
      competencyGoals: [competencies[0]._id],
      justification: "Synthetic record supporting the occupied-seat example.",
      status: "APPROVED",
      reviewedBy: admin._id,
      reviewedAt: days(-12),
      reviewReason: "Approved demonstration request.",
    },
  );
  const reservedNomination = await upsert(
    M.P2Nomination,
    { trainee: people[9]._id, batch: batches[0]._id },
    {
      trainee: people[9]._id,
      course: courses[0]._id,
      batch: batches[0]._id,
      trainingNeed: reservedNeed._id,
      ruleVersion: rules[0]._id,
      reason: "Synthetic confirmed application.",
      eligibilitySnapshot: {
        status: "ELIGIBLE",
        ruleVersion: 1,
        checkedAt: days(-6),
        checks: [],
        blockingReasons: [],
        missingInformation: [],
      },
      status: "APPROVED",
      submittedAt: days(-8),
      reviewedAt: days(-6),
      reviewedBy: admin._id,
      decisionReason: "Eligibility confirmed and one sample seat allocated.",
      revision: 4,
    },
  );
  await upsert(
    M.P2Enrollment,
    { trainee: people[9]._id, batch: batches[0]._id },
    {
      trainee: people[9]._id,
      batch: batches[0]._id,
      nomination: reservedNomination._id,
      status: "CONFIRMED",
      admittedBy: admin._id,
      admittedAt: days(-6),
    },
  );
  return {
    admin,
    asha: people[0],
    trainees: people,
    role,
    competencies,
    courses,
    rules,
    batches,
    paths,
    approvedNeed,
    returned,
    pendingNomination,
  };
}
