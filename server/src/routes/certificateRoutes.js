import crypto from "node:crypto";
import mongoose from "mongoose";
import PDFDocument from "pdfkit";
import { Router } from "express";
import { z } from "zod";
import auth from "../middleware/authMiddleware.js";
import roles from "../middleware/roleMiddleware.js";
import validate from "../middleware/validate.js";
import { HttpError } from "../middleware/errorHandler.js";
import * as P2 from "../models/Part2.js";
import * as P3 from "../models/Part3.js";
import { issueCertificate } from "../services/certificateService.js";
const router = Router();
router.use(auth);
const oid = z.string().regex(/^[a-f\d]{24}$/i);
const ok = (res, data) => res.json({ success: true, data });
const fail = (s, m) => {
  throw new HttpError(s, m);
};
async function scope(user) {
  if (user.role === "admin") return {};
  if (user.role === "trainee") return { trainee: user._id };
  return {
    batch: {
      $in: await P3.P3BatchPermission.find({
        user: user._id,
        actions: "PUBLISH_RESULT",
      }).distinct("batch"),
    },
  };
}
router.get(
  "/certificates",
  roles(["trainee", "trainer", "admin"]),
  async (req, res) => {
    const filter = await scope(req.user);
    const certificates = await P3.P3CompletionCertificate.find(filter)
      .sort({ createdAt: -1 })
      .lean();
    const enrollments =
      req.user.role === "trainee"
        ? []
        : await P2.P2Enrollment.find({ ...filter, status: "CONFIRMED" })
            .populate("trainee", "name")
            .populate({
              path: "batch",
              populate: { path: "course", select: "title" },
            })
            .lean();
    ok(res, { certificates, enrollments });
  },
);
router.post(
  "/certificates/issue",
  roles(["admin", "trainer"]),
  validate(z.object({ enrollment: oid }).strict()),
  async (req, res) =>
    ok(res, await issueCertificate(req.user, req.validated.body.enrollment)),
);
router.post(
  "/certificates/:id/revoke",
  roles(["admin"]),
  validate(z.object({ reason: z.string().trim().min(4).max(2000) }).strict()),
  async (req, res) => {
    if (!oid.safeParse(req.params.id).success)
      fail(400, "Invalid certificate identifier");
    const session = await mongoose.startSession();
    let row;
    try {
      await session.withTransaction(async () => {
        row = await P3.P3CompletionCertificate.findById(req.params.id).session(
          session,
        );
        if (!row) fail(404, "Certificate not found");
        if (row.status === "REVOKED") return;
        const reason = req.validated.body.reason;
        row.status = "REVOKED";
        row.history.push({
          action: "REVOKED",
          actor: req.user._id,
          at: new Date(),
          reason,
        });
        await row.save({ session });
        await P2.P2AuditLog.create(
          [
            {
              actor: req.user._id,
              action: "CERTIFICATE_REVOKED",
              entityType: "P3CompletionCertificate",
              entityId: row._id,
              reason,
              correlationId: crypto.randomUUID(),
            },
          ],
          { session, ordered: true },
        );
        await P2.P2Notification.create(
          [
            {
              recipient: row.trainee,
              type: "CERTIFICATE_REVOKED",
              title: "Certificate revoked",
              message: reason,
              eventId: `certificate:${row._id}:revoked`,
              entityReference: {
                entityType: "P3CompletionCertificate",
                entityId: row._id,
                path: "/trainee/certificates",
              },
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
router.get(
  "/certificates/:id/pdf",
  roles(["trainee", "trainer", "admin"]),
  async (req, res) => {
    if (!oid.safeParse(req.params.id).success)
      fail(400, "Invalid certificate identifier");
    const row = await P3.P3CompletionCertificate.findOne({
      _id: req.params.id,
      ...(await scope(req.user)),
    });
    if (!row) fail(404, "Certificate not found");
    if (row.status !== "ISSUED")
      fail(
        409,
        "This certificate has been revoked. Its history remains available.",
      );
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 55,
      info: { Title: "SAMARTHYA course-completion certificate" },
    });
    res.type("application/pdf");
    res.set(
      "Content-Disposition",
      `attachment; filename="${row.certificateId}.pdf"`,
    );
    doc.pipe(res);
    doc
      .fillColor("#101B46")
      .fontSize(28)
      .text("SAMARTHYA", { align: "center" });
    doc
      .moveDown()
      .fontSize(22)
      .text("Course-completion certificate", { align: "center" });
    doc.moveDown().fontSize(16).text(row.traineeName, { align: "center" });
    doc
      .moveDown()
      .fontSize(14)
      .text(`Completed: ${row.courseTitle}`, { align: "center" });
    doc.moveDown().text(`Batch: ${row.batchName}`, { align: "center" });
    doc
      .moveDown()
      .text(`Completion date: ${row.completedAt.toISOString().slice(0, 10)}`, {
        align: "center",
      });
    doc
      .moveDown()
      .fontSize(11)
      .text(`Certificate ID: ${row.certificateId}`, { align: "center" });
    doc
      .moveDown()
      .text("Issuer: SAMARTHYA demonstration issuer", { align: "center" });
    doc
      .moveDown()
      .text(
        "Credential type: Course completion. This document does not certify a competency level.",
        { align: "center" },
      );
    if (row.isSynthetic)
      doc
        .moveDown()
        .text("Synthetic demonstration record", { align: "center" });
    doc.end();
  },
);
export default router;
