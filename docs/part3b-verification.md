# Part 3B implementation and verification boundary

Part 3B completes the demonstration lifecycle from published Part 3A results through evidence submission, assigned human review, explicit competency decisions, current-record recomputation, history, gaps, follow-up and scoped organizational coverage.

## Stable records

- `P3Evidence._id` with `version` identifies the reviewed evidence version and retained prior versions.
- `P3CompetencyDecision._id` with `decisionVersion` identifies a human subject decision. `status` preserves corrections and revocations.
- `P3CompetencyHistory` records previous/current status and level, target, evidence version, reviewer, reason and timestamp.
- `P2CompetencyRecord` remains the current-state record consumed by the Part 2 gap service.
- `P3FollowUp` links needs-practice decisions to explainable practice, learning, reassessment or evidence actions.
- `P3AIRequestMetadata` contains safe provider/request metadata and human disposition; source text and credentials are not audit fields.

## Authorization boundary

Evidence owners can submit and revise only their own records. Coordinators assign reviewers. Reviewers need an explicit batch `REVIEW_EVIDENCE` permission; competency decisions additionally need `DECIDE_COMPETENCY` and reviewed expertise for the exact competency/framework at the target level. Access role alone does not establish subject authority.

## Genuine limitations

- Synthetic levels, rubrics, coverage thresholds and risk rules are proposed application configuration, not official IMD/WMO standards.
- The external `openai-compatible` adapter is implemented but no live provider was called during repository verification.
- File signatures and authorization are enforced. Malware scanning and managed signed object-store links remain deployment hardening work; GridFS downloads are authorized per request and never public.
- Coverage uses stored job-role requirements and approved accounts. Organizational-unit hierarchy and delegated department scopes are not modeled beyond the available department filter.
- Review-due dates are reported independently and never remove a demonstrated level automatically.
