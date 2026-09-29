import User from "../models/User.js";

export const DEMO_REQUESTS = [
  {
    name: "Amit Sharma",
    email: "amit.sharma@imd.gov.in",
    role: "trainer",
    accountStatus: "pending",
    department: "Forecasting Division",
    designation: "Meteorologist Gr-II",
  },
  {
    name: "Neha Verma",
    email: "neha.verma@imd.gov.in",
    role: "trainer",
    accountStatus: "pending",
    department: "Regional Centre Mumbai",
    designation: "Senior Scientific Assistant",
  },
  {
    name: "Rohit Kumar",
    email: "rohit.kumar@imd.gov.in",
    role: "trainee",
    accountStatus: "pending",
    department: "Climate Research",
    designation: "Junior Research Fellow",
  },
  {
    name: "Kavya Nair",
    email: "kavya.nair@imd.gov.in",
    role: "trainer",
    accountStatus: "pending",
    department: "Observatory Services",
    designation: "Assistant Meteorologist",
  },
  {
    name: "Suresh Patel",
    email: "suresh.p@imd.gov.in",
    role: "trainee",
    accountStatus: "pending",
    department: "Administration & Logistics",
    designation: "Administrative Assistant",
  },
  {
    name: "Priya Singh",
    email: "priya.s@imd.gov.in",
    role: "trainer",
    accountStatus: "pending",
    department: "R&D Division",
    designation: "Meteorologist Gr-I",
  },
  {
    name: "Arjun Das",
    email: "arjun.d@imd.gov.in",
    role: "trainee",
    accountStatus: "pending",
    department: "Forecasting Division",
    designation: "Technical Officer",
  },
  {
    name: "Ankit Joshi",
    email: "ankit.j@imd.gov.in",
    role: "trainer",
    accountStatus: "rejected",
    department: "Observatories",
    designation: "Observatory Technician",
  },
  {
    name: "Sunita Rao",
    email: "sunita.rao@imd.gov.in",
    role: "trainee",
    accountStatus: "rejected",
    department: "Regional Centre Kolkata",
    designation: "Data Entry Operator",
  },
  {
    name: "Rajesh Gupta",
    email: "rajesh.g@imd.gov.in",
    role: "trainer",
    accountStatus: "rejected",
    department: "Satellite Division",
    designation: "Instrumentation Specialist",
  },
];

export async function seedRegistrationRequests() {
  const password = "DemoOnly!2026";
  const results = [];
  for (const item of DEMO_REQUESTS) {
    let user = await User.findOne({ email: item.email });
    if (!user) {
      user = await User.create({
        ...item,
        password,
      });
      results.push({ email: user.email, status: user.accountStatus, created: true });
    } else {
      user.accountStatus = item.accountStatus;
      user.role = item.role;
      user.department = item.department;
      user.designation = item.designation;
      await user.save();
      results.push({ email: user.email, status: user.accountStatus, created: false });
    }
  }
  return results;
}
