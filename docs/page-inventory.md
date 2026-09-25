# PAGE INVENTORY

Verification snapshot: **2026-09-26**. This document lists the agreed page inventory per role and records where each item actually lives in the application. The inventory text is the agreed list; the **check** tables below it are the verification result against `client/src/utils/navigation.js` and `client/src/routes/AppRoutes.jsx`.

Status values used below:

- **Implemented** — a mounted page renders this item.
- **Partial** — the capability exists but is delivered through a differently-shaped surface, or a sub-part is missing.
- **Not built** — no page renders this item.

Scope labels follow `AGENTS.md`: **Core**, **Demo integration**, **Later**, **Proposed**.

## Page inventory

### 🧑‍💼 Trainee

- **Dashboard** — Overview of learning, competency, progress, and pending activities.
- **Training Calendar** — Shows upcoming training sessions, assessments, and deadlines.
- **Attendance** — Tracks participation in scheduled training.
- **My Courses** — Shows enrolled, ongoing, and completed courses.
- **Video Lectures** — Stream recorded lectures and presentations within enrolled courses; playback progress is tracked and resumes where left off. *(Demo integration)*
- **Achievements & Badges** — Displays learning milestones and achievements.
- **Knowledge Forum** — Enables users to ask questions and share knowledge.
- **Trainer/Mentorship** — Connects trainees with assigned trainers for guidance.
- **My Assessments** — Shows upcoming, completed, and assessment results.
- **My Certificates** — Stores completed course certificates and credentials.
- **Evidence Portfolio** — Displays evidence supporting competency status.
- **Notifications** — Provides reminders, announcements, deadlines, and recommendations.
- **Profile & Settings** — Manages personal information and account preferences.

### 👨‍🏫 Trainer

- **Trainer Dashboard** — Overview of trainees, courses, sessions, and evaluations.
- **Training Calendar** — Manages scheduled training and evaluation sessions.
- **Availability Management** — Defines trainer availability for matching.
- **Trainee List** — Shows assigned trainees and their progress.
- **Course Management** — Creates and manages courses and modules.
- **Resource Library** — Uploads and organizes learning materials, including recorded lecture videos, with upload/processing status shown before a video goes live to trainees. *(Demo integration)*
- **Question Bank** — Creates and manages assessment questions.
- **Training Sessions** — Schedules and manages training sessions.
- **Evaluation Workspace** — Reviews practical work using defined criteria.
- **Trainer Profile** — Displays expertise, competency, and training information.
- **Feedback** — Reviews feedback about training and resources.

### 👨‍💼 Admin

- **Admin Dashboard** — Provides organization-wide training and competency overview.
- **User Approval** — Approves and manages new users.
- **User & Role Management** — Manages users and their roles.
- **Competency Framework** — Defines competencies and competency levels.
- **Role Mapping** — Maps organizational roles to required competencies.
- **Evidence Requirements** — Defines evidence needed for competency verification.
- **Course Management** — Manages organizational courses and training content.
- **Media Library** — Oversees all uploaded video content across courses: processing status, storage usage, and content moderation/takedown. *(Demo integration)*
- **Enrollment Management** — Monitors course enrollment and participation.
- **Assessment Management** — Manages assessments and assessment data.
- **Certification Management** — Manages certificate records.
- **Trainer Verification** — Manages trainer verification.
- **Trainer Pool** — Maintains the pool of verified trainers.
- **Announcements** — Publishes organization-wide announcements.
- **Reports & Analytics** — Provides training, competency, and capacity insights.
- **Feedback Management** — Reviews and analyzes training feedback.

### 🌐 Common

- **Login / Signup** — Provides secure role-based access.
- **Search** — Helps users find courses, trainers, resources, and competencies.
- **Notifications** — Keeps users informed about relevant activities.
- **Profile / Settings** — Manages account and preferences.
- **Help / Support** — Provides platform guidance and assistance.

## Page check — Trainee

| Inventory item | App surface (label → path) | Status |
| --- | --- | --- |
| Dashboard | Dashboard → `/trainee` | Implemented |
| Training Calendar | Training Calendar → `/trainee/calendar` | Implemented (list view, not a month grid) |
| Attendance | — | Not built. Participation is recorded indirectly through module progress; there is no attendance page. |
| My Courses | My Courses → `/trainee/courses` | Implemented |
| Video Lectures | "Video lectures" card on My Learning → `/trainee/learning` | Implemented (Demo integration) |
| Achievements & Badges | Achievements & Badges → `/trainee/achievements` | Implemented |
| Knowledge Forum | — | Not built |
| Trainer/Mentorship | Trainer / Mentorship → `/trainee/trainer-match` | Implemented (read-only matched trainer and reasons; the coordinator still assigns) |
| My Assessments | My Assessments → `/trainee/assessments` | Implemented |
| My Certificates | My Certificates → `/trainee/certificates` | Implemented |
| Evidence Portfolio | Evidence Portfolio → `/trainee/evidence` | Implemented |
| Notifications | Notifications → `/trainee/notifications` | Implemented |
| Profile & Settings | Profile & Settings → `/trainee/profile` | Implemented |

## Page check — Trainer

| Inventory item | App surface (label → path) | Status |
| --- | --- | --- |
| Trainer Dashboard | Trainer Dashboard → `/trainer` | Implemented |
| Training Calendar | Training Calendar → `/trainer/calendar` | Implemented |
| Availability Management | Availability Management → `/trainer/availability` | Implemented |
| Trainee List | Trainee List → `/trainer/assigned-batches` | Implemented (assigned batches and their trainees) |
| Course Management | Course Management → `/trainer/courses` | Implemented |
| Resource Library | Resource Library → `/trainer/learning` | Implemented (includes recorded-lecture upload with processing status) |
| Question Bank | Question Bank → `/trainer/question-bank` | Implemented |
| Training Sessions | — | Partial. Sessions are embedded in batches and surfaced through Trainee List; there is no standalone sessions page. |
| Evaluation Workspace | Evaluation Workspace → `/trainer/evaluations` | Implemented |
| Trainer Profile | Trainer Profile → `/trainer/trainer-profile` | Implemented |
| Feedback | Feedback → `/trainer/feedback` | Implemented |

## Page check — Admin

| Inventory item | App surface (label → path) | Status |
| --- | --- | --- |
| Admin Dashboard | Admin Dashboard → `/admin` | Implemented |
| User Approval | User & Role Management → `/admin/users` | Implemented (approval is part of the same page) |
| User & Role Management | User & Role Management → `/admin/users` | Implemented |
| Competency Framework | Competency Framework → `/admin/competencies` | Implemented |
| Role Mapping | Role Mapping → `/admin/job-role-requirements` | Implemented |
| Evidence Requirements | — | Partial. Required evidence is configured through competency criteria; there is no dedicated page. |
| Course Management | Course Management → `/admin/courses` | Implemented |
| Media Library | Media Library → `/admin/media-library` | Implemented (Demo integration) |
| Enrollment Management | Batches → `/admin/batches`, Nominations → `/admin/nominations` | Partial. Enrolment is monitored through batches and nominations; there is no single enrolment page. |
| Assessment Management | Assessment Management → `/admin/assessments` | Implemented |
| Certification Management | Certification Management → `/admin/certificates` | Implemented |
| Trainer Verification | Train the Trainer → `/admin/train-the-trainer` | Implemented (verification is a step of the TTT workflow) |
| Trainer Pool | Trainer Discovery → `/admin/trainer-discovery` | Implemented (verified trainer pool and discovery) |
| Announcements | Announcements → `/admin/announcements` | Implemented |
| Reports & Analytics | — | Partial. Indicators appear on the dashboard, organizational capability, training demand, trainer capacity and AI activity pages; there is no single analytics page and no charting. |
| Feedback Management | Feedback Management → `/admin/feedback` | Implemented |

## Page check — Common

| Inventory item | App surface | Status |
| --- | --- | --- |
| Login / Signup | `/login`, `/register` | Implemented |
| Search | — | Partial. Search exists inside individual list pages (courses, users, resources); there is no global search. |
| Notifications | Notifications → each role's `/notifications` | Implemented |
| Profile / Settings | Profile (admin), Profile & Settings (trainee), Account Profile (trainer) | Implemented |
| Help / Support | — | Not built |

## Main workflow — one line each

| Workflow step | Where it is delivered | Status |
| --- | --- | --- |
| Role & Competency Requirement | `P2JobRole`/`P2RoleRequirement`; Admin → Role Mapping | Implemented |
| Profile & Evidence Collection | Profile page; evidence submission | Implemented |
| Competency Analysis | `P2CompetencyRecord`; Competency Passport | Implemented |
| Skill-Gap Identification | Skill Gaps page; `GET /api/gaps/me` | Implemented |
| Learning Recommendation | Training Needs, Learning Paths, course recommendation explanations | Implemented |
| Trainer Matching | `calculateSuitability`; Trainer / Mentorship (trainee), Trainer Discovery (admin) | Implemented (recommendation only; a coordinator assigns) |
| Learning & Training | Learning modules, resources, recorded lectures, progress tracking | Implemented |
| Knowledge Assessment | MCQ question bank, server-scored attempts | Implemented |
| Practical Verification | Practical submissions evaluated against criteria | Implemented |
| Human-Verified Competency | Competency decisions on reviewed evidence | Implemented |
| Evidence Portfolio | Evidence records and the passport | Implemented |
| Certificate / Credential | Completion certificates | Implemented (records completion, not verified competency) |
| Updated Individual Capability | Passport/history update and follow-up actions | Implemented |
| Organizational Capability Map | Organizational Capability page | Implemented |
| Organizational Skill Gaps | Capability coverage gaps (`NOT_ASSESSED` kept separate) | Implemented |
| Training Demand | Training Demand page | Implemented |
| Trainer Capacity Intelligence | Trainer Capacity page | Implemented |
| Train-the-Trainer | TTT program → practice → evaluation → coordinator verification | Implemented |
| Expanded Trainer Pool | TTT verification promotes a candidate and adds a verified trainer | Implemented |
| Continuous Feedback & Improvement | Feedback workflow and theme summarisation | Implemented |

## Video delivery — how it works, and its boundary

**Demo integration.** Trainer uploads an MP4/WebM recording against a course they manage. The asset is created as `PROCESSING`, the file is stored privately in GridFS, and the asset becomes `READY` only after the bytes are stored and content-checked. Trainees enrolled in the course see ready recordings on their learning page, stream them inline, and their playback position is saved and resumed. Coordinators see every asset with storage totals and can take a recording down or restore it.

Boundary — state this plainly if asked:

- **Direct upload only.** There is no HLS packaging, adaptive bitrate or transcoding pipeline. Files are served whole (with HTTP range support for seeking).
- The upload limit is 25 MB, and only MP4 and WebM are accepted, validated by content signature.
- Watching a lecture, and playback progress, are learning activity. They never create evidence and never change a competency record.

## Removed from the application

**Knowledge Continuity** (the `P3KnowledgeTransferPlan` knowledge-transfer workflow) was removed on **2026-09-26**. It does not appear in the agreed page inventory above, and it is not part of the current scope. The route file, model, page, navigation entries, tests and documentation references were deleted. It is recorded as `WITHDRAWN` in `implementation-progress.md` and `selected-workflow-coverage.md`.

Surfaces that are implemented but not listed in the inventory above (for example Train the Trainer, Organisational Capability, Audit Logs, AI Activity and the AI drafting tools) remain in place; they are additive to this inventory rather than part of it.
