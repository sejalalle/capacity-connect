import { Router } from "express";
import { z } from "zod";
import auth from "../middleware/authMiddleware.js";
import roles from "../middleware/roleMiddleware.js";
import validate from "../middleware/validate.js";
import { HttpError } from "../middleware/errorHandler.js";
import User from "../models/User.js";
import * as P2 from "../models/Part2.js";
import { notify, recordAudit } from "../services/part2Service.js";

const router = Router();
const admin = roles(["admin"]);
const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid identifier");
const body = (shape) => validate(z.object(shape).strict());
const ok = (res, data, message, status = 200) =>
  res.status(status).json({ success: true, data, ...(message && { message }) });
const fail = (status, message) => {
  throw new HttpError(status, message);
};
const now = () => new Date();

const notExpired = () => ({
  $or: [{ expiresAt: null }, { expiresAt: { $gt: now() } }],
});

// Public homepage feed: published, marked for the homepage, not expired.
router.get("/announcements/public", async (req, res) =>
  ok(
    res,
    await P2.P2Announcement.find({
      status: "PUBLISHED",
      showOnHomepage: true,
      ...notExpired(),
    })
      .sort({ pinned: -1, publishAt: -1, createdAt: -1 })
      .limit(12)
      .lean(),
  ),
);

router.get("/announcements", auth, async (req, res) => {
  const isAdmin = req.user.role === "admin";
  const filter = isAdmin
    ? req.query.status
      ? { status: req.query.status }
      : {}
    : {
        status: "PUBLISHED",
        audience: { $in: ["ALL", req.user.role.toUpperCase()] },
        ...notExpired(),
      };
  ok(
    res,
    await P2.P2Announcement.find(filter)
      .populate("createdBy", "name role")
      .sort({ pinned: -1, publishAt: -1, createdAt: -1 })
      .lean(),
  );
});

router.post(
  "/announcements",
  auth,
  admin,
  body({
    title: z.string().trim().min(4).max(300),
    body: z.string().trim().min(4).max(5000),
    summary: z.string().trim().max(300).default(""),
    category: z
      .enum(["NOTIFICATION", "ANNOUNCEMENT", "ACHIEVEMENT", "NEW_CONTENT"])
      .default("ANNOUNCEMENT"),
    audience: z.enum(["ALL", "TRAINEE", "TRAINER", "ADMIN"]).default("ALL"),
    pinned: z.boolean().default(false),
    showOnHomepage: z.boolean().default(true),
    publishAt: z
      .string()
      .datetime({ offset: true })
      .transform((x) => new Date(x))
      .optional(),
    expiresAt: z
      .string()
      .datetime({ offset: true })
      .transform((x) => new Date(x))
      .optional(),
  }),
  async (req, res) => {
    const announcement = await P2.P2Announcement.create({
      ...req.validated.body,
      status: "DRAFT",
      createdBy: req.user._id,
      history: [
        { action: "CREATED", actor: req.user._id, at: now(), reason: "" },
      ],
    });
    await recordAudit({
      actor: req.user._id,
      action: "ANNOUNCEMENT_CREATED",
      entityType: "P2Announcement",
      entityId: announcement._id,
      newStatus: "DRAFT",
      reason: `Announcement "${announcement.title}" created`,
    });
    ok(res, announcement.toObject(), "Announcement saved as draft", 201);
  },
);

router.patch(
  "/announcements/:id",
  auth,
  admin,
  body({
    title: z.string().trim().min(4).max(300).optional(),
    body: z.string().trim().min(4).max(5000).optional(),
    summary: z.string().trim().max(300).optional(),
    category: z
      .enum(["NOTIFICATION", "ANNOUNCEMENT", "ACHIEVEMENT", "NEW_CONTENT"])
      .optional(),
    audience: z.enum(["ALL", "TRAINEE", "TRAINER", "ADMIN"]).optional(),
    pinned: z.boolean().optional(),
    showOnHomepage: z.boolean().optional(),
    expiresAt: z
      .string()
      .datetime({ offset: true })
      .transform((x) => new Date(x))
      .nullable()
      .optional(),
  }),
  async (req, res) => {
    const announcement = await P2.P2Announcement.findById(req.params.id);
    if (!announcement) fail(404, "Announcement not found");
    if (announcement.status === "ARCHIVED")
      fail(409, "Archived announcements cannot be edited");
    Object.assign(announcement, req.validated.body);
    await announcement.save();
    ok(res, announcement.toObject(), "Announcement updated");
  },
);

router.post(
  "/announcements/:id/publish",
  auth,
  admin,
  body({ reason: z.string().trim().max(2000).default("") }),
  async (req, res) => {
    const announcement = await P2.P2Announcement.findById(req.params.id);
    if (!announcement) fail(404, "Announcement not found");
    if (announcement.status === "ARCHIVED")
      fail(409, "Archived announcements cannot be published");
    announcement.status = "PUBLISHED";
    announcement.publishAt = announcement.publishAt || now();
    announcement.history.push({
      action: "PUBLISHED",
      actor: req.user._id,
      at: now(),
      reason: req.body.reason,
    });
    await announcement.save();

    const audience =
      announcement.audience === "ALL"
        ? ["trainee", "trainer", "admin"]
        : [announcement.audience.toLowerCase()];
    const recipients = await User.find({
      role: { $in: audience },
      accountStatus: "approved",
    })
      .select("_id role")
      .lean();
    await Promise.all(
      recipients.map((recipient) =>
        notify({
          recipient: recipient._id,
          type: `ANNOUNCEMENT_${announcement.category}`,
          title: announcement.title,
          message:
            announcement.summary ||
            `${announcement.body.slice(0, 240)}${announcement.body.length > 240 ? "…" : ""}`,
          entityReference: {
            entityType: "P2Announcement",
            entityId: announcement._id,
            path: `/${recipient.role}/announcements`,
          },
          eventId: `announcement:${announcement._id}:${recipient.role}`,
          isSynthetic: announcement.isSynthetic,
          demoNamespace: announcement.demoNamespace,
        }),
      ),
    );
    await recordAudit({
      actor: req.user._id,
      action: "ANNOUNCEMENT_PUBLISHED",
      entityType: "P2Announcement",
      entityId: announcement._id,
      newStatus: "PUBLISHED",
      changes: { audience: announcement.audience, recipients: recipients.length },
      reason: req.body.reason,
    });
    ok(
      res,
      { ...announcement.toObject(), notifiedRecipients: recipients.length },
      "Announcement published",
    );
  },
);

router.post(
  "/announcements/:id/archive",
  auth,
  admin,
  body({ reason: z.string().trim().max(2000).default("") }),
  async (req, res) => {
    const announcement = await P2.P2Announcement.findById(req.params.id);
    if (!announcement) fail(404, "Announcement not found");
    announcement.status = "ARCHIVED";
    announcement.history.push({
      action: "ARCHIVED",
      actor: req.user._id,
      at: now(),
      reason: req.body.reason,
    });
    await announcement.save();
    await recordAudit({
      actor: req.user._id,
      action: "ANNOUNCEMENT_ARCHIVED",
      entityType: "P2Announcement",
      entityId: announcement._id,
      newStatus: "ARCHIVED",
      reason: req.body.reason,
    });
    ok(res, announcement.toObject(), "Announcement archived");
  },
);

export default router;
