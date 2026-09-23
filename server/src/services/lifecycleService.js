import mongoose from "mongoose";
import User from "../models/User.js";
import * as M from "../models/Lifecycle.js";
import { HttpError } from "../middleware/errorHandler.js";
export const same = (a, b) => String(a?._id || a) === String(b?._id || b);
const fail = (code, message) => {
  throw new HttpError(code, message);
};
export const requireCoordinator = (actor, batch) => {
  if (actor.role !== "admin" || !same(actor, batch.coordinator))
    fail(403, "Only this batch’s coordinator can make this decision.");
};
export const permitted = (actor, batch, action) =>
  batch.permissions.some(
    (p) => same(p.user, actor) && p.actions.includes(action),
  );
export const requirePermission = (actor, batch, action) => {
  if (!permitted(actor, batch, action))
    fail(403, `Explicit batch assignment required: ${action}.`);
};
const noSelf = (actor, owner) => {
  if (same(actor, owner))
    fail(403, "You cannot evaluate, publish or approve your own record.");
};
const get = async (Model, id, session) => {
  const row = await Model.findById(id).session(session);
  if (!row) fail(404, `${Model.modelName} not found`);
  return row;
};
const create = async (Model, data, session) =>
  (await Model.create([data], { session, ordered: true }))[0];
export const audit = (actor, batch, action, row, reason, session, from, to) =>
  create(
    M.AuditLog,
    {
      actor: actor._id,
      batch: batch?._id,
      action,
      entityType: row.constructor.modelName,
      entityId: row._id,
      reason,
      from,
      to,
    },
    session,
  );
const notify = (owner, batch, message, session) =>
  create(M.Notification, { owner, batch: batch._id, message }, session);
const transition = (row, actor, to, reason) => {
  row.history.push({
    from: row.state || row.status,
    to,
    actor: actor._id,
    at: new Date(),
    reason,
  });
  if (row.state !== undefined) row.state = to;
  else row.status = to;
};
async function ownedResources(ids, actor, batch, session) {
  if (!ids.length) return;
  const count = await M.Resource.countDocuments({
    _id: { $in: ids },
    owner: actor._id,
    batch: batch._id,
  }).session(session);
  if (count !== new Set(ids).size)
    fail(403, "Each attachment must be your private resource for this batch.");
}
export async function matching(batch, sessionId, session = null) {
  const slot = batch.sessions.id(sessionId);
  if (!slot) fail(404, "Session not found");
  const rules = await get(M.CourseRuleVersion, batch.ruleVersion, session);
  const trainers = await User.find({
    role: "trainer",
    accountStatus: "approved",
  }).session(session);
  const output = [];
  for (const trainer of trainers) {
    const expertise = await M.TrainerExpertise.findOne({
      trainer: trainer._id,
      subject: slot.subject,
      status: "APPROVED",
    }).session(session);
    const windows = await M.TrainerAvailability.find({
      trainer: trainer._id,
      start: { $lt: slot.end },
      end: { $gt: slot.start },
    }).session(session);
    const conflict = await M.TrainerAssignment.exists({
      trainer: trainer._id,
      state: { $in: ["ACTIVE", "UNAVAILABLE"] },
      start: { $lt: slot.end },
      end: { $gt: slot.start },
      $or: [{ batch: { $ne: batch._id } }, { sessionId: { $ne: slot._id } }],
    }).session(session);
    const reasons = [];
    if (!expertise) reasons.push("Approved relevant expertise is missing.");
    if (
      rules.trainerPrerequisites.some(
        (q) => !expertise?.qualifications.includes(q),
      )
    )
      reasons.push("Required qualifications are missing.");
    if (
      !windows.some(
        (w) => w.available && w.start <= slot.start && w.end >= slot.end,
      ) ||
      windows.some((w) => !w.available)
    )
      reasons.push("Availability does not cover the actual session.");
    if (conflict) reasons.push("A scheduling conflict exists.");
    const eligible = !reasons.length;
    const points = eligible
      ? 10 + Math.min(expertise.teachingYears || 0, 10)
      : null;
    output.push({
      trainer: trainer._id,
      name: trainer.name,
      eligible,
      points,
      explanation: eligible
        ? `Exact approved subject: 10 points; relevant teaching experience: ${Math.min(expertise.teachingYears || 0, 10)} points (capped at 10).`
        : reasons.join(" "),
      missingInformation: reasons,
    });
  }
  return output.sort(
    (a, b) =>
      (b.points ?? -1) - (a.points ?? -1) || a.name.localeCompare(b.name),
  );
}
const actions = {
  async defineCompetency(actor, d, s) {
    if (actor.role !== "admin") fail(403, "Coordinator access required");
    const row = await create(M.Competency, { ...d, synthetic: true }, s);
    await audit(
      actor,
      null,
      "SYNTHETIC_RUBRIC_DEFINED",
      row,
      M.POLICY_LABEL,
      s,
    );
    return row;
  },
  async defineJobRole(actor, d, s) {
    if (actor.role !== "admin") fail(403, "Coordinator access required");
    const row = await create(M.JobRole, { ...d, synthetic: true }, s);
    await audit(
      actor,
      null,
      "PROPOSED_JOB_ROLE_DEFINED",
      row,
      M.POLICY_LABEL,
      s,
    );
    return row;
  },
  async defineRequirement(actor, d, s) {
    if (actor.role !== "admin") fail(403, "Coordinator access required");
    await get(M.JobRole, d.jobRole, s);
    const competency = await get(M.Competency, d.competency, s);
    if (
      competency.rubricVersion !== d.rubricVersion ||
      !competency.levels.some((l) => l.level === d.requiredLevel)
    )
      fail(400, "Choose a level defined in the same competency rubric");
    const row = await create(M.RoleRequirement, d, s);
    await audit(
      actor,
      null,
      "ROLE_REQUIREMENT_DEFINED",
      row,
      M.POLICY_LABEL,
      s,
    );
    return row;
  },
  async assignJobRole(actor, d, s) {
    if (actor.role !== "admin") fail(403, "Coordinator access required");
    await get(M.JobRole, d.jobRole, s);
    const row = await get(User, d.user, s);
    row.jobRole = d.jobRole;
    await row.save({ session: s });
    await audit(actor, null, "PROPOSED_JOB_ROLE_ASSIGNED", row, d.reason, s);
    return row;
  },
  async createCourse(actor, d, s) {
    if (actor.role !== "admin") fail(403, "Admin/Coordinator access required");
    for (const competency of d.intendedCompetencies)
      await get(M.Competency, competency, s);
    const row = await create(
      M.Course,
      { ...d, owner: actor._id, synthetic: true },
      s,
    );
    await audit(
      actor,
      null,
      "COURSE_CREATED",
      row,
      "Synthetic proposed course created",
      s,
    );
    return row;
  },
  async defineRules(actor, d, s) {
    const course = await get(M.Course, d.course, s);
    if (actor.role !== "admin" || !same(course.owner, actor))
      fail(403, "Course owner required");
    const row = await create(
      M.CourseRuleVersion,
      { ...d, owner: actor._id, approvedBy: actor._id, label: M.POLICY_LABEL },
      s,
    );
    await audit(
      actor,
      null,
      "RULE_VERSION_APPROVED",
      row,
      `Approved proposed version ${d.version}`,
      s,
    );
    return row;
  },
  async createBatch(actor, d, s) {
    const rules = await get(M.CourseRuleVersion, d.ruleVersion, s),
      course = await get(M.Course, rules.course, s);
    if (actor.role !== "admin" || !same(course.owner, actor))
      fail(403, "Course owner required");
    const row = await create(
      M.Batch,
      {
        ...d,
        course: course._id,
        coordinator: actor._id,
        state: "PLANNED",
        permissions: [],
        history: [],
      },
      s,
    );
    await audit(
      actor,
      row,
      "BATCH_CREATED",
      row,
      "Batch pinned to approved rule version",
      s,
    );
    return row;
  },
  async batchState(actor, d, s) {
    const batch = await get(M.Batch, d.batch, s);
    requireCoordinator(actor, batch);
    const edges = {
      PLANNED: "NOMINATIONS_OPEN",
      NOMINATIONS_OPEN: "IN_PROGRESS",
      IN_PROGRESS: "COMPLETED",
    };
    if (edges[batch.state] !== d.state) fail(409, "Invalid batch transition");
    if (d.state === "IN_PROGRESS")
      for (const slot of batch.sessions) {
        if (
          !(await M.TrainerAssignment.exists({
            batch: batch._id,
            sessionId: slot._id,
            state: "ACTIVE",
          }).session(s))
        )
          fail(
            409,
            "Every session needs an active trainer assignment before learning starts",
          );
      }
    const from = batch.state;
    transition(batch, actor, d.state, d.reason);
    await batch.save({ session: s });
    await audit(actor, batch, "BATCH_STATE", batch, d.reason, s, from, d.state);
    return batch;
  },
  async grantPermission(actor, d, s) {
    const batch = await get(M.Batch, d.batch, s);
    requireCoordinator(actor, batch);
    const target = await get(User, d.user, s);
    if (
      target.accountStatus !== "approved" ||
      !["trainer", "admin"].includes(target.role)
    )
      fail(400, "Assign an approved trainer or administrator");
    const entry = batch.permissions.find((p) => same(p.user, target));
    if (entry) entry.actions = d.actions;
    else batch.permissions.push({ user: target._id, actions: d.actions });
    await batch.save({ session: s });
    await audit(
      actor,
      batch,
      "PERMISSIONS_ASSIGNED",
      batch,
      `${d.reason}; user ${target.id}; permissions ${d.actions.join(", ")}`,
      s,
    );
    return batch;
  },
  async createNeed(actor, d, s) {
    if (d.course) await get(M.Course, d.course, s);
    if (d.competency) await get(M.Competency, d.competency, s);
    const row = await create(M.TrainingNeed, { ...d, owner: actor._id }, s);
    await audit(actor, null, "NEED_IDENTIFIED", row, d.reason, s);
    return row;
  },
  async nominate(actor, d, s) {
    if (actor.role !== "trainee") fail(403, "Trainee access required");
    const batch = await get(M.Batch, d.batch, s),
      need = await get(M.TrainingNeed, d.need, s);
    if (batch.state !== "NOMINATIONS_OPEN")
      fail(409, "Nominations are not open");
    if (
      !same(need.owner, actor) ||
      (need.course && !same(need.course, batch.course))
    )
      fail(400, "Choose your training need for this course");
    await ownedResources(d.resources, actor, batch, s);
    const row = await create(
      M.Nomination,
      { ...d, owner: actor._id, state: "DRAFT" },
      s,
    );
    await audit(
      actor,
      batch,
      "NOMINATION_DRAFTED",
      row,
      "Draft nomination created",
      s,
    );
    return row;
  },
  async editNomination(actor, d, s) {
    const row = await get(M.Nomination, d.nomination, s),
      batch = await get(M.Batch, row.batch, s);
    if (!same(row.owner, actor)) fail(403, "Nomination owner required");
    if (!["DRAFT", "RETURNED"].includes(row.state))
      fail(409, "Only draft or returned nominations can be edited");
    await ownedResources(d.resources, actor, batch, s);
    row.information = d.information;
    row.qualifications = d.qualifications;
    row.resources = d.resources;
    await row.save({ session: s });
    await audit(
      actor,
      batch,
      "NOMINATION_CORRECTED",
      row,
      "Applicant updated submitted information",
      s,
    );
    return row;
  },
  async nominationState(actor, d, s) {
    const row = await get(M.Nomination, d.nomination, s),
      batch = await get(M.Batch, row.batch, s);
    const from = row.state;
    const edges = {
      DRAFT: ["SUBMITTED", "WITHDRAWN"],
      SUBMITTED: ["UNDER_REVIEW", "WITHDRAWN"],
      UNDER_REVIEW: [
        "RETURNED",
        "WAITLISTED",
        "APPROVED",
        "REJECTED",
        "WITHDRAWN",
      ],
      RETURNED: ["RESUBMITTED", "WITHDRAWN"],
      RESUBMITTED: ["UNDER_REVIEW", "WITHDRAWN"],
      WAITLISTED: ["APPROVED", "WITHDRAWN"],
      APPROVED: ["WITHDRAWN"],
    };
    if (!edges[from]?.includes(d.state))
      fail(409, "Invalid nomination transition");
    if (["SUBMITTED", "RESUBMITTED", "WITHDRAWN"].includes(d.state)) {
      if (!same(row.owner, actor))
        fail(403, "Only the applicant can submit or withdraw");
    } else requireCoordinator(actor, batch);
    if (
      ["SUBMITTED", "RESUBMITTED", "APPROVED", "WAITLISTED"].includes(
        d.state,
      ) &&
      batch.state !== "NOMINATIONS_OPEN"
    )
      fail(409, "Nominations are closed");
    if (
      d.state === "WITHDRAWN" &&
      from === "APPROVED" &&
      batch.state !== "NOMINATIONS_OPEN"
    )
      fail(
        409,
        "Withdrawal after learning starts requires a future exception process",
      );
    if (["SUBMITTED", "RESUBMITTED"].includes(d.state)) {
      row.eligibility = "NOT_CHECKED";
      row.eligibilityReview = undefined;
    }
    if (
      ["APPROVED", "WAITLISTED"].includes(d.state) &&
      row.eligibility !== "ELIGIBLE"
    )
      fail(409, "Reviewed eligibility is required before seat allocation");
    if (d.state === "APPROVED") {
      noSelf(actor, row.owner);
      const allocated = await M.Batch.findOneAndUpdate(
        {
          _id: batch._id,
          state: "NOMINATIONS_OPEN",
          $expr: { $lt: ["$admitted", "$capacity"] },
        },
        { $inc: { admitted: 1 } },
        { new: true, session: s },
      );
      if (!allocated)
        fail(409, "No seat available. Keep the eligible applicant waitlisted.");
      await create(
        M.Enrollment,
        { owner: row.owner, batch: batch._id, nomination: row._id },
        s,
      );
    }
    if (d.state === "WITHDRAWN" && from === "APPROVED") {
      await M.Enrollment.updateOne(
        { nomination: row._id },
        { completion: "WITHDRAWN" },
        { session: s },
      );
      await M.Batch.updateOne(
        { _id: batch._id, admitted: { $gt: 0 } },
        { $inc: { admitted: -1 } },
        { session: s },
      );
    }
    transition(row, actor, d.state, d.reason);
    await row.save({ session: s });
    await audit(
      actor,
      batch,
      "NOMINATION_STATE",
      row,
      d.reason,
      s,
      from,
      d.state,
    );
    await notify(row.owner, batch, `Nomination ${d.state}: ${d.reason}`, s);
    return row;
  },
  async reviewEligibility(actor, d, s) {
    const row = await get(M.Nomination, d.nomination, s),
      batch = await get(M.Batch, row.batch, s);
    requireCoordinator(actor, batch);
    noSelf(actor, row.owner);
    if (row.state !== "UNDER_REVIEW")
      fail(
        409,
        "Final eligibility review requires a submitted nomination under review",
      );
    const rules = await get(M.CourseRuleVersion, batch.ruleVersion, s);
    if (
      d.eligibility === "ELIGIBLE" &&
      rules.eligibility.requiredQualifications.some(
        (q) => !row.qualifications.includes(q),
      )
    )
      fail(409, "Submitted qualifications do not satisfy the pinned rules");
    const from = row.eligibility;
    row.eligibility = d.eligibility;
    row.eligibilityReview = {
      actor: actor._id,
      at: new Date(),
      reason: d.reason,
    };
    await row.save({ session: s });
    await audit(
      actor,
      batch,
      "ELIGIBILITY_REVIEWED",
      row,
      d.reason,
      s,
      from,
      d.eligibility,
    );
    return row;
  },
  async expertise(actor, d, s) {
    if (actor.role !== "admin") fail(403, "Coordinator access required");
    noSelf(actor, d.trainer);
    const trainer = await get(User, d.trainer, s);
    if (trainer.role !== "trainer" || trainer.accountStatus !== "approved")
      fail(400, "Approved trainer required");
    await User.updateOne(
      { _id: d.trainer },
      { $inc: { scheduleVersion: 1 } },
      { session: s },
    );
    const row = await M.TrainerExpertise.findOneAndUpdate(
      { trainer: d.trainer, subject: d.subject },
      { $set: { ...d, approvedBy: actor._id, approvedAt: new Date() } },
      { upsert: true, new: true, runValidators: true, session: s },
    );
    await audit(actor, null, "TRAINER_EXPERTISE_REVIEWED", row, d.basis, s);
    return row;
  },
  async availability(actor, d, s) {
    if (!same(actor, d.trainer) && actor.role !== "admin")
      fail(403, "Trainer owner or coordinator required");
    const trainer = await get(User, d.trainer, s);
    if (trainer.role !== "trainer") fail(400, "Trainer required");
    await User.updateOne(
      { _id: d.trainer },
      { $inc: { scheduleVersion: 1 } },
      { session: s },
    );
    const row = await create(M.TrainerAvailability, d, s);
    await audit(actor, null, "AVAILABILITY_RECORDED", row, d.reason, s);
    if (!d.available) {
      const affected = await M.TrainerAssignment.find({
        trainer: d.trainer,
        state: "ACTIVE",
        start: { $lt: d.end },
        end: { $gt: d.start },
      }).session(s);
      for (const assignment of affected) {
        assignment.state = "UNAVAILABLE";
        await assignment.save({ session: s });
        const batch = await get(M.Batch, assignment.batch, s);
        await audit(
          actor,
          batch,
          "TRAINER_UNAVAILABLE",
          assignment,
          d.reason,
          s,
          "ACTIVE",
          "UNAVAILABLE",
        );
        await notify(
          batch.coordinator,
          batch,
          "Trainer unavailable. Review eligible replacements for the affected session.",
          s,
        );
      }
    }
    return row;
  },
  async assignTrainer(actor, d, s) {
    const batch = await get(M.Batch, d.batch, s);
    requireCoordinator(actor, batch);
    if (batch.state === "COMPLETED") fail(409, "Batch is complete");
    // A shared trainer write serializes availability, expertise and cross-batch bookings.
    await User.updateOne(
      { _id: d.trainer },
      { $inc: { scheduleVersion: 1 } },
      { session: s },
    );
    const recommendations = await matching(batch, d.sessionId, s),
      candidate = recommendations.find((r) => same(r.trainer, d.trainer));
    if (!candidate?.eligible)
      fail(409, candidate?.explanation || "No eligible trainer available.");
    const slot = batch.sessions.id(d.sessionId),
      previous = await M.TrainerAssignment.findOne({
        batch: batch._id,
        sessionId: slot._id,
        state: { $in: ["ACTIVE", "UNAVAILABLE"] },
      }).session(s);
    if (previous) {
      previous.state = "REPLACED";
      await previous.save({ session: s });
    }
    const row = await create(
      M.TrainerAssignment,
      {
        trainer: d.trainer,
        batch: batch._id,
        sessionId: slot._id,
        start: slot.start,
        end: slot.end,
        assignedBy: actor._id,
        reason: d.reason,
        recommendationPoints: candidate.points,
        replaces: previous?._id,
      },
      s,
    );
    const departure = !same(
      recommendations.find((r) => r.eligible)?.trainer,
      d.trainer,
    );
    await audit(
      actor,
      batch,
      previous ? "TRAINER_REPLACED" : "TRAINER_ASSIGNED",
      row,
      `${d.reason}; ${candidate.explanation}; ranking departure: ${departure}`,
      s,
    );
    const trainees = await M.Enrollment.find({
      batch: batch._id,
      completion: { $ne: "WITHDRAWN" },
    }).session(s);
    const owners = new Set([
      String(d.trainer),
      ...trainees.map((t) => String(t.owner)),
      ...(previous ? [String(previous.trainer)] : []),
    ]);
    for (const owner of owners)
      await notify(
        owner,
        batch,
        `${previous ? "Replacement trainer approved" : "Trainer assigned"} for ${slot.title}.`,
        s,
      );
    return row;
  },
  async createAssessment(actor, d, s) {
    const batch = await get(M.Batch, d.batch, s);
    requirePermission(actor, batch, "CREATE_ASSESSMENT");
    if (batch.state === "COMPLETED") fail(409, "Batch is complete");
    const rules = await get(M.CourseRuleVersion, batch.ruleVersion, s);
    if (!rules.assessmentKinds.includes(d.kind))
      fail(400, "Assessment type is not enabled in the pinned rules");
    if (d.competency) {
      const competency = await get(M.Competency, d.competency, s);
      if (competency.rubricVersion !== d.rubricVersion)
        fail(400, "Rubric version mismatch");
    }
    const row = await create(
      M.Assessment,
      {
        ...d,
        owner: actor._id,
        ruleVersion: batch.ruleVersion,
        published: false,
      },
      s,
    );
    await audit(
      actor,
      batch,
      "ASSESSMENT_DRAFTED",
      row,
      "Manual assessment draft; human publication required",
      s,
    );
    return row;
  },
  async publishAssessment(actor, d, s) {
    const row = await get(M.Assessment, d.assessment, s),
      batch = await get(M.Batch, row.batch, s);
    requirePermission(actor, batch, "CREATE_ASSESSMENT");
    if (row.published) fail(409, "Assessment already published");
    await M.Batch.updateOne(
      { _id: batch._id },
      { $inc: { workflowVersion: 1 } },
      { session: s },
    );
    if (await M.Result.exists({ batch: batch._id }).session(s))
      fail(409, "Assessment plan is frozen after first result publication");
    row.published = true;
    await row.save({ session: s });
    await audit(actor, batch, "ASSESSMENT_PUBLISHED", row, d.reason, s);
    return row;
  },
  async submit(actor, d, s) {
    const assessment = await get(M.Assessment, d.assessment, s),
      batch = await get(M.Batch, assessment.batch, s);
    const enrollment = await M.Enrollment.findOne({
      owner: actor._id,
      batch: batch._id,
      completion: { $ne: "WITHDRAWN" },
    }).session(s);
    if (!enrollment) fail(403, "An active enrollment is required");
    if (batch.state !== "IN_PROGRESS" || !assessment.published)
      fail(409, "Assessment is not open");
    await ownedResources(d.resources, actor, batch, s);
    let automaticScore;
    if (assessment.kind === "MCQ") {
      if (
        d.answers.length !== assessment.questions.length ||
        d.answers.some(
          (a, i) => a < 0 || a >= assessment.questions[i].options.length,
        )
      )
        fail(400, "Answer every question with a valid option");
      automaticScore =
        (100 *
          assessment.questions.filter((q, i) => q.correctIndex === d.answers[i])
            .length) /
        assessment.questions.length;
    } else if (!d.text.trim() && !d.resources.length)
      fail(400, "A response or private attachment is required");
    const row = await create(
      M.Submission,
      {
        ...d,
        owner: actor._id,
        batch: batch._id,
        enrollment: enrollment._id,
        automaticScore,
      },
      s,
    );
    if (enrollment.completion === "NOT_STARTED") {
      enrollment.completion = "IN_PROGRESS";
      await enrollment.save({ session: s });
    }
    await audit(
      actor,
      batch,
      "SUBMISSION_CREATED",
      row,
      "Assessment response submitted; not an official result",
      s,
    );
    return row;
  },
  async evaluate(actor, d, s) {
    const submission = await get(M.Submission, d.submission, s),
      batch = await get(M.Batch, submission.batch, s);
    requirePermission(actor, batch, "EVALUATE");
    noSelf(actor, submission.owner);
    const row = await create(
      M.Evaluation,
      {
        ...d,
        batch: batch._id,
        evaluator: actor._id,
        score: submission.automaticScore ?? d.score,
      },
      s,
    );
    await audit(actor, batch, "SUBMISSION_EVALUATED", row, d.comments, s);
    return row;
  },
  async completeLearning(actor, d, s) {
    const row = await get(M.Enrollment, d.enrollment, s),
      batch = await get(M.Batch, row.batch, s);
    requireCoordinator(actor, batch);
    noSelf(actor, row.owner);
    if (
      row.completion === "WITHDRAWN" ||
      !["IN_PROGRESS", "COMPLETED"].includes(batch.state)
    )
      fail(409, "Learning must have started");
    row.completion = "COMPLETED";
    row.completedAt = new Date();
    row.completedBy = actor._id;
    await row.save({ session: s });
    await audit(actor, batch, "LEARNING_COMPLETED", row, d.reason, s);
    return row;
  },
  async publishResult(actor, d, s) {
    const enrollment = await get(M.Enrollment, d.enrollment, s),
      batch = await get(M.Batch, enrollment.batch, s);
    requirePermission(actor, batch, "PUBLISH_RESULT");
    noSelf(actor, enrollment.owner);
    if (enrollment.completion === "WITHDRAWN")
      fail(409, "Enrollment withdrawn");
    await M.Batch.updateOne(
      { _id: batch._id },
      { $inc: { workflowVersion: 1 } },
      { session: s },
    );
    const rules = await get(M.CourseRuleVersion, batch.ruleVersion, s),
      assessments = await M.Assessment.find({
        batch: batch._id,
        published: true,
      }).session(s);
    if (
      rules.assessmentKinds.some((k) => !assessments.some((a) => a.kind === k))
    )
      fail(409, "Required assessment types have not been published");
    const evaluations = [];
    let pass = true;
    for (const assessment of assessments) {
      const submission = await M.Submission.findOne({
        assessment: assessment._id,
        owner: enrollment.owner,
      }).session(s);
      if (!submission) fail(409, "Required submission missing");
      const evaluation = await M.Evaluation.findOne({
        submission: submission._id,
      }).session(s);
      if (!evaluation)
        fail(409, "Human evaluation is required for every assessment");
      evaluations.push(evaluation._id);
      if (evaluation.score < rules.passing[assessment.kind]) pass = false;
    }
    const row = await create(
      M.Result,
      {
        owner: enrollment.owner,
        enrollment: enrollment._id,
        batch: batch._id,
        ruleVersion: rules._id,
        outcome: pass ? "PASS" : "FAIL",
        evaluations,
        publishedBy: actor._id,
        publishedAt: new Date(),
      },
      s,
    );
    await audit(actor, batch, "RESULT_PUBLISHED", row, d.reason, s);
    await notify(
      row.owner,
      batch,
      `Official demonstration result published: ${row.outcome}. This does not verify competency.`,
      s,
    );
    return row;
  },
  async submitEvidence(actor, d, s) {
    const submission = await get(M.Submission, d.submission, s);
    if (!same(submission.owner, actor)) fail(403, "Submission owner required");
    const assessment = await get(M.Assessment, submission.assessment, s),
      batch = await get(M.Batch, submission.batch, s),
      competency = await get(M.Competency, d.competency, s);
    if (
      !same(assessment.competency, competency) ||
      assessment.rubricVersion !== d.rubricVersion ||
      competency.rubricVersion !== d.rubricVersion
    )
      fail(
        400,
        "Evidence must use the specific task’s competency and rubric version",
      );
    const row = await create(
      M.Evidence,
      { ...d, owner: actor._id, batch: batch._id, status: "SUBMITTED" },
      s,
    );
    await create(
      M.CompetencyRecord,
      {
        owner: actor._id,
        batch: batch._id,
        competency: competency._id,
        rubricVersion: d.rubricVersion,
        evidence: row._id,
        outcome: "UNDER_REVIEW",
      },
      s,
    );
    await audit(
      actor,
      batch,
      "EVIDENCE_SUBMITTED",
      row,
      "Existing submission reused as evidence; no duplicate upload",
      s,
    );
    return row;
  },
  async reviewEvidence(actor, d, s) {
    const evidence = await get(M.Evidence, d.evidence, s),
      batch = await get(M.Batch, evidence.batch, s);
    requirePermission(actor, batch, "REVIEW_EVIDENCE");
    noSelf(actor, evidence.owner);
    if (evidence.status !== "SUBMITTED")
      fail(409, "Only submitted evidence can be reviewed");
    const competency = await get(M.Competency, evidence.competency, s);
    if (
      d.status === "ACCEPTED" &&
      !["DEMONSTRATED", "NEEDS_PRACTICE"].includes(d.outcome)
    )
      fail(400, "Accepted evidence requires a competency review outcome");
    if (
      d.status !== "ACCEPTED" &&
      (d.outcome !== "NOT_ASSESSED" || d.demonstratedLevel !== undefined)
    )
      fail(400, "Returned or rejected evidence is not a competency assessment");
    if (
      d.outcome === "DEMONSTRATED" &&
      competency.levels.length &&
      !competency.levels.some((l) => l.level === d.demonstratedLevel)
    )
      fail(400, "Select a defined level in this synthetic rubric");
    if (d.outcome !== "DEMONSTRATED" && d.demonstratedLevel !== undefined)
      fail(400, "A demonstrated level requires a demonstrated outcome");
    transition(evidence, actor, d.status, d.comments);
    evidence.review = {
      reviewer: actor._id,
      at: new Date(),
      comments: d.comments,
    };
    await evidence.save({ session: s });
    await M.CompetencyRecord.updateOne(
      { evidence: evidence._id },
      {
        $set: {
          outcome: d.outcome,
          reviewer: actor._id,
          reviewedAt: new Date(),
          comments: d.comments,
          reviewDueAt: d.reviewDueAt,
          demonstratedLevel: d.demonstratedLevel,
        },
      },
      { session: s, runValidators: true },
    );
    await audit(
      actor,
      batch,
      "COMPETENCY_REVIEWED",
      evidence,
      d.comments,
      s,
      "UNDER_REVIEW",
      d.outcome,
    );
    await notify(
      evidence.owner,
      batch,
      `Evidence ${d.status}; competency ${d.outcome}.`,
      s,
    );
    return evidence;
  },
  async resubmitEvidence(actor, d, s) {
    const evidence = await get(M.Evidence, d.evidence, s),
      batch = await get(M.Batch, evidence.batch, s);
    if (!same(evidence.owner, actor)) fail(403, "Evidence owner required");
    if (evidence.status !== "RETURNED")
      fail(409, "Only returned evidence may be resubmitted");
    // Supplement the original submission; evidence keeps its original submission reference.
    await ownedResources(d.resources, actor, batch, s);
    evidence.supplement = { text: d.text, resources: d.resources };
    transition(evidence, actor, "SUBMITTED", d.reason);
    evidence.review = undefined;
    await evidence.save({ session: s });
    await M.CompetencyRecord.updateOne(
      { evidence: evidence._id },
      {
        $set: { outcome: "UNDER_REVIEW" },
        $unset: {
          reviewer: 1,
          reviewedAt: 1,
          comments: 1,
          demonstratedLevel: 1,
          reviewDueAt: 1,
        },
      },
      { session: s },
    );
    await audit(actor, batch, "EVIDENCE_RESUBMITTED", evidence, d.reason, s);
    return evidence;
  },
  async issueCertificate(actor, d, s) {
    const enrollment = await get(M.Enrollment, d.enrollment, s),
      batch = await get(M.Batch, enrollment.batch, s);
    requireCoordinator(actor, batch);
    noSelf(actor, enrollment.owner);
    const rules = await get(M.CourseRuleVersion, batch.ruleVersion, s),
      result = await M.Result.findOne({ enrollment: enrollment._id }).session(
        s,
      );
    if (
      !result ||
      (rules.certificate.requirePublishedPass && result.outcome !== "PASS") ||
      (rules.certificate.requireCompletion &&
        enrollment.completion !== "COMPLETED")
    )
      fail(
        409,
        "Configured completion and published result conditions are not satisfied",
      );
    if (rules.certificate.requireDemonstratedEvidence) {
      const course = await get(M.Course, batch.course, s);
      for (const competency of course.intendedCompetencies) {
        if (
          !(await M.CompetencyRecord.exists({
            owner: enrollment.owner,
            batch: batch._id,
            competency,
            outcome: "DEMONSTRATED",
          }).session(s))
        )
          fail(409, "Configured reviewed evidence is missing");
      }
    }
    const row = await create(
      M.Certificate,
      {
        owner: enrollment.owner,
        batch: batch._id,
        enrollment: enrollment._id,
        result: result._id,
        ruleVersion: rules._id,
        issuedBy: actor._id,
        issuedAt: new Date(),
        serial: `SYN-${enrollment.id}`,
        statement:
          "Synthetic course certificate. Establishes only the configured course conditions; not an operational expert designation.",
      },
      s,
    );
    await audit(actor, batch, "CERTIFICATE_ISSUED", row, d.reason, s);
    return row;
  },
  async feedback(actor, d, s) {
    const enrollment = await get(M.Enrollment, d.enrollment, s),
      batch = await get(M.Batch, enrollment.batch, s);
    if (!same(enrollment.owner, actor)) fail(403, "Enrollment owner required");
    if (!(await M.Result.exists({ enrollment: enrollment._id }).session(s)))
      fail(409, "Feedback opens after result publication");
    const row = await create(
      M.Feedback,
      { ...d, owner: actor._id, batch: batch._id, mode: "IDENTIFIED" },
      s,
    );
    await audit(
      actor,
      batch,
      "FEEDBACK_RECEIVED",
      row,
      "Identified course feedback submitted; response content omitted from audit log",
      s,
    );
    return row;
  },
  async followUp(actor, d, s) {
    const enrollment = await get(M.Enrollment, d.enrollment, s),
      batch = await get(M.Batch, enrollment.batch, s);
    requireCoordinator(actor, batch);
    if (d.evidence) {
      const evidence = await get(M.Evidence, d.evidence, s);
      if (
        !same(evidence.owner, enrollment.owner) ||
        !same(evidence.batch, batch)
      )
        fail(400, "Evidence does not belong to this enrollment");
    }
    const row = await create(
      M.FollowUp,
      {
        owner: enrollment.owner,
        batch: batch._id,
        enrollment: enrollment._id,
        evidence: d.evidence,
        createdBy: actor._id,
        action: d.action,
        dueAt: d.dueAt,
      },
      s,
    );
    const need = await create(
      M.TrainingNeed,
      {
        owner: enrollment.owner,
        course: batch.course,
        reason: d.action,
        action: d.nextAction,
        followUp: row._id,
      },
      s,
    );
    row.newNeed = need._id;
    await row.save({ session: s });
    await audit(actor, batch, "FOLLOW_UP_CREATED", row, d.action, s);
    await notify(row.owner, batch, `Follow-up: ${d.action}`, s);
    return row;
  },
  async completeFollowUp(actor, d, s) {
    const row = await get(M.FollowUp, d.followUp, s),
      batch = await get(M.Batch, row.batch, s);
    if (!same(row.owner, actor)) requireCoordinator(actor, batch);
    if (row.state === "DONE") fail(409, "Follow-up already completed");
    row.state = "DONE";
    await row.save({ session: s });
    await audit(actor, batch, "FOLLOW_UP_COMPLETED", row, d.reason, s);
    return row;
  },
  async readNotification(actor, d, s) {
    const row = await get(M.Notification, d.notification, s);
    if (!same(row.owner, actor)) fail(403, "Notification owner required");
    row.readAt = new Date();
    await row.save({ session: s });
    return row;
  },
};
export async function execute(actor, action, data) {
  if (!actions[action]) fail(404, "Unknown lifecycle action");
  return mongoose.connection.transaction(async (session) =>
    actions[action](actor, data, session),
  );
}
