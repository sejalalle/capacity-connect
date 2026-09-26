# Tooling

- Wants a proper, comprehensive `.gitignore` in place and verified: dependencies (`node_modules/`), build output (`dist/`, `build/`), env files (keeping `.env.example`), test/tooling output (`coverage/`, `test-results/`, `playwright-report/`, `artifacts/`), logs, and OS/editor noise. Confidence: 0.8
- Treats local-only / generated state as never-committed: the local MongoDB `data/` directory and its WiredTiger artifacts (`*.wt`, locks, journal, catalog) are regenerated from seed scripts, so they belong in `.gitignore`. Confidence: 0.85
- Wants to be told what tooling an agent installs and why — challenged the Playwright Chromium download (size and where it lives) and expects such artifacts kept outside the repo and easily removable (`npx playwright uninstall --all`). Confidence: 0.6
- Prefers provider/integration choices to be swappable through a single environment-variable switch (e.g. `AI_PROVIDER_PROFILE`) rather than code changes: "change ONE switch, then restart the backend". Confidence: 0.8
- Wants that switch limited to the options actually in use — a safe disabled default, the one or two real providers, and a test-only mock — rather than a menu of speculative profiles. Confidence: 0.75
- Wants `.env.example` to be the documented source of supported values: every switch listed with an explanatory comment naming the valid options, the default, and what each option affects. Confidence: 0.7
- Prefers explicit, diagnosable configuration failures over silent degradation: an unknown or incomplete setting is reported to the user, and a misconfigured integration fails closed to the manual path with no automatic fallback to another provider. Confidence: 0.75
