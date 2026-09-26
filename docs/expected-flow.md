# EXPECTED FLOW — the acceptance basis

Source: the product owner's stated Samarthya flow, recorded **2026-09-26**. This document records **what is expected to exist**, item by item, in the order stated. It is a **test basis, not a claim of implementation**.

How to use it:

- Expected behaviour lives **here**. Actual behaviour lives in `IMPLEMENTED_WORKFLOWS.md`. Per-item delivery and evidence live in `flow-coverage.md`.
- Status values in `flow-coverage.md`: **Implemented** (a mounted surface exists and was exercised), **Partial**, **Missing**.
- The AI stance in each step is part of the expectation, not decoration:
  - **❌** AI must not make the decision.
  - **⚪** AI is optional assistance.
  - **🟢** AI may explain or draft, while structured data or an authorized human stays authoritative.
- Two distinctions are load-bearing and must never be collapsed:
  - **Profile ≠ competency proof.** A self-declared skill is not a level.
  - **Learning completion ≠ verified competency**, and **certificate ≠ verified competency**.

---

## Part A — Trainee / employee flow

The trainee side starts with one question: *"For my role, what am I supposed to be capable of?"*

### 1. Role & Competency Requirement

The system knows the employee's organizational role, and from it the required competency and required level.

```
Employee → Forecasting Officer → Required Competency: Radar Interpretation → Required Level: L3
```

The framework defines what each level means, e.g. Radar Interpretation: L1 Basic Radar Concepts, L2 Radar Pattern Interpretation, L3 Complex Radar Analysis. With a role requiring L3, the system has a target to compare against. It is not recommending courses randomly.

**AI: ❌** Not an AI decision. It comes from the organization's competency framework and role mapping.

### 2. Professional Profile & Evidence Collection

The employee creates a professional profile: qualification, work experience, previous training, certifications, skills, areas of expertise. **Profile ≠ competency proof** — writing "I am expert in Radar Interpretation" does not make the system treat them as L3.

Evidence is collected separately: previous assessments, MCQ results, practical activities, assignments, authorized review feedback, previous training records. For a new employee a baseline assessment can establish an initial level.

Example: Asha declares Advanced. The system holds previous training → Basic; MCQ → 65%; practical → L1 performance; authorized review → L1. The system does not blindly trust the self-declared skill.

**AI: ⚪** May summarize profile information; must not decide the competency.

### 3. Competency Analysis

*"Based on the available evidence, what competency does this person currently demonstrate?"*

Evidence (MCQ, practical, previous training, experience, authorized review) is compared against the defined competency-level criteria. Required → L3, Current → L1.

Current demonstrated competency is not simply what the employee claims; it is supported by evidence.

**AI: ❌** No final competency-level decision. The logic is defined criteria + evidence + authorized verification.

### 4. Skill-Gap Identification

Required = L3, Current = L1, so L2 and L3 are missing; skill gap = **L2–L3**. The system goes further than "you need training" and identifies what exactly is missing (e.g. Radar Pattern Interpretation, Complex Radar Analysis), making the recommendation targeted.

**AI: 🟢** May explain the gap ("Your role requires L3 while current evidence supports L1; development is required in the criteria associated with L2 and L3"). Must not independently decide "you are L1".

### 5. Explainable Learning Recommendation

Given Current L1, Required L3, Gap L2/L3, the system asks what learning addresses this particular gap, e.g. Advanced Radar Analysis → Advanced Radar Interpretation. And it answers *why this course*: "This course addresses the competency criteria required for progression toward the required level."

**AI: 🟢** May generate the human-readable explanation. The underlying recommendation is competency–course mapping.

### 6. Trainer Matching

*"Which trainer is relevant for this particular competency gap?"* Factors: subject expertise, verified competency, teaching capability, availability, relevant training history. The system should explain the match: "Matched because the trainer has verified expertise in the required competency and is available for the relevant training."

**AI: 🟢** May explain why the trainer was matched; the underlying factors remain structured system data.

### 7. Learning & Training

The trainee accesses courses, modules, videos, presentations, PDFs, study material, activities and practical tasks. The system tracks progress (e.g. Module 1 ✓, Module 2 ✓, Module 3 60%, Module 4 ○). The trainer manages content; the trainee consumes it.

**AI: ⚪** Not necessary for the core learning system.

### 8. Knowledge Assessment

The trainee takes assessments, e.g. 10 MCQs → 8 correct → 80%. The score becomes evidence. **80% on an MCQ does not automatically mean L3 competency** — theory knowledge is not the same as practically performing the skill.

**AI: 🟢** May draft MCQs from course material, but AI draft → trainer review → question published. AI must not blindly publish questions.

### 9. Practical Competency Verification

*"Can the employee actually demonstrate the skill?"* A scenario is given, the employee interprets it, and performance is evaluated against a rubric/criteria, producing practical evidence.

**AI: ❌** Must not make the final practical competency decision.

### 10. Human-Verified Competency

Learning completion + MCQ results + practical performance + assignments + previous experience + authorized review → **VERIFIED COMPETENCY**. The platform deliberately distinguishes *learning completion ≠ verified competency*. Final verification is performed through the authorized process.

**AI: ❌** No final AI decision. AI may organize or summarize; it cannot say "you are officially L3".

### 11. Evidence Portfolio

The record of why the competency has that status: course completed + MCQ result + practical result + authorized evaluation + certificate. If an administrator later asks "why is this employee considered L2?", there is an evidence trail.

**AI: ⚪** May summarize the evidence; cannot modify it or make the final decision.

### 12. Certificate / Credential

After required training requirements are completed, the configured process can issue a certificate or credential. **Certificate ≠ verified competency**: a course can be completed and a certificate issued without the level required by the framework being demonstrated.

**AI: ❌** No AI decision.

### 13. Updated Individual Capability

Once competency is verified the capability record updates: Radar Interpretation L1 ✓, L2 ✓, L3 ○, current verified level L2, next development L3. The employee can see current capability, required capability, completed development, remaining gap and next development requirement — a continuous cycle rather than one-time training.

---

## Part B — Trainer side

The trainer's question: *"How do I deliver training and help verify whether the trainee has developed the required capability?"*

### 14. Trainer Matching / Assignment

The trainer receives the relevant trainee/training assignment, connected to the competency requirement — not random trainees. Trainer information: expertise, verified competency, teaching capability, availability, training history.

**AI: 🟢** May explain the match.

### 15. Learning & Training Management

The trainer manages courses, modules, videos, presentations, PDFs, study materials, activities and practical tasks. Trainer creates/manages content → trainee accesses it → progress is recorded.

**AI: ⚪** May assist with content creation; the trainer remains responsible for the content.

### 16. Trainee Progress Monitoring

*"How is my assigned trainee progressing?"* e.g. Asha, Course Radar Interpretation: progress 75%, assessment completed, practical pending.

**AI: ❌** Not necessary; progress comes directly from actual system activity.

### 17. Knowledge Assessment

Course material → AI-assisted MCQ drafting → trainer review → assessment → trainee attempts → score → evidence.

**AI: 🟢** MCQ drafting. **Not** AI deciding competence.

### 18. Practical Competency Verification

Radar scenario → trainee performs task → trainer reviews → rubric → practical evidence.

**AI: ❌** Final decision is not AI-based.

### 19. Authorized Evaluation / Review

The trainer/authorized process contributes to competency verification, moving from "the trainee completed training" to "the required competency has been demonstrated according to the verification process".

**AI: ❌** Final verification is human/authorized.

### 20. Trainer Capacity

Trainer eligibility, expertise and availability become organization-level information answering "do we have enough trainer capacity?", which matters later for training demand.

**AI: ❌** No AI decision required.

### 21. Train-the-Trainer

When training demand exceeds available trainers, the organization identifies a strong subject expert. Being a strong subject expert does **not** automatically make someone a trainer:

```
Strong Subject Expert → TTT Candidate → TTT Learning → Teaching Practice → Evaluation → Verification → Verified Trainer
```

**AI: 🟢** May explain/summarize candidate information. **❌** Does not make the final verification decision.

### 22. Expanded Trainer Pool

Verified trainer → trainer pool → more available training capacity. An organizational capacity-building loop.

---

## Part C — Admin / organization side

The Admin asks: *"What capabilities does the organization currently have, where are the gaps, how much training is required, and do we have enough trainers?"*

### 23. Organizational Capability Map

Individual verified competency records are aggregated. e.g. Radar Interpretation L3: required 40, verified 24, below 40 → 16. Admin sees how many people actually have the required competency, not "Asha completed Course X".

**AI: ❌** No AI decision.

### 24. Organizational Skill Gaps

Required organizational capability vs current verified capability → difference → organizational skill gap (required L3 40, verified 24, gap 16).

**AI: ❌** Calculable directly from structured data.

### 25. Training Demand

The organizational gap becomes an actual training requirement: 16 employees need Radar Interpretation L3 → training demand = 16.

**AI: ❌** No AI required.

### 26. Trainer Capacity Intelligence

*"Can we actually train those 16 people?"* Demand 16, eligible trainers 4, available trainers 2 → demand > available capacity → potential trainer-capacity gap. Capacity considers eligibility and availability.

**AI: ❌** Structured capacity calculation.

### 27. Train-the-Trainer (organizational)

Capacity gap → find strong subject experts → TTT candidate → TTT learning → teaching practice → evaluation → verification → verified trainer. A normal LMS says "16 employees need training"; Samarthya additionally asks "do we have enough people capable of delivering it?", and if not, "can we develop more trainers?"

**AI: ❌** human verification.

### 28. Expanded Trainer Pool

New verified trainer → trainer pool → trainer capacity increases. The organizational loop:

```
Skill Gap → Training Demand → Trainer Capacity Check → Capacity Gap → Train-the-Trainer → New Verified Trainer → Expanded Trainer Capacity
```

### 29. Continuous Feedback & Improvement

Users give feedback on course, learning resources, trainer and training experience. e.g. 100 responses → summarization → common issues: practical examples needed, Module 3 difficult, more trainer sessions requested. The improvement decision remains with the organization.

**AI: 🟢** May summarize large amounts of feedback.

### 30. Notifications

Enrollment, assessment deadlines, training reminders, certificate notifications, recommendations, announcements. Event/rule based.

**AI: ❌** Not necessary.

---

## The whole project in one story — Asha's journey

1. **Organization defines the requirement** — Forecasting Officer → Radar Interpretation → required L3.
2. **Asha joins / creates profile** — qualifications, experience, previous training, certifications, skills.
3. **System collects evidence** — previous assessments, MCQs, practicals, assignments, training records, authorized reviews.
4. **Current capability is established** — required L3, current demonstrated L1.
5. **Gap identified** — L1 current; L2 and L3 missing.
6. **Development recommended** — gap → Advanced Radar Analysis → recommended course; the system explains why.
7. **Trainer matched** — required competency + trainer expertise + verified competency + teaching capability + availability → suitable trainer.
8. **Learning happens** — course → modules → videos/PDFs → activities → practical tasks.
9. **Knowledge assessed** — MCQs → score → evidence.
10. **Practical ability tested** — radar scenario → Asha performs → rubric → practical evidence.
11. **Human verification** — learning + MCQ + practical + experience + authorized review → verified competency.
12. **Evidence stored** — course + MCQ + practical + evaluation + certificate → evidence portfolio.
13. **Capability updated** — before L1; after verification L2; required L3; remaining L3 development.

**Then Admin looks at the organization.** 40 Forecasting Officers need L3; verified L3 = 24; below L3 = 16 → organizational skill gap 16 → training demand 16. Eligible trainers 4, available trainers 2 → potential capacity gap → strong subject experts → TTT → teaching practice → evaluation → verification → new verified trainer → trainer pool expands. That is how individual learning connects back to organizational capacity.
