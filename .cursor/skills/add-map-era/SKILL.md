---
name: add-map-era
description: Autonomously adds a new historical map era to the geo-quiz — researches data sources online, builds pipeline, curates flags and RU/EN localization, writes tests, self-reviews, and verifies no regressions in existing eras. Use when the user asks to add a new map, era, epoch, or historical borders.
---

# Добавление новой карты (эпохи) — автономный workflow

Гео-квиз: SvelteKit 5, MapLibre, `BaseMapEra`, данные в `static/data/eras/{eraId}/`.

**Эталон реализации:** `preww1` (CShapes 1914). **Не ломать:** `modern`, `preww1` и все существующие режимы.

Агент выполняет задачу **полностью автономно** от исследования до финальной регрессии. Не останавливаться на полпути. Не спрашивать пользователя о технических деталях, если их можно вывести из кода или интернета.

---

## Фаза 0: Исследование источников (обязательно, до кода)

**Самостоятельно** найти в интернете кандидатов на геоданные для запрошенного года и масштаба.

### Что искать

- GeoJSON / shapefile / открытые датасеты с политическими границами на нужный год
- Покрытие: глобальное vs региональное
- Лицензия: пригодность для open-source (избегать NC, если не оговорено)
- Готовность: один файл-снимок vs сырой API/planet

### Известные кандидаты (стартовая точка, не ограничение)

| Источник | Период | Заметка |
|----------|--------|---------|
| CShapes 2.0 | 1886–2019 | `scripts/prepare_cshapes_era.mjs` |
| historical-basemaps | BCE–2024 | `world_{year}.geojson`, GPL-3.0 |
| Cliopatria (Seshat) | 3400 BCE–2024 | CC BY 4.0, один большой GeoJSON |
| OpenHistoricalMap | volunteer | часто неполно для древности |
| AWMC | античность | Средиземноморье, провинции Рима |
| Natural Earth | modern | только `modern` |

### Критерии выбора (оценить каждый найденный источник)

1. **Полнота** — есть ли все ключевые политии для квиза (кликабельные полигоны)?
2. **Формат** — легко ли конвертировать в `boundaries.geojson` + `entity_id`?
3. **Лицензия** — атрибуция, NC, copyleft
4. **Точность границ** — приемлема для образовательного квиза?
5. **Поддержка** — активный репозиторий, документация

### Выход фазы 0

Кратко зафиксировать (в комментарии к PR или в `meta.json` → `source`):

- какие источники рассмотрены и отклонены (с причиной)
- **выбранный источник** и почему
- ожидаемое число сущностей после whitelist

**Не начинать пайплайн**, пока нет whitelist сущностей (~30–180, по аналогии с modern=178, preww1≈142).

---

## Мастер-чеклист (выполнить все пункты)

```
Фаза 0 — Исследование
- [ ] WebSearch: ≥3 кандидата на геоданные
- [ ] Сравнение по критериям, выбор источника
- [ ] Скачать/просмотреть сырьё, черновой whitelist

Фаза 1 — Данные
- [ ] prepare_*_era.mjs → static/data/eras/{eraId}/
- [ ] boundaries.geojson ↔ entities.json sync

Фаза 2 — Локализация (см. раздел ниже)
- [ ] nameEn, nameRu, aliases.en.json, aliases.ru.json — полный набор

Фаза 3 — Флаги (см. раздел ниже)
- [ ] Поиск → curated → materialize → исторический аудит

Фаза 4 — Код
- [ ] Domain + registry + i18n UI + persist

Фаза 5 — Тесты
- [ ] Unit + integration + e2e для новой эры

Фаза 6 — Self-review + регрессия
- [ ] pnpm test, pnpm test:e2e, pnpm build
- [ ] modern + preww1 flows не сломаны
- [ ] Ручной просмотр чеклиста ревью (ниже)
```

---

## Фаза 1: Data pipeline

Выход в `static/data/eras/{eraId}/`:

| Файл | Назначение |
|------|------------|
| `boundaries.geojson` | Полигоны; `properties.entity_id` (slug) |
| `entities.json` | `{ id, nameEn, nameRu, region?, flagCode?, flagAsset? }[]` |
| `aliases.en.json` | `Record<entityId, string[]>` |
| `aliases.ru.json` | `Record<entityId, string[]>` |
| `meta.json` | `{ eraId, snapshotYear/snapshotDate, entityCount, source }` |

Правила:

- `entity_id` — slug (`roman-empire`), стабильный.
- Исключить микрогосударства, культуры-охотники, не-государства (паттерн `EXCLUDED_MICRO` в `prepare_cshapes_era.mjs`).
- Whitelist: `scripts/era-mappings/{eraId}_curated.json`.
- Кэш сырья: `scripts/.cache/` (в `.gitignore`).

**CShapes:**
```bash
node scripts/prepare_cshapes_era.mjs --era={eraId} --date=YYYY-MM-DD
```

**historical-basemaps** (если выбран):
- `https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson/world_{year}.geojson`
- Исключать: `*hunter-gatherers*`, `*Culture*`, `*complex*`

При отсутствии готового скрипта — написать `scripts/prepare_{source}_era.mjs` по образцу `prepare_cshapes_era.mjs`.

---

## Фаза 2: Локализация (EN + RU)

Агент **сам** проверяет и дополняет все тексты. Не оставлять `nameRu = nameEn` без проверки.

### Проверить

1. `entities.json` — у каждой сущности осмысленные `nameEn` и `nameRu`.
2. `aliases.en.json` — варианты на английском (сокращения, исторические синонимы).
3. `aliases.ru.json` — варианты на русском (исторические названия: «Римская империя», «Парфянское царство», «Хань»).
4. `src/lib/i18n/constants.ts` — `era{Id}`, `era{Id}Hint` (en + ru).

### Как переводить

- Для современных государств с ISO — `scripts/apply_era_localization.mjs` + `{eraId}_names.ru.json`, `{eraId}_aliases.ru.json`.
- Для исторических политий без ISO — **ручной перевод агентом**: исторически корректное русское название эпохи, не современное (Парфия ≠ Иран, Византия ≠ Греция).
- Добавить алиасы, по которым игрок реально будет вводить ответ (EN и RU UI — см. `.cursor/rules/business.mdc`).

### Критерий готовности

Для **каждого** `entity_id`: есть `nameRu` ≠ копипаста EN (если языки различаются) и ≥1 алиас в `aliases.ru.json`.

---

## Фаза 3: Флаги — поиск, добавление, исторический аудит

### Шаг 3.1: Поиск для каждой сущности

Для **каждой** записи в `entities.json` агент **самостоятельно** ищет в интернете исторически уместный флаг/знамя/герб эпохи:

1. **Wikimedia Commons** — основной источник (`commons:Flag_of_….svg`, знамёна SPQR, династий и т.д.).
2. WebSearch по запросам вида: `{polity name} flag {year} SVG`, `historical flag {entity} Wikimedia`.
3. Проверить лицензию файла на Commons (PD, CC BY, CC BY-SA).

Записать в `scripts/era-mappings/{eraId}_flag_curated.json`:

```json
{
  "roman-empire": "commons:Flag_of_the_Roman_Empire.svg",
  "persia": "commons:…"
}
```

Допустимо `iso:XX` **только** если полития = современное государство той эпохи с тем же флагом (редко для древности).

Если достоверного флага нет — явно пропустить (не подставлять современный ISO «наугад»).

### Шаг 3.2: Materialize

```bash
node scripts/generate_flag_sources.mjs   # если нужен промежуточный manifest
node scripts/materialize_era_flags.mjs   # параметризовать --era={eraId} при необходимости
```

Результат: `static/flags/eras/{eraId}/{entityId}.svg` + `manifest.json`.

Rate limit Commons: `User-Agent`, задержка между запросами (см. `materialize_era_flags.mjs`).

### Шаг 3.3: Исторический аудит (обязательный второй проход)

Пройтись по **всем** сущностям с флагами и проверить:

| Проверка | Пример ошибки |
|----------|---------------|
| Флаг соответствует **эпохе**, не современности | флаг Ирана для Парфии |
| Флаг соответствует **политии**, не соседу | османский для Австро-Венгрии |
| Не анахронизм по дате снимка | флаг СССР для 1914 |
| SVG открывается и читаем в UI | битый/пустой файл |

При ошибке — найти замену на Commons или установить `flagAsset: null`.

Запустить `pnpm flags:validate` если применимо к эре.

---

## Фаза 4: Domain + UI

### Domain

`src/lib/domain/maps/{eraId}/constants.ts`, `map.ts` — extends `BaseMapEra`.

`src/lib/domain/maps/registry.ts`:

```typescript
registerEra({
  id: '{ERA}_ERA_ID',
  factory: () => new {Era}WorldMap(),
  year: 100,               // number | null (modern)
  entityType: 'polity',    // 'country' только modern
  themeProfileId: 'parchment',
  labelKey: 'era{Id}'
})
```

### UI (не сломать существующие эры)

| Файл | Действие |
|------|----------|
| `src/lib/i18n/constants.ts` | `era{Id}`, `era{Id}Hint` |
| `src/routes/ui/StartScreen.svelte` | новая опция эры |
| `src/routes/ui/GameSettingsEditor.svelte` | селектор + hint |
| `src/routes/+page.svelte` | props, `applyEraSelection` |
| `src/routes/play/parse_config.ts` | `?era=` |

Селектор эпох — **добавить**, не заменить. `DEFAULT_ERA_ID` = `modern`.

---

## Фаза 5: Тесты (обязательно)

| Файл | Проверка |
|------|----------|
| `tests/unit/{eraId}_map.test.ts` | metadata, resolveEntityId |
| `tests/unit/entities_dataset_{eraId}.test.ts` | count, geojson sync |
| `tests/unit/map_era_registry.test.ts` | регистрация |
| `tests/unit/era_flags_manifest.test.ts` | manifest (расширить или новый) |
| `tests/integration/era_map_display.test.ts` | карта грузится |
| `tests/e2e/era_switch.test.ts` | переключение эпох |
| `tests/e2e/game_flow.test.ts` | **не трогать логику modern** — только убедиться что проходит |

Минимум по `.cursor/rules/testing.mdc`: happy path + edge case на публичный API.

---

## Фаза 6: Self-review и регрессия

### Команды (все должны пройти)

```bash
pnpm test:unit
pnpm test:integration
pnpm test:e2e
pnpm build
pnpm check    # если без блокирующих ошибок в затронутых файлах
```

### Чеклист ревью перед завершением

**Новая эра:**
- [ ] Карта отображается, полигоны кликабельны
- [ ] Autocomplete и валидация на EN и RU
- [ ] Флаги в UI (или осознанно null)
- [ ] Disclaimer и README обновлены (источник + лицензия)
- [ ] `meta.json` корректен

**Регрессия существующего:**
- [ ] `modern`: 178 сущностей, game flow e2e зелёный
- [ ] `preww1`: карта грузится, era switch работает
- [ ] Persist: `eraId` сохраняется, Continue работает
- [ ] Explore mode / hover / guessed states не сломаны
- [ ] Нет случайных изменений в `static/data/eras/modern/` и `preww1/`

**Лицензии:**
- [ ] Атрибуция источника границ в README/disclaimer
- [ ] Wikimedia flags — per-file или общая ссылка на Commons

При падении тестов — **исправить**, не отключать.

---

## Документация

- `README.md` — строка в таблице эпох
- Disclaimer: источник границ + «границы — историческая реконструкция»
- При необходимости `THIRD_PARTY_NOTICES.md`

---

## Референсные файлы

| Назначение | Путь |
|------------|------|
| CShapes pipeline | `scripts/prepare_cshapes_era.mjs` |
| RU-локализация | `scripts/apply_era_localization.mjs`, `scripts/era-mappings/preww1_names.ru.json` |
| Флаги | `scripts/era-mappings/preww1_flag_curated.json`, `materialize_era_flags.mjs` |
| Domain | `src/lib/domain/maps/preww1/` |
| Registry | `src/lib/domain/maps/registry.ts` |
| Данные | `static/data/eras/preww1/` |
| E2E modern | `tests/e2e/game_flow.test.ts` |
| E2E era switch | `tests/e2e/era_switch.test.ts` |

---

## Антипаттерны

- Начинать код до выбора источника и whitelist
- Копировать `nameRu` из `nameEn` без перевода
- Ставить современные ISO-флаги на исторические политии
- Пропускать тесты или регрессию
- Менять поведение `modern` ради новой эры
- Спрашивать пользователя то, что можно найти в интернете или в коде `preww1`
