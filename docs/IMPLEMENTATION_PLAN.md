# IMPLEMENTATION PLAN

Dated, newest-first. `[x]` = has executed automated evidence. `[ ]` = unimplemented or device/live acceptance only. A file or route is not evidence.

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

Recorded in `implementation-progress.md` and `selected-workflow-coverage.md`. Backend regression passed 35/35 at that time; later runs reached 44/44. The 23-feature table there lists TTT (19) and knowledge continuity (20) as **MISSING** — TTT is now addressed (2026-09-25); continuity remains built as the Knowledge Transfer Plan feature.

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
- Knowledge continuity recorded-coverage indicators (§20 in the old table).
- Persisted achievement award records plus one-time notifications (currently derived-only).
- Departmental scoping beyond the existing department filter.
- Real role-management UI (role change currently happens only through TTT verification).
- Recognition of previously-unmounted legacy `p3*` collections (`p3results`, `p3evaluations`, `p3submissions`, `p3capabilitysnapshots`, `p3aidrafts`, `p3evidencereviews`) — written only by the unrouted `part3Service.js` v1 engine; left in place, not authoritative.
