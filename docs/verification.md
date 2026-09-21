# Part 2 verification record

## Baseline

- Client production build passed before the Part 2 correction.
- Server tests could not bind MongoDB Memory Server inside the restricted sandbox (`EPERM 0.0.0.0`). The same baseline suite was rerun with localhost permission to separate environment restrictions from code failures.
- Source inspection found visible competition branding and active trainer matching, assessment, evidence, result and certificate workflows outside the corrected Part 2 boundary.

## Required workflow checks

- Part 1: registration, pending login denial, coordinator approval, JWT refresh, role redirect, profile persistence, token revocation.
- Authorization: trainee/trainer denial on user administration, record ownership, approved-account middleware.
- Gap logic: known two-level gap, `NOT_ASSESSED` for missing evidence, framework incompatibility.
- Needs: draft, submit, return/reason, edit/resubmit, review and decision history.
- Paths: published path assignment tied to an approved need and explicit course explanations.
- Rules: batch pins a rule version; publishing another version does not mutate the batch.
- Eligibility: explicit checks and source references; missing information is distinct from ineligibility.
- Nominations: ownership, duplicate index, valid transitions, stale revision rejection, return/resubmit.
- Admission: one transaction, final-seat race, unique enrollment, safe retry, cancellation releases once.
- Waitlist: no automatic promotion.
- Audit/notifications: status events and admission agree; recipient/event IDs prevent duplicates.
- Seed: stable namespace and repeatable upserts.

## Part 3A checks

- Trainer management: self-declaration stays pending until a reasoned coordinator review; review history and synthetic source are retained.
- Suitability: all mandatory checks, `NEEDS_INFORMATION`, exact seven-factor contributions, deterministic ordering and configuration version.
- Assignment: stale shortlist rejection, confirmation-time recheck, lower-rank reason and atomic overlapping-schedule protection.
- Learning: confirmed-enrollment access and ownership; module completion does not modify competency.
- Questions and assessments: distinct stable options, reviewed-only publication, answer-key secrecy and frozen published versions.
- Attempts: server start/deadline/order, save/resume, timeout recovery, attempt limit, server scoring and idempotent repeat submission.
- Human evaluation: explicit evaluator assignment, no self-evaluation, rubric limits and retained submission/evaluation versions.
- Results: draft privacy, scoped publication, correction/supersession history and no competency update.
- Files: allowed type and content checks, 5 MB parser limit, GridFS metadata and owner/batch-scoped download denial.
- Part 3B integration: evidence, explicit competency decisions, history, follow-up, capability and optional AI routes extend the same `/api/part3` boundary. See `docs/part3b-verification.md` for their authorization and record contracts.

## Visual checks

Playwright captures login, trainee dashboard/competency screens and nomination history at 1440px, 768px and 390px. Checks include horizontal overflow and browser exceptions. A source scan covers removed visible competition terms; runtime tests also check the public page text and role-specific navigation.

These checks validate the prototype implementation. They are not an accessibility certification, production penetration test, load test or stakeholder validation of proposed workflow rules.
