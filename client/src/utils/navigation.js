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
  CheckCircle2,
  UserCheck,
  Clock3,
  BookOpenCheck,
  ListChecks,
  FileCheck2,
  History,
  BrainCircuit,
  Activity,
  Award,
  Megaphone,
  Video,
  TrendingUp,
} from "lucide-react";

export const navigationGroups = {
  trainee: [
    {
      group: "HOME",
      items: [["Dashboard", "", LayoutDashboard]],
    },
    {
      group: "MY PROFILE",
      items: [
        ["Personal Profile", "profile", UserRound],
        ["Qualifications & Experience", "profile", Building2],
        ["Skills & Expertise", "profile", Fingerprint],
        ["Certifications & Training", "profile", Award],
      ],
    },
    {
      group: "MY COMPETENCIES",
      items: [
        ["Role & Requirements", "competency-passport", Fingerprint],
        ["My Capability", "competency-history", History],
        ["Skill Gap", "skill-gaps", ChartNoAxesColumnIncreasing],
        ["Development", "learning-paths", Route],
      ],
    },
    {
      group: "MY LEARNING",
      items: [
        ["Explore Courses", "courses", Library],
        ["My Courses", "nominations", BookOpenCheck],
        ["Learning Progress", "learning", ChartNoAxesColumnIncreasing],
        ["Learning Resources", "learning", Video],
      ],
    },
    {
      group: "ASSESSMENTS",
      items: [
        ["Assessments", "assessments", ClipboardCheck],
        ["Assessment History", "results", History],
        ["Results", "results", ShieldCheck],
      ],
    },
    {
      group: "EVIDENCE",
      items: [
        ["Evidence Portfolio", "evidence", FileCheck2],
        ["Assessment Evidence", "evidence", ClipboardCheck],
        ["Practical Evidence", "evidence", CheckCircle2],
        ["Verification", "competency-history", ShieldCheck],
      ],
    },
    {
      group: "CERTIFICATES",
      items: [["Certificates", "certificates", FileCheck2], ["Credentials", "certificates", Award]],
    },
    {
      group: "TRAINER",
      items: [["Trainer Matching", "trainer-match", UserCheck], ["My Trainer", "trainer-match", UserRound], ["Mentorship", "trainer-match", Users]],
    },
    {
      // Unlocked only after an admin/trainer nominates this trainee. The Sidebar
      // hides this group while `requiresTttNomination` is unmet.
      group: "TRAIN-THE-TRAINER",
      requiresTttNomination: true,
      items: [
        ["TTT Dashboard", "ttt-dashboard", LayoutDashboard],
        ["Program", "ttt-program", ScrollText],
        ["Learning Modules", "ttt-modules", BookOpenCheck],
        ["Teaching Practice", "ttt-practice", CalendarDays],
        ["Submissions", "ttt-submissions", ClipboardCheck],
        ["Progress & Evaluation", "ttt-progress", ListChecks],
      ],
    },
    {
      group: "CALENDAR",
      items: [["Training Calendar", "calendar", CalendarDays], ["Upcoming Activities", "calendar", Clock3]],
    },
    {
      group: "FEEDBACK",
      items: [["Course Feedback", "feedback", ClipboardCheck], ["Trainer Feedback", "feedback", UserCheck], ["Training Experience", "feedback", ScrollText]],
    },
    {
      group: "HELP & SUPPORT",
      items: [["Help Center", "support", Users], ["FAQs", "support", ScrollText], ["Contact Support", "support", Bell]],
    },
    {
      group: "NOTIFICATIONS",
      items: [
        ["All Notifications", "notifications", Bell],
        ["Training Updates", "announcements", Megaphone],
        ["Reminders", "notifications", Clock3],
        ["Announcements", "announcements", ScrollText],
      ],
    },
  ],
  trainer: [
    {
      group: "DASHBOARD",
      items: [["Dashboard", "", LayoutDashboard]],
    },
    {
      group: "MY PROFILE",
      items: [
        ["Profile", "profile", UserRound],
        ["Expertise", "trainer-profile", Fingerprint],
        ["Experience", "trainer-profile", History],
        ["Verification", "trainer-profile", ShieldCheck],
      ],
    },
    {
      group: "COURSE MANAGEMENT",
      items: [
        ["My Courses", "courses", Library],
        ["Course Content", "courses", BookOpenCheck],
        ["Course Resources", "learning", Video],
      ],
    },
    {
      group: "MY TRAINEES",
      items: [
        ["Assigned Trainees", "assigned-batches", Users],
        ["Trainee Progress", "assigned-batches", TrendingUp],
        ["Trainee Assessments", "evaluations", ClipboardCheck],
        ["Competency Evidence", "evidence-review", FileCheck2],
      ],
    },
    { group: "RESOURCES", items: [["Resource Library", "learning", Library], ["Learning Materials", "learning", BookOpenCheck]] },
    { group: "ASSESSMENTS", items: [["Assessments", "assessments", ClipboardCheck], ["Questionnaires", "question-bank", ListChecks], ["Assessment Results", "results", ShieldCheck]] },
    { group: "SCHEDULE", items: [["Training Sessions", "training-sessions", CalendarDays], ["Availability & Capacity", "availability", Clock3], ["Training Calendar", "calendar", CalendarDays]] },
    { group: "TRAIN-THE-TRAINER", items: [["Dashboard", "train-the-trainer", LayoutDashboard], ["Candidates", "ttt-candidates", Users], ["Program", "train-the-trainer", Route], ["Learning Modules", "train-the-trainer", BookOpenCheck], ["Teaching Practice", "train-the-trainer", UserCheck], ["Evaluation", "ttt-candidates", ClipboardCheck], ["Completion", "ttt-candidates", Award]] },
    { group: "FEEDBACK", items: [["Trainee Feedback", "feedback", Users], ["Training Feedback", "feedback", ClipboardCheck]] },
  ],
  admin: [
    { group: "DASHBOARD", items: [["Dashboard", "", LayoutDashboard]] },
    {
      group: "PEOPLE",
      items: [
        ["User Approvals", "users", ShieldCheck],
        ["Users & Roles", "user-roles", Users],
      ],
    },
    {
      group: "CAPABILITY",
      items: [
        ["Competency Framework", "competencies", Fingerprint],
        ["Role Mapping", "job-role-requirements", Building2],
        ["Capability Map", "organizational-capability", Building2],
        ["Skill Gap Analysis", "skill-gap-analysis", ChartNoAxesColumnIncreasing],
      ],
    },
    {
      group: "TRAINING",
      items: [
        ["Training Demand", "training-demand", Route],
        ["Courses", "courses", Library],
        ["Assessments", "assessments", ClipboardCheck],
        ["Certifications", "certificates", FileCheck2],
      ],
    },
    {
      group: "TRAINERS",
      items: [
        ["Trainer Pool", "trainer-discovery", Users],
        ["Capacity Analysis", "trainer-capacity", Clock3],
        ["Verification", "trainer-verification", ShieldCheck],
      ],
    },
    {
      group: "TRAIN-THE-TRAINER",
      items: [
        ["TTT Overview", "train-the-trainer", UserCheck],
        ["TTT Candidates", "ttt-candidates", Users],
        ["TTT Programme", "ttt-programme", ScrollText],
        ["Verification", "ttt-verification", Award],
      ],
    },
    {
      group: "KNOWLEDGE CONTINUITY",
      items: [
        ["Knowledge Base", "knowledge-base", BookOpenCheck],
        ["Succession Planning", "succession-planning", Route],
        ["Risk Assessment", "risk-assessment", ShieldCheck],
      ],
    },
    {
      group: "COMMUNICATION",
      items: [
        ["Announcements", "announcements", Megaphone],
        ["Notifications", "notifications", Bell],
      ],
    },
    {
      group: "REPORTS & ANALYTICS",
      items: [
        ["Reports & Analytics", "audit-logs", ScrollText],
        ["Training Reports", "training-reports", ChartNoAxesColumnIncreasing],
        ["Competency Reports", "competency-reports", Activity],
      ],
    },
    {
      group: "FEEDBACK",
      items: [
        ["Feedback Overview", "feedback", ClipboardCheck],
        ["Feedback Trends", "feedback-trends", Activity],
        ["Improvement Actions", "improvement-actions", Route],
      ],
    },
  ],
};

// Flattened navigation for router compatibility
export const navigation = {
  trainee: [...new Map(navigationGroups.trainee.flatMap((g) => g.items).map((item) => [item[1], item])).values()],
  trainer: [...new Map(navigationGroups.trainer.flatMap((g) => g.items).map((item) => [item[1], item])).values()],
  admin: [...new Map(navigationGroups.admin.flatMap((g) => g.items).map((item) => [item[1], item])).values()],
};
