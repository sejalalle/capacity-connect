import {
  LayoutDashboard,
  Fingerprint,
  ChartNoAxesColumnIncreasing,
  Route,
  Library,
  Users,
  Bell,
  UserRound,
  ShieldCheck,
  Building2,
  CalendarDays,
  ScrollText,
  ClipboardCheck,
  UserCheck,
  Clock3,
  BookOpenCheck,
  ListChecks,
  FileCheck2,
  History,
  BrainCircuit,
  Activity,
} from "lucide-react";

export const navigationGroups = {
  trainee: [
    {
      group: "Overview",
      items: [["Dashboard", "", LayoutDashboard]],
    },
    {
      group: "My Capability",
      items: [
        ["Competency Passport", "competency-passport", Fingerprint],
        ["Skill Gaps", "skill-gaps", ChartNoAxesColumnIncreasing],
        ["Competency History", "competency-history", History],
        ["Skill Suggestions", "skill-suggestions", BrainCircuit],
      ],
    },
    {
      group: "Learning & Training",
      items: [
        ["Training Needs", "training-needs", Route],
        ["Learning Paths", "learning-paths", Route],
        ["Courses", "courses", Library],
        ["My Nominations", "nominations", ShieldCheck],
        ["Training Calendar", "calendar", CalendarDays],
        ["My Learning", "learning", BookOpenCheck],
      ],
    },
    {
      group: "Assessments & Evidence",
      items: [
        ["Assessments", "assessments", ClipboardCheck],
        ["Published Results", "results", ShieldCheck],
        ["Evidence", "evidence", FileCheck2],
        ["Follow-up Actions", "follow-ups", Route],
      ],
    },
    {
      group: "Account",
      items: [
        ["Notifications", "notifications", Bell],
        ["Profile", "profile", UserRound],
      ],
    },
  ],
  trainer: [
    {
      group: "Overview",
      items: [["Dashboard", "", LayoutDashboard]],
    },
    {
      group: "Course Management",
      items: [
        ["My Courses", "courses", Library],
        ["Training Calendar", "calendar", CalendarDays],
        ["Learning Resources", "learning", BookOpenCheck],
        ["Question Bank", "question-bank", ListChecks],
        ["Assessments", "assessments", ClipboardCheck],
      ],
    },
    {
      group: "Delivery & Review",
      items: [
        ["Assigned Batches", "assigned-batches", UserCheck],
        ["Availability", "availability", Clock3],
        ["Evaluation Queue", "evaluations", ClipboardCheck],
        ["Published Results", "results", ShieldCheck],
        ["Evidence Review", "evidence-review", FileCheck2],
        ["Competency Decisions", "competency-decisions", Fingerprint],
      ],
    },
    {
      group: "Tools & Account",
      items: [
        ["Follow-up Actions", "follow-ups", Route],
        ["AI Question Drafts", "ai-question-drafts", BrainCircuit],
        ["Trainer Profile & Expertise", "trainer-profile", UserRound],
        ["Account Profile", "profile", UserRound],
        ["Notifications", "notifications", Bell],
      ],
    },
  ],
  admin: [
    {
      group: "Overview",
      items: [["Dashboard", "", LayoutDashboard]],
    },
    {
      group: "People & Capability",
      items: [
        ["Users", "users", Users],
        ["Competency Framework", "competencies", Fingerprint],
        ["Job Role Requirements", "job-role-requirements", Building2],
        ["Organizational Capability", "organizational-capability", Building2],
      ],
    },
    {
      group: "Training",
      items: [
        ["Training Needs", "training-needs", Route],
        ["Learning Paths", "learning-paths", Route],
        ["Courses", "courses", Library],
        ["Batches", "batches", CalendarDays],
        ["Nominations", "nominations", ShieldCheck],
        ["Training Calendar", "calendar", CalendarDays],
      ],
    },
    {
      group: "Delivery & Review",
      items: [
        ["Trainer Discovery", "trainer-discovery", UserCheck],
        ["Assignment Management", "trainer-assignments", UserCheck],
        ["Assessment Oversight", "assessments", ClipboardCheck],
        ["Evaluator Queue", "evaluations", ClipboardCheck],
        ["Result Publication", "results", ShieldCheck],
        ["Review Oversight", "review-oversight", FileCheck2],
      ],
    },
    {
      group: "Insights & Records",
      items: [
        ["Follow-up Oversight", "follow-up-oversight", Route],
        ["AI Activity", "ai-activity", Activity],
        ["Audit Logs", "audit-logs", ScrollText],
        ["Notifications", "notifications", Bell],
        ["Profile", "profile", UserRound],
      ],
    },
  ],
};

// Flattened navigation for router compatibility
export const navigation = {
  trainee: navigationGroups.trainee.flatMap((g) => g.items),
  trainer: navigationGroups.trainer.flatMap((g) => g.items),
  admin: navigationGroups.admin.flatMap((g) => g.items),
};
