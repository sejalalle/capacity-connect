import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import * as P2 from "../models/Part2.js";
import * as P3 from "../models/Part3.js";
import { DEMO_NAMESPACE } from "./demoPart2.js";

const synthetic = { isSynthetic: true, demoNamespace: DEMO_NAMESPACE };

export async function seedTrainerEvaluationsAndEvidence() {
  const admin = await User.findOne({ role: "admin" });
  if (!admin) throw new Error("Admin user not found");

  const trainer1 = await User.findOne({ email: "trainer1@example.test" });
  const trainer2 = await User.findOne({ email: "trainer2@example.test" });
  if (!trainer1) throw new Error("Trainer 1 not found");

  const batches = await P2.P2Batch.find({}).populate("course");
  if (!batches.length) throw new Error("No batches found");
  const primaryBatch = batches[0];
  const secondaryBatch = batches[1] || batches[0];

  const competencies = await P2.P2Competency.find({});
  const compRadar = competencies.find((c) => c.name?.includes("Radar")) || competencies[0];
  const compNwp = competencies.find((c) => c.name?.includes("NWP")) || competencies[1] || competencies[0];
  const compNowcast = competencies.find((c) => c.name?.includes("Nowcast") || c.name?.includes("Severe")) || competencies[0];

  const ruleVersion = await P2.P2CourseRuleVersion.findOne({}) || null;

  // 1. Grant batch permissions to both trainers with REVIEW_EVIDENCE and EVALUATE_SUBMISSION
  const trainerIds = [trainer1._id, trainer2?._id].filter(Boolean);
  for (const tId of trainerIds) {
    for (const b of batches) {
      await P3.P3BatchPermission.findOneAndUpdate(
        { batch: b._id, user: tId },
        {
          $set: {
            batch: b._id,
            user: tId,
            actions: [
              "CREATE_ASSESSMENT",
              "EVALUATE_SUBMISSION",
              "PUBLISH_RESULT",
              "MANAGE_LEARNING",
              "MANAGE_QUESTION_BANK",
              "REVIEW_EVIDENCE",
              "DECIDE_COMPETENCY",
              "MANAGE_FOLLOW_UP",
              "USE_AI",
            ],
            grantedBy: admin._id,
            reason: "Designated faculty reviewer and evaluator for batch.",
            ...synthetic,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
  }

  // 2. Create / update Assessments with rubrics and assigned evaluators
  const assessmentConfigs = [
    {
      title: "Advanced Doppler Radar Velocity Analysis & De-aliasing",
      batch: primaryBatch._id,
      course: primaryBatch.course?._id || primaryBatch.course,
      type: "PRACTICAL",
      status: "PUBLISHED",
      instructions: "Perform volume velocity processing (VVP) and radial velocity de-aliasing across multi-tilt radar datasets.",
      competency: compRadar?._id,
      frameworkVersion: 1,
      rubricVersion: "SYN-RAD-VVP-RUBRIC-v1",
      maxScore: 100,
      passingScore: 60,
      assignedEvaluators: trainerIds,
      rubric: [
        { criterionId: "VELOCITY_DEALIASING", label: "Velocity De-aliasing & Nyquist Interval", description: "Accurate dual-PRF phase correction without folding artifacts", maxMarks: 30 },
        { criterionId: "MESOCYCLONE_SIGNATURE", label: "Mesocyclone & Shear Signature Detection", description: "Recognition of rotational couplets and gate-to-gate shear", maxMarks: 35 },
        { criterionId: "NOWCASTING_BULLETIN", label: "Operational Advisory & Safety Bulletin", description: "Timely formatting of aviation and public weather alerts", maxMarks: 35 },
      ],
    },
    {
      title: "Monsoon Squall Line & Microburst Hazard Practical",
      batch: primaryBatch._id,
      course: primaryBatch.course?._id || primaryBatch.course,
      type: "PRACTICAL",
      status: "PUBLISHED",
      instructions: "Identify convective gust fronts, downburst velocity divergence, and draft terminal aerodrome warnings.",
      competency: compNowcast?._id,
      frameworkVersion: 1,
      rubricVersion: "SYN-SQUALL-RUBRIC-v1",
      maxScore: 100,
      passingScore: 65,
      assignedEvaluators: trainerIds,
      rubric: [
        { criterionId: "CONVECTIVE_STRUCTURE", label: "Convective Storm Structure & Bow Echo", description: "Identification of rear-inflow jets and reflectivity gradient", maxMarks: 30 },
        { criterionId: "DOWNDRAFT_DIVERGENCE", label: "Surface Outflow & Microburst Detection", description: "Calculation of radial divergence velocities at lowest tilt", maxMarks: 40 },
        { criterionId: "SAFETY_ADVISORY", label: "Aerodrome Warning & Lead Time", description: "Communication of flight safety hazards with >25 min lead time", maxMarks: 30 },
      ],
    },
    {
      title: "NWP Ensemble Guidance & Mesoscale Model Evaluation",
      batch: secondaryBatch._id,
      course: secondaryBatch.course?._id || secondaryBatch.course,
      type: "WRITTEN_ASSIGNMENT",
      status: "PUBLISHED",
      instructions: "Critique high-resolution mesoscale model outputs against operational AWS observations.",
      competency: compNwp?._id,
      frameworkVersion: 1,
      rubricVersion: "SYN-NWP-MESO-RUBRIC-v1",
      maxScore: 100,
      passingScore: 60,
      assignedEvaluators: trainerIds,
      rubric: [
        { criterionId: "ENSEMBLE_SPREAD", label: "Ensemble Spread vs Skill Analysis", description: "Interpretation of forecast uncertainty plumes and clustering", maxMarks: 35 },
        { criterionId: "OROGRAPHIC_CORRECTION", label: "Orographic Bias Assessment", description: "Accounting for terrain effects along Western Ghats / Himalayas", maxMarks: 35 },
        { criterionId: "SYNOPTIC_SYNTHESIS", label: "Synoptic Synthesis & Final Forecast", description: "Coherent forecast discussion integrating satellite and radar data", maxMarks: 30 },
      ],
    },
    {
      title: "Aviation Weather Hazard Assessment & METAR/SIGMET Task",
      batch: secondaryBatch._id,
      course: secondaryBatch.course?._id || secondaryBatch.course,
      type: "PRACTICAL",
      status: "PUBLISHED",
      instructions: "Issue operational aviation weather briefings, TAF, SPECI, and en-route SIGMET advisories.",
      competency: compNowcast?._id,
      frameworkVersion: 1,
      rubricVersion: "SYN-AVI-HAZARD-v1",
      maxScore: 100,
      passingScore: 70,
      assignedEvaluators: trainerIds,
      rubric: [
        { criterionId: "OBSERVATION_MONITORING", label: "Continuous Aerodrome Weather Monitoring", description: "Detection of threshold exceedances (visibility, RVR, cloud base)", maxMarks: 30 },
        { criterionId: "SIGMET_DISSEMINATION", label: "SIGMET / AIRMET Dissemination Accuracy", description: "Compliance with ICAO Annex 3 formatting and validity standards", maxMarks: 40 },
        { criterionId: "AIRLINE_BRIEFING", label: "Flight Crew Briefing Coherence", description: "Clarity in communicating hazardous turbulence and icing zones", maxMarks: 30 },
      ],
    },
    {
      title: "Doppler Radar Volume Velocity Processing (VVP) Knowledge Check",
      batch: primaryBatch._id,
      course: primaryBatch.course?._id || primaryBatch.course,
      type: "MCQ",
      status: "PUBLISHED",
      instructions: "Core theoretical principles of radar reflectivity, Doppler velocity equations, and clutter mitigation.",
      competency: compRadar?._id,
      frameworkVersion: 1,
      maxScore: 100,
      passingScore: 75,
      assignedEvaluators: trainerIds,
      rubric: [],
    },
  ];

  const createdAssessments = [];
  for (const cfg of assessmentConfigs) {
    let assess = await P3.P3Assessment.findOne({ title: cfg.title, batch: cfg.batch });
    if (!assess) {
      assess = await P3.P3Assessment.create({
        ...cfg,
        ruleVersion: ruleVersion?._id || null,
        createdBy: admin._id,
        version: 1,
        opensAt: new Date(Date.now() - 14 * 86400000),
        closesAt: new Date(Date.now() + 30 * 86400000),
        durationMinutes: 90,
        ...synthetic,
      });
    } else {
      assess.assignedEvaluators = trainerIds;
      assess.rubric = cfg.rubric;
      assess.status = "PUBLISHED";
      await assess.save();
    }
    createdAssessments.push(assess);
  }

  // Also ensure existing assessments include trainerIds
  await P3.P3Assessment.updateMany(
    {},
    { $addToSet: { assignedEvaluators: { $each: trainerIds } } }
  );

  // 3. Find confirmed enrollments
  const enrollments = await P2.P2Enrollment.find({ status: "CONFIRMED" })
    .populate("trainee")
    .sort({ admittedAt: -1 })
    .limit(12);

  if (enrollments.length === 0) {
    console.log("No confirmed enrollments found, cannot seed submissions.");
    return;
  }

  const assessVVP = createdAssessments[0];
  const assessSquall = createdAssessments[1];
  const assessNWP = createdAssessments[2];
  const assessAviation = createdAssessments[3];
  const assessMCQ = createdAssessments[4];

  // 4. Seed Submissions & Evaluations
  const submissionDefs = [
    {
      enrollmentIdx: 0,
      assessment: assessVVP,
      status: "SUBMITTED",
      version: 1,
      submittedAt: new Date(Date.now() - 1 * 86400000),
      responseText: "Comprehensive Doppler velocity volume scan (VVP) completed for 10 elevation cuts. De-aliased radial velocity field using dual-PRF algorithm. Identified cyclonic shear signature at 3.5 km altitude (azimuth 245°, range 48 km). Attached operational analysis log and wind profile hodograph for Delhi-NCR radar sector.",
    },
    {
      enrollmentIdx: 1,
      assessment: assessSquall,
      status: "SUBMITTED",
      version: 1,
      submittedAt: new Date(Date.now() - 2 * 86400000),
      responseText: "Analyzed radar reflectivity gradient exceeding 52 dBZ along active squall line. Detected divergent outflow signature at surface level indicating dry microburst with estimated peak gusts of 48 knots. Drafted nowcasting alert for Delhi aviation corridor with 30-minute advance lead time.",
    },
    {
      enrollmentIdx: 2,
      assessment: assessNWP,
      status: "UNDER_EVALUATION",
      version: 1,
      submittedAt: new Date(Date.now() - 3 * 86400000),
      responseText: "Evaluated 12km NCUM and WRF mesoscale ensemble plumes for Konkan coast convective precipitation. Calculated ensemble probability of precipitation (>65mm) at 78%. Noted orographic enhancement bias over Western Ghats windward slopes and applied empirical downscaling adjustment.",
    },
    {
      enrollmentIdx: 3,
      assessment: assessAviation,
      status: "EVALUATED",
      version: 1,
      submittedAt: new Date(Date.now() - 5 * 86400000),
      responseText: "Issued simulated SIGMET for severe turbulence and embedded CB between FL180 and FL340 over Nagpur FIR. Prepared aerodrome special report (SPECI) following visibility drop below 800m during thunderstorm squall. Validated with pilot weather reports (PIREPs).",
      eval: {
        score: 88,
        outcome: "PASS",
        comments: "Exemplary operational SIGMET formulation. Accurate delineation of thunderstorm flight hazards and clear communication with air traffic controllers.",
        criterionMarks: [
          { criterionId: "OBSERVATION_MONITORING", marks: 27, comment: "Timely detection of RVR threshold drop." },
          { criterionId: "SIGMET_DISSEMINATION", marks: 36, comment: "Strict compliance with ICAO Annex 3 formatting." },
          { criterionId: "AIRLINE_BRIEFING", marks: 25, comment: "Clear, concise flight crew safety packet." },
        ],
      },
    },
    {
      enrollmentIdx: 4,
      assessment: assessVVP,
      status: "EVALUATED",
      version: 1,
      submittedAt: new Date(Date.now() - 6 * 86400000),
      responseText: "Processed radar volume dataset for coastal supercell cell. Successfully resolved folded radial velocities in high-shear sector. Confirmed hook echo signature and BWER on RHI cross-section. Provided emergency briefing to state disaster management authority.",
      eval: {
        score: 93,
        outcome: "PASS",
        comments: "Outstanding radar analysis. Excellent de-aliasing technique and precise mesocyclone classification under high clutter environment.",
        criterionMarks: [
          { criterionId: "VELOCITY_DEALIASING", marks: 28, comment: "Flawless dual-PRF correction." },
          { criterionId: "MESOCYCLONE_SIGNATURE", marks: 33, comment: "Accurate rotational shear calculation." },
          { criterionId: "NOWCASTING_BULLETIN", marks: 32, comment: "High-priority warning issued with high confidence." },
        ],
      },
    },
    {
      enrollmentIdx: 5,
      assessment: assessSquall,
      status: "RETURNED_FOR_REVISION",
      version: 1,
      submittedAt: new Date(Date.now() - 4 * 86400000),
      responseText: "Initial microburst analysis submitted. Identified bow echo pattern on radar PPI scan. Evaluated surface wind speed from automated station anemometer data.",
      eval: {
        score: 52,
        outcome: "REVISION_REQUIRED",
        comments: "Please include the vertical velocity profile (RHI) to corroborate surface outflow divergence and provide estimated lead time before the squall front reaches runway threshold.",
        criterionMarks: [
          { criterionId: "CONVECTIVE_STRUCTURE", marks: 20, comment: "Bow echo recognized, but weak cross-section analysis." },
          { criterionId: "DOWNDRAFT_DIVERGENCE", marks: 18, comment: "Lacked radial velocity divergence calculation." },
          { criterionId: "SAFETY_ADVISORY", marks: 14, comment: "Lead time was not explicitly calculated." },
        ],
      },
    },
    {
      enrollmentIdx: 6,
      assessment: assessMCQ,
      status: "EVALUATED",
      version: 1,
      submittedAt: new Date(Date.now() - 7 * 86400000),
      responseText: "Completed 25-question Doppler Radar Knowledge Check on SAMARTHYA Assessment Engine. Score: 23/25 (92%).",
    },
    {
      enrollmentIdx: 7,
      assessment: assessAviation,
      status: "SUBMITTED",
      version: 1,
      submittedAt: new Date(Date.now() - 12 * 3600000),
      responseText: "Operational evaluation for Low-Level Wind Shear (LLWS) alerting system. Formatted aerodrome warning package for Indira Gandhi International Airport during severe pre-monsoon squall event.",
    },
  ];

  for (const sDef of submissionDefs) {
    const enr = enrollments[sDef.enrollmentIdx % enrollments.length];
    if (!enr || !sDef.assessment) continue;

    let sub = await P3.P3AssessmentSubmission.findOne({
      enrollment: enr._id,
      assessment: sDef.assessment._id,
      version: sDef.version,
    });

    if (!sub) {
      sub = await P3.P3AssessmentSubmission.create({
        enrollment: enr._id,
        assessment: sDef.assessment._id,
        trainee: enr.trainee?._id || enr.trainee,
        version: sDef.version,
        responseText: sDef.responseText,
        submittedAt: sDef.submittedAt,
        status: sDef.status,
        ...synthetic,
      });
    } else {
      sub.responseText = sDef.responseText;
      sub.status = sDef.status;
      sub.submittedAt = sDef.submittedAt;
      await sub.save();
    }

    if (sDef.eval) {
      await P3.P3HumanEvaluation.findOneAndUpdate(
        { submission: sub._id, version: sDef.version },
        {
          $set: {
            submission: sub._id,
            assessment: sDef.assessment._id,
            evaluator: trainer1._id,
            version: sDef.version,
            status: sDef.status === "EVALUATED" ? "EVALUATED" : "RETURNED_FOR_REVISION",
            score: sDef.eval.score,
            outcome: sDef.eval.outcome,
            comments: sDef.eval.comments,
            criterionMarks: sDef.eval.criterionMarks,
            evaluatedAt: new Date(sDef.submittedAt.getTime() + 4 * 3600000),
            ...synthetic,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
  }

  // 5. Seed Competency Evidence records assigned to trainer1 & trainer2
  const evidenceDefs = [
    {
      traineeIdx: 0,
      evidenceKey: "EV-RAD-2026-AV01",
      evidenceType: "PRACTICAL_TASK",
      competency: compRadar,
      status: "UNDER_REVIEW",
      submittedAt: new Date(Date.now() - 2 * 86400000),
      description: "Operational Doppler Weather Radar scan analysis during Western Disturbance squall line passage over North India. Included CAPPI, RHI, and raw reflectivity datasets verified against ground truth rainfall.",
    },
    {
      traineeIdx: 1,
      evidenceKey: "EV-NOW-2026-RM02",
      evidenceType: "PROJECT",
      competency: compNowcast,
      status: "UNDER_REVIEW",
      submittedAt: new Date(Date.now() - 3 * 86400000),
      description: "Development of automated 30-minute lead-time heavy rainfall nowcasting warning matrix for urban catchment flood risk reduction in NCR region.",
    },
    {
      traineeIdx: 2,
      evidenceKey: "EV-AVI-2026-KN03",
      evidenceType: "PRACTICAL_TASK",
      competency: compNowcast,
      status: "UNDER_REVIEW",
      submittedAt: new Date(Date.now() - 4 * 86400000),
      description: "Severe weather briefing package and real-time SIGMET issuance for international flight corridors during cyclone Nilam transit.",
    },
    {
      traineeIdx: 3,
      evidenceKey: "EV-NWP-2026-MS04",
      evidenceType: "CERTIFICATE",
      competency: compNwp,
      status: "VERIFIED",
      submittedAt: new Date(Date.now() - 10 * 86400000),
      reviewedAt: new Date(Date.now() - 4 * 86400000),
      reviewedBy: trainer1._id,
      reviewReason: "Verified against WMO competency standard and IMD operational guidelines.",
      reviewComments: "Valid credential from ECMWF training institute demonstrating operational competence in high-resolution ensemble interpretation.",
      description: "WMO/ECMWF Advanced Numerical Weather Prediction & High-Resolution Ensemble Interpretation Specialist Certification.",
    },
    {
      traineeIdx: 4,
      evidenceKey: "EV-SAT-2026-PS05",
      evidenceType: "TRAINER_RECOMMENDATION",
      competency: compNowcast,
      status: "VERIFIED",
      submittedAt: new Date(Date.now() - 8 * 86400000),
      reviewedAt: new Date(Date.now() - 3 * 86400000),
      reviewedBy: trainer1._id,
      reviewReason: "Demonstrated consistent L4 proficiency during operational monsoon duty shifts.",
      reviewComments: "Faculty commendation for operational excellence during rapid-scan INSAT-3DR convective storm tracking and cloud-top cooling analysis.",
      description: "Faculty commendation and supervisor endorsement for exceptional convective storm nowcasting performance during monsoon deployment.",
    },
    {
      traineeIdx: 5,
      evidenceKey: "EV-CYC-2026-AP06",
      evidenceType: "PROJECT",
      competency: compRadar,
      status: "NEEDS_REVISION",
      submittedAt: new Date(Date.now() - 5 * 86400000),
      reviewedAt: new Date(Date.now() - 2 * 86400000),
      reviewedBy: trainer1._id,
      reviewReason: "Missing IR temperature calibration curve and central pressure derivation steps.",
      reviewComments: "Please provide satellite IR temperature threshold calibrations for T-number justification before verification can proceed.",
      description: "Tropical Cyclone Dvorak technique satellite intensity estimation log and central pressure derivation exercise for Arabian Sea deep depression.",
    },
    {
      traineeIdx: 6,
      evidenceKey: "EV-RAD-2026-SK07",
      evidenceType: "ASSESSMENT",
      competency: compRadar,
      status: "VERIFIED",
      submittedAt: new Date(Date.now() - 12 * 86400000),
      reviewedAt: new Date(Date.now() - 6 * 86400000),
      reviewedBy: trainer1._id,
      reviewReason: "Verified practical assessment score of 94% on Doppler calibration testbed.",
      reviewComments: "Demonstrated mastery in dual-polarization radar parameters (ZDR, KDP, RhoHV) and hydrometeor classification.",
      description: "Independent evaluation board score verification for Advanced Doppler Radar calibration & dual-pol metrics.",
    },
    {
      traineeIdx: 7,
      evidenceKey: "EV-HYD-2026-DJ08",
      evidenceType: "OTHER",
      competency: compNowcast,
      status: "UNDER_REVIEW",
      submittedAt: new Date(Date.now() - 1 * 86400000),
      description: "Field deployment report on Automated Weather Station (AWS) sensor cross-calibration and quantitative precipitation estimate (QPE) validation against tipping bucket rain gauges.",
    },
  ];

  for (const evDef of evidenceDefs) {
    const enr = enrollments[evDef.traineeIdx % enrollments.length];
    if (!enr) continue;
    const traineeUser = enr.trainee?._id ? enr.trainee : await User.findById(enr.trainee);
    if (!traineeUser) continue;

    await P3.P3Evidence.findOneAndUpdate(
      { owner: traineeUser._id, evidenceKey: evDef.evidenceKey },
      {
        $set: {
          owner: traineeUser._id,
          enrollment: enr._id,
          evidenceKey: evDef.evidenceKey,
          version: 1,
          evidenceType: evDef.evidenceType,
          claimedCompetencies: [
            {
              competency: evDef.competency?._id || compRadar?._id,
              frameworkVersion: 1,
              rubricVersion: "SYN-RUBRIC-v1",
              targetLevel: 3,
            },
          ],
          competency: evDef.competency?._id || compRadar?._id,
          frameworkVersion: 1,
          rubricVersion: "SYN-RUBRIC-v1",
          status: evDef.status,
          submittedAt: evDef.submittedAt,
          description: evDef.description,
          assignedReviewer: trainer1._id,
          reviewedBy: evDef.reviewedBy || null,
          reviewedAt: evDef.reviewedAt || null,
          reviewComments: evDef.reviewComments || null,
          reviewReason: evDef.reviewReason || null,
          ...synthetic,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  console.log(`Successfully seeded ${createdAssessments.length} assessments, ${submissionDefs.length} submissions, and ${evidenceDefs.length} evidence records for trainer workspace.`);
}

if (process.argv[1]?.endsWith("seedTrainerEvaluationsAndEvidence.js")) {
  await connectDB();
  await seedTrainerEvaluationsAndEvidence();
  await mongoose.disconnect();
}
