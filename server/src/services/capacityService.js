import * as P2 from "../models/Part2.js";
import * as P3 from "../models/Part3.js";
import { calculateSuitability } from "./part3aService.js";
import { HttpError } from "../middleware/errorHandler.js";

// Union intervals first: overlapping availability must never create extra hours.
export function unionIntervals(intervals) {
  const sorted = intervals
    .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b) && b > a)
    .sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [a, b] of sorted) {
    const last = merged.at(-1);
    if (last && a <= last[1]) last[1] = Math.max(last[1], b);
    else merged.push([a, b]);
  }
  return merged;
}
export function freeHours(available, blocked, start, end) {
  const clip = (xs) =>
    xs.map(([a, b]) => [Math.max(a, start), Math.min(b, end)]);
  const windows = unionIntervals(clip(available)),
    exclusions = unionIntervals(clip(blocked));
  let total = 0;
  for (const [a, b] of windows) {
    let occupied = 0;
    for (const [c, d] of exclusions)
      occupied += Math.max(0, Math.min(b, d) - Math.max(a, c));
    total += b - a - occupied;
  }
  return Math.max(0, total / 3600000);
}
export async function capacityFor(batchId, inputs) {
  const batch = await P2.P2Batch.findById(batchId).lean();
  if (!batch) throw new HttpError(404, "Batch not found");
  if (!batch.sessions?.length)
    throw new HttpError(
      409,
      "Configure dated sessions and requirements before estimating capacity",
    );
  const start = new Date(inputs.start).getTime(),
    end = new Date(inputs.end).getTime();
  if (
    batch.sessions.some(
      (s) =>
        new Date(s.start).getTime() < start || new Date(s.end).getTime() > end,
    )
  )
    throw new HttpError(
      400,
      "Planning period must include every template session",
    );
  const sessions = [];
  for (const s of batch.sessions) {
    const suitability = await calculateSuitability(batch._id, s._id);
    sessions.push({
      session: s._id,
      title: s.title,
      start: s.start,
      end: s.end,
      durationHours: (new Date(s.end) - new Date(s.start)) / 3600000,
      suitability,
    });
  }
  const ids = [
    ...new Set(
      sessions.flatMap((s) =>
        s.suitability
          .filter((t) => t.status === "ELIGIBLE")
          .map((t) => String(t.trainer._id)),
      ),
    ),
  ];
  const trainerRows = [];
  for (const trainer of ids) {
    const availability = await P3.P3TrainerAvailability.find({
      trainer,
      start: { $lt: new Date(end) },
      end: { $gt: new Date(start) },
    }).lean();
    const assignments = await P3.P3TrainerAssignment.find({
      trainer,
      status: "ACTIVE",
      start: { $lt: new Date(end) },
      end: { $gt: new Date(start) },
    }).lean();
    const interval = (x) => [
      new Date(x.start).getTime(),
      new Date(x.end).getTime(),
    ];
    const positive = availability.filter((x) => x.available).map(interval);
    const blocked = [
      ...availability.filter((x) => !x.available),
      ...assignments,
    ].map(interval);
    const fact = sessions
      .flatMap((s) => s.suitability)
      .find((t) => String(t.trainer._id) === trainer);
    trainerRows.push({
      trainer,
      name: fact.trainer.name,
      recordedAvailableHours: freeHours(
        positive,
        availability.filter((x) => !x.available).map(interval),
        start,
        end,
      ),
      assignedHours: freeHours(assignments.map(interval), [], start, end),
      unallocatedHours: freeHours(positive, blocked, start, end),
    });
  }
  const competencies = batch.sessions.map(s => s.competency).filter(Boolean);
  const recordedDemandPeople = await P2.P2TrainingNeed.find({
    competencyGoals: { $in: competencies },
    status: { $in: ['SUBMITTED', 'RESUBMITTED', 'UNDER_REVIEW', 'APPROVED'] },
  }).distinct('beneficiary');
  const batchesRequired = Math.ceil(inputs.traineeCount / inputs.batchSize);
  const teachingHoursPerBatch =
    sessions.reduce((n, s) => n + s.durationHours, 0) *
    inputs.trainersPerSession;
  const requiredTeachingHours = batchesRequired * teachingHoursPerBatch;
  const unallocatedTeachingHours = trainerRows.reduce(
    (n, t) => n + t.unallocatedHours,
    0,
  );
  const sessionShortfalls = sessions
    .filter(
      (s) =>
        s.suitability.filter((t) => t.status === "ELIGIBLE").length <
        inputs.trainersPerSession,
    )
    .map((s) => s.title);
  return {
    calculatedAt: new Date(),
    batch: batch._id,
    batchName: batch.name,
    inputs,
    recordedDemandPeople: recordedDemandPeople.length,
    batchesRequired,
    teachingHoursPerBatch,
    requiredTeachingHours,
    unallocatedTeachingHours,
    estimatedHourCapacity: teachingHoursPerBatch
      ? Math.floor(unallocatedTeachingHours / teachingHoursPerBatch)
      : null,
    sessionShortfalls,
    trainers: trainerRows,
    sessions,
    definition:
      "Planning estimate, not a confirmed delivery schedule. Availability is de-duplicated and active assignments/unavailable periods are subtracted.",
    assumptions: [
      "Each repeated batch uses the template session durations and trainer count.",
      "All sessions must independently pass the existing suitability hard gates.",
      "Additional batch dates and cross-session scheduling feasibility have not been solved.",
      "Trainer count alone does not establish a shortage.",
    ],
    recommendedAction: sessionShortfalls.length
      ? "Review scheduling or plan trainer development"
      : unallocatedTeachingHours < requiredTeachingHours
        ? "Review teaching-hour availability"
        : "Review dates and explicitly assign trainers",
  };
}
