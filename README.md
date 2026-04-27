# Blocky Strategery

A simplified medieval-fantasy 4X strategy game for mobile, designed for **20–30
minute play sessions**. Pick a tribe, settle cities, research technologies,
explore a fog-of-war map, fend off rivals, and win by conquest, knowledge, or
endurance.

Built with React Native + Expo + TypeScript. Single-player vs. AI; landscape
only; no networking. iPad/iPhone first, Android second.

---

## Quick start

```bash
npm install
npm run ios       # or: npm run android
```

You can also run `npm start` and pick a target in the Expo dev menu. To build
a native dev client (faster than Expo Go and required for the Skia renderer):

```bash
npx expo run:ios
```

Other scripts:

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # expo lint
```

---

## Gameplay overview

### Setup

Tap an empty Realm slot from the title screen and walk through a 3-step setup:

1. **Tribe** — pick from 10 medieval British-Isles cultures (Anglo-Saxons,
   Normans, Welsh, Scots, Picts, Irish, Cornish, Cumbrians, Danes, Islesmen)
   or roll Random. Each tribe has a heraldic color and a unique starting
   bonus (extra unit, free tech, gold, or terrain combat advantage).
2. **Difficulty + Map size** — Chieftain / Prince / King (3 / 5 / 7 rivals)
   and Small / Medium / Large.
3. **Rules** — pick a turn limit (50 / 100 / 200 / Endless) and toggle which
   victory conditions are active (Conquest / Tech / Time).

### Core loop

Each turn:

- **Move units** — tap a unit, then tap a tile to move or attack. Long-press
  for menu actions, or drag from the unit to set a long-range destination.
- **Found cities** — your starting Wayfarer settles a city on its tile.
- **Build** — tap one of your cities to choose what to produce. Long-press
  any build option to append it to that city's queue (max 5).
- **Research** — auto-picks the cheapest available tech each turn; tap the
  flask pill at the top to override.
- **End turn** — once all your units have moves resolved (Auto/Explore units
  manage themselves), the End-Turn pill brightens.

### Victory conditions

- **Conquest** — capture every other tribe's last city.
- **Tech** — be the first to research Philosophy.
- **Time** — hold the most cities at the turn limit (or "Endless" disables).

### Key features

- **Fog of war** — vision is per-unit (Footman 1, Horseman 2, Galley 3, City
  2). Tiles you've ever seen stay visible (terrain memory) but enemy units
  only render while currently in vision.
- **Auto-Worker** — toggle a Serf to "A" mode and it irrigates grass/plains,
  mines hills, and lays roads inside your borders automatically.
- **Explore mode** — toggle a combat unit to "E" mode and it BFS-paths to
  the nearest unexplored tile. Multiple explorers fan out via crowding-aware
  target selection.
- **City borders** — every city projects a territory ring that grows with
  population (3×3 / 5×5 / 7×7). Borders form your tribe's land area.
- **Trade routes** — two cities of yours connected through territory tiles
  earn +1 gold/turn each. Visualized as dashed gold lines on the map.
- **Goody huts** — tribal villages on land yield rewards on contact (gold,
  science, free tech, or a free Footman).
- **Combat preview** — adjacent attackable enemies show predicted win
  percentage, color-coded by threshold.
- **Per-tribe city names** — authentic medieval place-name pools per tribe
  (Wintanceaster, Caer Dydd, Dùn Èideann, Jorvik, etc.).
- **Save slots** — three persistent slots; history of past games (wins,
  losses, stalemates).

---

## Architecture

### Tech stack

- **Expo SDK 54** (managed workflow, native dev client)
- **React Native 0.81 / React 19** + **TypeScript** (strict)
- **@shopify/react-native-skia** for the map, decals, and unit/city sprites
- **react-native-reanimated** + worklets for camera gestures
- **react-native-gesture-handler** for pan / pinch / tap / long-press
- **Zustand** for game state (single store, persists per-turn)
- **AsyncStorage** for save slots, history, tutorial flag, and settings

### Project layout

```
app/                          # Expo Router entry points (boots <App />)
src/
  data/                       # Pure data tables — no React, no state
    buildings.ts              # 8 buildings (Granary, Library, etc.)
    cityNames.ts              # Per-tribe authentic place-name pools
    countries.ts              # 10 medieval tribes (qid, iso, name)
    cultures.ts               # Per-tribe heraldic color + starting flavor
    gameIcons.ts              # Skia path data for game-icons.net glyphs
    improvements.ts           # Road / Farm / Mine / Irrigation
    leaders.ts                # (Legacy) Wikidata leader fetch — no-op for
                              #  cult_* qids; kept for save compatibility
    resources.ts              # Bonus terrain resources + yields
    tech.ts                   # 8 techs and prereq tree
    terrain.ts                # 10 terrain types + base yields
    units.ts                  # 8 unit kinds + canEnterTerrain rules
    wonders.ts                # 6 wonders + their tech gates

  game/                       # Pure game logic — no React, no AsyncStorage
    ai.ts                     # AI turn execution + pickAINextBuild
    combat.ts                 # resolveCombat() + attackOdds() preview
    gameOver.ts               # Victory/defeat checks (per scenario rules)
    ids.ts                    # Unit + city id generators
    init.ts                   # buildInitialState — map + spawns + tribes
    map.ts                    # Map type + chebyshev / tile lookups
    mapgen.ts                 # Procedural terrain (simplex-noise)
    path.ts                   # nextStepToTiles BFS + manhattan helpers
    types.ts                  # All shared game types (City, Unit, etc.)
    visibility.ts             # computeCurrentVisibility + pickExploreTarget
    yields.ts                 # computeCityYields + computeTradeRoutes

  state/                      # Zustand store + AsyncStorage persistence
    game.ts                   # The big store — all actions, the endTurn
                              #  reducer, autosave + visibility refresh
    saves.ts                  # Save/load/list slots, history, tutorial,
                              #  wipeAllAppData

  render/                     # Skia canvas rendering
    MapView.tsx               # The main map: terrain, borders, roads,
                              #  units, cities, fog, trade lines, decor
    MiniMap.tsx               # Top-right mini-map with viewport indicator
                              #  and matching fog overlay
    decor.tsx                 # Per-tile decoration (trees, mountains, etc.)

  ui/                         # React Native UI (HUD, modals, screens)
    CultureIcon.tsx           # Static iso → painted PNG asset map
    DiplomacyScreen.tsx       # Peace / war modal per rival tribe
    GameIcon.tsx              # Skia-rendered game-icons.net glyphs
    GameOverOverlay.tsx       # Victory / Defeat / Stalemate result card
    GameScreen.tsx            # Main game view — wires MapView + Hud
    Hud.tsx                   # Top pills, unit/city panels, turn events,
                              #  battle banner, attack preview, end turn
    KingdomMenu.tsx           # Empire summary — cities + research
    LegendScreen.tsx          # Icon legend ("?")
    ScenarioScreen.tsx        # 3-step new-game wizard
    ScoreScreen.tsx           # Standings ranked by score
    SettingsScreen.tsx        # Reset tutorial / wipe data / version
    TechScreen.tsx            # Card-grid tech tree
    TitleScreen.tsx           # Slot picker + History + Settings
    TutorialOverlay.tsx       # First-run welcome guide
    palette.ts                # THEME colors + PLAYER_PALETTE
```

### Data flow

1. **Title screen** loads save slots from AsyncStorage. Picking an empty
   slot opens **ScenarioScreen** (3-step wizard).
2. Hitting Start calls `useGame.newGame(slot, seed, leaders, scenario)`,
   which builds initial state via `buildInitialState` and persists.
3. **GameScreen** subscribes to the store, renders **MapView** + **Hud**.
4. Player taps fire actions on the store (`tapTile`, `endTurn`, `foundCity`,
   etc.). Each action mutates state and calls `commitWithVisibility(set,
   get)` which refreshes the human's fog and autosaves.
5. On `endTurn`, the reducer runs:
   - City growth + production, building/wonder completion (with build queue
     advance)
   - Unit destination auto-step, auto-Worker improvements, auto-Explore
     fan-out
   - Trade-route + science + gold aggregation per player
   - Random events
   - Each AI player's `runAITurn`
   - Goody-hut pickup pass
   - `checkGameOver` against the scenario's turn limit + victory toggles

### Saves

Each slot's `SaveData` (in `src/state/saves.ts`) carries the full game tree
plus per-game scenario settings (turn limit, victory toggles) and the
player's fog-of-war "memory" set. Load is forward-compatible — missing
fields default sensibly so older saves keep working.

History records (one per finished game) live in a separate AsyncStorage key
and are appended whenever `gameOver` transitions from null to non-null.

---

## Building for distribution

The project uses Expo's managed workflow with a custom dev client (Skia
needs native modules). To produce a TestFlight build:

```bash
npx eas build --platform ios --profile preview
```

(Requires an EAS configuration — not yet checked in.)

---

## Design history

- `DESIGN.md` — original design doc from project kickoff. Some details have
  evolved (e.g., the country roster shifted from 32 modern UN states to 10
  British-Isles tribes), but the philosophy and high-level mechanics are
  still accurate.
- `ICON_MIGRATION_PLAN.md` and `KINGDOM_MENU_PLAN.md` — completed feature
  plans, kept for historical reference.

---

## Credits

- Map and decor rendering: [@shopify/react-native-skia](https://shopify.github.io/react-native-skia/).
- HUD glyphs: [game-icons.net](https://game-icons.net/) via Iconify.
- Painted unit + tribe icons: generated with Google Gemini, prompts in commit history.
