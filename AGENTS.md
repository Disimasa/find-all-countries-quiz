# AGENTS.md

## Cursor Cloud specific instructions

This is a fully static, client-side SvelteKit SPA (a geography quiz). There is **no backend, database, or API** — the only runtime service is the Vite dev/preview server, and game data ships as static files under `static/data/eras/modern/`.

Standard commands live in `package.json` (`dev`, `build`, `preview`, `check`, `lint`, `format`, `test`, `test:unit`, `test:integration`, `test:e2e`). Node 22+ / pnpm 10+ (see `README.md`). The update script already runs `pnpm install` and installs the Playwright Chromium browser.

Non-obvious caveats for this repo:

- **Integration and e2e tests need a dev server already running.** `pnpm test:integration` and `pnpm test:e2e` do NOT start a server themselves — they probe ports `5174`, `5173`, then `4173` (see `tests/e2e/helpers/playwright_helpers.ts`). Start `pnpm dev` first (default port `5173`), otherwise these suites fail with "Start dev server: pnpm dev". `pnpm test` (unit + integration) will fail on the integration project for the same reason unless a dev server is up.
- **Playwright browser is required for integration/e2e tests** (and the `client` Vitest project). It is installed via the update script (`pnpm exec playwright install chromium`); without it tests fail with "Executable doesn't exist".
- **The map basemap requires outbound internet.** Tiles are fetched at runtime from `https://tiles.openfreemap.org/styles/positron` (hardcoded in `src/lib/infrastructure/map/constants.ts`). Country polygons and all game logic work offline; only the visual basemap needs network.
- **`pnpm lint` currently fails on the clean checkout** (pre-existing Prettier formatting + ESLint errors across ~25 files). CI (`.github/workflows/ci.yml`) does not gate on lint — it runs `test:unit` and `build` only. Do not mass-reformat unless asked.
- The `client` Vitest project (`src/**/*.svelte.test.ts`) currently has no test files.
