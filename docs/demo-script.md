# SAMARTHYA 5–7 minute synthetic demo script

All people, competencies, levels, outcomes and organization records shown in this script are synthetic demonstration data. They do not represent an official IMD deployment or measured workforce impact.

## Before the presentation

1. Use a dedicated development database and run `npm run seed:admin --prefix server`, followed by `npm run seed:demo --prefix server`.
2. Start the backend and frontend. Keep AI disabled unless a live provider and its data-handling approval were separately verified.
3. Open one normal browser window and keep the three local demo logins ready. Never use these shared credentials outside a local synthetic environment.

## 0:00–0:45 — Configured capability context

Sign in as the coordinator. Open **Competency Framework** and **Job Role Requirements**. Explain that access roles and proposed professional roles are separate, the displayed levels have plain-language definitions, and every seeded record is marked as demo data. If time permits, create a draft synthetic competency version and a proposed role requirement; these actions are audited and do not change a trainee's demonstrated competency.

## 0:45–1:35 — Asha's need and gap

Sign in as `asha.sharma@example.test`. Open **Competency Passport** and **Skill Gaps**. Point out the reviewed lower radar level, the separate `NOT_ASSESSED` record, and the proposed higher role requirement. Open **Training Needs**, submit the synthetic radar practice request, then switch to the coordinator to move it under review and approve it with a reason.

State clearly that missing evidence is unknown, not zero ability, and that an approved need is not admission.

## 1:35–2:25 — Eligibility and admission exception

Return to Asha. Open **My Nominations** and the returned radar nomination. Show the reason, add the requested clarification and resubmit. As coordinator, move it under review and approve it. The server reruns eligibility against the batch's pinned rule version and allocates a seat transactionally.

Briefly show the separate waitlisted/full-capacity example. Explain that a full batch is a capacity outcome and never silently becomes failed eligibility.

## 2:25–3:10 — Explainable trainer selection

As coordinator, open **Trainer Discovery**. Use the sample batch and the unassigned “practice review” session, then calculate suitability. Show mandatory checks, recommendation-point contributions, the configuration version, missing-information reasons and the unavailable trainer. Assign the highest-ranked eligible trainer explicitly.

Explain that recommendation points are not a probability or an official IMD/WMO method. The coordinator makes and audits the final decision.

## 3:10–4:10 — Learning, assessment and human evaluation

As Asha, open **My Learning**, mark the sample module complete and state that this does not update competency. Open **Assessments**, complete the reviewed MCQ and submit the practical response. The MCQ is scored on the server and the trainee receives a submission receipt without unpublished answer keys.

As `trainer2@example.test`, open **Evaluation Queue**. Evaluate the practical with criterion-level marks and comments. Emphasize the explicit evaluator assignment and the fact that evaluation does not publish a result or promote competency.

## 4:10–5:00 — Controlled result and evidence

As coordinator, open **Result Publication**, prepare the result and publish it after checking required components. Return to Asha and show the published result. Create evidence by referencing the practical submission and published result, avoiding a duplicate upload.

As coordinator, assign `trainer2@example.test` as reviewer. As that reviewer, verify the evidence for its stated purpose, then record the separate rubric-based human competency decision.

## 5:00–5:50 — Current record, history and follow-up

Return to Asha. Refresh **Competency History**, **Competency Passport** and **Skill Gaps** to show the stored decision and recalculation. Sign out and in once to demonstrate persistence.

Show the seeded higher-level `NEEDS_PRACTICE` case: the valid lower demonstrated level remains present and a guided-practice follow-up is available. A completed course, accepted evidence or AI suggestion never promotes competency by itself.

## 5:50–6:30 — Organizational coverage and boundaries

As coordinator, open **Organizational Capability**. Show numerator, denominator, data timestamp, not-assessed records and the application-level “insufficient evidence coverage” indicator. Explain that these are counts from stored reviewed evidence, not predictive forecasts or claims about unrecorded expertise.

Finish by showing AI disabled mode and deterministic catalogue search. Manual workflows remain available. State that live AI, production malware scanning and deployment-specific infrastructure require separate external verification.
