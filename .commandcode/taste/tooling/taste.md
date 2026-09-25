# Tooling

- Wants a proper, comprehensive `.gitignore` in place and verified: dependencies (`node_modules/`), build output (`dist/`, `build/`), env files (keeping `.env.example`), test/tooling output (`coverage/`, `test-results/`, `playwright-report/`, `artifacts/`), logs, and OS/editor noise. Confidence: 0.8
- Treats local-only / generated state as never-committed: the local MongoDB `data/` directory and its WiredTiger artifacts (`*.wt`, locks, journal, catalog) are regenerated from seed scripts, so they belong in `.gitignore`. Confidence: 0.85
- Wants to be told what tooling an agent installs and why — challenged the Playwright Chromium download (size and where it lives) and expects such artifacts kept outside the repo and easily removable (`npx playwright uninstall --all`). Confidence: 0.6
