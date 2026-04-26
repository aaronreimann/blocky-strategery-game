import { create } from 'zustand';

import { BUILDING, type BuildingKind } from '@/src/data/buildings';
import type { LeaderMap } from '@/src/data/countries';
import {
  IMPROVEMENT,
  tileKey,
  type ImprovementKind,
  type ImprovementMap,
} from '@/src/data/improvements';
import { pickCheapestAvailable, prereqsMet, TECH, type TechId } from '@/src/data/tech';
import { TERRAIN } from '@/src/data/terrain';
import { UNIT, type UnitKind } from '@/src/data/units';
import { pickAINextBuild, runAITurn } from '@/src/game/ai';
import { resolveCombat, type Battle } from '@/src/game/combat';
import { checkGameOver } from '@/src/game/gameOver';
import { nextCityId, nextUnitId, parseIdNum, syncIdCounters } from '@/src/game/ids';
import { buildInitialState } from '@/src/game/init';
import { chebyshev, type GameMap } from '@/src/game/map';
import { nextStepToFriendlyCity } from '@/src/game/path';
import type {
  City,
  CityBuildTarget,
  CityFocus,
  Difficulty,
  GameOverState,
  Player,
  TurnEvent,
  Unit,
} from '@/src/game/types';
import { computeCityYields, foodNeededToGrow } from '@/src/game/yields';

import { loadSlot, saveSlot } from './saves';

const MIN_CITY_SPACING = 3;
const HUMAN_IDX = 0;

function buildCost(target: CityBuildTarget): number {
  return target.kind === 'unit'
    ? UNIT[target.unit].cost
    : BUILDING[target.building].cost;
}

type GameState = {
  map: GameMap | null;
  players: Player[];
  units: Unit[];
  cities: City[];
  improvements: ImprovementMap;
  turn: number;
  seed: number;
  difficulty: Difficulty;
  currentSlot: number | null;
  selectedUnitId: string | null;
  selectedCityId: string | null;
  lastBattle: Battle | null;
  turnEvents: TurnEvent[];
  tilePicker: { x: number; y: number } | null;
  gameOver: GameOverState | null;

  newGame: (slot: number, seed: number, difficulty: Difficulty, leaders: LeaderMap) => void;
  loadFromSlot: (slot: number) => Promise<boolean>;
  exitToTitle: () => void;

  selectUnit: (id: string | null) => void;
  selectCity: (id: string | null) => void;
  tapTile: (x: number, y: number) => void;
  foundCity: () => void;
  setCityBuild: (cityId: string, target: CityBuildTarget) => void;
  setCityFocus: (cityId: string, focus: CityFocus) => void;
  setResearch: (tech: TechId) => void;
  startWork: (kind: ImprovementKind) => void;
  cancelWork: () => void;
  setUnitDestination: (unitId: string, x: number, y: number) => void;
  clearUnitDestination: (unitId: string) => void;
  openTilePicker: (x: number, y: number) => void;
  closeTilePicker: () => void;
  selectUnitFromPicker: (unitId: string) => void;
  selectCityFromPicker: (cityId: string) => void;
  endTurn: () => void;
  dismissBattle: () => void;
  dismissTurnEvents: () => void;
};

const CITY_NAMES = [
  'Rivermouth', 'Highkeep', 'Stonehold', 'Goldfield', 'Ironreach',
  'Saltmarsh', 'Greenvale', 'Northwatch', 'Sunhaven', 'Whitefall',
];

function findSpawnTile(
  city: City,
  units: Unit[],
  map: GameMap,
): { x: number; y: number } | null {
  const candidates: { x: number; y: number }[] = [{ x: city.x, y: city.y }];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      candidates.push({ x: city.x + dx, y: city.y + dy });
    }
  }
  for (const c of candidates) {
    if (c.x < 0 || c.y < 0 || c.x >= map.width || c.y >= map.height) continue;
    const tile = map.tiles[c.y * map.width + c.x];
    if (!TERRAIN[tile.terrain].passable) continue;
    if (units.some((u) => u.x === c.x && u.y === c.y && u.ownerIdx === city.ownerIdx)) continue;
    return c;
  }
  return null;
}

function autosave(state: GameState): void {
  if (state.currentSlot === null || !state.map) return;
  saveSlot(state.currentSlot, {
    seed: state.seed,
    turn: state.turn,
    difficulty: state.difficulty,
    map: state.map,
    players: state.players,
    units: state.units,
    cities: state.cities,
    improvements: state.improvements,
    gameOver: state.gameOver,
  }).catch((err) => console.warn('autosave failed', err));
}

export const useGame = create<GameState>((set, get) => ({
  map: null,
  players: [],
  units: [],
  cities: [],
  improvements: {},
  turn: 1,
  seed: 0,
  difficulty: 'normal',
  currentSlot: null,
  selectedUnitId: null,
  selectedCityId: null,
  lastBattle: null,
  turnEvents: [],
  tilePicker: null,
  gameOver: null,

  newGame: (slot, seed, difficulty, leaders) => {
    const initial = buildInitialState(seed, difficulty, leaders);
    syncIdCounters(
      Math.max(0, ...initial.units.map((u) => parseIdNum(u.id))),
      Math.max(0, ...initial.cities.map((c) => parseIdNum(c.id))),
    );
    set({
      map: initial.map,
      players: initial.players,
      units: initial.units,
      cities: initial.cities,
      improvements: {},
      turn: 1,
      seed,
      difficulty,
      currentSlot: slot,
      selectedUnitId: null,
      selectedCityId: null,
      lastBattle: null,
      gameOver: null,
    });
    autosave(get());
  },

  loadFromSlot: async (slot) => {
    const data = await loadSlot(slot);
    if (!data) return false;
    // Forward-compat: older saves lacked workingOn / workTurnsLeft / destination / stack.
    const normalizedUnits: Unit[] = data.units.map((u) => ({
      ...u,
      workingOn: u.workingOn ?? null,
      workTurnsLeft: u.workTurnsLeft ?? 0,
      destination: u.destination ?? null,
      stack: (u.stack && u.stack.length > 0 ? u.stack : [u.kind]) as Unit['stack'],
    }));
    const normalizedPlayers: Player[] = data.players.map((p) => ({
      ...p,
      researched: p.researched ?? [],
      researching: p.researching ?? null,
      science: p.science ?? 0,
    }));
    // Forward-compat: older cities used a string `building` and a numeric
    // `productionPerTurn`. New schema uses a build target object and yields
    // come from worked tiles.
    const normalizedCities: City[] = data.cities.map((c) => {
      const raw = c as City & { building?: unknown };
      let building: CityBuildTarget | null = null;
      if (raw.building && typeof raw.building === 'string') {
        building = { kind: 'unit', unit: raw.building as UnitKind };
      } else if (
        raw.building &&
        typeof raw.building === 'object' &&
        'kind' in raw.building
      ) {
        building = raw.building as CityBuildTarget;
      }
      return {
        ...c,
        food: c.food ?? 0,
        buildings: c.buildings ?? [],
        building,
        focus: c.focus ?? 'balanced',
      };
    });
    syncIdCounters(
      Math.max(0, ...normalizedUnits.map((u) => parseIdNum(u.id))),
      Math.max(0, ...normalizedCities.map((c) => parseIdNum(c.id))),
    );
    set({
      map: data.map,
      players: normalizedPlayers,
      units: normalizedUnits,
      cities: normalizedCities,
      improvements: data.improvements ?? {},
      turn: data.turn,
      seed: data.seed,
      difficulty: data.difficulty,
      currentSlot: slot,
      selectedUnitId: null,
      selectedCityId: null,
      lastBattle: null,
      gameOver: data.gameOver ?? null,
    });
    return true;
  },

  exitToTitle: () => {
    set({
      map: null,
      players: [],
      units: [],
      cities: [],
      improvements: {},
      turn: 1,
      seed: 0,
      difficulty: 'normal',
      currentSlot: null,
      selectedUnitId: null,
      selectedCityId: null,
      lastBattle: null,
      gameOver: null,
    });
  },

  selectUnit: (id) => set({ selectedUnitId: id, selectedCityId: id ? null : get().selectedCityId }),
  selectCity: (id) => set({ selectedCityId: id, selectedUnitId: id ? null : get().selectedUnitId }),

  tapTile: (x, y) => {
    const state = get();
    if (state.gameOver) return;
    const { units, cities, selectedUnitId, selectedCityId, map, players, turn } = state;
    if (!map) return;

    const friendlyUnitAtTile = units.find(
      (u) => u.x === x && u.y === y && u.ownerIdx === HUMAN_IDX,
    );
    const enemyUnitAtTile = units.find(
      (u) => u.x === x && u.y === y && u.ownerIdx !== HUMAN_IDX,
    );
    const friendlyCityAtTile = cities.find(
      (c) => c.x === x && c.y === y && c.ownerIdx === HUMAN_IDX,
    );
    const enemyCityAtTile = cities.find(
      (c) => c.x === x && c.y === y && c.ownerIdx !== HUMAN_IDX,
    );
    const selected = units.find((u) => u.id === selectedUnitId) ?? null;

    if (selected) {
      if (friendlyUnitAtTile && friendlyUnitAtTile.id !== selected.id) {
        set({ selectedUnitId: friendlyUnitAtTile.id, selectedCityId: null });
        return;
      }
      if (friendlyUnitAtTile && friendlyUnitAtTile.id === selected.id) {
        set({ selectedUnitId: null, selectedCityId: null });
        return;
      }

      // Attack / capture path.
      if (enemyUnitAtTile || enemyCityAtTile) {
        if (selected.movesLeft <= 0) return;
        const dist = chebyshev(selected.x, selected.y, x, y);
        if (dist > selected.movesLeft) return;

        let nextUnits = units;
        let nextCities = cities;
        let battle: Battle | null = null;

        if (enemyUnitAtTile) {
          const defenderTile = map.tiles[y * map.width + x];
          // Walls add +1 defense if the defender is inside their own city.
          const cityHere = cities.find(
            (c) => c.x === x && c.y === y && c.ownerIdx === enemyUnitAtTile.ownerIdx,
          );
          const wallsBonus = cityHere?.buildings.includes('walls') ? 1 : 0;
          battle = resolveCombat(selected, enemyUnitAtTile, defenderTile, wallsBonus);
          if (!battle.attackerWon) {
            nextUnits = nextUnits.filter((u) => u.id !== selected.id);
            const finished = checkGameOver({
              units: nextUnits,
              cities: nextCities,
              players,
              turn,
            });
            set({
              units: nextUnits,
              selectedUnitId: null,
              lastBattle: battle,
              gameOver: finished,
            });
            autosave(get());
            return;
          }
          nextUnits = nextUnits.filter((u) => u.id !== enemyUnitAtTile.id);
        }

        nextUnits = nextUnits.map((u) =>
          u.id === selected.id ? { ...u, x, y, movesLeft: 0 } : u,
        );

        if (enemyCityAtTile) {
          nextCities = nextCities.map((c) =>
            c.id === enemyCityAtTile.id
              ? { ...c, ownerIdx: HUMAN_IDX, production: 0 }
              : c,
          );
        }

        const finished = checkGameOver({
          units: nextUnits,
          cities: nextCities,
          players,
          turn,
        });
        set({
          units: nextUnits,
          cities: nextCities,
          lastBattle: battle,
          gameOver: finished,
        });
        autosave(get());
        return;
      }

      // Plain move.
      if (selected.movesLeft <= 0) return;
      const dist = chebyshev(selected.x, selected.y, x, y);
      if (dist > selected.movesLeft) return;
      const targetTile = map.tiles[y * map.width + x];
      if (!TERRAIN[targetTile.terrain].passable) return;
      if (units.some((u) => u.x === x && u.y === y && u.ownerIdx === selected.ownerIdx)) return;
      set({
        units: units.map((u) =>
          u.id === selected.id ? { ...u, x, y, movesLeft: u.movesLeft - dist } : u,
        ),
      });
      autosave(get());
      return;
    }

    if (friendlyUnitAtTile) {
      set({ selectedUnitId: friendlyUnitAtTile.id, selectedCityId: null });
      return;
    }
    if (friendlyCityAtTile) {
      if (selectedCityId === friendlyCityAtTile.id) {
        set({ selectedCityId: null });
      } else {
        set({ selectedCityId: friendlyCityAtTile.id, selectedUnitId: null });
      }
      return;
    }
    set({ selectedUnitId: null, selectedCityId: null });
  },

  foundCity: () => {
    const { units, selectedUnitId, cities, map, gameOver } = get();
    if (gameOver || !map) return;
    const selected = units.find((u) => u.id === selectedUnitId);
    if (!selected || selected.kind !== 'pioneer') return;

    const tooClose = cities.some(
      (c) => chebyshev(c.x, c.y, selected.x, selected.y) < MIN_CITY_SPACING,
    );
    if (tooClose) return;

    const tile = map.tiles[selected.y * map.width + selected.x];
    if (!TERRAIN[tile.terrain].passable) return;

    const cityName = CITY_NAMES[cities.length % CITY_NAMES.length];
    const newCity: City = {
      id: nextCityId(),
      ownerIdx: selected.ownerIdx,
      name: cityName,
      x: selected.x,
      y: selected.y,
      population: 1,
      food: 0,
      buildings: [],
      building: { kind: 'unit', unit: 'footman' },
      production: 0,
      focus: 'balanced',
    };

    set({
      cities: [...cities, newCity],
      units: units.filter((u) => u.id !== selected.id),
      selectedUnitId: null,
      selectedCityId: newCity.id,
    });
    autosave(get());
  },

  setCityBuild: (cityId, target) => {
    if (get().gameOver) return;
    set({
      cities: get().cities.map((c) =>
        c.id === cityId ? { ...c, building: target } : c,
      ),
    });
    autosave(get());
  },

  setCityFocus: (cityId, focus) => {
    if (get().gameOver) return;
    set({
      cities: get().cities.map((c) => (c.id === cityId ? { ...c, focus } : c)),
    });
    autosave(get());
  },

  setResearch: (tech) => {
    const { players, gameOver } = get();
    if (gameOver) return;
    const human = players.find((p) => p.isHuman);
    if (!human) return;
    if (human.researched.includes(tech)) return;
    if (!prereqsMet(human.researched, tech)) return;
    set({
      players: players.map((p) =>
        p.isHuman ? { ...p, researching: tech } : p,
      ),
    });
    autosave(get());
  },

  startWork: (kind) => {
    const { units, selectedUnitId, improvements, gameOver } = get();
    if (gameOver) return;
    const sel = units.find((u) => u.id === selectedUnitId);
    if (!sel || sel.kind !== 'laborer') return;
    if (sel.ownerIdx !== 0) return;
    if (sel.workingOn) return;
    if (improvements[tileKey(sel.x, sel.y)]) return;
    set({
      units: units.map((u) =>
        u.id === sel.id
          ? { ...u, workingOn: kind, workTurnsLeft: IMPROVEMENT[kind].buildTurns, movesLeft: 0 }
          : u,
      ),
    });
    autosave(get());
  },

  cancelWork: () => {
    const { units, selectedUnitId } = get();
    const sel = units.find((u) => u.id === selectedUnitId);
    if (!sel || !sel.workingOn) return;
    set({
      units: units.map((u) =>
        u.id === sel.id ? { ...u, workingOn: null, workTurnsLeft: 0 } : u,
      ),
    });
    autosave(get());
  },

  setUnitDestination: (unitId, x, y) => {
    const { units, map, gameOver } = get();
    if (gameOver || !map) return;
    const u = units.find((u) => u.id === unitId);
    if (!u || u.ownerIdx !== HUMAN_IDX) return;
    if (x < 0 || y < 0 || x >= map.width || y >= map.height) return;
    if (u.x === x && u.y === y) {
      set({
        units: units.map((v) => (v.id === unitId ? { ...v, destination: null } : v)),
      });
      autosave(get());
      return;
    }

    // Drag onto a friendly military unit on an adjacent tile -> merge into army.
    const friendlyHere = units.find(
      (o) => o.x === x && o.y === y && o.ownerIdx === HUMAN_IDX && o.id !== unitId,
    );
    if (friendlyHere) {
      const dist = chebyshev(u.x, u.y, x, y);
      const military: UnitKind[] = ['footman', 'spearman', 'horseman', 'swordsman', 'catapult'];
      if (
        dist === 1 &&
        military.includes(u.kind) &&
        military.includes(friendlyHere.kind) &&
        u.stack.length + friendlyHere.stack.length <= 3
      ) {
        set({
          units: units
            .filter((o) => o.id !== u.id)
            .map((o) =>
              o.id === friendlyHere.id
                ? { ...o, stack: [...o.stack, ...u.stack] }
                : o,
            ),
          selectedUnitId: friendlyHere.id,
        });
        autosave(get());
      }
      return;
    }

    const tile = map.tiles[y * map.width + x];
    if (!TERRAIN[tile.terrain].passable) return;
    set({
      units: units.map((v) =>
        v.id === unitId ? { ...v, destination: { x, y }, workingOn: null, workTurnsLeft: 0 } : v,
      ),
    });
    autosave(get());
  },

  clearUnitDestination: (unitId) => {
    set({
      units: get().units.map((u) =>
        u.id === unitId ? { ...u, destination: null } : u,
      ),
    });
    autosave(get());
  },

  openTilePicker: (x, y) => {
    const { units, cities } = get();
    const hasUnit = units.some((u) => u.x === x && u.y === y && u.ownerIdx === HUMAN_IDX);
    const hasCity = cities.some((c) => c.x === x && c.y === y && c.ownerIdx === HUMAN_IDX);
    if (!hasUnit && !hasCity) return;
    set({ tilePicker: { x, y } });
  },

  closeTilePicker: () => set({ tilePicker: null }),

  endTurn: () => {
    const { units, cities, turn, map, players, improvements, gameOver } = get();
    if (gameOver || !map) return;

    const events: TurnEvent[] = [];
    const playerName = (idx: number) => players[idx]?.name ?? `Player ${idx}`;

    // Refresh moves; +1 movement bonus when starting on a road tile.
    let workingUnits: Unit[] = units.map((u) => {
      const baseMove = UNIT[u.kind].move;
      const bonus = improvements[tileKey(u.x, u.y)] === 'road' ? 1 : 0;
      return { ...u, movesLeft: baseMove + bonus };
    });

    // Advance any in-progress work; complete improvements when done.
    let workingImprovements: ImprovementMap = improvements;
    workingUnits = workingUnits.map((u) => {
      if (!u.workingOn || u.workTurnsLeft <= 0) return u;
      const next = u.workTurnsLeft - 1;
      if (next <= 0) {
        workingImprovements = {
          ...workingImprovements,
          [tileKey(u.x, u.y)]: u.workingOn,
        };
        return { ...u, workingOn: null, workTurnsLeft: 0 };
      }
      return { ...u, workingOn: u.workingOn, workTurnsLeft: next, movesLeft: 0 };
    });

    let workingCities: City[] = cities.map((city) => {
      const yields = computeCityYields(city, map);

      // Food growth: surplus food goes into the city's larder; on overflow,
      // grow a citizen. Granary keeps half of the larder on growth.
      let nextPop = city.population;
      let nextFood = Math.max(0, city.food + yields.food);
      const threshold = foodNeededToGrow(nextPop);
      if (nextFood >= threshold) {
        nextPop += 1;
        const hasGranary = city.buildings.includes('granary');
        nextFood = hasGranary ? Math.floor(threshold / 2) : 0;
        if (city.ownerIdx === HUMAN_IDX) {
          events.push({ kind: 'grew', text: `${city.name} grew to size ${nextPop}.` });
        }
      }

      // Production: accumulate prod from yields toward the current build.
      const accrued = city.production + yields.prod;
      if (!city.building) {
        return { ...city, population: nextPop, food: nextFood, production: accrued };
      }
      const cost = buildCost(city.building);
      if (accrued < cost) {
        return { ...city, population: nextPop, food: nextFood, production: accrued };
      }

      // Completed something.
      if (city.building.kind === 'unit') {
        const unitKind = city.building.unit;
        const spawnPos = findSpawnTile(city, workingUnits, map);
        if (!spawnPos) {
          return { ...city, population: nextPop, food: nextFood, production: accrued };
        }
        workingUnits.push({
          id: nextUnitId(),
          kind: unitKind,
          ownerIdx: city.ownerIdx,
          x: spawnPos.x,
          y: spawnPos.y,
          movesLeft: UNIT[unitKind].move,
          workingOn: null,
          workTurnsLeft: 0,
          destination: null,
          stack: [unitKind],
        });
        if (city.ownerIdx === HUMAN_IDX) {
          events.push({
            kind: 'built',
            text: `${city.name} built a ${UNIT[unitKind].name}.`,
          });
        }
        // For AI cities, pick the next build dynamically based on need.
        let nextBuilding: CityBuildTarget = city.building;
        if (city.ownerIdx !== HUMAN_IDX) {
          const owner = players.find((p) => p.idx === city.ownerIdx);
          nextBuilding = pickAINextBuild(
            city.ownerIdx,
            cities,
            workingUnits,
            owner?.researched ?? [],
          );
        }
        return {
          ...city,
          population: nextPop,
          food: nextFood,
          production: accrued - cost,
          building: nextBuilding,
        };
      }

      // Building completed: add to buildings, default back to footman.
      const kind = city.building.building;
      if (city.buildings.includes(kind)) {
        // Already owned — drop the prod and revert to footman.
        return {
          ...city,
          population: nextPop,
          food: nextFood,
          production: 0,
          building: { kind: 'unit', unit: 'footman' },
        };
      }
      if (city.ownerIdx === HUMAN_IDX) {
        events.push({
          kind: 'built',
          text: `${city.name} finished ${BUILDING[kind].name}.`,
        });
      }
      return {
        ...city,
        population: nextPop,
        food: nextFood,
        production: 0,
        buildings: [...city.buildings, kind],
        building: { kind: 'unit', unit: 'footman' },
      };
    });

    // Auto-move pass: any unit with a destination tries to step toward it.
    // BFS from current position to destination. If blocked or destination
    // reached, the destination clears.
    workingUnits = workingUnits.map((u) => {
      if (!u.destination) return u;
      if (u.movesLeft <= 0) return u;
      if (u.workingOn) return u;
      if (u.x === u.destination.x && u.y === u.destination.y) {
        return { ...u, destination: null };
      }
      const fakeCityForDest: City = {
        id: '__dest__',
        ownerIdx: u.ownerIdx,
        name: 'dest',
        x: u.destination.x,
        y: u.destination.y,
        population: 0,
        food: 0,
        buildings: [],
        building: null,
        production: 0,
        focus: 'balanced',
      };
      const next = nextStepToFriendlyCity(
        u,
        [...workingCities, fakeCityForDest],
        workingUnits,
        map,
      );
      if (!next) return { ...u, destination: null };
      const blockedByFriendly = workingUnits.some(
        (o) => o.id !== u.id && o.x === next.x && o.y === next.y && o.ownerIdx === u.ownerIdx,
      );
      const blockedByEnemy = workingUnits.some(
        (o) => o.x === next.x && o.y === next.y && o.ownerIdx !== u.ownerIdx,
      );
      if (blockedByFriendly || blockedByEnemy) {
        // Stop short, keep destination so we'll try again next turn.
        return u;
      }
      const moved = { ...u, x: next.x, y: next.y, movesLeft: u.movesLeft - 1 };
      if (moved.x === moved.destination!.x && moved.y === moved.destination!.y) {
        moved.destination = null;
      }
      return moved;
    });

    // Auto-Laborer pass: any player whose city has focus='roads' gets their
    // free Laborers (no manual destination, not already busy) either building
    // on the current tile or stepping toward the closest other friendly city.
    const playersWantingRoads = new Set(
      workingCities.filter((c) => c.focus === 'roads').map((c) => c.ownerIdx),
    );
    if (playersWantingRoads.size > 0) {
      workingUnits = workingUnits.map((u) => {
        if (u.kind !== 'laborer') return u;
        if (!playersWantingRoads.has(u.ownerIdx)) return u;
        if (u.workingOn) return u;
        if (u.destination) return u; // manual order takes priority
        if (u.movesLeft <= 0) return u;
        const here = tileKey(u.x, u.y);
        const onCity = workingCities.some((c) => c.x === u.x && c.y === u.y);
        if (!onCity && !workingImprovements[here]) {
          return {
            ...u,
            workingOn: 'road' as const,
            workTurnsLeft: IMPROVEMENT.road.buildTurns,
            movesLeft: 0,
          };
        }
        const next = nextStepToFriendlyCity(u, workingCities, workingUnits, map);
        if (!next) return u;
        const blockedByFriendly = workingUnits.some(
          (o) =>
            o.id !== u.id && o.x === next.x && o.y === next.y && o.ownerIdx === u.ownerIdx,
        );
        if (blockedByFriendly) return u;
        return { ...u, x: next.x, y: next.y, movesLeft: u.movesLeft - 1 };
      });
    }

    // Science: aggregate per-player science gain from each city's yields.
    const scienceByPlayer = new Map<number, number>();
    for (const c of workingCities) {
      const y = computeCityYields(c, map);
      scienceByPlayer.set(c.ownerIdx, (scienceByPlayer.get(c.ownerIdx) ?? 0) + y.science);
    }

    let workingPlayers: Player[] = players.map((p) => {
      const gain = scienceByPlayer.get(p.idx) ?? 0;
      let science = p.science + gain;
      let researching = p.researching;
      let researched = p.researched;
      // Complete research if we have enough.
      while (researching && science >= TECH[researching].cost) {
        const finished = researching;
        science -= TECH[finished].cost;
        researched = [...researched, finished];
        researching = null;
        if (p.isHuman) {
          events.push({
            kind: 'research',
            text: `Researched ${TECH[finished].name}.`,
          });
        }
        if (!p.isHuman) researching = pickCheapestAvailable(researched);
      }
      if (!p.isHuman && !researching) {
        researching = pickCheapestAvailable(researched);
      }
      return { ...p, science, researching, researched };
    });

    let lastAIBattle: Battle | null = null;
    for (const player of workingPlayers) {
      if (player.isHuman) continue;
      const result = runAITurn({
        ownerIdx: player.idx,
        map,
        units: workingUnits,
        cities: workingCities,
      });
      workingUnits = result.units;
      workingCities = result.cities;
      for (const b of result.battles) {
        if (b.attackerOwnerIdx === HUMAN_IDX || b.defenderOwnerIdx === HUMAN_IDX) {
          const ours = b.attackerOwnerIdx === HUMAN_IDX ? b.attackerKind : b.defenderKind;
          const theirs = b.attackerOwnerIdx === HUMAN_IDX ? b.defenderKind : b.attackerKind;
          const theirOwner = b.attackerOwnerIdx === HUMAN_IDX
            ? b.defenderOwnerIdx
            : b.attackerOwnerIdx;
          const weWon =
            (b.attackerOwnerIdx === HUMAN_IDX && b.attackerWon) ||
            (b.defenderOwnerIdx === HUMAN_IDX && !b.attackerWon);
          events.push({
            kind: 'battle',
            text: `${UNIT[ours].name} ${weWon ? 'beat' : 'lost to'} ${playerName(theirOwner)} ${UNIT[theirs].name} (${b.attackerRoll} vs ${b.defenderRoll}).`,
          });
        }
      }
      if (result.battles.length > 0) {
        lastAIBattle = result.battles[result.battles.length - 1];
      }
    }

    const newTurn = turn + 1;
    const finished = checkGameOver({
      units: workingUnits,
      cities: workingCities,
      players: workingPlayers,
      turn: newTurn,
    });

    set({
      turn: newTurn,
      selectedUnitId: null,
      selectedCityId: null,
      players: workingPlayers,
      units: workingUnits,
      cities: workingCities,
      improvements: workingImprovements,
      lastBattle: lastAIBattle,
      turnEvents: events,
      gameOver: finished,
    });
    autosave(get());
  },

  dismissBattle: () => set({ lastBattle: null }),
  dismissTurnEvents: () => set({ turnEvents: [] }),

  selectUnitFromPicker: (unitId: string) => {
    set({ selectedUnitId: unitId, selectedCityId: null, tilePicker: null });
  },
  selectCityFromPicker: (cityId: string) => {
    set({ selectedCityId: cityId, selectedUnitId: null, tilePicker: null });
  },
}));
