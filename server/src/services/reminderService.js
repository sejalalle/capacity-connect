import mongoose from "mongoose";
import * as P2 from "../models/Part2.js";
import * as P3 from "../models/Part3.js";
import { notify } from "./part2Service.js";

const DAY = 86400000;
const OPEN_GAP_CATEGORIES = [
  "ONE_LEVEL_GAP",
  "TWO_LEVEL_GAP",
  "THREE_OR_MORE_LEVEL_GAP",
];

// Time-driven reminders. Every notice is emitted through the same deduplicated
// notification engine as workflow events, keyed by a stable eventId, so a
// repeated scan never repeats a notice. Reminders are notices only: they never
// change workflow state.
async function confirmedTrainees(batchIds) {
  const rows = await P2.P2Enrollment.find({
    batch: { $in: batchIds },
    status: "CONFIRMED",
  })
    .select("trainee batch")
    .lean();
  return rows;
}

export async function runReminders({ now = new Date(), withinDays = 3 } = {}) {
  const horizon = new Date(now.getTime() + withinDays * DAY);
  const result = {
    windowStart: now,
    windowEnd: horizon,
    withinDays,
    assessmentDeadlineReminders: 0,
    learningDeadlineReminders: 0,
    recommendationNotices: 0,
  };

  const assessments = await P3.P3Assessment.find({
    status: "PUBLISHED",
    closesAt: { $gt: now, $lte: horizon },
  })
    .select("batch course title closesAt")
    .lean();
  if (assessments.length) {
    const enrollments = await confirmedTrainees(
      assessments.map((row) => row.batch),
    );
    const submitted = await P3.P3AssessmentAttempt.find({
      assessment: { $in: assessments.map((row) => row._id) },
      status: { $in: ["SUBMITTED", "TIMED_OUT"] },
    })
      .select("assessment enrollment")
      .lean();
    for (const assessment of assessments)
      for (const enrollment of enrollments.filter(
        (row) => String(row.batch) === String(assessment.batch),
      )) {
        const done = submitted.some(
          (row) =>
            String(row.assessment) === String(assessment._id) &&
            String(row.enrollment) === String(enrollment._id),
        );
        if (done) continue;
        await notify({
          recipient: enrollment.trainee,
          type: "ASSESSMENT_DEADLINE_REMINDER",
          title: "Assessment deadline approaching",
          message: `${assessment.title} closes on ${assessment.closesAt.toISOString().slice(0, 10)} and has no submitted attempt.`,
          entityReference: {
            entityType: "P3Assessment",
            entityId: assessment._id,
            path: "/trainee/assessments",
          },
          eventId: `reminder:assessment:${assessment._id}:${enrollment.trainee}:${assessment.closesAt.toISOString()}`,
        });
        result.assessmentDeadlineReminders += 1;
      }
  }

  const modules = await P3.P3LearningModule.find({
    status: "PUBLISHED",
    deadline: { $gt: now, $lte: horizon },
  })
    .select("batch course title deadline")
    .lean();
  if (modules.length) {
    const enrollments = await confirmedTrainees(
      modules.map((row) => row.batch || row.course),
    );
    const batches = await P2.P2Batch.find({
      _id: { $in: modules.map((row) => row.batch).filter(Boolean) },
    })
      .select("course")
      .lean();
    const completed = await P3.P3LearningProgress.find({
      module: { $in: modules.map((row) => row._id) },
      status: "COMPLETED",
    })
      .select("module trainee")
      .lean();
    for (const module of modules)
      for (const enrollment of enrollments) {
        const applies = module.batch
          ? String(enrollment.batch) === String(module.batch)
          : batches.some(
              (batch) =>
                String(batch._id) === String(enrollment.batch) &&
                String(batch.course) === String(module.course),
            );
        if (!applies) continue;
        const done = completed.some(
          (row) =>
            String(row.module) === String(module._id) &&
            String(row.trainee) === String(enrollment.trainee),
        );
        if (done) continue;
        await notify({
          recipient: enrollment.trainee,
          type: "TRAINING_DEADLINE_REMINDER",
          title: "Training deadline approaching",
          message: `${module.title} is due on ${module.deadline.toISOString().slice(0, 10)}.`,
          entityReference: {
            entityType: "P3LearningModule",
            entityId: module._id,
            path: "/trainee/learning",
          },
          eventId: `reminder:learning:${module._id}:${enrollment.trainee}:${module.deadline.toISOString()}`,
        });
        result.learningDeadlineReminders += 1;
      }
  }

  const User = mongoose.model("User");
  const withRole = await User.find({
    role: "trainee",
    accountStatus: "approved",
    jobRole: { $ne: null },
  })
    .select("jobRole")
    .lean();
  if (withRole.length) {
    // Mirrors gapsFor: requirements are scoped by professional role only, so a
    // reminder never disagrees with the Skill Gaps page.
    const requirements = await P2.P2RoleRequirement.find({
      jobRole: { $in: withRole.map((row) => row.jobRole) },
    })
      .populate("competency", "name code")
      .lean();
    const courseMapping = await P2.P2Course.find({
      status: "PUBLISHED",
      "competencyOutcomes.competency": {
        $in: requirements.map((row) => row.competency?._id).filter(Boolean),
      },
    })
      .select("title competencyOutcomes")
      .lean();
    for (const user of withRole)
      for (const requirement of requirements.filter(
        (row) => String(row.jobRole) === String(user.jobRole),
      )) {
        const competencyId = requirement.competency?._id;
        if (!competencyId) continue;
        const record = await P2.P2CompetencyRecord.findOne({
          trainee: user._id,
          competency: competencyId,
          frameworkVersion: requirement.competencyVersion,
        }).lean();
        if (
          record?.status === "DEMONSTRATED" &&
          record.demonstratedLevel >= requirement.requiredLevel
        )
          continue;
        const recommended = courseMapping.filter((course) =>
          course.competencyOutcomes.some(
            (outcome) =>
              String(outcome.competency) === String(competencyId) &&
              outcome.frameworkVersion === requirement.competencyVersion &&
              (record?.status !== "DEMONSTRATED" ||
                record.frameworkVersion !== requirement.competencyVersion ||
                outcome.targetLevel > record.demonstratedLevel),
          ),
        );
        if (!recommended.length) continue;
        const reviewed =
          record?.status === "DEMONSTRATED" &&
          record.frameworkVersion === requirement.competencyVersion
            ? `; your reviewed level is L${record.demonstratedLevel}`
            : "";
        await notify({
          recipient: user._id,
          type: "RECOMMENDATION_AVAILABLE",
          title: "Development recommendation available",
          message: `${requirement.competency.name} is required at L${requirement.requiredLevel} for your role${reviewed}. ${recommended[0].title} addresses the criteria for progression.`,
          entityReference: {
            entityType: "P2Competency",
            entityId: competencyId,
            path: "/trainee/skill-gaps",
          },
          eventId: `reminder:recommendation:${user._id}:${competencyId}:${requirement.competencyVersion}`,
        });
        result.recommendationNotices += 1;
      }
  }

  return result;
}
