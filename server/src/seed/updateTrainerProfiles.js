import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";

export const TRAINER_PROFILES = [
  {
    email: "trainer1@example.test",
    designation: "Senior Meteorological Instructor & Radar Lead",
    department: "Synthetic Training Faculty",
    phone: "+91 98112 34567",
    qualifications: [
      "Ph.D. in Atmospheric Sciences, IIT Delhi",
      "M.Sc. Meteorology & Oceanography",
      "WMO Certified Radar Specialist"
    ],
    skills: [
      "Radar Product Interpretation",
      "Numerical Weather Prediction",
      "Practical Rubric Evaluation",
      "Nowcasting & Warning Systems"
    ],
    interests: [
      "Doppler Radar Diagnostics",
      "Severe Weather Warnings",
      "Faculty Capability Building"
    ],
    workExperience: [
      {
        organization: "Indian Meteorological Department",
        role: "Senior Meteorological Faculty & Instructor",
        from: new Date("2018-06-15"),
        to: null
      },
      {
        organization: "Regional Meteorological Centre",
        role: "Radar Meteorologist & Operational Forecaster",
        from: new Date("2012-08-01"),
        to: new Date("2018-05-31")
      }
    ],
    certificates: [
      {
        title: "Master Trainer Certification in Doppler Weather Radar",
        issuedBy: "WMO / IMD Central Training Faculty",
        date: new Date("2021-03-15")
      }
    ]
  },
  {
    email: "trainer2@example.test",
    designation: "Chief Meteorological Specialist & Faculty",
    department: "Synthetic Training Faculty",
    phone: "+91 98112 45678",
    qualifications: [
      "M.Tech in Atmospheric Physics",
      "WMO Certified Nowcasting Expert"
    ],
    skills: [
      "Severe Weather Analysis",
      "Radar Product Interpretation",
      "Nowcasting Protocols",
      "Aviation Meteorology"
    ],
    interests: [
      "Tropical Cyclone Tracking",
      "Mesoscale Modeling",
      "Training Methodology"
    ],
    workExperience: [
      {
        organization: "Indian Meteorological Department",
        role: "Chief Training Faculty",
        from: new Date("2016-01-10"),
        to: null
      }
    ],
    certificates: [
      {
        title: "Advanced Meteorological Instruction Diploma",
        issuedBy: "IMD Training Directorate",
        date: new Date("2019-11-20")
      }
    ]
  },
  {
    email: "trainer3@example.test",
    designation: "NWP & Satellite Meteorology Instructor",
    department: "Synthetic Training Faculty",
    phone: "+91 98112 56789",
    qualifications: [
      "Ph.D. in Numerical Weather Modeling",
      "M.Sc. Physics"
    ],
    skills: [
      "Numerical Weather Prediction Interpretation",
      "Satellite Meteorology",
      "Model Verification",
      "Practical Assessment"
    ],
    interests: [
      "High-Resolution NWP Diagnostics",
      "Ensemble Prediction Systems",
      "Technical Curriculum Design"
    ],
    workExperience: [
      {
        organization: "Indian Meteorological Department",
        role: "Lead NWP Instructor",
        from: new Date("2019-09-01"),
        to: null
      }
    ],
    certificates: [
      {
        title: "Certified Lead Evaluator in Numerical Meteorology",
        issuedBy: "WMO Regional Training Centre",
        date: new Date("2022-05-18")
      }
    ]
  }
];

export async function updateTrainerProfiles() {
  const results = [];
  for (const item of TRAINER_PROFILES) {
    const user = await User.findOne({ email: item.email });
    if (user) {
      user.designation = item.designation;
      user.department = item.department;
      user.phone = item.phone;
      user.qualifications = item.qualifications;
      user.skills = item.skills;
      user.interests = item.interests;
      user.workExperience = item.workExperience;
      user.certificates = item.certificates;
      await user.save();
      results.push({ email: user.email, designation: user.designation, updated: true });
    }
  }
  return results;
}

if (process.argv[1]?.endsWith("updateTrainerProfiles.js")) {
  try {
    await connectDB();
    const res = await updateTrainerProfiles();
    console.log("Updated trainer profiles:", res);
  } catch (err) {
    console.error("Failed to update trainer profiles:", err);
  } finally {
    await mongoose.disconnect();
  }
}
