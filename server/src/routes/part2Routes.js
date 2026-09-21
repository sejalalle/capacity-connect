import { Router } from "express";
import mongoose from "mongoose";
import auth from "../middleware/authMiddleware.js";
import roles from "../middleware/roleMiddleware.js";
import { HttpError } from "../middleware/errorHandler.js";
import * as M from "../models/Part2.js";
import * as P3 from "../models/Part3.js";
import {
  approveNomination,
  assertTransition,
  cancelAdmission,
  checkEligibility,
  gapsFor,
  needTransitions,
  nominationTransitions,
  notify,
  recordAudit,
} from "../services/part2Service.js";

const router = Router();
router.use((req, res, next) =>
  /^\/(dashboard|competencies|job-roles|competency-records|gaps|training-needs|learning-paths|courses|batches|nominations|calendar|notifications|audit)(\/|$)/.test(
    req.path,
  )
    ? auth(req, res, next)
    : next(),
);
const ok = (res, data, message) =>
  res.json({ success: true, data, ...(message && { message }) });
const fail = (status, message) => {
  throw new HttpError(status, message);
};
const admin = roles(["admin"]);
const allRoles = roles(["trainee", "trainer", "admin"]);
const same = (a, b) => String(a?._id || a) === String(b?._id || b);
const canManageCourse = (user, course) =>
  user.role === "admin" ||
  (user.role === "trainer" && same(course.createdBy, user._id));
const courseFields = [
  "title",
  "code",
  "description",
  "domain",
  "category",
  "duration",
  "difficulty",
  "targetJobRoles",
  "competencyOutcomes",
];
const courseInput = (body) =>
  Object.fromEntries(
    courseFields
      .filter((key) => body[key] !== undefined)
      .map((key) => [key, body[key]]),
  );
const publicationErrors = async (course) => {
  const errors = [];
  for (const [field, label] of [
    ["title", "Course title"],
    ["code", "Course code"],
    ["description", "Description"],
    ["domain", "Domain"],
    ["category", "Category"],
    ["difficulty", "Difficulty"],
  ])
    if (!String(course[field] || "").trim())
      errors.push({ field, message: `${label} is required.` });
  if (!Number.isFinite(course.duration?.value) || course.duration.value <= 0)
    errors.push({
      field: "duration.value",
      message: "Duration must be greater than zero.",
    });
  if (!course.duration?.unit)
    errors.push({
      field: "duration.unit",
      message: "Duration unit is required.",
    });
  if (!course.competencyOutcomes?.length)
    errors.push({
      field: "competencyOutcomes",
      message: "Add at least one intended competency outcome.",
    });
  for (const [index, outcome] of (course.competencyOutcomes || []).entries()) {
    const competency = await M.P2Competency.findById(outcome.competency).lean();
    if (!competency || competency.status !== "PUBLISHED")
      errors.push({
        field: `competencyOutcomes.${index}.competency`,
        message: "Select a published competency.",
      });
    else if (competency.version !== outcome.frameworkVersion)
      errors.push({
        field: `competencyOutcomes.${index}.frameworkVersion`,
        message: "Framework version must match the selected competency.",
      });
    if (
      !Number.isInteger(outcome.targetLevel) ||
      outcome.targetLevel < 1 ||
      outcome.targetLevel > 5 ||
      (competency &&
        !competency.levels.some((level) => level.value === outcome.targetLevel))
    )
      errors.push({
        field: `competencyOutcomes.${index}.targetLevel`,
        message: "Select a target level defined by this competency version.",
      });
  }
  return errors;
};
const objectId = (value) =>
  mongoose.isValidObjectId(value) ? value : fail(400, "Invalid identifier");
const page = (req) => ({
  page: Math.max(1, Number(req.query.page) || 1),
  limit: Math.min(50, Math.max(1, Number(req.query.limit) || 20)),
});
const list = async (Model, query, req, populate = "") => {
  const p = page(req);
  const [items, total] = await Promise.all([
    Model.find(query)
      .populate(populate)
      .sort({ createdAt: -1 })
      .skip((p.page - 1) * p.limit)
      .limit(p.limit)
      .lean(),
    Model.countDocuments(query),
  ]);
  return {
    items,
    pagination: { ...p, total, pages: Math.ceil(total / p.limit) },
  };
};
const ownerQuery = (req, field = "trainee") =>
  req.user.role === "admin" ? {} : { [field]: req.user._id };
const reasonRequired = (value) => {
  if (!value || String(value).trim().length < 4)
    fail(400, "A specific reason is required");
  return String(value).trim();
};
const requiredText = (value, label, max = 200) => {
  const text = String(value || "").trim();
  if (!text || text.length > max)
    fail(400, `${label} is required and must be at most ${max} characters`);
  return text;
};
const positiveInteger = (value, label, max = Number.MAX_SAFE_INTEGER) => {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > max)
    fail(400, `${label} must be a whole number between 1 and ${max}`);
  return number;
};
const notifyAdmins = async (payload) => {
  const admins = await mongoose
    .model("User")
    .find({ role: "admin", accountStatus: "approved" })
    .select("_id")
    .lean();
  await Promise.all(
    admins.map((adminUser) =>
      notify({
        ...payload,
        recipient: adminUser._id,
        eventId: `${payload.eventId}:${adminUser._id}`,
      }),
    ),
  );
};

router.get("/dashboard", allRoles, async (req, res) => {
  if (req.user.role === "trainer") {
    const [courses, batches, unread] = await Promise.all([
      M.P2Course.countDocuments({ status: "PUBLISHED" }),
      M.P2Batch.countDocuments({
        status: "OPEN",
        startDate: { $gte: new Date() },
      }),
      M.P2Notification.countDocuments({
        recipient: req.user._id,
        readAt: null,
      }),
    ]);
    return ok(res, {
      role: "trainer",
      kpis: {
        publishedCourses: courses,
        upcomingBatches: batches,
        unreadNotifications: unread,
      },
      actionItems: [],
      upcoming: await M.P2Batch.find({
        status: "OPEN",
        startDate: { $gte: new Date() },
      })
        .populate("course")
        .sort({ startDate: 1 })
        .limit(5)
        .lean(),
    });
  }
  if (req.user.role === "admin") {
    const [needs, nominations, batches, demand] = await Promise.all([
      M.P2TrainingNeed.find({
        status: { $in: ["SUBMITTED", "RESUBMITTED", "UNDER_REVIEW"] },
      })
        .populate("beneficiary competencyGoals")
        .sort({ createdAt: 1 })
        .limit(10)
        .lean(),
      M.P2Nomination.find({
        status: {
          $in: ["SUBMITTED", "RESUBMITTED", "UNDER_REVIEW", "WAITLISTED"],
        },
      })
        .populate("trainee course batch")
        .sort({ createdAt: 1 })
        .limit(10)
        .lean(),
      M.P2Batch.find({
        status: { $in: ["OPEN", "CLOSED"] },
        startDate: { $gte: new Date() },
      })
        .populate("course")
        .sort({ startDate: 1 })
        .limit(8)
        .lean(),
      M.P2TrainingNeed.aggregate([
        {
          $match: {
            status: { $in: ["SUBMITTED", "UNDER_REVIEW", "APPROVED"] },
          },
        },
        { $unwind: "$competencyGoals" },
        { $group: { _id: "$competencyGoals", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 6 },
      ]),
    ]);
    return ok(res, {
      role: "admin",
      kpis: {
        pendingNeeds: needs.length,
        pendingNominations: nominations.length,
        activeBatches: batches.length,
        waitlisted: await M.P2Nomination.countDocuments({
          status: "WAITLISTED",
        }),
      },
      needs,
      nominations,
      batches,
      demand,
    });
  }
  const gaps = await gapsFor(req.user._id);
  const [needs, nominations, enrollments, assignment] = await Promise.all([
    M.P2TrainingNeed.find({ beneficiary: req.user._id })
      .sort({ createdAt: -1 })
      .lean(),
    M.P2Nomination.find({ trainee: req.user._id })
      .populate("course batch")
      .sort({ createdAt: -1 })
      .lean(),
    M.P2Enrollment.find({ trainee: req.user._id, status: "CONFIRMED" })
      .populate({ path: "batch", populate: { path: "course" } })
      .lean(),
    M.P2LearningPathAssignment.findOne({
      trainee: req.user._id,
      status: "ACTIVE",
    })
      .populate({
        path: "learningPath",
        populate: { path: "orderedCourseSteps.course" },
      })
      .sort({ assignedAt: -1 })
      .lean(),
  ]);
  const actionItems = nominations
    .filter((x) => x.status === "RETURNED")
    .map((x) => ({
      type: "RETURNED_NOMINATION",
      title: `${x.course?.title || "Nomination"} needs correction`,
      path: `/trainee/nominations/${x._id}`,
      message: x.decisionReason,
    }));
  return ok(res, {
    role: "trainee",
    kpis: {
      activeNeeds: needs.filter(
        (x) => !["CLOSED", "WITHDRAWN", "REJECTED"].includes(x.status),
      ).length,
      knownGaps: gaps.filter((x) => Number.isInteger(x.gap) && x.gap > 0)
        .length,
      notAssessed: gaps.filter((x) => x.category === "NOT_ASSESSED").length,
      activeNominations: nominations.filter(
        (x) =>
          !["WITHDRAWN", "REJECTED", "ADMISSION_CANCELLED"].includes(x.status),
      ).length,
      upcomingEnrolledBatches: enrollments.length,
    },
    actionItems,
    upcoming: enrollments,
    assignment,
  });
});

router.get("/competencies", allRoles, async (req, res) =>
  ok(
    res,
    await list(
      M.P2Competency,
      req.user.role === "admin" ? {} : { status: "PUBLISHED" },
      req,
    ),
  ),
);
router.post("/competencies", admin, async (req, res) => {
  if (!Array.isArray(req.body.levels) || !req.body.levels.length)
    fail(400, "At least one plain-language competency level is required");
  const levels = req.body.levels.map((level) => ({
    value: positiveInteger(level.value, "Level value", 5),
    label: requiredText(level.label, "Level label", 80),
    definition: requiredText(level.definition, "Level definition", 500),
  }));
  if (new Set(levels.map((level) => level.value)).size !== levels.length)
    fail(400, "Competency level values must be distinct");
  const row = await M.P2Competency.create({
    name: requiredText(req.body.name, "Competency name"),
    code: requiredText(req.body.code, "Competency code", 50).toUpperCase(),
    description: String(req.body.description || "").trim(),
    domain: requiredText(req.body.domain, "Domain"),
    version: positiveInteger(req.body.version, "Version", 999),
    levels,
    status: ["DRAFT", "PUBLISHED"].includes(req.body.status)
      ? req.body.status
      : "DRAFT",
    isSynthetic: Boolean(req.body.isSynthetic),
    createdBy: req.user._id,
  });
  await recordAudit({
    actor: req.user._id,
    action: "COMPETENCY_VERSION_CREATED",
    entityType: "Competency",
    entityId: row._id,
    newStatus: row.status,
    changes: { code: row.code, version: row.version },
    reason: "Coordinator created a versioned competency definition",
    isSynthetic: row.isSynthetic,
  });
  ok(res.status(201), row, "Competency version created");
});
router.post("/competencies/:id/publish", admin, async (req, res) => {
  const row = await M.P2Competency.findById(objectId(req.params.id));
  if (!row) fail(404, "Competency not found");
  if (row.status !== "DRAFT")
    fail(409, "Only draft competency versions can be published");
  if (
    !row.levels.length ||
    row.levels.some(
      (level) => !level.definition?.trim() || !level.label?.trim(),
    )
  )
    fail(
      400,
      "Every configured level needs a label and plain-language definition",
    );
  row.status = "PUBLISHED";
  await row.save();
  await recordAudit({
    actor: req.user._id,
    action: "COMPETENCY_PUBLISHED",
    entityType: "Competency",
    entityId: row._id,
    reason: "Coordinator published the competency framework version",
  });
  ok(res, row, "Competency available for course mapping");
});
router.get("/job-roles", allRoles, async (req, res) =>
  ok(res, await M.P2JobRole.find({ status: "ACTIVE" }).lean()),
);
router.post("/job-roles", admin, async (req, res) => {
  const row = await M.P2JobRole.create({
    title: requiredText(req.body.title, "Professional role title"),
    description: requiredText(req.body.description, "Description", 1000),
    status: "ACTIVE",
    isSynthetic: Boolean(req.body.isSynthetic),
    createdBy: req.user._id,
  });
  await recordAudit({
    actor: req.user._id,
    action: "JOB_ROLE_CREATED",
    entityType: "JobRole",
    entityId: row._id,
    newStatus: row.status,
    changes: { title: row.title },
    reason: "Coordinator created a proposed professional role",
    isSynthetic: row.isSynthetic,
  });
  ok(res.status(201), row, "Professional role created");
});
router.get("/job-roles/:id/requirements", allRoles, async (req, res) =>
  ok(
    res,
    await M.P2RoleRequirement.find({ jobRole: objectId(req.params.id) })
      .populate("competency")
      .lean(),
  ),
);
router.post("/job-roles/:id/requirements", admin, async (req, res) => {
  const competency = await M.P2Competency.findById(
    objectId(req.body.competency),
  ).lean();
  if (!competency) fail(404, "Competency not found");
  const jobRole = await M.P2JobRole.findById(objectId(req.params.id)).lean();
  if (!jobRole) fail(404, "Professional role not found");
  const row = await M.P2RoleRequirement.create({
    jobRole: jobRole._id,
    competency: competency._id,
    competencyVersion: positiveInteger(
      req.body.competencyVersion,
      "Competency version",
      999,
    ),
    requiredLevel: positiveInteger(req.body.requiredLevel, "Required level", 5),
    priority: ["LOW", "MEDIUM", "HIGH"].includes(req.body.priority)
      ? req.body.priority
      : "MEDIUM",
    version: positiveInteger(req.body.version, "Requirement version", 999),
    effectiveAt: req.body.effectiveAt
      ? new Date(req.body.effectiveAt)
      : new Date(),
    isSynthetic: Boolean(req.body.isSynthetic),
    createdBy: req.user._id,
  });
  if (Number.isNaN(row.effectiveAt.getTime()))
    fail(400, "Effective date is invalid");
  await recordAudit({
    actor: req.user._id,
    action: "ROLE_REQUIREMENT_CREATED",
    entityType: "RoleRequirement",
    entityId: row._id,
    newStatus: "ACTIVE",
    changes: {
      jobRole: String(jobRole._id),
      competency: String(competency._id),
      requiredLevel: row.requiredLevel,
      version: row.version,
    },
    reason: "Coordinator created a versioned professional-role requirement",
    isSynthetic: row.isSynthetic,
  });
  ok(res.status(201), row, "Role requirement created");
});
router.get("/competency-records/me", roles(["trainee"]), async (req, res) =>
  ok(
    res,
    await M.P2CompetencyRecord.find({ trainee: req.user._id })
      .populate("competency reviewer")
      .lean(),
  ),
);
router.get("/competency-records/:traineeId", admin, async (req, res) =>
  ok(
    res,
    await M.P2CompetencyRecord.find({ trainee: objectId(req.params.traineeId) })
      .populate("competency reviewer")
      .lean(),
  ),
);
router.get("/gaps/me", roles(["trainee"]), async (req, res) =>
  ok(res, await gapsFor(req.user._id)),
);
router.get("/gaps/:traineeId", admin, async (req, res) =>
  ok(res, await gapsFor(objectId(req.params.traineeId))),
);

router.get("/training-needs", allRoles, async (req, res) =>
  ok(
    res,
    await list(
      M.P2TrainingNeed,
      req.user.role === "admin"
        ? req.query.status
          ? { status: req.query.status }
          : {}
        : { beneficiary: req.user._id },
      req,
      "beneficiary targetJobRole competencyGoals reviewedBy",
    ),
  ),
);
router.post(
  "/training-needs",
  roles(["trainee", "admin"]),
  async (req, res) => {
    const beneficiary =
      req.user.role === "admin" ? objectId(req.body.beneficiary) : req.user._id;
    const row = await M.P2TrainingNeed.create({
      title: req.body.title,
      description: req.body.description,
      requestedBy: req.user._id,
      beneficiary,
      targetJobRole: objectId(req.body.targetJobRole),
      competencyGoals: req.body.competencyGoals || [],
      justification: reasonRequired(req.body.justification),
      priority: req.body.priority || "MEDIUM",
      status: "DRAFT",
      isSynthetic: Boolean(req.body.isSynthetic),
      demoNamespace: req.body.demoNamespace,
    });
    ok(res.status(201), row, "Training need draft saved");
  },
);
router.get("/training-needs/:id", allRoles, async (req, res) => {
  const row = await M.P2TrainingNeed.findById(objectId(req.params.id))
    .populate("beneficiary targetJobRole competencyGoals reviewedBy")
    .lean();
  if (!row || (req.user.role !== "admin" && !same(row.beneficiary, req.user)))
    fail(404, "Training need not found");
  ok(res, row);
});
router.patch(
  "/training-needs/:id",
  roles(["trainee", "admin"]),
  async (req, res) => {
    const row = await M.P2TrainingNeed.findById(objectId(req.params.id));
    if (!row || (req.user.role !== "admin" && !same(row.beneficiary, req.user)))
      fail(404, "Training need not found");
    if (!["DRAFT", "RETURNED"].includes(row.status))
      fail(409, "Only draft or returned needs can be edited");
    for (const key of [
      "title",
      "description",
      "justification",
      "priority",
      "competencyGoals",
    ])
      if (req.body[key] !== undefined) row[key] = req.body[key];
    row.revision += 1;
    await row.save();
    ok(res, row, "Training need updated");
  },
);
router.post(
  "/training-needs/:id/transitions",
  roles(["trainee", "admin"]),
  async (req, res) => {
    const row = await M.P2TrainingNeed.findById(objectId(req.params.id));
    if (!row || (req.user.role !== "admin" && !same(row.beneficiary, req.user)))
      fail(404, "Training need not found");
    const to = req.body.status;
    assertTransition(needTransitions, row.status, to);
    const adminStates = [
      "UNDER_REVIEW",
      "APPROVED",
      "RETURNED",
      "REJECTED",
      "CLOSED",
    ];
    if (adminStates.includes(to) && req.user.role !== "admin")
      fail(403, "Coordinator permission required");
    const reason = ["RETURNED", "REJECTED", "CLOSED", "WITHDRAWN"].includes(to)
      ? reasonRequired(req.body.reason)
      : String(req.body.reason || "Status updated");
    const from = row.status;
    row.status = to;
    row.revision += 1;
    row.history.push({ from, to, actor: req.user._id, reason });
    if (adminStates.includes(to)) {
      row.reviewedBy = req.user._id;
      row.reviewedAt = new Date();
      row.reviewReason = reason;
    }
    await row.save();
    await recordAudit({
      actor: req.user._id,
      action: `TRAINING_NEED_${to}`,
      entityType: "TrainingNeed",
      entityId: row._id,
      previousStatus: from,
      newStatus: to,
      changes: {},
      reason,
      isSynthetic: row.isSynthetic,
      demoNamespace: row.demoNamespace,
    });
    if (["SUBMITTED", "RESUBMITTED"].includes(to))
      await notifyAdmins({
        type: "TRAINING_NEED_REVIEW",
        title: "Training need awaiting review",
        message: row.title,
        entityReference: {
          entityType: "TrainingNeed",
          entityId: row._id,
          path: `/admin/training-needs/${row._id}`,
        },
        eventId: `need:${row._id}:${to}:${row.revision}`,
        isSynthetic: row.isSynthetic,
        demoNamespace: row.demoNamespace,
      });
    if (["APPROVED", "RETURNED", "REJECTED"].includes(to))
      await notify({
        recipient: row.beneficiary,
        type: `TRAINING_NEED_${to}`,
        title: `Training need ${to.toLowerCase().replaceAll("_", " ")}`,
        message: reason,
        entityReference: {
          entityType: "TrainingNeed",
          entityId: row._id,
          path: `/trainee/training-needs/${row._id}`,
        },
        eventId: `need:${row._id}:${to}:${row.revision}`,
        isSynthetic: row.isSynthetic,
        demoNamespace: row.demoNamespace,
      });
    ok(res, row, "Training need status updated");
  },
);

router.get("/learning-paths", allRoles, async (req, res) =>
  ok(
    res,
    await list(
      M.P2LearningPath,
      req.user.role === "admin" ? {} : { status: "PUBLISHED" },
      req,
      "targetJobRoles competencyGoals orderedCourseSteps.course",
    ),
  ),
);
router.post("/learning-paths", admin, async (req, res) => {
  const orders = (req.body.orderedCourseSteps || []).map((x) => x.order);
  const courses = (req.body.orderedCourseSteps || []).map((x) =>
    String(x.course),
  );
  if (
    new Set(orders).size !== orders.length ||
    new Set(courses).size !== courses.length
  )
    fail(400, "Learning path steps must be unique");
  ok(
    res.status(201),
    await M.P2LearningPath.create({ ...req.body, createdBy: req.user._id }),
  );
});
router.post("/learning-paths/:id/assign", admin, async (req, res) => {
  const path = await M.P2LearningPath.findOne({
    _id: objectId(req.params.id),
    status: "PUBLISHED",
  });
  const need = await M.P2TrainingNeed.findOne({
    _id: objectId(req.body.trainingNeed),
    status: "APPROVED",
  });
  if (!path || !need)
    fail(409, "A published path and approved need are required");
  const row = await M.P2LearningPathAssignment.create({
    trainee: need.beneficiary,
    trainingNeed: need._id,
    learningPath: path._id,
    learningPathVersion: path.version,
    assignedBy: req.user._id,
    assignedAt: new Date(),
    isSynthetic: need.isSynthetic,
    demoNamespace: need.demoNamespace,
  });
  ok(res.status(201), row, "Learning path assigned");
});
router.get(
  "/learning-paths/assignments/me",
  roles(["trainee"]),
  async (req, res) =>
    ok(
      res,
      await M.P2LearningPathAssignment.find({ trainee: req.user._id })
        .populate({
          path: "learningPath",
          populate: { path: "orderedCourseSteps.course competencyGoals" },
        })
        .lean(),
    ),
);

router.get("/courses", allRoles, async (req, res) => {
  const query =
    req.user.role === "admin"
      ? {}
      : req.user.role === "trainer"
        ? { $or: [{ createdBy: req.user._id }, { status: "PUBLISHED" }] }
        : { status: "PUBLISHED" };
  if (req.query.domain) query.domain = req.query.domain;
  if (req.query.q) query.$text = { $search: req.query.q };
  ok(
    res,
    await list(
      M.P2Course,
      query,
      req,
      "competencyOutcomes.competency targetJobRoles createdBy",
    ),
  );
});
router.get("/courses/:id", allRoles, async (req, res) => {
  const course = await M.P2Course.findById(objectId(req.params.id))
    .populate("competencyOutcomes.competency targetJobRoles")
    .lean();
  if (
    !course ||
    (course.status === "DRAFT" && !canManageCourse(req.user, course))
  )
    fail(404, "Course not found");
  const batches = await M.P2Batch.find({
    course: course._id,
    ...(req.user.role === "admin"
      ? {}
      : { status: { $in: ["OPEN", "CLOSED", "ONGOING", "COMPLETED"] } }),
  })
    .populate("ruleVersion")
    .sort({ startDate: 1 })
    .lean();
  const canManage = canManageCourse(req.user, course);
  const modules = canManage
    ? await P3.P3LearningModule.find({ course: course._id, batch: null })
        .sort({ order: 1, version: -1 })
        .lean()
    : [];
  ok(res, {
    course,
    batches,
    modules,
    access: { isOwner: same(course.createdBy, req.user._id), canManage },
  });
});
router.post("/courses", roles(["trainer", "admin"]), async (req, res) => {
  const input = courseInput(req.body);
  const row = await M.P2Course.create({
    ...input,
    status: "DRAFT",
    createdBy: req.user._id,
  });
  await recordAudit({
    actor: req.user._id,
    action: "COURSE_CREATED",
    entityType: "P2Course",
    entityId: row._id,
    reason: "Course draft created by its owner",
    changes: { status: row.status },
  });
  ok(res.status(201), row, "Course draft created");
});
router.patch("/courses/:id", roles(["trainer", "admin"]), async (req, res) => {
  const row = await M.P2Course.findById(objectId(req.params.id));
  if (!row) fail(404, "Course not found");
  if (!canManageCourse(req.user, row))
    fail(403, "You can only edit a course you own");
  if (row.status !== "DRAFT")
    fail(
      409,
      "Published course metadata is version-stable; archive it or create a new course version",
    );
  Object.assign(row, courseInput(req.body));
  await row.save();
  ok(res, row, "Course draft saved");
});
router.post(
  "/courses/:id/publish",
  roles(["trainer", "admin"]),
  async (req, res) => {
    const row = await M.P2Course.findById(objectId(req.params.id));
    if (!row) fail(404, "Course not found");
    if (!canManageCourse(req.user, row))
      fail(403, "You can only publish a course you own");
    if (row.status !== "DRAFT")
      fail(409, "Only a draft course can be published");
    const errors = await publicationErrors(row);
    if (errors.length)
      throw new HttpError(
        400,
        "Complete the required course information before publishing.",
        errors,
      );
    row.status = "PUBLISHED";
    await row.save();
    await recordAudit({
      actor: req.user._id,
      action: "COURSE_PUBLISHED",
      entityType: "P2Course",
      entityId: row._id,
      reason: "Owner published a valid course",
      changes: { status: row.status },
    });
    ok(res, row, "Course published");
  },
);
router.post(
  "/courses/:id/archive",
  roles(["trainer", "admin"]),
  async (req, res) => {
    const row = await M.P2Course.findById(objectId(req.params.id));
    if (!row) fail(404, "Course not found");
    if (!canManageCourse(req.user, row))
      fail(403, "You can only archive a course you own");
    if (row.status !== "PUBLISHED")
      fail(409, "Only a published course can be archived");
    row.status = "ARCHIVED";
    await row.save();
    await recordAudit({
      actor: req.user._id,
      action: "COURSE_ARCHIVED",
      entityType: "P2Course",
      entityId: row._id,
      reason: String(req.body?.reason || "Course archived by owner"),
      changes: { status: row.status },
    });
    ok(
      res,
      row,
      "Course archived; existing enrollment references are preserved",
    );
  },
);
router.post("/courses/:id/rules", admin, async (req, res) =>
  ok(
    res.status(201),
    await M.P2CourseRuleVersion.create({
      ...req.body,
      course: objectId(req.params.id),
      createdBy: req.user._id,
      publishedAt: req.body.status === "PUBLISHED" ? new Date() : null,
    }),
  ),
);

router.get("/batches", allRoles, async (req, res) =>
  ok(
    res,
    await list(
      M.P2Batch,
      req.user.role === "admin"
        ? {}
        : { status: { $in: ["OPEN", "CLOSED", "ONGOING", "COMPLETED"] } },
      req,
      "course ruleVersion",
    ),
  ),
);
router.get("/batches/:id", allRoles, async (req, res) => {
  const batch = await M.P2Batch.findById(objectId(req.params.id))
    .populate("course ruleVersion")
    .lean();
  if (!batch) fail(404, "Batch not found");
  const data = {
    batch,
    activeEnrollments: await M.P2Enrollment.countDocuments({
      batch: batch._id,
      status: "CONFIRMED",
    }),
    waitlisted: await M.P2Nomination.countDocuments({
      batch: batch._id,
      status: "WAITLISTED",
    }),
  };
  if (req.user.role === "admin")
    data.roster = await M.P2Enrollment.find({
      batch: batch._id,
      status: "CONFIRMED",
    })
      .populate("trainee", "name email department designation")
      .lean();
  ok(res, data);
});
router.post("/batches", admin, async (req, res) => {
  const start = new Date(req.body.startDate),
    end = new Date(req.body.endDate),
    opens = new Date(req.body.nominationOpensAt),
    closes = new Date(req.body.nominationClosesAt);
  if (!(opens < closes && closes <= start && start < end))
    fail(400, "Dates must follow nomination open → close → batch start → end");
  if (
    ["IN_PERSON", "BLENDED"].includes(req.body.deliveryMode) &&
    !req.body.location
  )
    fail(400, "Location is required for physical or blended delivery");
  ok(
    res.status(201),
    await M.P2Batch.create({ ...req.body, createdBy: req.user._id }),
  );
});
router.get("/batches/:id/eligibility", roles(["trainee"]), async (req, res) =>
  ok(
    res,
    await checkEligibility({
      traineeId: req.user._id,
      batchId: objectId(req.params.id),
    }),
  ),
);

router.get("/nominations", allRoles, async (req, res) =>
  ok(
    res,
    await list(
      M.P2Nomination,
      {
        ...ownerQuery(req),
        ...(req.query.status && { status: req.query.status }),
      },
      req,
      "trainee course batch trainingNeed learningPathAssignment reviewedBy",
    ),
  ),
);
router.post("/nominations", roles(["trainee"]), async (req, res) => {
  const batch = await M.P2Batch.findOne({
    _id: objectId(req.body.batch),
    status: "OPEN",
  });
  if (!batch) fail(409, "This batch is not open for nominations");
  const eligibility = await checkEligibility({
    traineeId: req.user._id,
    batchId: batch._id,
  });
  if (eligibility.status === "INELIGIBLE")
    fail(409, eligibility.blockingReasons.join(" "));
  if (
    eligibility.status === "NEEDS_INFORMATION" &&
    !eligibility.allowIncompleteForReview
  )
    fail(409, eligibility.missingInformation.join(" "));
  const row = await M.P2Nomination.create({
    trainee: req.user._id,
    course: batch.course,
    batch: batch._id,
    trainingNeed: objectId(req.body.trainingNeed),
    learningPathAssignment: req.body.learningPathAssignment || undefined,
    ruleVersion: batch.ruleVersion,
    reason: reasonRequired(req.body.reason),
    eligibilitySnapshot: eligibility,
    status: "DRAFT",
  });
  ok(res.status(201), row, "Nomination draft saved");
});
router.get("/nominations/:id", allRoles, async (req, res) => {
  const row = await M.P2Nomination.findById(objectId(req.params.id))
    .populate(
      "trainee course batch trainingNeed learningPathAssignment reviewedBy",
    )
    .lean();
  if (!row || (req.user.role !== "admin" && !same(row.trainee, req.user)))
    fail(404, "Nomination not found");
  ok(res, row);
});
router.patch("/nominations/:id", roles(["trainee"]), async (req, res) => {
  const row = await M.P2Nomination.findOne({
    _id: objectId(req.params.id),
    trainee: req.user._id,
  });
  if (!row) fail(404, "Nomination not found");
  if (!["DRAFT", "RETURNED"].includes(row.status))
    fail(409, "Only draft or returned nominations can be edited");
  for (const key of ["reason", "correctionResponse"])
    if (req.body[key] !== undefined) row[key] = req.body[key];
  row.revision += 1;
  await row.save();
  ok(res, row, "Nomination updated");
});
router.post("/nominations/:id/transitions", allRoles, async (req, res) => {
  const row = await M.P2Nomination.findById(objectId(req.params.id));
  if (!row || (req.user.role !== "admin" && !same(row.trainee, req.user)))
    fail(404, "Nomination not found");
  const to = req.body.status;
  if (to === "APPROVED") {
    if (req.user.role !== "admin") fail(403, "Coordinator permission required");
    return ok(
      res,
      await approveNomination({
        nominationId: row._id,
        expectedRevision: Number(req.body.expectedRevision),
        actor: req.user,
        reason: reasonRequired(req.body.reason),
      }),
      "Admission confirmed",
    );
  }
  if (to === "ADMISSION_CANCELLED") {
    if (req.user.role !== "admin") fail(403, "Coordinator permission required");
    return ok(
      res,
      await cancelAdmission({
        nominationId: row._id,
        actor: req.user,
        reason: reasonRequired(req.body.reason),
      }),
      "Admission cancelled",
    );
  }
  assertTransition(nominationTransitions, row.status, to);
  const adminStates = ["UNDER_REVIEW", "RETURNED", "WAITLISTED", "REJECTED"];
  if (adminStates.includes(to) && req.user.role !== "admin")
    fail(403, "Coordinator permission required");
  const reason = ["RETURNED", "REJECTED", "WAITLISTED", "WITHDRAWN"].includes(
    to,
  )
    ? reasonRequired(req.body.reason)
    : String(req.body.reason || "Status updated");
  const from = row.status;
  row.status = to;
  row.revision += 1;
  row.history.push({ from, to, actor: req.user._id, reason });
  if (adminStates.includes(to)) {
    row.reviewedBy = req.user._id;
    row.reviewedAt = new Date();
    row.decisionReason = reason;
  }
  if (["SUBMITTED", "RESUBMITTED"].includes(to)) {
    row.submittedAt = new Date();
    row.eligibilitySnapshot = await checkEligibility({
      traineeId: row.trainee,
      batchId: row.batch,
    });
  }
  await row.save();
  await recordAudit({
    actor: req.user._id,
    action: `NOMINATION_${to}`,
    entityType: "Nomination",
    entityId: row._id,
    previousStatus: from,
    newStatus: to,
    changes: {},
    reason,
    isSynthetic: row.isSynthetic,
    demoNamespace: row.demoNamespace,
  });
  const event = {
    type: `NOMINATION_${to}`,
    title: `Nomination ${to.toLowerCase().replaceAll("_", " ")}`,
    message: reason,
    entityReference: {
      entityType: "Nomination",
      entityId: row._id,
      path: `/trainee/nominations/${row._id}`,
    },
    eventId: `nomination:${row._id}:${to}:${row.revision}`,
    isSynthetic: row.isSynthetic,
    demoNamespace: row.demoNamespace,
  };
  if (["SUBMITTED", "RESUBMITTED"].includes(to))
    await notifyAdmins({
      ...event,
      type: "NOMINATION_REVIEW",
      title: "Nomination awaiting review",
      entityReference: {
        ...event.entityReference,
        path: `/admin/nominations/${row._id}`,
      },
    });
  else await notify({ ...event, recipient: row.trainee });
  ok(res, row, "Nomination status updated");
});

router.get("/calendar", allRoles, async (req, res) => {
  const query = {
    startDate: {
      $gte: req.query.from ? new Date(req.query.from) : new Date(0),
    },
    endDate: {
      $lte: req.query.to ? new Date(req.query.to) : new Date("2999-01-01"),
    },
    status: { $in: ["OPEN", "CLOSED", "ONGOING", "COMPLETED"] },
  };
  const batches = await M.P2Batch.find(query)
    .populate("course")
    .sort({ startDate: 1 })
    .lean();
  if (req.user.role === "trainee") {
    const enrolled = new Set(
      (
        await M.P2Enrollment.find({
          trainee: req.user._id,
          status: "CONFIRMED",
        }).distinct("batch")
      ).map(String),
    );
    batches.forEach((x) => (x.isEnrolled = enrolled.has(String(x._id))));
  }
  ok(res, batches);
});
router.get("/notifications", allRoles, async (req, res) =>
  ok(res, await list(M.P2Notification, { recipient: req.user._id }, req)),
);
router.patch("/notifications/:id/read", allRoles, async (req, res) => {
  const row = await M.P2Notification.findOneAndUpdate(
    { _id: objectId(req.params.id), recipient: req.user._id },
    { readAt: new Date() },
    { new: true },
  );
  if (!row) fail(404, "Notification not found");
  ok(res, row);
});
router.get("/notifications/unread-count", allRoles, async (req, res) =>
  ok(res, {
    count: await M.P2Notification.countDocuments({
      recipient: req.user._id,
      readAt: null,
    }),
  }),
);
router.get("/audit", admin, async (req, res) =>
  ok(
    res,
    await list(
      M.P2AuditLog,
      req.query.entityId ? { entityId: objectId(req.query.entityId) } : {},
      req,
      "actor",
    ),
  ),
);

export default router;
