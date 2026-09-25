# IMPLEMENTED WORKFLOWS — what actually works

Snapshot date: **2026-09-26**. This is the **actual**, not the target. Inspect code before relying on any row.

## Architecture section → working behaviour or boundary

| § | Area | Actual behaviour | Boundary |
| --- | --- | --- | --- |
| 1 | Competency workflow spine | Registered → approved → profile → gap → training need → nomination → admission → learning → assessment → evaluation → result → evidence → human decision → passport. DB-backed and tested. | AI assistance is strictly explanation/drafting; human decisions remain authoritative. |
| 2 | Trainee side | Passport, gaps, training needs, nominations, learning, assessments, evidence, follow-ups, certificates all mounted. **AI gap and course recommendation explanations** available. | AI explanations provide reasoning context; never modify records. |
| 3 | Supporting trainee features | Calendar (list), notifications, feedback, certificates, **achievements**, **trainer match** mounted with **AI 1-line match justifications**, and **video lectures** (upload → processing → ready, inline playback that resumes). | Calendar is not a month grid. Video is direct upload only — no transcoding or HLS; playback is not evidence. |
| 4 | Trainer side | Profile/expertise, availability, assignments, learning delivery, question bank, assessments, evaluations, results, evidence review, competency decisions mounted. | No dedicated resources-only or sessions-only page. |
| 5 | Train the Trainer | **New.** Program → nomination → accept → teaching practice → evaluation → admin verification. Verification creates reviewed expertise and promotes a trainee to trainer. | Eligibility thresholds are proposed config; live demo acceptance pending. |
| 6 | Admin side | Users/approval, competency framework, job-role requirements, courses, batches, nominations, audit, dashboards. | No force-role change outside TTT; reports are tables, no charts. |
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

- **Models:** `server/src/models/{User,Part2,Part3}.js` (45+ models; new TTT, `P2Announcement`, `P3MediaAsset` and `P3MediaProgress` added).
- **Routes:** `server/src/routes/` — mounted in `server/src/app.js`:
  - `/api/auth`, `/api/users`
  - `/api` → `part2Routes.js`, `announcementRoutes.js`
  - `/api/part3` → `part3aRoutes.js`, `part3bRoutes.js`, `feedbackRoutes.js`, `certificateRoutes.js`, `capacityRoutes.js`, `mediaRoutes.js`, `tttRoutes.js`
- **Services:** `server/src/services/` — `part2Service`, `part3aService`, `part3bService`, `tttService` (**new**), `demandService` (**new**), `capacityService`, `criterionService`, `certificateService`, `aiService`.
- **Client pages (new):** `client/src/pages/ttt/TttPage.jsx`, `pages/demand/TrainingDemandPage.jsx`, `pages/announcements/AnnouncementsPage.jsx`, `pages/achievements/AchievementsPage.jsx`, `pages/trainer/TrainerMatchPage.jsx`, `pages/media/MediaLibraryPage.jsx`, `components/media/VideoLibrary.jsx`.
- **Client wiring:** `client/src/utils/navigation.js` (nav + route generation) and `client/src/routes/AppRoutes.jsx` (page dispatch).
- **Page scope:** `docs/page-inventory.md` is the agreed per-role page list and its verified mapping to code.
- **Seed:** `server/src/seed/demoPart2.js`, `demoPart3.js` (now seeds a TTT program, a nominated candidate, an evaluated practice and announcements).

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
- TTT eligibility, suitability weights, demand/coverage thresholds and pass rules are **proposed application configuration**.
- Live AI, malware scanning, production TLS/reverse proxy, managed secrets, backups and monitoring are outside the repository.
- The legacy `part3Service.js` v1 engine remains unmounted; its collections are not authoritative.
