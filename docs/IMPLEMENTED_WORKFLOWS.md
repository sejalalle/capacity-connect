# IMPLEMENTED WORKFLOWS — what actually works

Snapshot date: **2026-09-26**. This is the **actual**, not the target. Inspect code before relying on any row.

Baseline at snapshot: `npm test --prefix server` → **72 passed / 0 failed**; `npm run build --prefix client` → clean. Per-step status and evidence: `flow-coverage.md`.

## Architecture section → working behaviour or boundary

| § | Area | Actual behaviour | Boundary |
| --- | --- | --- | --- |
| 1 | Competency workflow spine | Registered → approved → profile → gap → training need → nomination → admission → learning → assessment → evaluation → result → evidence → human decision → passport. DB-backed and tested. `PATCH /api/users/:id/job-role` (coordinator, audited) assigns the **professional role** the requirements are mapped against, so the spine no longer depends on the seed. `POST /api/competency-records/:traineeId/baseline` records a reviewed initial level from historical evidence; `POST/GET /api/trainees/:traineeId/course-completions` records previous training. | AI assistance is strictly explanation/drafting; human decisions remain authoritative. A baseline can never lower or replace a reviewed Part 3 decision. |
| 2 | Trainee side | Passport, gaps, training needs, nominations, learning, assessments, evidence, follow-ups, certificates all mounted. **AI gap and course recommendation explanations** available. The gap payload carries the recommended course plus a human-readable explanation, asserted by test. | AI explanations provide reasoning context; never modify records. |
| 3 | Supporting trainee features | Calendar (list), notifications, feedback, certificates, **achievements**, **trainer match** mounted with **AI 1-line match justifications**, and **video lectures** (upload → processing → ready, inline playback that resumes). Trainer match now also answers the trainee's **own competency gap** (`gapMatches`), and the Profile "Previous Training" tab reads recorded completions. **Time-driven reminders** — assessment deadline, training deadline and recommendation — run on a scheduled scan. | Calendar is not a month grid. Video is direct upload only — no transcoding or HLS; playback is not evidence. Reminders are notices only and never change workflow state. |
| 4 | Trainer side | Profile/expertise, availability, assignments, **trainee roster with recorded progress** (`GET /api/part3/trainees`), **training sessions with assignment and availability state** (`GET /api/part3/training-sessions`), learning delivery, question bank **with independent review**, **assessment authoring and publication**, evaluations, results, evidence review, competency decisions mounted. | No dedicated resources-only page. A trainer declares availability but cannot schedule a session or assign themselves. Module authoring stays in the Courses workspace. |
| 5 | Train the Trainer | Program → nomination → accept → **TTT learning** → teaching practice → evaluation → admin verification. Verification creates reviewed expertise and promotes a trainee to trainer. Teaching practice is gated on the program's courses being complete. | Eligibility thresholds are proposed config; live demo acceptance pending. TTT learning completion is learning activity and creates no reviewed expertise. |
| 6 | Admin side | Users/approval, competency framework, job-role requirements, courses, batches, nominations, audit, dashboards. The user panel assigns the **professional role** (separate from the access role) and records **previous training** and a **reviewed baseline level**. `POST /api/notifications/reminders/run` triggers a reminder scan on demand. | No force-role change outside TTT; reports are tables, no charts. |
| 7 | Organizational capability | `GET /api/part3/capability` coverage with `NOT_ASSESSED` separated. | Application-level indicator, not a forecast. |
| 8 | Training demand | **New.** `GET /api/part3/training-demand` adds headcount-below-requirement and trainer-capacity gap. | Same indicator caveat. |
| 9 | Trainer capacity | `POST /api/part3/capacity` interval-based estimate. | Estimate only. |
| 10 | TTT as solution | Loop closes: verification adds a verified trainer to the pool. | Manual; no automatic nomination. |
| 11 | Announcements | **New.** `P2Announcement` + publish fan-out; public homepage feed. | Publish does not change workflow state. |
| 12 | Reports/analytics | Dashboard, capability, demand, audit, feedback, AI activity endpoints. | No dedicated analytics page/charts. |
| 13 | Feedback | Participant-scoped feedback with aggregate views. | — |
| 14 | Complete story | Demonstrable end to end with the seeded dataset. | Synthetic data only. |
| 15 | Security/audit | JWT + approval + role/ownership/scope checks; transactions for admission/verification; audit requires `correlationId`; notifications deduplicated by `eventId`. | Malware scanning/TLS/deploy hardening are external. |

## Code map

- **Models:** `server/src/models/{User,Part2,Part3}.js` (45+ models; `P3TTTLearning`, `P2Announcement`, `P3MediaAsset` and `P3MediaProgress` are the newer additions).
- **Routes:** `server/src/routes/` — mounted in `server/src/app.js`:
  - `/api/auth`, `/api/users` (incl. `PATCH /:id/job-role`)
  - `/api` → `part2Routes.js` (incl. `POST /competency-records/:traineeId/baseline`, `GET/POST /trainees/:traineeId/course-completions`, `POST /notifications/reminders/run`), `announcementRoutes.js`
  - `/api/part3` → `part3aRoutes.js`, `part3bRoutes.js`, `feedbackRoutes.js`, `certificateRoutes.js`, `capacityRoutes.js`, `mediaRoutes.js`, `tttRoutes.js` (incl. `GET/POST /ttt/nominations/:id/learning`)
- **Services:** `server/src/services/` — `part2Service`, `part3aService`, `part3bService`, `tttService`, `demandService`, `capacityService`, `criterionService`, `certificateService`, `reminderService`, `aiService`.
- **Client pages (new):** `client/src/pages/ttt/TttPage.jsx`, `pages/demand/TrainingDemandPage.jsx`, `pages/announcements/AnnouncementsPage.jsx`, `pages/achievements/AchievementsPage.jsx`, `pages/trainer/TrainerMatchPage.jsx`, `pages/media/MediaLibraryPage.jsx`, `components/media/VideoLibrary.jsx`.
- **Client surface changes (2026-09-26):** `pages/admin/UserTable.jsx` (professional role, previous training, baseline level), `pages/profile/ProfilePage.jsx` (recorded previous training), `pages/ttt/TttPage.jsx` (TTT learning plan and gate), `pages/part3/Part3Page.jsx` (question review, assessment authoring and publish), `pages/trainer/TrainerMatchPage.jsx` (gap-driven trainer list).
- **Client wiring:** `client/src/utils/navigation.js` (nav + route generation) and `client/src/routes/AppRoutes.jsx` (page dispatch).
- **Page scope:** `docs/page-inventory.md` is the agreed per-role page list and its verified mapping to code.
- **Seed:** `server/src/seed/demoPart2.js`, `demoPart3.js`, `demoTrainer.js` (Part 2/3 seeds plus an additive trainer workspace: a second batch, rosters with progress, a pending evaluation and scoped feedback; also seeds a TTT program, a nominated candidate, an evaluated practice with its completed programme learning, and announcements).

## Run commands

```bash
npm install && npm install --prefix server && npm install --prefix client
npm run seed:admin --prefix server
npm run seed:demo --prefix server
npm run dev --prefix server      # API
npm run dev --prefix client      # web
npm test --prefix server         # backend suite (memory replica set)
npm run build --prefix client    # production build
npm run test:e2e                 # Playwright (isolated ports 5100/5174)
```

## Limits

- All people, competencies, levels and outcomes shown are **synthetic demonstration data**.
- TTT eligibility, suitability weights, demand/coverage thresholds, reminder windows and pass rules are **proposed application configuration**.
- The reviewer of a question, the decider of a competency and the verifier of a trainer are separate authorised people; the API enforces each separation, and the client still needs a live walkthrough of each.
- A **baseline** is a coordinator-reviewed historical record, not an employee-facing diagnostic test: an assessment attempt is enrolment-scoped by design.
- Live AI, malware scanning, production TLS/reverse proxy, managed secrets, backups and monitoring are outside the repository.
- The legacy `part3Service.js` v1 engine remains unmounted; its collections are not authoritative.
