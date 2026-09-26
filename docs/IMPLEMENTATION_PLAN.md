# IMPLEMENTATION PLAN

Dated, newest-first. `[x]` = has executed automated evidence. `[ ]` = unimplemented or device/live acceptance only. A file or route is not evidence.

## **Trainee Train-the-Trainer portal, 2026-09-26**

Built the nominated candidate's own TTT workspace to the agreed eight-step reference flow, and made the `TRAIN-THE-TRAINER` navigation group conditional on an admin-created nomination. The backend connections the design still needs are recorded in `page-inventory.md`. Evidence: `npm run build --prefix client` → clean, 1708 modules; `npm run test:e2e` → `flow.spec.js` 5/5, `ui-recovery.spec.js` 2/2 (the route-inventory spec parses `navigation.js`, so all six new candidate pages are walked at four widths and checked for overflow) and the new `tests/ttt-trainee-portal.spec.js` 2/2.

**Unrelated E2E failures present in the working tree at this time:** seven specs fail against the *concurrent*, uncommitted trainee-page rewrite (`TraineeExperiencePage.jsx` and siblings), which replaces API-backed trainee surfaces with static mockups and renames/removes navigation entries. `lifecycle.spec.js:11` (no "TWO LEVEL GAP" on the mocked Skill Gaps page), `lifecycle.spec.js:116` ("Competency Passport" renamed to "Role & Requirements"), `part3.spec.js:50` and `part3b.spec.js:17` (cascades: the admission never runs, so the trainee has no enrollment), `part3b.spec.js:175` (mocked competency history), `part3b.spec.js:194` (`skill-suggestions` no longer has a route), `selected-workflow.spec.js:9` (mockup heading is "Feedback & notifications", not "Training Feedback"). None of these are reachable from this change and none touch the Train-the-Trainer surfaces.

### Candidate workspace (Trainee, Core)

- [x] `TttTraineePage.jsx` with six sections: TTT Dashboard, Program, Learning Modules, Teaching Practice, Submissions, Progress & Evaluation. Nav group + routes are generated from `client/src/utils/navigation.js`, so the six entries create their own routes.
- [x] The Step 1 callout appears on the trainee dashboard, and the group only exists when a nomination is present.
- [x] Real data throughout: nomination detail and history, `learning` progress with the teaching-practice gate, practice sessions, rubric evaluation (per-criterion marks, overall score, evaluator, comments) and the completion checklist.
- [x] Accept / Start / Decline use the existing `transitions` endpoint with the revision; submission uses the existing `teaching-practice` endpoint; module progress uses the existing `learning` endpoint.

### Conditional visibility

- [x] `useTttNomination` reads `GET /api/part3/ttt/candidates` (own nominations for a trainee) and exposes `hasAccess`, which is false for `WITHDRAWN`/`REJECTED` nominations and while loading.
- [x] `navigation.js` marks the group `requiresTttNomination: true`; `Sidebar.jsx` filters it out for trainees without access. Trainer and admin navigation is untouched.
- [x] Direct navigation without a nomination renders a "no nomination" state rather than the workspace.

### Boundaries stated in the UI

- [x] Programme duration/mode/start/end, the programme's written practice requirements, session links and recordings, practice file uploads and additional resources have no backing fields. Each renders an inline pending notice rather than placeholder content. Upload controls are present but disabled with the reason given.
- [x] Completing the programme never claims verified expertise: the completion banner and checklist both defer to the coordinator's verification decision.

---

## **AI provider switch and AI position record, 2026-09-26**

Added `AI_PROVIDER_PROFILE` as the single switch that moves every AI-assisted task between providers, recorded the AI boundary in `docs/ai-position.md`, and fixed the masked-5xx defect that made an AI misconfiguration undiagnosable. Evidence: `npm test --prefix server` → **78 passed / 0 failed** (was 72: +6 in `server/test/ai-profile.test.js`).

### Provider switch

- [x] `AI_PROVIDER_PROFILE` (`disabled` | `gemini` | `openai` | `mock`) in `services/aiService.js`. A profile carries the transport, base URL, default model and which secret is read, so one env change moves MCQ drafting, skill-gap explanation, course-recommendation explanation, trainer-match explanation, evidence summarization, feedback summarization and TTT candidate summarization together.
- [x] `gemini` uses Gemini's OpenAI-compatible endpoint with `GEMINI_MODEL` (default `gemini-3.8-flash`); `openai` uses `api.openai.com/v1` with `OPENAI_MODEL`. `AI_MODEL`, `AI_API_KEY` and `AI_BASE_URL` remain manual overrides.
- [x] No automatic fallback between providers: a profile either works or the call fails closed to the manual workflow. An unrecognised profile name is reported in `GET /api/part3/ai/settings` and in the 503 message rather than silently falling back.
- [x] Selecting a profile switches AI on; `AI_ENABLED=false` stays available as a hard override that wins. `AI_EXTERNAL_DATA_APPROVED` is still required for external calls — a profile selection is not a data-handling approval.
- [x] `aiSettings()` now also reports the resolved profile and endpoint (never the secret), and the unresolved-profile error is surfaced.

### Masked 5xx fixed

- [x] `middleware/errorHandler.js` masked **every** 5xx message, so "AI assistance is disabled", "provider configuration unavailable for profile X", "data handling not approved", "timed out" and "request limit reached" all arrived as `Something went wrong. Please try again.` — leaving no way to tell why an AI call failed. Deliberate `HttpError`s now keep their already-worded message; unexpected errors (including every non-`HttpError` 5xx and the StrictMode crash class) stay masked. Every deliberate 5xx in the repository is in `aiService.js`, so the exposure is bounded.

### Documentation

- [x] `docs/ai-position.md` — the 🟢 assistant tasks and the 🔴 prohibited decisions, each 🔴 row naming the code that enforces it, plus the provider switch table.
- [x] Corrected the endpoint named in the earlier AI entry: MCQ drafting is `POST /api/part3/ai/mcq-drafts` (`ai-question-drafts` is the client route segment, not the API path).

---

## **Expected-flow coverage pass, 2026-09-26**

Stored the product owner's stated flow as `docs/expected-flow.md` (test basis), audited all 30 steps against code, and recorded per-step status in the new `docs/flow-coverage.md`. Closed every item in that queue. Evidence: `npm test --prefix server` → **72 passed / 0 failed** (was 66: +1 job-role, +1 baseline/previous-training, +1 trainer-match, +1 review chain, +2 reminders); `npm run build --prefix client` → clean, 1704 modules.

Result: **29 Implemented / 1 Partial / 0 Missing** (was 23 / 7 / 0).

### Part A — trainee (§1, §2, §6)

- [x] `PATCH /api/users/:id/job-role` (`controllers/userController.js`, admin, audited `PROFESSIONAL_ROLE_ASSIGNED`, validated against an `ACTIVE` `P2JobRole`). Previously **nothing** outside the seed wrote `User.jobRole`, so role→requirement mapping was unreachable and `/api/gaps/me` returned `[]` for any real account. Admin → Users assigns it in the user panel.
- [x] `POST /api/competency-records/:traineeId/baseline` records a reviewed initial level from historical evidence (`sourceType: "HISTORICAL_REVIEW"`, audited `BASELINE_COMPETENCY_RECORDED`) and refuses `409` when a reviewed Part 3 decision already records that level or higher — a baseline can never downgrade a demonstrated level.
- [x] `GET/POST /api/trainees/:traineeId/course-completions` records previous training (idempotent per trainee+course, read-only afterwards, audited `PREVIOUS_TRAINING_RECORDED`), making the `COURSE_COMPLETION` eligibility rule satisfiable for the first time. The trainee Profile "Previous Training" tab now reads real records instead of two hard-coded rows.
- [x] **Fixed** trainer-match reasons: `trainerMatchFor` read a field that `factor()` never set, so every weight reason rendered as `undefined (+N points)`. Now reads `f.source`. Added `gapTrainerMatches`, which answers "which trainer fits *my* gap" from reviewed expertise at or above the required level, with declared availability.

### Part B — trainer (§5, §15, §17)

- [x] `P3TTTLearning` + `GET/POST /api/part3/ttt/nominations/:id/learning`: the program's `courses` are now the TTT curriculum, the candidate records progress, and `GET` returns `completed`/`total` plus a `gate`. `savePractice` refuses `409` until every programme course is complete. `TttPage.jsx` shows the plan, the controls and the lock.
- [x] **Fixed** a latent crash: `createQuestion` spread the route's `batch` key into `P3Question`, which is `strict: "throw"`, so **every** API question creation returned `500`. `batch` now only scopes the permission check.
- [x] Trainer **Question Bank** gained a *Mark reviewed* action (the author cannot self-review) and **Assessments** gained *Create assessment draft* (batch, course, type, window, limits, questions, rubric) plus *Publish*.

### Part C — organization (§30)

- [x] `services/reminderService.js` with `runReminders()`: `ASSESSMENT_DEADLINE_REMINDER`, `TRAINING_DEADLINE_REMINDER` and `RECOMMENDATION_AVAILABLE`, emitted through the existing deduplicated notification engine so a repeated scan never repeats a notice. Reminder rules mirror `gapsFor` so a notice never contradicts the Skill Gaps page.
- [x] Scheduler in `server.js` (scan 5s after boot, then every `REMINDER_INTERVAL_MS`, cleared on shutdown) and `POST /api/notifications/reminders/run` (admin) for an on-demand scan.

### Tests closed (previously implemented but unasserted)

- [x] `recommendedCourses[0].explanation` and its batches (#5); the passport history→evidence/decision trail (#11); exact coverage-bucket arithmetic `meeting + below + notAssessed + notComparable === denominator` (#24); the `trainerCapacityGap` verdict and its matching `recommendedAction` (#26); the demand→TTT chain (#27); and `reviewedTrainerCount` increasing by exactly one after a TTT verification (#28).

### Still open

- [ ] **Employee-facing baseline/diagnostic assessment** (#2). An attempt requires `P2Enrollment` and its unique indexes are keyed on it, so a pre-enrolment diagnostic needs a deliberate decision to relax that model. The reviewed baseline record delivers the outcome without weakening validation. Needs an explicit instruction.
- [ ] Live browser walkthrough of the new controls (admin user panel, TTT learning, trainer question review and assessment authoring, gap-driven trainer match).

---

## **Trainer Training Sessions page, 2026-09-26**

Added the last trainer inventory item that had no page at all; sessions existed only as embedded `P2Batch.sessions[]`. Evidence: `npm test --prefix server` → **66 passed / 0 failed** (was 63: +3 in `server/test/training-sessions.test.js`); `npm run build --prefix client` → clean; `npm run test:e2e` → **17 passed**.

- [x] `sessionScheduleFor(actor)` in `services/part3aService.js` + `GET /api/part3/training-sessions` (`trainer` only). It returns the sessions of the batches the trainer is responsible for, each with the coordinator's assignment status and decision reason, and the trainer's own availability window covering it.
- [x] `Part3Page.jsx` → `TrainingSessions`: a session-load summary and a per-batch session table (competency, required level and qualifications, window, assignment state, availability state).
- [x] The only trainer-side write is declaring availability for a session window through the existing `POST /api/part3/availability`. Declaring unavailability flags an overlapping `ACTIVE` assignment as `UNAVAILABLE` and notifies coordinators. A trainer still cannot schedule a session or assign themselves.
- [x] Nav entry, route dispatch (`part3Paths`) and page title added; the trainer nav group now matches the inventory.
- [x] Seed: `demoTrainer.js` adds two sessions and a coordinator-approved `ACTIVE` assignment on the trainer's second batch, so the page has assigned, unassigned, available and undeclared examples.
- [ ] Live browser walkthrough of the sessions page.

Boundary: the trainer views the schedule and declares availability. Scheduling and trainer assignment remain coordinator decisions.

---

## **Trainer Trainee List corrected and trainer demo roster, 2026-09-26**

The trainer's **Trainee List** (`/trainer/assigned-batches`) rendered the Part 3A session-assignment table, so it showed batches, scope, status and score decisions and **no trainees at all**. It now renders a trainer-scoped trainee roster with recorded progress. Evidence: `npm test --prefix server` → **63 passed / 0 failed** (was 60: +3 in `server/test/trainer-roster.test.js`); `npm run build --prefix client` → clean, 1704 modules.

### Trainer Trainee List (Trainer, Core)

- [x] `rosterFor(actor)` in `services/part3aService.js` derives the trainer's batches from `P3BatchPermission` **and** `ACTIVE | UNAVAILABLE` `P3TrainerAssignment`, reads the confirmed `P2Enrollment` rows, and composes per trainee: published-module completion, assessment attempts and best score, pending/returned/evaluated submissions, latest published result and evidence counts.
- [x] `GET /api/part3/trainees` (`trainerOrAdmin`). A coordinator is scoped to their own `P3BatchPermission` batches, matching `GET /submissions`.
- [x] `Part3Page.jsx` renders `TraineeList` for trainers: per-batch cards (course, roster size, published modules, window) plus a trainee table with a learning-progress bar, assessment best score, evaluation state, result, evidence and last activity. The page title was corrected from "Assigned Batches" to "Trainee List".
- [x] The page states the boundary: learning completion, attempts and scores are recorded activity and never create competency.
- [x] The trainer **Feedback** page no longer read the trainee-only `submitted` field. A trainer sees scoped aggregates plus the privacy boundary; a coordinator sees the identified `responses` the API already returns.

### Trainer demo dataset

- [x] `server/src/seed/demoTrainer.js` (`seedTrainerWorkspace`) is **additive** and called by `seed:demo` after the Part 2/3 seeds, so the exact counts the Part 2/3 seed tests assert are untouched and no existing suite imports it. It grants the demonstration trainer a second batch, publishes two modules there, confirms six synthetic enrollments (three per batch), records learning progress, authors and reviews a second question, publishes an MCQ and a practical with one evaluated and one pending submission, publishes one result, and records scoped feedback.
- [ ] Live browser walkthrough of every trainer page against the seeded dataset.

### Documentation

- [x] `page-inventory.md` Trainee List row now matches the code; Trainer "Training Sessions" remains **Partial** with no standalone page.

Boundary: the roster reports recorded activity only. It never infers a level from absence and never writes a competency record.

---

## **Page inventory, video lectures and continuity removal, 2026-09-26**

Added `docs/page-inventory.md` — the agreed per-role page inventory plus a verified mapping of where each item actually lives. Evidence: `npm test --prefix server` → **60 passed / 0 failed** (was 57: −1 continuity test, +4 media tests); `npm run build --prefix client` → clean, 1704 modules.

### Video lectures (§3, Demo integration)

- [x] Models `P3MediaAsset` (`PROCESSING → READY`, `FAILED`, `TAKEN_DOWN`) and `P3MediaProgress` (resume position per trainee).
- [x] `routes/mediaRoutes.js` mounted at `/api/part3`: course-scoped upload (MP4/WebM, 25 MB, content-signature checked), scoped listing, inline streaming with HTTP range support, coordinator moderation, uploader removal, playback progress.
- [x] The stream route accepts `?token=` in addition to the bearer header so a `<video>` element can authenticate. Media mounts **before** `part3aRoutes`, which applies a blanket `auth` across `/api/part3`.
- [x] Client `VideoLibrary` (upload with progress and status, trainee playback with resume) on the learning page; admin `MediaLibraryPage` with storage totals and takedown/restore.
- [x] Tests `server/test/media.test.js`: owner-scoped upload, content validation, enrollment-scoped listing, resume upsert, token/range streaming, takedown withdrawal and cascade removal.
- [ ] Live browser acceptance of a large upload.

### Knowledge Continuity removed

- [x] Deleted `continuityRoutes.js`, `ContinuityPage.jsx`, the `P3KnowledgeTransferPlan` model, the three navigation entries, the client route case and the `part3b.test.js` continuity test. Recorded as `WITHDRAWN` in the progress tables.

### Navigation labels aligned to the inventory

- [x] Renamed sidebar labels to the inventory wording (for example Courses → My Courses, Availability → Availability Management, Assigned Batches → Trainee List, Evaluation Queue → Evaluation Workspace, Assessment Oversight → Assessment Management). Items with no matching page are recorded as Partial or Not built in `page-inventory.md`.

Boundary: video is direct upload with no transcoding or HLS packaging; playback progress is learning activity and never evidence.

---

## **AI Features Implementation & Oversight Update, 2026-09-26**

Implemented the seven sanctioned AI use cases and the human-review gate for skill-tag extraction. All six new explanation use cases are explanation-only from day one (read-only structured outputs, disclaimers, no automated record creation or competency changes). All calls logged to `P3AIRequestMetadata` for auditability. Evidence: `npm test --prefix server` → **57 passed / 0 failed**; `npm run build --prefix client` → clean.

### Sanctioned AI Slots Implemented
- [x] **MCQ Drafting** (Core/Demo integration) — `POST /api/part3/ai/mcq-drafts` creates unpublished drafts for human review.
- [x] **Skill-gap explanation** (Core/Demo integration) — `POST /api/part3/ai/explain-gap` produces 2-3 sentence explanation + next steps without updating competency records.
- [x] **Course recommendation explanation** (Core/Demo integration) — `POST /api/part3/ai/explain-course` explains course mapping rationale for competency development.
- [x] **Trainer-match explanation** (Core/Demo integration) — `POST /api/part3/ai/explain-trainer-match` returns 1-liner justification from suitability factor points. Wired into `TrainerMatchPage.jsx`.
- [x] **Evidence summarization** (Core/Demo integration) — `POST /api/part3/ai/explain-evidence` returns structured summary and key points. Wired into `EvidenceWorkspace` on `Part3BPage.jsx`.
- [x] **Feedback summarization & theme extraction** (Core/Demo integration) — `POST /api/part3/ai/summarize-feedback` extracts themes and sentiment across feedback entries.
- [x] **TTT candidate summarization** (Core/Demo integration) — `POST /api/part3/ai/summarize-ttt-candidate` generates candidate readiness blurb and teaching strengths. Wired into `TttPage.jsx`.

### Skill Extraction Review Gate
- [x] Added explicit **Reject** button alongside **Accept** in `Part3BPage.jsx` for both self-declared skills and competency matching. Rejected suggestions log `humanAction: "REJECTED"` and never alter user profile or competency records.

---

## **Gap-closure update, 2026-09-25**

Closed the five gaps between the planned Samarthya flow and the build, and repaired a broken server import. Evidence: `npm test --prefix server` → **56 passed / 0 failed**; `npm run build --prefix client` → clean; new suites `server/test/ttt.test.js` and `server/test/gaps.test.js`.

### Boot fix

- [x] `server/src/controllers/userController.js` no longer imports the deleted `models/Lifecycle.js`; it writes `P2AuditLog` with `previousStatus`/`newStatus`/`correlationId`. Regression: "approving an account works and writes an audit record".

### Train-the-Trainer (§5, §10)

- [x] Models `P3TTTProgram`, `P3TTTNomination`, `P3TTTPractice`, `P3TTTEvaluation`, `P3TTTVerification`.
- [x] `services/tttService.js` — eligibility, nomination, transitions, teaching practice, rubric-limited evaluation, transactional verification.
- [x] `routes/tttRoutes.js` mounted at `/api/part3`.
- [x] Verification creates reviewed `P3TrainerExpertise` **and promotes a `trainee` candidate to `trainer`** so the trainer pool actually expands.
- [x] Client `TttPage.jsx` + nav (trainee/trainer/admin) + route cases.
- [x] Tests: eligibility (missing-information vs eligible), workflow, rubric-limit rejection, verification + promotion, self-evaluation rejection.
- [ ] Live demo acceptance of the full TTT loop (nominate → practice → evaluate → verify).

### Training demand (§8)

- [x] `services/demandService.js` reshapes `capabilityReport` into per-competency demand with trainer supply and a `trainerCapacityGap` flag.
- [x] `GET /api/part3/training-demand` (admin) in `capacityRoutes.js`.
- [x] Client `TrainingDemandPage.jsx` (+ links to Trainer Capacity and Train the Trainer) + nav.
- [x] Tests: report shape and coordinator-only access.

### Announcements and homepage publishing (§11)

- [x] `P2Announcement` model.
- [x] `routes/announcementRoutes.js` mounted at `/api`: public feed, audience-filtered feed, create/patch/publish/archive; publish fans out `P2Notification`.
- [x] Client `AnnouncementsPage.jsx` + nav for all roles; landing-page "Latest updates" strip.
- [x] Tests: public feed excludes drafts, audience filtering, publish notification fan-out.

### Achievements (§3)

- [x] `achievementsFor` in `part3bService.js` (derived; no new collection) + `GET /api/part3/achievements`.
- [x] Client `AchievementsPage.jsx` + nav; labelled as separate from certificates.
- [x] Test: derived items with the milestones label.

### Trainee trainer matching (§3, §16)

- [x] `trainerMatchFor` in `part3aService.js` reusing `calculateSuitability`; `GET /api/part3/trainer-match` (trainee).
- [x] Client `TrainerMatchPage.jsx` + nav.

### Docs workflow

- [x] `AGENTS.md`, this plan, `docs/README.md`, `UPDATED_ARCHITECTURE.md`, `IMPLEMENTED_WORKFLOWS.md`, `PROJECT_CONTEXT.md`, `docs/sources/`.

Boundary: TTT eligibility thresholds, demand thresholds and coverage labels remain **proposed application configuration**, not IMD/WMO standards.

---

## **Baseline checkpoint, 2026-09-23**

Recorded in `implementation-progress.md` and `selected-workflow-coverage.md`. Backend regression passed 35/35 at that time; later runs reached 44/44. The 23-feature table there lists TTT (19) and knowledge continuity (20) as **MISSING** — TTT is now addressed (2026-09-25); **knowledge continuity (20) was withdrawn and removed from the application on 2026-09-26** (routes, model, page, nav and tests deleted).

---

## Custom acceptance criteria

- **TTT:** a nomination cannot exist unless eligibility is `ELIGIBLE`; a repeated verification is rejected `409`; a candidate cannot evaluate their own practice (`403`).
- **Announcements:** drafts never appear on the public feed; a trainee never receives a trainer-only announcement; publish records at least one notification per approved recipient of the audience.
- **Achievements:** derived only from stored records; the response carries the milestones label.
- **Training demand:** admin-only; rows include a `recommendedAction`; never presented as a forecast.
- **Trainer matching:** returns only the trainee's own sessions and the selected trainer; carries the "coordinator makes the final assignment" note.

## Demo script (additions)

Follow `docs/demo-script.md` for the core journey. Add:

1. **Announcements** — as coordinator, publish the seeded "New radar interpretation course published"; show it on the public landing page and in a trainee's notifications.
2. **Training demand** — open **Training Demand**, show headcount below requirement and where the trainer-capacity gap is flagged; follow the link to **Train the Trainer**.
3. **TTT loop** — nominate a subject expert; as the candidate accept and submit teaching practice; as the trainer evaluate; as coordinator verify. Show that the candidate becomes a verified trainer and appears in **Trainer Discovery** / `reviewedTrainerCount`.
4. **Trainee surfaces** — open **Trainer Match** (matched trainer + reasons) and **Achievements**.

State throughout that these are application-level indicators over synthetic records.

## Explicitly deferred backlog

- Live external AI provider verification (unchanged).
- Persisted achievement award records plus one-time notifications (currently derived-only).
- Departmental scoping beyond the existing department filter.
- Real role-management UI (role change currently happens only through TTT verification).
- Recognition of previously-unmounted legacy `p3*` collections (`p3results`, `p3evaluations`, `p3submissions`, `p3capabilitysnapshots`, `p3aidrafts`, `p3evidencereviews`) — written only by the unrouted `part3Service.js` v1 engine; left in place, not authoritative.
