import * as P3 from "../models/Part3.js";
import { capabilityReport } from "./part3bService.js";

const ACTIVE_TTT_STATES = [
  "NOMINATED",
  "ACCEPTED",
  "IN_PROGRESS",
  "TEACHING_PRACTICE",
  "EVALUATED",
];

// Training demand is the explicit middle link between an organizational
// capability gap and trainer capacity: how many people need development in a
// competency, and does recorded trainer supply cover that demand?
export async function demandReport(actor, filters = {}) {
  const capability = await capabilityReport(actor, filters);
  const rows = capability.coverage.map((item) => {
    const requiredHeadcount = item.denominator || 0;
    const verifiedHeadcount = item.meetingCount || 0;
    const gapHeadcount = Math.max(0, requiredHeadcount - verifiedHeadcount);
    const availableTrainers = item.availableTrainerCount;
    const trainerCapacityGap =
      gapHeadcount > 0 &&
      availableTrainers != null &&
      availableTrainers < gapHeadcount;
    return {
      competency: item.competency,
      jobRole: item.jobRole,
      frameworkVersion: item.frameworkVersion,
      requiredLevel: item.requiredLevel,
      requiredHeadcount,
      verifiedHeadcount,
      gapHeadcount,
      belowRequiredCount: item.belowRequiredCount,
      notAssessedCount: item.notAssessedCount,
      pendingNeeds: item.pendingTrainingDemand,
      eligibleTrainers: item.reviewedTrainerCount,
      availableTrainers,
      trainerCapacityGap,
      recommendedAction:
        gapHeadcount === 0
          ? "Recorded coverage meets the requirement"
          : trainerCapacityGap
            ? "Nominate subject experts for Train-the-Trainer to expand trainer capacity"
            : "Plan a batch and assign an eligible trainer",
    };
  });
  const actionable = rows.filter(
    (row) => row.gapHeadcount > 0 || row.pendingNeeds > 0,
  );
  const tttInProgress = await P3.P3TTTNomination.countDocuments({
    status: { $in: ACTIVE_TTT_STATES },
  });
  return {
    calculatedAt: new Date(),
    scope: capability.scope,
    summary: {
      competenciesWithDemand: actionable.filter((r) => r.gapHeadcount > 0).length,
      totalPeopleNeedingDevelopment: rows.reduce(
        (n, r) => n + r.gapHeadcount,
        0,
      ),
      competenciesWithTrainerCapacityGap: rows.filter(
        (r) => r.trainerCapacityGap,
      ).length,
      tttInProgress,
    },
    rows: actionable,
    definition:
      "Headcount below the configured job-role requirement, derived from stored reviewed evidence. This is a training-demand artifact, not a predictive forecast or a claim about unrecorded expertise.",
    chain:
      "Organizational capability gap → training demand → trainer capacity → Train-the-Trainer → verified trainers",
    label: "Application-level analytical indicators — proposed rules",
  };
}
