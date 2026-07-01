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
| **1939** | Europe and the world on the eve of the Second World War |
| **1914** | Europe and the world on the eve of the First World War |
| **Before the Napoleonic Wars** | States and borders in the late 18th century |
| **Fall of the Eastern Roman Empire** | The Byzantine world in the empire’s final years before Constantinople fell in 1453 |
| **Roman Empire at its height** | Provinces and frontiers around the empire’s greatest extent |

Good for learning geography beyond “where things are today”—see how borders used to look.

## Game settings

Before you start:

- **Time** — no limit, or 15 / 30 / 60 minutes
- **Lives** — no limit, or 1 / 3 / 5 mistakes
- **Language** — English or Russian (menus and country names)

Your choices are saved in the browser for the next visit.

## Save & continue

Progress is saved automatically. Leave mid-game and the lobby will offer **Continue** with your score (e.g. 12/195). **New game** starts fresh.

---

## Disclaimer

Some regions are territories or disputed areas. Borders are shown for quiz purposes only.

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