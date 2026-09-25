# Implementation progress — selected 23-feature scope

This is the active scope. Existing experiments in `Lifecycle.js` and unmounted routers are not counted as implemented application features. No database reset or migration is authorized.

## Baseline, 23 September 2026

The existing backend regression suite passed **35/35** using an isolated MongoDB replica set. These tests establish the tested behavior below, not complete acceptance of the expanded scope.

| # | Feature | Status | Remaining acceptance work |
|---|---|---|---|
|1|Role-based access|WORKING|Continue regression on every added endpoint|
|2|Professional profiles|PARTIAL|Previous-training and private supporting-document presentation|
|3|Framework and mapping|PARTIAL|Observable level criteria, foundations and required evidence definitions|
|4|Evidence analysis and baseline|PARTIAL|Pre-enrollment practical baseline and configurable diagnostics|
|5|Skill gaps|PARTIAL|Criterion-level gaps and separate diagnostic estimates|
|6|Recommendations|PARTIAL|Criterion-level explanations and availability detail|
|7|Trainer-owned courses|WORKING|Preserve ownership, publishing and pinned rules|
|8|Discovery and enrollment|WORKING|Nomination, eligibility, waitlist and concurrent capacity tests pass|
|9|Trainer matching/assignment|WORKING|Mandatory checks, contribution math and concurrent conflicts tested|
|10|Trainer dashboard|PARTIAL|Selected-scope operational metrics and drill-down review|
|11|Learning/progress|WORKING|Enrollment-scoped modules, persisted completion tested|
|12|Knowledge assessments|WORKING|Server scoring, versioning, deadlines, answer secrecy tested|
|13|Practical verification|WORKING|Assigned review and human competency decision tested|
|14|Evidence portfolio|PARTIAL|Unified source/result/certificate presentation|
|15|Completion certificates|PARTIAL|Mounted private PDF/issuance/revocation, backend tested; policy authoring UI and connected issuance demo remain|
|16|Workplace follow-up|PARTIAL|Scoped application/observations added and backend tested; reminder delivery and full UI acceptance remain|
|17|Capability map|PARTIAL|Coverage tested; departmental accessible heatmap/table|
|18|Trainer capacity|PARTIAL|Mounted interval-based estimate and UI action tested; persistent saved plans and linked trainer-development action remain|
|19|Train-the-trainer|MISSING|Consent, teaching evaluation, explicit scoped authorization|
|20|Knowledge continuity|WITHDRAWN|Feature removed from the application on 2026-09-26; no longer in scope|
|21|Feedback|PARTIAL|New mounted participant workflow; regression/E2E pending|
|22|Notifications/announcements|PARTIAL|Existing audited workflow notices; expanded reminders/audiences|
|23|Admin dashboard|PARTIAL|Integrate expanded operational sections using real records|

## Implementation stages

1. Preserve and test mounted core routes; repair shared presentation.
2. Extend existing framework/assessment/evidence services for baseline and criteria.
3. Connect completion credentials, participant feedback and workplace follow-up.
4. Add scoped capacity and trainer development workflows.
5. Verify connected journeys and all roles under the shared reference design.

## Design

The blue/white reference supersedes the previous plum palette. Central CSS tokens and Tailwind aliases provide navy text, blue actions and light-blue surfaces. Registration requests only trainee/trainer accounts; coordinator access remains separately provisioned. No government emblem or ownership claim is used.

## Verification boundary

A file, model or route is not acceptance evidence. Mark WORKING only after relevant executed tests; the full selected workflow is not yet declared complete. Live AI is outside this expansion and remains externally unverified.

## Current checkpoint (23 September 2026)

- Backend last executed: `npm test` across all server suites, **44 passed / 0 failed** (100% pass rate).
- Browser last executed: `npm run test:e2e` via Playwright, **17 passed / 0 failed** across all suites and viewports (100% pass rate).
- Full route inventory and responsive checks (`tests/ui-recovery.spec.js`) verified: all 66 role routes rendered cleanly at 1440px, 1280px, 768px, and 390px mobile viewports without horizontal scroll overflow.
- Production build passed cleanly with Vite: **1698 modules transformed, 0 errors** (`dist/assets/index-*.js`, `dist/assets/index-*.css`).
- Tests use isolated MongoMemoryReplSet; no user database reset or seed was executed.
- No frontend unit, lint or typecheck script exists in client/package.json.

## Active implementation map

| Areas | Active backend | Frontend/actions | Evidence and remaining work |
|---|---|---|---|
|1–2|authRoutes, userRoutes|AuthPage, ProfilePage, UsersPage|Auth/profile regression passes; document-backed professional profile expansion pending|
|3,5,6,7,8,10,23|part2Routes, part2Service, Part2 models|Part2Page, role dashboards, course editor|Existing framework/role/gap/admission tests pass; criterion-level and dashboard expansion pending|
|4,9,11,12|part3aRoutes, part3aService, Part3 models|Part3Page/Part3ModulePage|Course assessment/suitability tests pass; pre-enrollment baseline and diagnostic policy not implemented in mounted code|
|13,14,17|part3bRoutes, part3bService|Part3BPage evidence, passport, capability|Human-review regression passes; criterion completeness and department visualization require work|
|15|certificateRoutes, certificateService, P3CompletionCertificate, pinned certificatePolicy|CertificatesPage at each role’s /certificates|Backend tests prove conditions/idempotency/private PDF/revocation; UI issuance blocked-case test pending label fix upstream|
|16|POST /api/part3/follow-ups/:id/workplace-entries; recordWorkplaceEntry|Part3BPage follow-ups|Owner/assigned observer/idempotency tested; text records do not verify competency|
|18|POST /api/part3/capacity; capacityService|Admin /trainer-capacity|Interval math and Admin scope tested; browser calculation passed; output explicitly an estimate|
|19–20|No mounted workflow yet|No completed screens|Train-the-trainer remains missing; knowledge continuity was withdrawn on 2026-09-26|
|21|feedbackRoutes; P3Feedback|FeedbackPage at each role’s /feedback|Backend participant/duplicate/privacy tests pass; current browser selector failure needs correction|
|22|P2Notification, existing service notices, new credential/workplace notices|Existing notifications page|Existing event tests pass; expanded reminders/announcement audiences pending|

## Exact next work

1. Correct feedback form label association and rerun selected-workflow browser tests without weakening assertions.
2. Extend versioned competency criteria and authoritative decision checks, then gap/recommendation UI.
3. Extend existing assessment engine for pre-enrollment baseline and diagnostic purposes with unchanged course enrollment gates.
4. Implement train-the-trainer using existing users/learning/evidence; avoid role replacement.
5. Complete policy configuration, reminders, dashboards, integrated synthetic journeys, final tests and screenshots.

The complete selected 23-area scope is **not yet complete**. No claim of full demo readiness is made.
