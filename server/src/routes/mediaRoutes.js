import { Router } from "express";
import express from "express";
import crypto from "node:crypto";
import mongoose from "mongoose";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { z } from "zod";
import auth from "../middleware/authMiddleware.js";
import roles from "../middleware/roleMiddleware.js";
import validate from "../middleware/validate.js";
import { HttpError } from "../middleware/errorHandler.js";
import { recordAudit } from "../services/part2Service.js";
import * as P2 from "../models/Part2.js";
import * as P3 from "../models/Part3.js";

const router = Router();
const ok = (res, data, message, status = 200) =>
  res.status(status).json({ success: true, data, ...(message && { message }) });
const fail = (status, message) => {
  throw new HttpError(status, message);
};
const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid identifier");
const text = z.string().trim().min(4).max(3000);
const body = (shape) => validate(z.object(shape).strict());
const admin = roles(["admin"]);
const traineeOnly = roles(["trainee"]);
const uploader = roles(["trainer", "admin"]);
const all = roles(["trainee", "trainer", "admin"]);
const same = (a, b) => String(a?._id || a || "") === String(b?._id || b || "");
const bucket = () =>
  new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: "part3PrivateFiles",
  });

const videoTypes = new Set(["video/mp4", "video/webm"]);
const videoMatches = (mime, buffer) => {
  if (mime === "video/webm")
    return buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  return buffer.subarray(4, 8).toString() === "ftyp";
};

const canManageCourse = async (user, courseId) => {
  if (user.role === "admin") return true;
  if (user.role !== "trainer") return false;
  return Boolean(
    await P2.P2Course.exists({ _id: courseId, createdBy: user._id }),
  );
};
const enrolledInCourse = async (user, course) =>
  Boolean(
    await P2.P2Enrollment.exists({
      trainee: user._id,
      status: "CONFIRMED",
      batch: { $in: await P2.P2Batch.find({ course }).distinct("_id") },
    }),
  );
const scopeFilter = async (user) => {
  if (user.role === "admin") return {};
  if (user.role === "trainer") {
    const owned = await P2.P2Course.find({
      createdBy: user._id,
    }).distinct("_id");
    return { $or: [{ owner: user._id }, { course: { $in: owned } }] };
  }
  const batches = await P2.P2Enrollment.find({
    trainee: user._id,
    status: "CONFIRMED",
  }).distinct("batch");
  const courses = await P2.P2Batch.find({
    _id: { $in: batches },
  }).distinct("course");
  return { status: "READY", course: { $in: courses } };
};

router.post(
  "/media/courses/:courseId",
  auth,
  uploader,
  express.raw({ type: () => true, limit: "25mb" }),
  async (req, res) => {
    const course = objectId.parse(req.params.courseId);
    if (!(await canManageCourse(req.user, course)))
      fail(403, "Course media access is not permitted");
    const mimeType = String(req.headers["content-type"] || "").split(";")[0];
    if (
      !videoTypes.has(mimeType) ||
      !Buffer.isBuffer(req.body) ||
      !req.body.length ||
      !videoMatches(mimeType, req.body)
    )
      fail(400, "Video content must be a valid MP4 or WebM file");
    const batchHeader = req.headers["x-media-batch"];
    const batch = batchHeader ? objectId.parse(String(batchHeader)) : undefined;
    if (batch && !(await P2.P2Batch.exists({ _id: batch, course })))
      fail(400, "The selected batch does not belong to this course");
    const filename = String(req.headers["x-file-name"] || "recording.mp4")
      .replace(/[^a-zA-Z0-9._ -]/g, "_")
      .slice(0, 150);
    const asset = await P3.P3MediaAsset.create({
      title: String(
        req.headers["x-media-title"] || filename || "Untitled recording",
      )
        .trim()
        .slice(0, 200),
      course,
      ...(batch && { batch }),
      owner: req.user._id,
      status: "PROCESSING",
      mimeType,
      size: req.body.length,
    });
    const store = bucket();
    const upload = store.openUploadStream(filename, {
      metadata: {
        owner: req.user._id,
        course: new mongoose.Types.ObjectId(course),
        mimeType,
      },
    });
    try {
      await pipeline(Readable.from(req.body), upload);
      const resource = await P3.P3PrivateResource.create({
        owner: req.user._id,
        course,
        ...(batch && { batch }),
        storageId: upload.id,
        filename,
        mimeType,
        size: req.body.length,
        sha256: crypto.createHash("sha256").update(req.body).digest("hex"),
        purpose: "VIDEO",
      });
      asset.media = resource._id;
      asset.status = "READY";
      await asset.save();
      await recordAudit({
        actor: req.user._id,
        action: "MEDIA_ASSET_READY",
        entityType: "P3MediaAsset",
        entityId: asset._id,
        newStatus: "READY",
        reason:
          "Direct upload stored and integrity-checked; this build has no transcoding pipeline",
      });
      ok(res, asset, "Recording stored", 201);
    } catch (error) {
      if (upload.id) await store.delete(upload.id).catch(() => {});
      asset.status = "FAILED";
      asset.failureReason = String(
        error.message || "Upload failed",
      ).slice(0, 300);
      await asset.save().catch(() => {});
      throw error;
    }
  },
);

router.get("/media/courses", auth, uploader, async (req, res) =>
  ok(
    res,
    await P2.P2Course.find(
      req.user.role === "admin" ? {} : { createdBy: req.user._id },
    )
      .select("title code")
      .sort({ title: 1 })
      .lean(),
  ),
);

router.get("/media", auth, all, async (req, res) => {
  const filter = await scopeFilter(req.user);
  const [assets, progress] = await Promise.all([
    P3.P3MediaAsset.find(filter)
      .populate("owner course", "name title")
      .sort({ createdAt: -1 })
      .lean(),
    P3.P3MediaProgress.find({ trainee: req.user._id }).lean(),
  ]);
  const storage = assets.reduce(
    (total, asset) => {
      if (asset.status === "READY") {
        total.readyCount += 1;
        total.totalBytes += asset.size || 0;
      }
      if (asset.status === "PROCESSING") total.processingCount += 1;
      if (asset.status === "FAILED") total.failedCount += 1;
      if (asset.status === "TAKEN_DOWN") total.takenDownCount += 1;
      return total;
    },
    {
      totalBytes: 0,
      readyCount: 0,
      processingCount: 0,
      failedCount: 0,
      takenDownCount: 0,
    },
  );
  ok(res, {
    assets,
    storage,
    progress: Object.fromEntries(
      progress.map((row) => [
        String(row.media),
        {
          positionSeconds: row.positionSeconds,
          durationSeconds: row.durationSeconds,
          completed: row.completed,
        },
      ]),
    ),
  });
});

router.delete("/media/:id", auth, all, async (req, res) => {
  const asset = await P3.P3MediaAsset.findById(objectId.parse(req.params.id));
  if (!asset) fail(404, "Recording not found");
  if (req.user.role !== "admin" && !same(asset.owner, req.user))
    fail(403, "Only the uploader or a coordinator can remove this recording");
  if (asset.media) {
    const referenced = await P3.P3LearningModule.exists({
      "resources.privateResource": asset.media,
      status: "PUBLISHED",
    });
    if (referenced)
      fail(
        409,
        "This recording is referenced by a published module; archive that module first",
      );
    const resource = await P3.P3PrivateResource.findById(asset.media);
    if (resource) {
      await bucket().delete(resource.storageId).catch(() => {});
      await resource.deleteOne();
    }
  }
  await P3.P3MediaProgress.deleteMany({ media: asset._id });
  await asset.deleteOne();
  await recordAudit({
    actor: req.user._id,
    action: "MEDIA_ASSET_REMOVED",
    entityType: "P3MediaAsset",
    entityId: asset._id,
    previousStatus: asset.status,
    reason: "Uploader or coordinator removed the recording",
  });
  ok(res, { _id: asset._id }, "Recording removed");
});

router.post(
  "/media/:id/moderate",
  auth,
  admin,
  body({ status: z.enum(["READY", "TAKEN_DOWN"]), reason: text }),
  async (req, res) => {
    const asset = await P3.P3MediaAsset.findById(objectId.parse(req.params.id));
    if (!asset) fail(404, "Recording not found");
    if (asset.status === "PROCESSING" || asset.status === "FAILED")
      fail(409, "Only a stored recording can be moderated");
    const previousStatus = asset.status;
    if (previousStatus === req.validated.body.status)
      return ok(res, asset, "Media status already set");
    asset.status = req.validated.body.status;
    asset.moderatedBy = req.user._id;
    asset.moderatedAt = new Date();
    asset.moderationReason = req.validated.body.reason;
    await asset.save();
    await recordAudit({
      actor: req.user._id,
      action: "MEDIA_ASSET_MODERATED",
      entityType: "P3MediaAsset",
      entityId: asset._id,
      previousStatus,
      newStatus: asset.status,
      reason: req.validated.body.reason,
    });
    ok(res, asset, "Media status updated");
  },
);

router.post(
  "/media/:id/progress",
  auth,
  traineeOnly,
  body({
    positionSeconds: z.number().min(0).max(86400),
    durationSeconds: z.number().min(0).max(86400),
  }),
  async (req, res) => {
    const asset = await P3.P3MediaAsset.findById(objectId.parse(req.params.id));
    if (!asset || asset.status !== "READY")
      fail(404, "Available recording not found");
    if (!(await enrolledInCourse(req.user, asset.course)))
      fail(403, "Enrollment is required to record playback progress");
    const { positionSeconds, durationSeconds } = req.validated.body;
    ok(
      res,
      await P3.P3MediaProgress.findOneAndUpdate(
        { media: asset._id, trainee: req.user._id },
        {
          $set: {
            positionSeconds,
            durationSeconds,
            completed:
              durationSeconds > 0 && positionSeconds >= durationSeconds * 0.95,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ),
    );
  },
);

const streamAuth = async (req, res, next) => {
  if (!req.headers.authorization && typeof req.query.token === "string")
    req.headers.authorization = `Bearer ${req.query.token}`;
  await auth(req, res, next);
};

router.get("/media/:id/content", streamAuth, all, async (req, res) => {
  const asset = await P3.P3MediaAsset.findById(
    objectId.parse(req.params.id),
  ).populate("media");
  const resource = asset?.status === "READY" ? asset.media : null;
  let permitted = false;
  if (resource) {
    if (req.user.role === "admin") permitted = true;
    else if (same(asset.owner, req.user)) permitted = true;
    else if (req.user.role === "trainer")
      permitted = await canManageCourse(req.user, asset.course);
    else permitted = await enrolledInCourse(req.user, asset.course);
  }
  if (!permitted || !resource) fail(404, "Recording not found");
  const size = resource.size || 0;
  res.set({
    "Content-Type": resource.mimeType || "video/mp4",
    "Content-Disposition": "inline",
    "Accept-Ranges": "bytes",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
  });
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
  let options;
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Number(range[2]) : size - 1;
    if (!size || start > end || end >= size) {
      res.status(416).set("Content-Range", `bytes */${size}`).end();
      return;
    }
    res
      .status(206)
      .set({
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Content-Length": String(end - start + 1),
      });
    options = { start, end: end + 1 };
  } else {
    res.set("Content-Length", String(size));
  }
  bucket()
    .openDownloadStream(resource.storageId, options)
    .on("error", () => (res.headersSent ? res.destroy() : res.status(404).end()))
    .pipe(res);
});

export default router;
