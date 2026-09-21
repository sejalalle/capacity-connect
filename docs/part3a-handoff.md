# Part 3A handoff

Part 3A ends at authorized result publication. It does not review assessment work as competency evidence and does not update `P2CompetencyRecord`.

## Stable references for Part 3B

- `P3TrainerExpertise._id` identifies the reviewed expertise record. `frameworkVersion`, `approvedLevel`, reviewer, review time, reason/source and `reviewHistory` preserve its basis.
- `P3Assessment._id` plus `version` identifies the frozen course/batch assessment. `competency`, `frameworkVersion` and `rubricVersion` are mappings and do not prove competence.
- `P3AssessmentAttempt._id` identifies an immutable submitted or timed-out MCQ attempt. Its score is server-calculated from the frozen `questionVersions`.
- `P3AssessmentSubmission._id` plus `version` identifies a practical or written submission revision. `previousSubmission` links revision history.
- `P3HumanEvaluation._id` plus `version` identifies the assigned evaluator's rubric decision. Criterion marks, comments, evaluator and evaluation time remain traceable.
- `P3ResultVersion._id` plus `version` identifies a result version. `previousResult` and `SUPERSEDED` preserve correction history.
- `P3PrivateResource._id` is the only file reference exposed to domain records. GridFS object IDs and storage paths are never public URLs.
- `P2AuditLog` and `P2Notification` retain action/entity references for expertise review, assignment, assessment publication, attempt submission, evaluation and result publication/correction.

Part 3B may reuse a submitted attempt or practical submission as evidence by reference. It must add an explicit evidence submission and authorized human evidence review; it must not infer demonstrated competence from a score or published result.

## Active API boundary

Part 3A remains mounted through `server/src/routes/part3aRoutes.js`. Part 3B now extends the same `/api/part3` boundary through `server/src/routes/part3bRoutes.js`; it adds evidence review, explicit competency decisions, follow-up, capability analytics and optional AI assistance without replacing the Part 3A records above. Older `part3Routes.js` and lifecycle experiment files remain unmounted and are not authoritative runtime paths.

## Genuine limitations

- Suitability weights and mandatory requirements are proposed prototype configuration and require IMD validation.
- Demo availability uses explicit time windows; recurring calendar rules and external calendar synchronization are not implemented.
- Files are buffered up to 5 MB before GridFS upload. A production deployment may use streaming malware scanning and a managed private object-store adapter.
- Question delivery randomizes question order; per-question option randomization is not implemented.
- Timeout recovery runs when an attempt is resumed and is also exposed as a service operation for a future scheduled worker. No background scheduler is bundled.
- Result preparation currently applies the strictest configured percentage threshold across the batch assessments. More complex component weighting must come from a future approved course-rule schema.
- Session links and external resource URLs are references only; SAMARTHYA does not host video or conferencing infrastructure.
