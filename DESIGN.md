# Blocky Strategery — Design Doc

A radically simplified classic 4X-style turn-based 4X for mobile. Target session length: **20–30 minutes**.

## Platforms & Tech

- **Targets:** iOS + Android (no web, no desktop). Orientation: **landscape only**.
- **App identity:** name `Blocky Strategery`, bundle/package `com.aaronr.blockystrategery` (placeholder, easy to rename pre-store).
- **Stack:** Expo (managed) + React Native + TypeScript.
- **Navigation:** **Expo Router** (file-based routing).
- **Renderer:** `@shopify/react-native-skia` for the map, sprites, and animations. Plain RN views for HUD, menus, dialogs.
- **UI kit:** **None.** Custom HUD components built on RN primitives + Skia. No Tamagui/gluestack — game HUDs don't fit form-oriented kits.
- **State:** Zustand (small, fast, no Redux ceremony). Game state is one tree, mutated per turn.
- **Persistence:** AsyncStorage for save slots (3 slots).
- **Art (placeholder):** Kenney.nl medieval/strategy packs for the prototype. Commission Kingdom-Rush-style replacements later.
- **No networking** in v1. Single-player vs. AI only.

## Map

- **Size:** 48 columns × 36 rows squares (1,728 tiles). No wraparound (simpler edge logic).
- **Terrain:** Grassland, Plains, Forest, Hills, Mountains, Desert, Tundra, Coast, Ocean, River.
- **Resources** (sprinkled at gen): Wheat, Cattle, Fish, Iron, Horses, Gold, Wine, Spices.
- Map generated with simplex noise → continents → resource pass → starting-position pass (8 evenly spaced spawns).

## Players

- **1 human + N AIs**, where N = 3 / 5 / 7 by difficulty.
- **Realms:** 8 are drawn at random per game from a pool of the 32 most populous countries (UN 2024 estimates).
- **Leaders:** Fetched from Wikidata at first launch, cached locally. Stale data is fine. If the fetch fails, fall back to a bundled JSON.

### Wikidata fetch

SPARQL query against `https://query.wikidata.org/sparql` for current head of state/government per country (Q-IDs hardcoded for the 32 countries). Cache result in AsyncStorage with a 30-day TTL.

## Turn Loop

Each turn:
1. **Player phase:** move units, manage cities, pick research.
2. **AI phase:** all AIs resolve in parallel under the hood, shown as a 1–2 second animated sweep.
3. **World phase:** resource regen, random event (5% chance: barbarian raid, gift caravan, minor plague).
4. End-turn button → next turn.

**Hard turn limit: 60 turns.** Past that, highest score wins. Keeps the 30-min ceiling honest.

## Tech Tree (20 techs, shallow)

Each tech costs ~10 + (tier × 15) science. Single tree, mostly linear with a few branches. Researching the final tech (**Philosophy**) is one of the win conditions.

| # | Tech | Prereq | Unlocks |
|---|---|---|---|
| 1 | Pottery | — | Granary, Irrigation |
| 2 | Agriculture | — | Farm improvement |
| 3 | Animal Husbandry | — | Reveals Horses, +1 food on Cattle |
| 4 | Mining | — | Mine improvement |
| 5 | Bronze Working | Mining | Spearman, Archer, Barracks |
| 6 | Masonry | Mining | Walls, Quarry |
| 7 | The Wheel | Pottery | Road, Chariot |
| 8 | Writing | Pottery | Library, diplomacy screen |
| 9 | Horseback Riding | Animal Husbandry | Horseman |
| 10 | Currency | Bronze Working | Marketplace, gold trade |
| 11 | Reading | Writing | +25% science from Library |
| 12 | Iron Working | Bronze Working | Swordsman, reveals Iron |
| 13 | Construction | Masonry, Currency | Aqueduct, Bridge |
| 14 | Mathematics | Currency | Catapult |
| 15 | Sailing | Pottery | Galley, fishing boats |
| 16 | Trade | Currency, Sailing | Trade route bonus +50% |
| 17 | Code of Laws | Writing | Courthouse, -1 unhappy per city |
| 18 | Literacy | Reading, Code of Laws | Great Library wonder |
| 19 | Engineering | Construction, Wheel | Aqueduct cheaper, road x2 movement |
| 20 | Philosophy | Literacy, Mathematics | **Tech win condition** |

## Units

Starting roster: **1 Settler, 1 Warrior, 1 Worker.**

| Unit | Tech | Move | Attack | Defense | Cost |
|---|---|---|---|---|---|
| Settler | — | 1 | 0 | 1 | 30 |
| Worker | — | 1 | 0 | 1 | 20 |
| Warrior | — | 1 | 1 | 1 | 10 |
| Archer | Bronze Working | 1 | 3 | 2 | 25 |
| Spearman | Bronze Working | 1 | 1 | 3 | 20 |
| Horseman | Horseback Riding | 2 | 2 | 1 | 25 |
| Chariot | The Wheel | 2 | 3 | 1 | 30 |
| Swordsman | Iron Working | 1 | 4 | 2 | 35 |
| Catapult | Mathematics | 1 | 6 | 1 | 40 |
| Galley | Sailing | 3 (water) | 1 | 1 | 30 |

Combat is a single dice roll: `attacker.attack + d6` vs `defender.defense + d6 + terrain bonus`. Loser dies, winner takes 0–1 damage. No HP bars to track — fast.

**Stacking:** **1 unit per tile** (classic 4X style). Moving onto a friendly-occupied tile is blocked. Moving onto an enemy-occupied tile triggers combat.

## Buildings (per city)

| Building | Tech | Cost | Effect |
|---|---|---|---|
| Granary | Pottery | 40 | Half food carries on growth |
| Barracks | Bronze Working | 30 | Veteran units (+1 attack) |
| Walls | Masonry | 50 | +50% defense in city |
| Library | Writing | 50 | +50% science |
| Marketplace | Currency | 50 | +50% gold |
| Temple | Writing | 30 | +1 happy citizen |
| Aqueduct | Construction | 60 | Allows city > size 6 |
| Courthouse | Code of Laws | 50 | -1 unhappy citizen |

Wonders (one per game, world-unique): Pyramids, Great Wall, Great Library. That's it.

## Tile Improvements (Worker actions)

- **Road** — +1 trade, +1 movement
- **Irrigation** — +1 food (requires adjacent water/river)
- **Mine** — +1 production (Hills/Mountains)
- **Farm** — +1 food (Plains/Grassland; needs Agriculture)

## City Mechanics

- **Minimum spacing:** new cities must be founded at least **3 tiles** (Chebyshev distance) from any existing city, friend or foe. Prevents spam and matches the working radius.
- City works the 8 surrounding tiles + center (radius 1, not the classic fat-cross — simpler).
- Each tile produces food / production / trade based on terrain + improvement.
- **Growth:** city grows when food box fills (10 + size × 5 food).
- **Irrigation gate:** every 2 size levels above 4 requires +1 irrigated tile in workable radius. Otherwise growth stalls. (This is the "city needs more irrigation" mechanic.)
- **Production:** spent on units, buildings, or wonders.
- **Trade:** split by player slider into Gold / Science / Luxury (default 50/40/10).

## Happiness (kept simple)

- Each citizen starts **content**.
- Citizens beyond size 4 start **unhappy**.
- Temples/Courthouses/luxuries make citizens **happy**.
- If unhappy > happy → city goes into **disorder** (zero production until fixed).
- That's the whole system. No religion, no entertainers, no policies.

## Money

- Gold income = trade allocated to gold + marketplace bonuses.
- Spent on: building maintenance (1 gold/turn each), rush-buying production (2 gold per shield), unit upkeep (1 gold per unit beyond city size).
- Negative balance for 5 turns → random building disbands.

## Win Conditions (first to any wins)

1. **Conquest** — only realm with cities remaining.
2. **Domination** — control 50% of land tiles.
3. **Tech** — research Philosophy.
4. **Score** — at turn 60, highest score (cities × 5 + techs × 3 + wonders × 10 + population).

## Difficulty (3 levels)

| Level | AI count | AI bonus | Player bonus |
|---|---|---|---|
| Chieftain | 3 | none | +50 starting gold, +1 starting Warrior |
| Prince | 5 | none | none |
| King | 7 | +25% production & science | none |

No "AI cheats with extra units at start" nonsense. Differences are mild — game stays fun.

## Random Events (5%/turn each)

- Barbarian raid near a random city
- Friendly caravan (+30 gold)
- Minor plague (-1 population in largest city)
- Resource discovered (a random tile reveals a luxury)

Capped at one event per turn.

## Save System

- 3 save slots, AsyncStorage.
- Autosave at end of every turn into slot 0.
- Manual save → slot 1 or 2.

## Art Pipeline (prototype → final)

- **Prototype:** Kenney medieval/strategy + RPG packs (CC0). Drop in, iterate gameplay.
- **Final:** commission a single artist for unit sprites (32×32 or 48×48) + terrain tileset in chunky cartoon-medieval style. Budget for ~40 sprites total (10 units + 10 buildings + 10 terrain + 10 UI icons).

## Out of Scope (v1)

- Multiplayer
- Diplomacy beyond "war / peace" toggle
- Religion, espionage, ideologies, governments
- Naval combat beyond Galley scouting
- Air units, modern era, anything past Philosophy
- City-states, barbarian camps as persistent objectives
- Tutorials beyond a 5-screen intro

## Build Phases

1. **M0 — Scaffold** (1–2 days). Expo project, Skia hello-world, Zustand store, navigation skeleton.
2. **M1 — Map** (3–5 days). Procgen, render, pan/zoom, tile inspect.
3. **M2 — Turn loop + units** (5–7 days). Move, found city, end turn, basic combat.
4. **M3 — Cities + buildings** (5–7 days). Build queue, growth, irrigation gate.
5. **M4 — Tech tree + research** (3 days).
6. **M5 — AI** (5–10 days). Dumbest viable AI: greedy expansion, attack weakest neighbor.
7. **M6 — Win conditions + difficulty** (2 days).
8. **M7 — Wikidata fetch + realm/leader picker** (1 day).
9. **M8 — Polish, sound, save/load, intro** (open-ended).

Total to playable v1: roughly 4–6 weeks of focused work.
