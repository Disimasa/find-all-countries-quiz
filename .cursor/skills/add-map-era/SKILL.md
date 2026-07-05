---
name: add-map-era
description: Autonomously adds a new historical map era to the geo-quiz — researches data sources online, builds pipeline, curates flags and RU/EN localization, writes tests, self-reviews, and verifies no regressions in existing eras. Use when the user asks to add a new map, era, epoch, or historical borders.
---

# Adding a New Map Era — Autonomous Workflow

Geo-quiz stack: SvelteKit 5, MapLibre, `BaseMapEra`, data in `static/data/eras/{eraId}/`.

**Reference implementation:** `preww1` (CShapes 1914). **Do not break:** `modern`, `preww1`, and all existing modes.

The agent completes the task **fully autonomously** from research through final regression. Do not stop halfway. Do not ask the user for technical details that can be inferred from the codebase or the web.

---

## Phase 0: Source Research (required, before code)

**Independently** search the web for geodata candidates for the requested year and scope.

### What to look for

- GeoJSON / shapefile / open datasets with political boundaries for the target year
- Coverage: global vs regional
- License: suitable for open-source (avoid NC unless explicitly agreed)
- Readiness: single snapshot file vs raw API/planet

### Known candidates (starting points, not limits)

| Source | Period | Notes |
|--------|--------|-------|
| CShapes 2.0 | 1886–2019 | `scripts/prepare_cshapes_era.mjs` |
| historical-basemaps | BCE–2024 | `world_{year}.geojson`, GPL-3.0 |
| Cliopatria (Seshat) | 3400 BCE–2024 | CC BY 4.0, one large GeoJSON |
| OpenHistoricalMap | volunteer | often incomplete for antiquity |
| AWMC | antiquity | Mediterranean, Roman provinces |
| Natural Earth | modern | `modern` era only |

### Selection criteria (evaluate each source found)

1. **Completeness** — are all key polities present for the quiz (clickable polygons)?
2. **Format** — easy to convert to `boundaries.geojson` + `entity_id`?
3. **License** — attribution, NC, copyleft
4. **Boundary accuracy** — acceptable for an educational quiz?
5. **Maintenance** — active repo, documentation

### Phase 0 output

Briefly document (in a PR comment or in `meta.json` → `source`):

- which sources were considered and rejected (with reason)
- **chosen source** and why
- expected entity count after whitelist

**Do not start the pipeline** until there is an entity whitelist (~30–180, similar to modern=178, preww1≈142).

---

## Master Checklist (complete every item)

```
Phase 0 — Research
- [ ] WebSearch: ≥3 geodata candidates
- [ ] Compare by criteria, pick source
- [ ] Download/inspect raw data, draft whitelist

Phase 1 — Data
- [ ] prepare_*_era.mjs → static/data/eras/{eraId}/
- [ ] boundaries.geojson ↔ entities.json sync

Phase 2 — Localization (see section below)
- [ ] nameEn, nameRu, aliases.en.json, aliases.ru.json — full set

Phase 3 — Flags (see section below)
- [ ] Search → curated → materialize → historical audit

Phase 4 — Code
- [ ] Domain + registry + i18n UI + persist

Phase 5 — Tests
- [ ] Unit + integration + e2e for the new era

Phase 6 — Self-review + regression
- [ ] pnpm test, pnpm test:e2e, pnpm build
- [ ] modern + preww1 flows still work
- [ ] Manual review checklist (below)
```

---

## Phase 1: Data Pipeline

Output to `static/data/eras/{eraId}/`:

| File | Purpose |
|------|---------|
| `boundaries.geojson` | Polygons; `properties.entity_id` (slug) |
| `entities.json` | `{ id, nameEn, nameRu, region?, flagCode?, flagAsset? }[]` |
| `aliases.en.json` | `Record<entityId, string[]>` |
| `aliases.ru.json` | `Record<entityId, string[]>` |
| `meta.json` | `{ eraId, snapshotYear/snapshotDate, entityCount, source }` |

Rules:

- `entity_id` — slug (`roman-empire`), stable.
- Exclude microstates, hunter-gatherer cultures, non-states (see `EXCLUDED_MICRO` pattern in `prepare_cshapes_era.mjs`).
- Whitelist: `scripts/era-mappings/{eraId}_curated.json`.
- Raw cache: `scripts/.cache/` (in `.gitignore`).

**CShapes:**
```bash
node scripts/prepare_cshapes_era.mjs --era={eraId} --date=YYYY-MM-DD
```

**historical-basemaps** (if chosen):
- `https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson/world_{year}.geojson`
- Exclude: `*hunter-gatherers*`, `*Culture*`, `*complex*`

If no ready-made script exists — write `scripts/prepare_{source}_era.mjs` following `prepare_cshapes_era.mjs`.

---

## Phase 2: Localization (EN + RU)

The agent **must** verify and complete all text. Do not leave `nameRu = nameEn` unchecked.

### Verify

1. `entities.json` — every entity has meaningful `nameEn` and `nameRu`.
2. `aliases.en.json` — English variants (abbreviations, historical synonyms).
3. `aliases.ru.json` — Russian variants (historical names: «Римская империя», «Парфянское царство», «Хань»).
4. `src/lib/i18n/constants.ts` — `era{Id}`, `era{Id}Hint` (en + ru).

### How to translate

- For modern states with ISO — `scripts/apply_era_localization.mjs` + `{eraId}_names.ru.json`, `{eraId}_aliases.ru.json`.
- For historical polities without ISO — **manual translation by the agent**: historically correct Russian name for the era, not the modern one (Parthia ≠ Iran, Byzantium ≠ Greece).
- Add aliases players are likely to type (EN and RU UI — see `.cursor/rules/business.mdc`).

### Done criteria

For **every** `entity_id`: `nameRu` is not a copy-paste of EN (when languages differ) and there is ≥1 alias in `aliases.ru.json`.

---

## Phase 3: Flags — Search, Add, Historical Audit

### Step 3.1: Search for each entity

For **every** entry in `entities.json`, the agent **independently** searches the web for a historically appropriate flag/banner/coat of arms for the era:

1. **Wikimedia Commons** — primary source (`commons:Flag_of_….svg`, SPQR standards, dynastic banners, etc.).
2. WebSearch queries like: `{polity name} flag {year} SVG`, `historical flag {entity} Wikimedia`.
3. Verify Commons file license (PD, CC BY, CC BY-SA).

Record in `scripts/era-mappings/{eraId}_flag_curated.json`:

```json
{
  "roman-empire": "commons:Flag_of_the_Roman_Empire.svg",
  "persia": "commons:…"
}
```

`iso:XX` is allowed **only** when the polity is a modern state of that era with the same flag (rare for antiquity).

If no reliable flag exists — explicitly skip (do not guess a modern ISO flag).

### Step 3.2: Materialize

```bash
node scripts/generate_flag_sources.mjs   # if intermediate manifest is needed
node scripts/materialize_era_flags.mjs   # pass --era={eraId} if needed
```

Result: `static/flags/eras/{eraId}/{entityId}.svg` + `manifest.json`.

Commons rate limit: `User-Agent`, delay between requests (see `materialize_era_flags.mjs`).

### Step 3.3: Historical audit (required second pass)

Review **all** entities with flags and verify:

| Check | Example mistake |
|-------|-----------------|
| Flag matches the **era**, not the present day | Iran's flag for Parthia |
| Flag matches the **polity**, not a neighbor | Ottoman flag for Austria-Hungary |
| No anachronism vs snapshot date | USSR flag for 1914 |
| SVG opens and is readable in UI | broken/empty file |

On failure — find a Commons replacement or set `flagAsset: null`.

Run `pnpm flags:validate` if applicable to the era.

---

## Phase 4: Domain + UI

### Domain

`src/lib/domain/maps/{eraId}/constants.ts`, `map.ts` — extends `BaseMapEra`.

`src/lib/domain/maps/registry.ts`:

```typescript
registerEra({
  id: '{ERA}_ERA_ID',
  factory: () => new {Era}WorldMap(),
  year: 100,               // number | null (modern)
  entityType: 'polity',    // 'country' only for modern
  themeProfileId: 'parchment',
  labelKey: 'era{Id}'
})
```

### UI (do not break existing eras)

| File | Action |
|------|--------|
| `src/lib/i18n/constants.ts` | `era{Id}`, `era{Id}Hint` |
| `src/routes/ui/StartScreen.svelte` | new era option |
| `src/routes/ui/GameSettingsEditor.svelte` | selector + hint |
| `src/routes/+page.svelte` | props, `applyEraSelection` |
| `src/routes/play/parse_config.ts` | `?era=` |

Era selector — **add**, do not replace. `DEFAULT_ERA_ID` = `modern`.

---

## Phase 5: Tests (required)

| File | What to verify |
|------|----------------|
| `tests/unit/{eraId}_map.test.ts` | metadata, resolveEntityId |
| `tests/unit/entities_dataset_{eraId}.test.ts` | count, geojson sync |
| `tests/unit/map_era_registry.test.ts` | registration |
| `tests/unit/era_flags_manifest.test.ts` | manifest (extend or add era-specific) |
| `tests/integration/era_map_display.test.ts` | map loads |
| `tests/e2e/era_switch.test.ts` | era switching |
| `tests/e2e/game_flow.test.ts` | **do not change modern logic** — only ensure it still passes |

Minimum per `.cursor/rules/testing.mdc`: happy path + one edge case per public API.

---

## Phase 6: Self-Review and Regression

### Commands (all must pass)

```bash
pnpm test:unit
pnpm test:integration
pnpm test:e2e
pnpm build
pnpm check    # if no blocking errors in touched files
```

### Review checklist before finishing

**New era:**
- [ ] Map renders, polygons are clickable
- [ ] Autocomplete and validation work in EN and RU
- [ ] Flags in UI (or intentionally null)
- [ ] Disclaimer and README updated (source + license)
- [ ] `meta.json` is correct

**Existing-era regression:**
- [ ] `modern`: 178 entities, game flow e2e green
- [ ] `preww1`: map loads, era switch works
- [ ] Persist: `eraId` saved, Continue works
- [ ] Explore mode / hover / guessed states not broken
- [ ] No accidental changes in `static/data/eras/modern/` and `preww1/`

**Licenses:**
- [ ] Border source attribution in README/disclaimer
- [ ] Wikimedia flags — per-file or general Commons link

If tests fail — **fix**, do not disable.

---

## Documentation

- `README.md` — row in the eras table
- Disclaimer: border source + "boundaries are a historical reconstruction"
- `THIRD_PARTY_NOTICES.md` if needed

---

## Reference Files

| Purpose | Path |
|---------|------|
| CShapes pipeline | `scripts/prepare_cshapes_era.mjs` |
| RU localization | `scripts/apply_era_localization.mjs`, `scripts/era-mappings/preww1_names.ru.json` |
| Flags | `scripts/era-mappings/preww1_flag_curated.json`, `materialize_era_flags.mjs` |
| Domain | `src/lib/domain/maps/preww1/` |
| Registry | `src/lib/domain/maps/registry.ts` |
| Data | `static/data/eras/preww1/` |
| E2E modern | `tests/e2e/game_flow.test.ts` |
| E2E era switch | `tests/e2e/era_switch.test.ts` |

---

## Anti-Patterns

- Starting code before choosing a source and whitelist
- Copying `nameRu` from `nameEn` without translation
- Using modern ISO flags for historical polities
- Skipping tests or regression
- Changing `modern` behavior to accommodate a new era
- Asking the user for things findable on the web or in the `preww1` codebase
