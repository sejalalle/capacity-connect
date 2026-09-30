import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import * as P2 from "../models/Part2.js";
import * as P3 from "../models/Part3.js";
import { DEMO_NAMESPACE } from "./demoPart2.js";

const synthetic = { isSynthetic: true, demoNamespace: DEMO_NAMESPACE };

export async function seedAssignedTrainees() {
  const admin = await User.findOne({ role: "admin" });
  if (!admin) throw new Error("Admin user not found");

  const trainer1 = await User.findOne({ email: "trainer1@example.test" });
  if (!trainer1) throw new Error("Trainer 1 not found");

  const batches = await P2.P2Batch.find({}).populate("course");
  if (!batches.length) throw new Error("No batches found");

  const role = await P2.P2JobRole.findOne({});
  const competency = await P2.P2Competency.findOne({});

  // 1. Grant trainer1 permissions on all batches
  for (const b of batches) {
    await P3.P3BatchPermission.findOneAndUpdate(
      { batch: b._id, user: trainer1._id },
      {
        $set: {
          batch: b._id,
          user: trainer1._id,
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
          reason: "Assigned faculty lead for batch delivery and trainee monitoring.",
          ...synthetic,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  // 2. Ensure each batch has 5 published learning modules so progress percentages calculate cleanly (20% per module)
  const batchModules = new Map();
  for (const b of batches.slice(0, 4)) {
    const existing = await P3.P3LearningModule.find({ batch: b._id, status: "PUBLISHED" });
    const modules = [...existing];
    for (let i = existing.length + 1; i <= 5; i++) {
      const m = await P3.P3LearningModule.create({
        course: b.course?._id || b.course,
        batch: b._id,
        order: i,
        title: `${b.course?.title || b.name} - Module ${i}`,
        summary: `Operational concepts and procedures for Module ${i}.`,
        status: "PUBLISHED",
        version: 1,
        createdBy: trainer1._id,
        ...synthetic,
      });
      modules.push(m);
    }
    batchModules.set(String(b._id), modules);
  }

  // 3. 12 assigned trainees from the reference design
  const traineeData = [
    { name: "Asha Verma", email: "asha.verma@imd.gov.in", employeeId: "IMD2345", dept: "Forecasting Division", batchIdx: 0, completedModules: 4, status: "Active" }, // 80%
    { name: "Rohit Mehta", email: "rohit.mehta@imd.gov.in", employeeId: "IMD2378", dept: "NWP Centre Delhi", batchIdx: 1, completedModules: 3, status: "Active" }, // 60%
    { name: "Kavya Nair", email: "kavya.nair@imd.gov.in", employeeId: "IMD2412", dept: "Climate Research", batchIdx: 2, completedModules: 2, status: "At Risk" }, // 40%
    { name: "Manish Singh", email: "manish.singh@imd.gov.in", employeeId: "IMD2450", dept: "Weather Services", batchIdx: 3, completedModules: 5, status: "Completed" }, // 100%
    { name: "Neha Sharma", email: "neha.s@imd.gov.in", employeeId: "IMD2465", dept: "Radar Centre Mumbai", batchIdx: 0, completedModules: 4, status: "Active" }, // 80%
    { name: "Arjun Rao", email: "arjun.rao@imd.gov.in", employeeId: "IMD2480", dept: "Aviation Division", batchIdx: 1, completedModules: 4, status: "Active" }, // 80%
    { name: "Pooja Patel", email: "pooja.p@imd.gov.in", employeeId: "IMD2495", dept: "Satellite Meteorology", batchIdx: 2, completedModules: 1, status: "At Risk" }, // 20%
    { name: "Vikram Das", email: "vikram.das@imd.gov.in", employeeId: "IMD2510", dept: "Forecasting Division", batchIdx: 3, completedModules: 5, status: "Completed" }, // 100%
    { name: "Suresh Kumar", email: "suresh.k@imd.gov.in", employeeId: "IMD2525", dept: "Hydrology Division", batchIdx: 0, completedModules: 4, status: "Active" }, // 80%
    { name: "Divya Iyer", email: "divya.iyer@imd.gov.in", employeeId: "IMD2540", dept: "Agrometeorology", batchIdx: 1, completedModules: 3, status: "Active" }, // 60%
    { name: "Karan Joshi", email: "karan.joshi@imd.gov.in", employeeId: "IMD2555", dept: "Nowcasting Unit", batchIdx: 2, completedModules: 2, status: "At Risk" }, // 40%
    { name: "Ananya Roy", email: "ananya.roy@imd.gov.in", employeeId: "IMD2570", dept: "Regional Centre Kolkata", batchIdx: 3, completedModules: 5, status: "Completed" }, // 100%
  ];

  const results = [];
  for (const t of traineeData) {
    let user = await User.findOne({ email: t.email });
    if (!user) {
      user = await User.create({
        name: t.name,
        email: t.email,
        password: "DemoOnly!2026",
        role: "trainee",
        accountStatus: "approved",
        department: t.dept,
        designation: "Meteorological Officer",
      });
    }

    const batch = batches[t.batchIdx % batches.length];

    // Ensure TrainingNeed
    const need = await P2.P2TrainingNeed.findOneAndUpdate(
      { beneficiary: user._id, targetJobRole: role?._id },
      {
        $set: {
          title: `Operational Development Need - ${t.name}`,
          description: "Approved training need for operational batch enrollment.",
          requestedBy: user._id,
          beneficiary: user._id,
          targetJobRole: role?._id,
          competencyGoals: competency ? [competency._id] : [],
          priority: "HIGH",
          status: "APPROVED",
          reviewedBy: admin._id,
          reviewedAt: new Date("2026-08-10"),
          reviewReason: "Approved training application.",
          ...synthetic,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Ensure Nomination
    const nomination = await P2.P2Nomination.findOneAndUpdate(
      { trainee: user._id, batch: batch._id },
      {
        $set: {
          trainee: user._id,
          course: batch.course?._id || batch.course,
          batch: batch._id,
          trainingNeed: need._id,
          ruleVersion: batch.ruleVersion || 1,
          reason: "Approved nomination for training batch.",
          eligibilitySnapshot: {
            status: "ELIGIBLE",
            ruleVersion: 1,
            checkedAt: new Date("2026-08-12"),
            checks: [],
            blockingReasons: [],
            missingInformation: [],
          },
          status: "APPROVED",
          submittedAt: new Date("2026-08-10"),
          reviewedAt: new Date("2026-08-12"),
          reviewedBy: admin._id,
          decisionReason: "Eligibility verified and admission approved.",
          revision: 1,
          ...synthetic,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Ensure Enrollment
    const enrollment = await P2.P2Enrollment.findOneAndUpdate(
      { trainee: user._id, batch: batch._id },
      {
        $set: {
          trainee: user._id,
          batch: batch._id,
          nomination: nomination._id,
          status: "CONFIRMED",
          admittedBy: admin._id,
          admittedAt: new Date("2026-08-15"),
          ...synthetic,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Record learning progress
    const modules = batchModules.get(String(batch._id)) || [];
    for (let i = 0; i < modules.length; i++) {
      const isCompleted = i < t.completedModules;
      await P3.P3LearningProgress.findOneAndUpdate(
        { enrollment: enrollment._id, module: modules[i]._id },
        {
          $set: {
            enrollment: enrollment._id,
            module: modules[i]._id,
            trainee: user._id,
            status: isCompleted ? "COMPLETED" : "NOT_STARTED",
            viewedAt: isCompleted ? new Date("2026-08-20") : null,
            completedAt: isCompleted ? new Date("2026-09-01") : null,
            ...synthetic,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    results.push({ trainee: user.name, batch: batch.name, completedModules: t.completedModules, status: t.status });
  }

  console.log(`Seeded ${results.length} assigned trainees across batches for trainer1.`);
  return results;
}

if (process.argv[1]?.endsWith("seedAssignedTrainees.js")) {
  try {
    await connectDB();
    await seedAssignedTrainees();
  } catch (err) {
    console.error("Failed to seed assigned trainees:", err);
  } finally {
    await mongoose.disconnect();
  }
}
