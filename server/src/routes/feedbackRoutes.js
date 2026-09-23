import { Router } from "express";
import { z } from "zod";
import auth from "../middleware/authMiddleware.js";
import roles from "../middleware/roleMiddleware.js";
import validate from "../middleware/validate.js";
import { HttpError } from "../middleware/errorHandler.js";
import * as P2 from "../models/Part2.js";
import * as P3 from "../models/Part3.js";

const router = Router();
router.use(auth);
const oid = z.string().regex(/^[a-f\d]{24}$/i);
const ok = (res, data) => res.json({ success: true, data });
const fail = (status, message) => {
  throw new HttpError(status, message);
};

router.get("/feedback/opportunities", roles(["trainee"]), async (req, res) => {
  const enrollments = await P2.P2Enrollment.find({
    trainee: req.user._id,
    status: "CONFIRMED",
  })
    .populate({ path: "batch", populate: { path: "course" } })
    .lean();
  const items = [];
  for (const e of enrollments) {
    if (!e.batch?.course) continue;
    const common = { enrollment: e._id, batchName: e.batch.name };
    items.push({
      ...common,
      targetType: "COURSE",
      target: e.batch.course._id,
      title: e.batch.course.title,
    });
    items.push({
      ...common,
      targetType: "EXPERIENCE",
      target: e.batch._id,
      title: "Training experience",
    });
    const modules = await P3.P3LearningModule.find({
      course: e.batch.course._id,
      status: "PUBLISHED",
      $or: [{ batch: e.batch._id }, { batch: null }],
    })
      .select("title")
      .lean();
    items.push(
      ...modules.map((m) => ({
        ...common,
        targetType: "RESOURCE",
        target: m._id,
        title: m.title,
      })),
    );
    const assignments = await P3.P3TrainerAssignment.find({
      batch: e.batch._id,
      status: { $in: ["ACTIVE", "REPLACED", "UNAVAILABLE"] },
    })
      .populate("trainer", "name")
      .lean();
    const seen = new Set();
    for (const a of assignments)
      if (a.trainer && !seen.has(String(a.trainer._id))) {
        seen.add(String(a.trainer._id));
        items.push({
          ...common,
          targetType: "TRAINER",
          target: a.trainer._id,
          title: a.trainer.name,
        });
      }
  }
  const submitted = await P3.P3Feedback.find({ trainee: req.user._id }).lean();
  ok(res, {
    items,
    submitted,
    privacy:
      "Identified feedback: coordinators can read your response. Trainers see only scoped rating aggregates, not your name or comment.",
  });
});

router.post(
  "/feedback",
  roles(["trainee"]),
  validate(
    z
      .object({
        enrollment: oid,
        targetType: z.enum(["COURSE", "RESOURCE", "TRAINER", "EXPERIENCE"]),
        target: oid,
        rating: z.number().int().min(1).max(5),
        comment: z.string().trim().max(3000).default(""),
      })
      .strict(),
  ),
  async (req, res) => {
    const data = req.validated.body;
    const e = await P2.P2Enrollment.findOne({
      _id: data.enrollment,
      trainee: req.user._id,
      status: "CONFIRMED",
    });
    if (!e) fail(403, "Confirmed participant enrollment is required");
    const batch = await P2.P2Batch.findById(e.batch);
    let eligible = false;
    if (data.targetType === "COURSE")
      eligible = String(batch.course) === data.target;
    if (data.targetType === "EXPERIENCE")
      eligible = String(batch._id) === data.target;
    if (data.targetType === "RESOURCE")
      eligible = await P3.P3LearningModule.exists({
        _id: data.target,
        course: batch.course,
        status: "PUBLISHED",
        $or: [{ batch: batch._id }, { batch: null }],
      });
    if (data.targetType === "TRAINER")
      eligible = await P3.P3TrainerAssignment.exists({
        batch: batch._id,
        trainer: data.target,
        status: { $in: ["ACTIVE", "REPLACED", "UNAVAILABLE"] },
      });
    if (!eligible)
      fail(403, "Feedback target is outside your enrolled training");
    try {
      const row = await P3.P3Feedback.create({
        ...data,
        trainee: req.user._id,
        batch: batch._id,
      });
      ok(res, row);
    } catch (error) {
      if (error.code === 11000)
        fail(409, "You have already submitted feedback for this opportunity");
      throw error;
    }
  },
);

router.get("/feedback", roles(["admin", "trainer"]), async (req, res) => {
  let scope = {};
  if (req.user.role === "trainer") {
    const batches = await P3.P3TrainerAssignment.find({
      trainer: req.user._id,
      status: "ACTIVE",
    }).distinct("batch");
    scope = { batch: { $in: batches } };
  }
  const rows = await P3.P3Feedback.find(scope).sort({ createdAt: -1 }).lean();
  const groups = new Map();
  for (const row of rows) {
    const key = `${row.batch}:${row.targetType}:${row.target}`;
    const group = groups.get(key) || {
      batch: row.batch,
      targetType: row.targetType,
      target: row.target,
      count: 0,
      sum: 0,
    };
    group.count++;
    group.sum += row.rating;
    groups.set(key, group);
  }
  ok(res, {
    aggregates: [...groups.values()].map(({ sum, ...g }) => ({
      ...g,
      average: sum / g.count,
    })),
    responses: req.user.role === "admin" ? rows : [],
    privacy:
      "Identified feedback. Ratings do not establish expertise or influence suitability.",
  });
});
export default router;
