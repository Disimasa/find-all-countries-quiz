# Find All Countries

> 🌍 **Live → [find-all-countries.ru](https://find-all-countries.ru/)**

Click countries on a world map, name them correctly, and try to find them all. Play at your own pace or race the clock—on. Try modern borders or maps from other times in history.

## How to play

1. Open the lobby and choose your map era and rules.
2. Click a country on the map.
3. Type its name.
4. Keep going until every country is found or you run out of time or lives.

Correct answers light up on the map. Wrong answers cost a life when lives are on. A side panel shows your progress and what’s left to find.

## Map eras

Switch between political maps from different periods. Each era has its own borders, country list, and acceptable names:

| Era | What you practice |
| --- | --- |
| **Modern** | Today’s internationally recognized borders |
| **1914** | Europe and the world on the eve of the First World War |
| **1300** | The Mongol uluses, Rus principalities, and the late medieval world |
| **100 AD** | Major powers of the ancient world around 100 CE |

Good for learning geography beyond “where things are today”—see how borders used to look.

Want another era? [Open an issue](https://github.com/Disimasa/find-all-countries-quiz/issues) and suggest it.

## Game settings

Before you start:

- **Time** — no limit, or 15 / 30 / 60 minutes
- **Lives** — no limit, or 1 / 3 / 5 mistakes
- **Language** — English or Russian (menus and country names)

Your choices are saved in the browser for the next visit.

## Save & continue

Progress is saved automatically per map era. Leave mid-game and the lobby will offer **Continue** for the selected era (e.g. 12/178 on the modern map). **New game** starts fresh on that era.

---

## Disclaimer

Some regions are territories or disputed areas. Borders are shown for quiz purposes only.

Historical map borders for the **1914** era are derived from [CShapes 2.0](https://icr.ethz.ch/data/cshapes/) (ETH Zurich). The **100 AD** era uses [historical-basemaps](https://github.com/aourednik/historical-basemaps) (GPL-3.0). The **1300** era combines historical-basemaps with [Cliopatria](https://github.com/Seshat-Global-History-Databank/cliopatria) (CC BY 4.0), then curated by hand—boundary edits, entity selection, and gap fills such as Rus principalities missing from the base datasets. Era-specific flag artwork, where shown, is sourced from [Wikimedia Commons](https://commons.wikimedia.org/) and used under their respective licenses.

## Development

### Requirements

Node.js 22+, pnpm 10+.

```sh
pnpm install
pnpm dev
```

### Stack

SvelteKit 5, MapLibre GL, Tailwind CSS 4, DaisyUI, Vitest. Domain logic lives in `src/lib/domain/`.

### Docker

```sh
docker compose up -d --build
```