# AI POSITION — where AI is used, and where it must never decide

Recorded **2026-09-26**. This is the authoritative AI map for SAMARTHYA. The per-step AI stance is also stated in `expected-flow.md`; this file is the short version plus **what actually enforces it in code**.

**AI is an assistance layer, not the decision-making layer.** Every AI feature produces text or a draft for a human to read, accept or reject. No AI call creates, changes or clears a competency level, a grade, a verification or an approval.

## How the stance is enforced, structurally

1. **Explanation-only returns.** The explanation and summarization functions return strings and never touch a record: `explainGap`, `explainCourseRecommendation`, `explainTrainerMatch`, `summarizeEvidence`, `summarizeFeedback`, `summarizeTttCandidate` (`server/src/services/part3bService.js:1147-1240`).
2. **Drafts are drafted.** AI MCQ output is stored as `P3Question` with `status:"DRAFT"` and `provenance.type:"AI_ASSISTED"` (`routes/part3bRoutes.js:433-454`). An assessment cannot be created while any selected question is unreviewed (`services/part3aService.js:980-985`), and the question's author cannot perform that review (`:946`).
3. **Suggestions need a human action.** Skill extraction and competency matching are saved as suggestions and only apply after an explicit accept/review route (`routes/part3bRoutes.js:274,343`). A rejected suggestion changes nothing.
4. **Every call is logged and rate-limited.** All calls go through `aiAssist` → `P3AIRequestMetadata` with actor, feature, provider, model, outcome and request id (`services/part3bService.js:1065-1112`). Secrets never enter that record. The payload is visible to a coordinator at `GET /api/part3/ai/activity`.

## 🟢 AI may be used for

| AI-assisted task | Route | What it returns | Human gate that keeps it safe |
| --- | --- | --- | --- |
| MCQ / questionnaire drafting | `POST /api/part3/ai/mcq-drafts` | An unpublished question draft | Independent review; unreviewed questions cannot enter an assessment |
| Skill-gap explanation | `POST /api/part3/ai/explain-gap` | A readable explanation + next steps | The gap itself is computed by `gapsFor`, never by AI |
| Course recommendation explanation | `POST /api/part3/ai/explain-course` | Why a mapped course is relevant | The course match is competency-course mapping, not AI |
| Trainer-match explanation | `POST /api/part3/ai/explain-trainer-match` | A one-line justification from suitability factors | The factors and the score are rule-based; the coordinator assigns |
| Evidence summarization | `POST /api/part3/ai/explain-evidence` | A summary + key points of submitted evidence | Accepting evidence is a separate human review; it never promotes a level |
| Feedback summarization | `POST /api/part3/ai/summarize-feedback` | Themes + sentiment label across responses | The improvement decision stays with the organization |
| TTT candidate information explanation | `POST /api/part3/ai/summarize-ttt-candidate` | Candidate blurb, strengths, readiness note | Selection and verification are coordinator decisions |
| Skill extraction from a CV | `POST /api/part3/ai/skill-extraction` (+ `/accept`) | Suggested skill tags with the passage supporting each | Tags apply only after explicit acceptance |
| Competency matching from free text | `POST /api/part3/ai/competency-matching` (+ `/review`) | Suggested matches with confidence | Matches apply only after explicit review |

Every response carries the same disclaimer: *"AI suggestions require human review and do not establish expertise or competency."*

## 🔴 AI must never decide

| Prohibited decision | What actually enforces it |
| --- | --- |
| Competency-level decision | `POST /api/part3/evidence/:id/competency-decisions` requires an authorized human reviewer holding `DECIDE_COMPETENCY` **and** reviewed subject expertise at `approvedLevel ≥ targetLevel` (`part3bService.js:290-313,387`). No AI route writes `P2CompetencyRecord`. |
| Grading decision | MCQ scoring is deterministic server-side in `finalizeAttempt` (`part3aService.js:1184-1215`); a client-supplied score in the submit body is rejected `400`. |
| Practical competency verification | `POST /api/part3/submissions/:id/evaluations` records a `P3HumanEvaluation` from an explicitly assigned human evaluator; self-evaluation is refused (`part3aService.js:1288-1359`). |
| Final competency verification | Same path as the competency-level decision: the record is recomputed only inside the authorized decision transaction (`recomputeRecord`, `part3bService.js:315`). AI output is never an input to it. |
| Certificate issuance | `issueCertificate` is rule-based on the pinned `certificatePolicy` plus an authorized caller (`certificateService.js:10-152`). The certificate text states it does not certify a competency level. |
| Admin approval | `PATCH /api/users/:id/status` is admin-only and audited (`routes/userRoutes.js:34-41`, `controllers/userController.js:48`). |
| Final Train-the-Trainer verification | `POST /api/part3/ttt/nominations/:id/verify` is admin-only and requires `EVALUATED` status with a `DEMONSTRATED` practice evaluation (`routes/tttRoutes.js:208`, `services/tttService.js:761`). |

## ⚪ Not AI at all

`POST /api/part3/ai/competency-search` and `deterministicCompetencyMatch` are keyword matching, not a model call. They are labelled "AI" in the UI for grouping only and produce identical results with AI switched off.

## 🔀 Switching provider

One switch moves every 🟢 task. See `server/.env.example`.

```bash
AI_PROVIDER_PROFILE=gemini      # disabled | gemini | openai | mock
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3.8-flash
```

| Profile | Transport | Default model | Secret |
| --- | --- | --- | --- |
| `disabled` | none — every AI call fails closed to the manual workflow | — | — |
| `gemini` | Gemini's OpenAI-compatible endpoint | `gemini-3.8-flash` | `GEMINI_API_KEY` |
| `openai` | `api.openai.com/v1` | `gpt-4o-mini` | `OPENAI_API_KEY` |
| `mock` | deterministic fixtures, tests only | `deterministic-fixture` | — |

There is **no automatic fallback** between profiles: a profile either works or the call fails closed. Selecting a profile is not by itself a data-handling approval — external calls stay blocked until `AI_EXTERNAL_DATA_APPROVED=true`. `AI_ENABLED=false` is a hard override that beats any profile.

The resolved configuration is visible at `GET /api/part3/ai/settings` (profile, provider, model, endpoint) — it never returns the secret. An unrecognised profile name is reported rather than silently falling back.

Evidence: `server/test/ai-profile.test.js` (switch, endpoint, model override, fail-closed, unknown profile, hard override) and `server/test/part3b.test.js:508-680` (disabled, provider failure, invalid output, mocked output stays a draft, no decision created).
