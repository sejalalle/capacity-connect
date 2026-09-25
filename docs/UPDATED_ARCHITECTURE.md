# UPDATED ARCHITECTURE — agreed target

This is the **target**. It is not evidence that a feature works. See `IMPLEMENTED_WORKFLOWS.md` for actual behaviour.

Numbering follows the agreed Samarthya flow. Each section carries a scope label (**Core / Demo integration / Later / Proposed**). Where the problem statement (PS 26075) matters, its wording is quoted.

## 1. Overall idea — competency-based learning and capacity building

**Core.** Role requirement → profile and evidence → competency analysis → skill gap → development recommendation → trainer matching → learning → assessment → evidence → human verification → updated competency → organizational capability → training demand → trainer capacity → Train-the-Trainer → verified trainer.

Invariant: learning, assessment, evidence acceptance and competency remain four separate things. None substitutes for another.

## 2. Trainee side

**Core.** Login/signup (approval-gated); professional profile (qualification, work experience, previous training, skills, interests, certifications); role and required competencies; current demonstrated/verified capability with supporting evidence; skill-gap analysis; development recommendation with reasons; course discovery and enrollment; learning with progress tracking; assessments (MCQ scored server-side); evidence and human verification; certificate (completion only); updated capability with the next development requirement.

## 3. Supporting trainee features

**Core.** Training calendar; attendance/participation; achievements/badges (**separate from certificates**); evidence portfolio; feedback (course, resource, trainer, experience); notifications (enrollment, deadlines, assessments, certificates, recommendations, announcements); **trainee-facing trainer matching** (see §16).

## 4. Trainer side

**Core.** Login/signup; trainer profile; expertise and evidence review; verified capability per competency; availability and capacity; trainer dashboard; assigned trainees; course and module management; resource library; assessment creation (questionnaires, MCQs, deadlines, criteria); training sessions; trainee monitoring; assessment review; practical evaluation with criteria/rubrics (demonstrated / not demonstrated / needs further development); competency evidence review; feedback.

## 5. Train the Trainer (TTT)

**Core.** Not a fourth role. Nomination → nomination details → accept & enroll → TTT program overview → TTT learning modules → teaching practice → teaching practice submission → evaluation → program completion → **admin verification** → verified trainer. An authorized trainer conducts TTT and evaluates teaching practice; the coordinator verifies. A candidate stays a trainee/employee until verification.

## 6. Admin side

**Core.** Dashboard (users, courses, enrollments, competency gaps, trainers, training activity, pending actions, TTT activity); user management (review, approve, roles, account status); competency framework (competencies, levels, level descriptions, criteria, evidence requirements); role mapping (role → competency → required level); training management (courses, enrollments, assessments, certifications); announcements and homepage publishing (§11).

## 7. Organizational capability

**Core/Proposed.** Individual verified competencies aggregated into an organizational view: required vs verified headcount per competency, with `NOT_ASSESSED` kept separate. Presented as application-level indicators, not predictions.

## 8. Training demand

**Proposed.** The explicit middle link: "how many people need development in competency Y", derived from required vs verified headcount and pending training needs. Distinct artifact from capability coverage and trainer capacity.

## 9. Trainer capacity

**Core/Demo integration.** Whether recorded eligible and available trainers can meet the driving demand; surfaces a trainer-capacity gap.

## 10. TTT as the organizational solution

**Proposed.** Capability gap → training demand → trainer capacity → TTT → new verified trainers → expanded trainer pool. This is the loop closed by §5.

## 11. Admin communication

**Core.** Announcements, notifications, training updates and organizational messages delivered to the relevant audience. Publishing **fans out notifications** but never changes workflow state.

## 12. Reports and analytics

**Core/Proposed.** Training, enrollment, participation, assessment completion, certification, competency levels, skill gaps, capability coverage, trainer availability/capacity/demand, and TTT progress. No charting dependency is assumed; tables are acceptable.

## 13. Feedback and improvement

**Core.** Feedback from trainees/trainers analysed to identify course, resource, trainer and experience issues.

## 14. Complete story

**Core.** The end-to-end flow in §1, described as one narrative in `README.md` and the demo script.

## 15. Cross-cutting: security, audit, demo honesty

**Core.** JWT auth, approved-account checks, role + ownership + scope authorization, transactional admission/verification, audit records with a required `correlationId`, deduplicated notifications, and `isSynthetic`/`demoNamespace` labels on demo data.

---

## Additions beyond the source (all **Proposed**)

These were designed by us and are labelled so they are never mistaken for PS requirements:

- **§16 Trainee-facing trainer matching** — "here is your trainer, and why", read-only for the trainee's own sessions; the coordinator still assigns.
- **§17 Announcements as first-class content** — a `P2Announcement` collection with homepage flag and audience fan-out, distinct from transactional `P2Notification`.
- **§18 Achievements as derived milestones** — computed from stored records; no free-form badge table.
- **§19 TTT eligibility rule** — demonstrated subject competence at/above the program target level, not already a verified trainer for that competency; env-configurable via `TTT_MIN_EXPERT_LEVEL`.
