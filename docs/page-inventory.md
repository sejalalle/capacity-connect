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
- **Train-the-Trainer Portal** — The nominated candidate's own TTT workspace: programme, learning modules, teaching practice, submissions and evaluation progress. **Hidden until a coordinator nominates the trainee.** *(Core)*
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
| Train-the-Trainer Portal | `TRAIN-THE-TRAINER` group → `/trainee/ttt-dashboard`, `/trainee/ttt-program`, `/trainee/ttt-modules`, `/trainee/ttt-practice`, `/trainee/ttt-submissions`, `/trainee/ttt-progress` | Implemented (six sections; the group is revealed only when a nomination exists. Parts of the design still need backend fields — see below) |
| Notifications | Notifications → `/trainee/notifications` | Implemented |
| Profile & Settings | Profile & Settings → `/trainee/profile` | Implemented |

## Page check — Trainer

| Inventory item | App surface (label → path) | Status |
| --- | --- | --- |
| Trainer Dashboard | Trainer Dashboard → `/trainer` | Implemented |
| Training Calendar | Training Calendar → `/trainer/calendar` | Implemented |
| Availability Management | Availability Management → `/trainer/availability` | Implemented |
| Trainee List | Trainee List → `/trainer/assigned-batches` | Implemented (assigned batches with the trainees confirmed into them, and their learning, assessment, evaluation, result and evidence progress) |
| Course Management | Course Management → `/trainer/courses` | Implemented |
| Resource Library | Resource Library → `/trainer/learning` | Implemented (includes recorded-lecture upload with processing status) |
| Question Bank | Question Bank → `/trainer/question-bank` | Implemented |
| Training Sessions | Training Sessions → `/trainer/training-sessions` | Implemented (the trainer's batch sessions with the coordinator's assignment status and the trainer's own declared availability) |
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
| Role & Competency Requirement | `P2JobRole`/`P2RoleRequirement`; Admin → Role Mapping. **Admin → Users assigns a user's professional role** (separate from the access role) | Implemented |
| Profile & Evidence Collection | Profile page; evidence submission. **A coordinator can record previous training and a reviewed baseline level** | Implemented |
| Competency Analysis | `P2CompetencyRecord`; Competency Passport | Implemented |
| Skill-Gap Identification | Skill Gaps page; `GET /api/gaps/me` | Implemented |
| Learning Recommendation | Training Needs, Learning Paths, course recommendation explanations | Implemented |
| Trainer Matching | `calculateSuitability`; Trainer / Mentorship (trainee), Trainer Discovery (admin). **The trainee view also lists trainers for the trainee's own competency gap** | Implemented (recommendation only; a coordinator assigns) |
| Learning & Training | Learning modules, resources, recorded lectures, progress tracking | Implemented |
| Knowledge Assessment | MCQ question bank (**with independent review**), server-scored attempts, **trainer assessment authoring and publication** | Implemented |
| Practical Verification | Practical submissions evaluated against criteria | Implemented |
| Human-Verified Competency | Competency decisions on reviewed evidence | Implemented |
| Evidence Portfolio | Evidence records and the passport | Implemented |
| Certificate / Credential | Completion certificates | Implemented (records completion, not verified competency) |
| Updated Individual Capability | Passport/history update and follow-up actions | Implemented |
| Organizational Capability Map | Organizational Capability page | Implemented |
| Organizational Skill Gaps | Capability coverage gaps (`NOT_ASSESSED` kept separate) | Implemented |
| Training Demand | Training Demand page | Implemented |
| Trainer Capacity Intelligence | Trainer Capacity page | Implemented |
| Train-the-Trainer | TTT program → **programme learning** → practice → evaluation → coordinator verification | Implemented |
| Expanded Trainer Pool | TTT verification promotes a candidate and adds a verified trainer | Implemented |
| Continuous Feedback & Improvement | Feedback workflow and theme summarisation | Implemented |
| Notifications | Per-role notification list; workflow events plus **time-driven reminders** (assessment deadline, training deadline, recommendation) | Implemented (in-app list only) |

### UI additions, 2026-09-26

Controls added to pages that already existed — no new page was introduced:

| Page | Added |
| --- | --- |
| Admin → Users (user panel) | Professional role, previous training records, reviewed baseline level |
| Trainee → Profile & Settings | "Previous Training" reads recorded completions instead of hard-coded rows |
| Trainee → Trainer / Mentorship | Trainers for the trainee's own competency gap, with reviewed level and availability |
| Trainee → Train the Trainer | Programme learning plan, progress controls and the teaching-practice lock |
| Trainer → Question Bank | *Mark reviewed* (the author cannot self-review) |
| Trainer → Assessments | *Create assessment draft* and *Publish* |

## Trainee Train-the-Trainer portal

**Core.** The nominated candidate's own view of the programme, built to the agreed eight-step reference flow. It is a separate surface from the coordinator/trainer `TttPage`; both read the same records, so nothing a candidate sees can disagree with what a coordinator sees.

### Visibility rule

The `TRAIN-THE-TRAINER` navigation group is present only when the trainee has a nomination that is not `WITHDRAWN` or `REJECTED`. `useTttNomination` reads `GET /api/part3/ttt/candidates`, which for a trainee returns their own nominations, so the unlock is driven entirely by the **admin-created nomination**. Direct navigation to a `/trainee/ttt-*` URL without a nomination renders an explicit "no nomination" state rather than the workspace.

### Sections → reference steps

| Section | Path | Reference steps | Backed by |
| --- | --- | --- | --- |
| TTT Dashboard | `/trainee/ttt-dashboard` | 1 (entry), 8 (completion summary) | Nomination + learning + practices |
| Program | `/trainee/ttt-program` | 2 (nomination), 3 (overview) | Nomination detail; accept/decline via `transitions` |
| Learning Modules | `/trainee/ttt-modules` | 4 | `GET/POST /ttt/nominations/:id/learning` |
| Teaching Practice | `/trainee/ttt-practice` | 5 | `GET /ttt/nominations/:id/practices` |
| Submissions | `/trainee/ttt-submissions` | 6 | `POST /ttt/nominations/:id/teaching-practice` |
| Progress & Evaluation | `/trainee/ttt-progress` | 7 (evaluation), 8 (completion) | Practice evaluation + nomination history |

The Step 1 callout also appears on the trainee dashboard. Every design element in the reference that has no backing field renders an honest pending notice instead of placeholder content.

### Backend connections still needed

These are the designed elements that cannot be filled from the current API. Each is marked in the UI with an inline notice.

| Designed element | What is missing |
| --- | --- |
| Programme duration, delivery mode, start and end dates | `P3TTTProgram` has no `duration`, `deliveryMode`, `startDate` or `endDate`. Add them, and expose them on the candidate's nomination payload. |
| Programme's written teaching-practice requirements | `P3TTTProgram.teachingPracticeRequirements` exists but `populatedNomination` projects only `title competency targetLevel status`, so a candidate cannot read it. Widen the projection or add a candidate-facing programme endpoint. |
| Session join link and recording playback | `P3TTTPractice` has no session link, and there is no recording field. Add both (or reference a `P3MediaAsset`) and expose them to the candidate. |
| Session plan and recording upload | `savePractice` accepts `privateResources`, but there is no private-file upload endpoint scoped to a TTT practice. Add one (owner + candidate scoped, same GridFS pattern as evidence files) and enable the upload fields. |
| Additional resources (handbook, sample plan, videos) | No resource field on the programme. Add `P3TTTProgram.resources[]` (title, type, link or private resource id). |
| Completion "forwarded for empanelment" wording | Verification status is real (`nomination.status === VERIFIED`); the empanelment/notice step has no separate record. |

## Video delivery — how it works, and its boundary

**Demo integration.** Trainer uploads an MP4/WebM recording against a course they manage. The asset is created as `PROCESSING`, the file is stored privately in GridFS, and the asset becomes `READY` only after the bytes are stored and content-checked. Trainees enrolled in the course see ready recordings on their learning page, stream them inline, and their playback position is saved and resumed. Coordinators see every asset with storage totals and can take a recording down or restore it.

Boundary — state this plainly if asked:

- **Direct upload only.** There is no HLS packaging, adaptive bitrate or transcoding pipeline. Files are served whole (with HTTP range support for seeking).
- The upload limit is 25 MB, and only MP4 and WebM are accepted, validated by content signature.
- Watching a lecture, and playback progress, are learning activity. They never create evidence and never change a competency record.

## Removed from the application

**Knowledge Continuity** (the `P3KnowledgeTransferPlan` knowledge-transfer workflow) was removed on **2026-09-26**. It does not appear in the agreed page inventory above, and it is not part of the current scope. The route file, model, page, navigation entries, tests and documentation references were deleted. It is recorded as `WITHDRAWN` in `implementation-progress.md` and `selected-workflow-coverage.md`.

Surfaces that are implemented but not listed in the inventory above (for example Train the Trainer, Organisational Capability, Audit Logs, AI Activity and the AI drafting tools) remain in place; they are additive to this inventory rather than part of it.
