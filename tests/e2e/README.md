# E2E tests

Playwright flows against a running dev or preview server.

```bash
pnpm dev
pnpm test:e2e
```

Requires map + game UI at `http://localhost:5173` (or 5174 / 4173).

Scenarios: win/loss modals, timer and lives, locale validation, saved-game continue.
