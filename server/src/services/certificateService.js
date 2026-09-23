import crypto from "node:crypto";
import mongoose from "mongoose";
import * as P2 from "../models/Part2.js";
import * as P3 from "../models/Part3.js";
import User from "../models/User.js";
import { HttpError } from "../middleware/errorHandler.js";
const fail = (status, message) => {
  throw new HttpError(status, message);
};
export async function issueCertificate(actor, enrollmentId) {
  const session = await mongoose.startSession();
  let certificate;
  try {
    await session.withTransaction(async () => {
      const e = await P2.P2Enrollment.findById(enrollmentId).session(session);
      if (!e) fail(404, "Enrollment not found");
      if (
        actor.role !== "admin" &&
        !(await P3.P3BatchPermission.exists({
          batch: e.batch,
          user: actor._id,
          actions: "PUBLISH_RESULT",
        }).session(session))
      )
        fail(403, "Explicit publication permission is required");
      certificate = await P3.P3CompletionCertificate.findOne({
        enrollment: e._id,
      }).session(session);
      if (certificate) return;
      if (e.status !== "CONFIRMED")
        fail(409, "Confirmed enrollment is required");
      const batch = await P2.P2Batch.findById(e.batch).session(session);
      const rule = await P2.P2CourseRuleVersion.findById(
        batch.ruleVersion,
      ).session(session);
      const policy = rule?.certificatePolicy;
      if (!policy?.enabled)
        fail(
          409,
          "The pinned course rules do not enable completion certificates",
        );
      if (
        policy.additionalRequirements?.length ||
        Object.keys(rule.futureCertificatePolicyMetadata || {}).length
      )
        fail(
          409,
          "Unsupported certificate requirements need explicit configuration before issuance",
        );
      if (!policy.requireLearningCompletion && !policy.requirePublishedPass)
        fail(409, "Configure at least one supported completion condition");
      let result = null;
      if (policy.requirePublishedPass) {
        result = await P3.P3ResultVersion.findOne({
          enrollment: e._id,
          status: "PUBLISHED",
        })
          .sort({ version: -1 })
          .session(session);
        if (!result || result.outcome !== "PASS")
          fail(409, "A published passing result is required");
      }
      const modules = await P3.P3LearningModule.find({
        course: batch.course,
        status: "PUBLISHED",
        $or: [{ batch: batch._id }, { batch: null }],
      }).session(session);
      const completed = await P3.P3LearningProgress.find({
        enrollment: e._id,
        status: "COMPLETED",
      }).session(session);
      if (
        policy.requireLearningCompletion &&
        (!modules.length ||
          modules.some(
            (m) => !completed.some((p) => String(p.module) === String(m._id)),
          ))
      )
        fail(409, "All configured learning modules must be completed");
      const person = await User.findById(e.trainee).session(session);
      const course = await P2.P2Course.findById(batch.course).session(session);
      const at = new Date();
      [certificate] = await P3.P3CompletionCertificate.create(
        [
          {
            certificateId: `SAM-${crypto.randomUUID()}`,
            enrollment: e._id,
            trainee: e.trainee,
            batch: batch._id,
            course: course._id,
            ruleVersion: rule._id,
            resultVersion: result?._id,
            completedModules: completed.map((p) => p.module),
            traineeName: person.name,
            courseTitle: course.title,
            batchName: batch.name,
            issuedBy: actor._id,
            completedAt: at,
            history: [
              {
                action: "ISSUED",
                actor: actor._id,
                at,
                reason: "Configured course-completion conditions satisfied",
              },
            ],
            isSynthetic: e.isSynthetic,
          },
        ],
        { session, ordered: true },
      );
      await P2.P2AuditLog.create(
        [
          {
            actor: actor._id,
            action: "CERTIFICATE_ISSUED",
            entityType: "P3CompletionCertificate",
            entityId: certificate._id,
            reason: "Pinned completion conditions satisfied",
            correlationId: certificate.certificateId,
          },
        ],
        { session, ordered: true },
      );
      await P2.P2Notification.create(
        [
          {
            recipient: e.trainee,
            type: "CERTIFICATE_ISSUED",
            title: "Course-completion certificate issued",
            message:
              "Your completion certificate is available. It does not certify a competency level.",
            eventId: `certificate:${certificate._id}:issued`,
            entityReference: {
              entityType: "P3CompletionCertificate",
              entityId: certificate._id,
              path: "/trainee/certificates",
            },
          },
        ],
        { session, ordered: true },
      );
    });
    return certificate;
  } catch (error) {
    if (error.code === 11000)
      return P3.P3CompletionCertificate.findOne({ enrollment: enrollmentId });
    throw error;
  } finally {
    await session.endSession();
  }
}
