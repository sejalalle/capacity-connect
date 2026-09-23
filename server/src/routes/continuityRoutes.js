import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import auth from "../middleware/authMiddleware.js";
import roles from "../middleware/roleMiddleware.js";
import validate from "../middleware/validate.js";
import { HttpError } from "../middleware/errorHandler.js";
import User from "../models/User.js";
import * as P2 from "../models/Part2.js";
import * as P3 from "../models/Part3.js";
const router = Router();
const oid = z.string().regex(/^[a-f\d]{24}$/i),
  text = z.string().trim().min(4).max(3000);
const fail = (s, m) => {
    throw new HttpError(s, m);
  },
  ok = (res, data) => res.json({ success: true, data });
const scope = (user) =>
  user.role === "admin"
    ? {}
    : { $or: [{ sourceExpert: user._id }, { participants: user._id }] };
router.get("/continuity/options", auth, roles(["admin"]), async (req, res) => {
  const [people, records, courses] = await Promise.all([
    User.find({ accountStatus: "approved" }).select("name role").lean(),
    P2.P2CompetencyRecord.find({
      status: "DEMONSTRATED",
      demonstratedLevel: { $ne: null },
      sourceType: { $in: ["HISTORICAL_REVIEW", "PART3_REVIEW"] },
    })
      .populate("competency trainee", "name version status")
      .lean(),
    P2.P2Course.find({ status: "PUBLISHED" })
      .select("title competencyOutcomes")
      .lean(),
  ]);
  ok(res, {
    people,
    courses,
    records: records.filter(
      (r) =>
        r.competency?.version === r.frameworkVersion &&
        r.competency.status === "PUBLISHED" &&
        people.some((p) => String(p._id) === String(r.trainee?._id)),
    ),
  });
});
router.get(
  "/continuity",
  auth,
  roles(["admin", "trainer", "trainee"]),
  async (req, res) =>
    ok(
      res,
      await P3.P3KnowledgeTransferPlan.find(scope(req.user))
        .populate("competency sourceExpert participants courses", "name title")
        .sort({ createdAt: -1 })
        .lean(),
    ),
);
router.post(
  "/continuity",
  auth,
  roles(["admin"]),
  validate(
    z
      .object({
        title: text,
        sourceRecord: oid,
        participants: z.array(oid).min(1).max(100),
        courses: z.array(oid).max(20).default([]),
        practiceTask: text,
        reviewRequirements: text,
        dueDate: z.string().datetime({ offset: true }),
        requestId: z.string().uuid(),
      })
      .strict(),
  ),
  async (req, res) => {
    const data = req.validated.body,
      session = await mongoose.startSession();
    let plan;
    try {
      await session.withTransaction(async () => {
        plan = await P3.P3KnowledgeTransferPlan.findOne({
          createdBy: req.user._id,
          requestId: data.requestId,
        }).session(session);
        if (plan) return;
        const record = await P2.P2CompetencyRecord.findById(data.sourceRecord)
          .populate("competency")
          .session(session);
        if (
          !record ||
          record.status !== "DEMONSTRATED" ||
          record.demonstratedLevel == null ||
          record.frameworkVersion !== record.competency?.version ||
          !["HISTORICAL_REVIEW", "PART3_REVIEW"].includes(record.sourceType)
        )
          fail(
            409,
            "Source expert requires comparable reviewed subject evidence",
          );
        const participants = [...new Set(data.participants)];
        if (participants.includes(String(record.trainee)))
          fail(400, "Source expert and participants must be separate");
        if (
          (await User.countDocuments({
            _id: { $in: [record.trainee, ...participants] },
            accountStatus: "approved",
          }).session(session)) !==
          participants.length + 1
        )
          fail(400, "All plan users must have approved accounts");
        if (
          (await P2.P2Course.countDocuments({
            _id: { $in: data.courses },
            status: "PUBLISHED",
          }).session(session)) !== new Set(data.courses).size
        )
          fail(400, "Reference published courses only");
        [plan] = await P3.P3KnowledgeTransferPlan.create(
          [
            {
              ...data,
              participants,
              competency: record.competency._id,
              frameworkVersion: record.frameworkVersion,
              targetLevel: record.demonstratedLevel,
              sourceExpert: record.trainee,
              createdBy: req.user._id,
              history: [
                {
                  actor: req.user._id,
                  at: new Date(),
                  status: "ACTIVE",
                  reason:
                    "Coordinator created an explicit knowledge-transfer plan",
                },
              ],
            },
          ],
          { session, ordered: true },
        );
        await P2.P2AuditLog.create(
          [
            {
              actor: req.user._id,
              action: "KNOWLEDGE_TRANSFER_PLANNED",
              entityType: "P3KnowledgeTransferPlan",
              entityId: plan._id,
              reason: "Participation is not competency verification",
              correlationId: data.requestId,
            },
          ],
          { session, ordered: true },
        );
        await P2.P2Notification.create(
          [record.trainee, ...participants].map((recipient) => ({
            recipient,
            type: "KNOWLEDGE_TRANSFER_PLAN",
            title: "Knowledge-transfer plan assigned",
            message: plan.title,
            eventId: `continuity:${plan._id}:created`,
            entityReference: {
              entityType: "P3KnowledgeTransferPlan",
              entityId: plan._id,
            },
          })),
          { session, ordered: true },
        );
      });
      ok(res, plan);
    } finally {
      await session.endSession();
    }
  },
);
router.post(
  "/continuity/:id/participation",
  auth,
  roles(["trainee", "trainer", "admin"]),
  validate(
    z
      .object({ text, evidence: oid.optional(), requestId: z.string().uuid() })
      .strict(),
  ),
  async (req, res) => {
    if (!oid.safeParse(req.params.id).success)
      fail(400, "Invalid plan identifier");
    const data = req.validated.body,
      session = await mongoose.startSession();
    let row;
    try {
      await session.withTransaction(async () => {
        row = await P3.P3KnowledgeTransferPlan.findOne({
          _id: req.params.id,
          participants: req.user._id,
        }).session(session);
        if (!row) fail(404, "Assigned plan not found");
        if (
          row.participation.some(
            (p) =>
              p.requestId === data.requestId &&
              String(p.participant) === String(req.user._id),
          )
        )
          return;
        if (row.status !== "ACTIVE") fail(409, "This plan is closed");
        if (
          data.evidence &&
          !(await P3.P3Evidence.exists({
            _id: data.evidence,
            owner: req.user._id,
          }).session(session))
        )
          fail(403, "Evidence must belong to the participant");
        row.participation.push({
          ...data,
          participant: req.user._id,
          at: new Date(),
        });
        await row.save({ session });
        await P2.P2AuditLog.create(
          [
            {
              actor: req.user._id,
              action: "KNOWLEDGE_TRANSFER_PARTICIPATION",
              entityType: "P3KnowledgeTransferPlan",
              entityId: row._id,
              reason: "Participation recorded without a competency update",
              correlationId: data.requestId,
            },
          ],
          { session, ordered: true },
        );
      });
      ok(res, row);
    } finally {
      await session.endSession();
    }
  },
);
router.post(
  "/continuity/:id/close",
  auth,
  roles(["admin"]),
  validate(
    z
      .object({ status: z.enum(["COMPLETED", "CANCELLED"]), reason: text })
      .strict(),
  ),
  async (req, res) => {
    if (!oid.safeParse(req.params.id).success)
      fail(400, "Invalid plan identifier");
    const data = req.validated.body,
      session = await mongoose.startSession();
    let row;
    try {
      await session.withTransaction(async () => {
        row = await P3.P3KnowledgeTransferPlan.findById(req.params.id).session(
          session,
        );
        if (!row) fail(404, "Plan not found");
        if (row.status === data.status) return;
        if (row.status !== "ACTIVE")
          fail(409, "Closed plans cannot be changed");
        row.status = data.status;
        row.history.push({ actor: req.user._id, at: new Date(), ...data });
        await row.save({ session });
        await P2.P2AuditLog.create(
          [
            {
              actor: req.user._id,
              action: "KNOWLEDGE_TRANSFER_CLOSED",
              entityType: "P3KnowledgeTransferPlan",
              entityId: row._id,
              reason: data.reason,
              correlationId: `continuity:${row._id}:${data.status}`,
            },
          ],
          { session, ordered: true },
        );
      });
      ok(res, row);
    } finally {
      await session.endSession();
    }
  },
);
export default router;
