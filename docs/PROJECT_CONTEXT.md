# PROJECT CONTEXT — repository facts

**Inspect code before changing it. This snapshot is not proof a feature works.**

## What this is

SAMARTHYA (PS 26075, "CAPACITY CONNECT — A Digital Capacity Building and Learning Management Portal") — a MERN application for organizational training, competency development and knowledge sharing. Ministry of Earth Sciences / India Meteorological Department, theme Smart Education.

Project status: **demonstration application using synthetic data**. Not an official IMD deployment.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite 6, React Router 7, Axios, Tailwind CSS 3.4, lucide-react |
| Backend | Node.js ≥22 (ESM), Express 5, Zod, JWT, bcrypt, pdfkit |
| Database | MongoDB (Mongoose 8) with transactions (replica set required) |
| Private files | MongoDB GridFS bucket `part3PrivateFiles` |
| Tests | `node:test` + `mongodb-memory-server` (replica set); Playwright E2E |

## Repository layout

| Path | Purpose |
| --- | --- |
| `client/` | React app; routing via `src/utils/navigation.js` + `src/routes/AppRoutes.jsx`; services in `src/services/` |
| `server/src/models/` | `User.js`, `Part2.js`, `Part3.js` (all models; `make()` factory) |
| `server/src/routes/` | Small route files mounted in `src/app.js` |
| `server/src/services/` | Business rules |
| `server/src/seed/` | Synthetic data (`createAdmin`, `createDemo`, `demoPart2`, `demoPart3`, `demoTrainer`) |
| `server/test/` | Backend suites (`*.test.js`) + `e2e-server.js` |
| `tests/` | Playwright specs |
| `docs/` | This documentation set |
| `data/` | Local MongoDB data directory (not versioned) |

## Commands

```bash
npm test --prefix server      # backend suite
npm run build --prefix client # production build
npm run test:e2e              # Playwright
npm run seed:admin --prefix server
npm run seed:demo --prefix server   # refuses NODE_ENV=production
npm run dev --prefix server
npm run dev --prefix client
```

Demo accounts (after seeding): `asha.sharma@example.test`, `trainee2..10@example.test`, `trainer1..3@example.test`, password `DemoOnly!2026`. Admin comes from `ADMIN_SEED_EMAIL`/`ADMIN_SEED_PASSWORD`.

## Roles and statuses

- Roles: `trainee`, `trainer`, `admin`. Registration allows only trainee/trainer; admin is seeded. A `trainee` is promoted to `trainer` only by TTT verification.
- Account status: `pending`, `approved`, `rejected`, `suspended`. Non-approved accounts cannot log in.
- `User.jobRole` is the **professional** role (for example Forecasting Officer) that competency requirements are mapped against. It is set by a coordinator and is unrelated to the access role.

## Known gaps and cautions

- The legacy engine `server/src/services/part3Service.js` is only partially used (`recordPart3Audit`, `requirePermission`); its v1 functions and the collections `p3submissions`, `p3evaluations`, `p3results`, `p3evidencereviews`, `p3capabilitysnapshots`, `p3aidrafts` are written by nothing at runtime. Not authoritative.
- `User.jobRole` references `"JobRole"`; the registered model is `P2JobRole`. Avoid `populate("jobRole")`.
- No frontend unit/lint/typecheck script exists; verification is the Vite build + Playwright.
- There is no role-change API; role changes occur only through TTT verification.
- `User.jobRole` (the **professional** role) is separate from `User.role` (application access) and is set only through `PATCH /api/users/:id/job-role` (admin). Do not conflate them.
- Reminders are the only scheduled work (`services/reminderService.js`, driven from `server.js`). Tests import `app.js`, so the scheduler never runs under test; use `POST /api/notifications/reminders/run` for a deterministic run.
- `docs/` mixes a new target/actual set with older verification records — see `docs/README.md` for which is which.

## Testing boundary

Tests use an isolated in-memory replica set and never touch `MONGO_URI`. Backend suite runs with `--test-concurrency=1`. On a cold machine the first run downloads the MongoDB binary.

Latest executed: **78/78 backend tests pass** (2026-09-26). Latest `npm run build --prefix client`: clean, 1704 modules.
