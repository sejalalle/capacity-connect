# Documentation

- Wants a documentation-driven workflow on every project: an `AGENTS.md` at the repo root plus a structured `docs/` folder, so a new agent is pointed at files to read rather than relying on chat memory ("nothing lives in chat memory"). Confidence: 0.95
- `AGENTS.md` should be short and imperative — a rules sheet, not the spec: a "Read first" pointer list, "Product decisions" as hard invariants (never/always statements), implementation conventions, and a scope-labels legend. Confidence: 0.9
- `docs/` should keep distinct kinds of truth in separate files: the agreed target/architecture, a dated implementation plan/checklist, actual implemented workflows, and project context/repo facts — never mixed. Confidence: 0.9
- Record provenance: keep immutable originals in a `docs/sources/` folder with a README noting where each came from, extraction caveats, and the conflict-resolution rule. Confidence: 0.85
- Maintain a dated, append-only, newest-first change history rather than rewriting history. Confidence: 0.85
- Tag every feature/design item with one scope label: Core / Demo integration / Later / Proposed, where "Proposed" explicitly marks the agent's own design that is not in the source statement. Confidence: 0.9
- Treats the agreed per-role page inventory doc (e.g. `docs/page-inventory.md`) as the UI scope contract: sidebar navigation labels must match the inventory's wording exactly. Confidence: 0.85
- Keep target (design/architecture) and actual (implemented) strictly separate; never mark something done from a design, a placeholder screen, or a happy-path fixture. Confidence: 0.9
- Lock documentation section numbers to the source document so every requirement traces back (source section → architecture section → checklist item → implemented coverage). Confidence: 0.8
- Documented recommendations and matches should explain why, not just state the outcome. Confidence: 0.75
- Docs should explicitly distinguish fixtures, simulated integrations, real services and unimplemented plans, and never imply demo/synthetic data is real. Confidence: 0.85
- The "Read first" list exists as a throttle so an agent doesn't re-read every doc on every task — keep it minimal and current. Confidence: 0.8
- Implementation checklists should mark items that have automated evidence distinctly from those that are only device/live-acceptance or unimplemented; a file or route existing is not evidence. Confidence: 0.8
