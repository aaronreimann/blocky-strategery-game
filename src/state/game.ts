import { create } from 'zustand';

import type { LeaderMap } from '@/src/data/countries';
import { TERRAIN } from '@/src/data/terrain';
import { UNIT, type UnitKind } from '@/src/data/units';
import { runAITurn } from '@/src/game/ai';
import { resolveCombat, type Battle } from '@/src/game/combat';
import { checkGameOver } from '@/src/game/gameOver';
import { nextCityId, nextUnitId, parseIdNum, syncIdCounters } from '@/src/game/ids';
import { buildInitialState } from '@/src/game/init';
import { chebyshev, type GameMap } from '@/src/game/map';
import type { City, Difficulty, GameOverState, Player, Unit } from '@/src/game/types';

import { loadSlot, saveSlot } from './saves';

const MIN_CITY_SPACING = 3;
const DEFAULT_PRODUCTION_PER_TURN = 3;
const HUMAN_IDX = 0;

type GameState = {
  map: GameMap | null;
  players: Player[];
  units: Unit[];
  cities: City[];
  turn: number;
  seed: number;
  difficulty: Difficulty;
  currentSlot: number | null;
  selectedUnitId: string | null;
  selectedCityId: string | null;
  lastBattle: Battle | null;
  gameOver: GameOverState | null;

  newGame: (slot: number, seed: number, difficulty: Difficulty, leaders: LeaderMap) => void;
  loadFromSlot: (slot: number) => Promise<boolean>;
  exitToTitle: () => void;

  selectUnit: (id: string | null) => void;
  selectCity: (id: string | null) => void;
  tapTile: (x: number, y: number) => void;
  foundCity: () => void;
  setCityBuild: (cityId: string, kind: UnitKind) => void;
  endTurn: () => void;
  dismissBattle: () => void;
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
    gameOver: state.gameOver,
  }).catch((err) => console.warn('autosave failed', err));
}

export const useGame = create<GameState>((set, get) => ({
  map: null,
  players: [],
  units: [],
  cities: [],
  turn: 1,
  seed: 0,
  difficulty: 'normal',
  currentSlot: null,
  selectedUnitId: null,
  selectedCityId: null,
  lastBattle: null,
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
    syncIdCounters(
      Math.max(0, ...data.units.map((u) => parseIdNum(u.id))),
      Math.max(0, ...data.cities.map((c) => parseIdNum(c.id))),
    );
    set({
      map: data.map,
      players: data.players,
      units: data.units,
      cities: data.cities,
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
          battle = resolveCombat(selected.kind, enemyUnitAtTile.kind, defenderTile);
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
      building: 'footman',
      production: 0,
      productionPerTurn: DEFAULT_PRODUCTION_PER_TURN,
    };

    set({
      cities: [...cities, newCity],
      units: units.filter((u) => u.id !== selected.id),
      selectedUnitId: null,
      selectedCityId: newCity.id,
    });
    autosave(get());
  },

  setCityBuild: (cityId, kind) => {
    if (get().gameOver) return;
    set({
      cities: get().cities.map((c) => (c.id === cityId ? { ...c, building: kind } : c)),
    });
    autosave(get());
  },

  endTurn: () => {
    const { units, cities, turn, map, players, gameOver } = get();
    if (gameOver || !map) return;

    let workingUnits: Unit[] = units.map((u) => ({
      ...u,
      movesLeft: UNIT[u.kind].move,
    }));

    let workingCities: City[] = cities.map((city) => {
      const accrued = city.production + city.productionPerTurn;
      if (!city.building) return { ...city, production: accrued };
      const cost = UNIT[city.building].cost;
      if (accrued < cost) return { ...city, production: accrued };
      const spawnPos = findSpawnTile(city, workingUnits, map);
      if (!spawnPos) return { ...city, production: accrued };
      workingUnits.push({
        id: nextUnitId(),
        kind: city.building,
        ownerIdx: city.ownerIdx,
        x: spawnPos.x,
        y: spawnPos.y,
        movesLeft: UNIT[city.building].move,
      });
      return { ...city, production: accrued - cost };
    });

    let lastAIBattle: Battle | null = null;
    for (const player of players) {
      if (player.isHuman) continue;
      const result = runAITurn({
        ownerIdx: player.idx,
        map,
        units: workingUnits,
        cities: workingCities,
      });
      workingUnits = result.units;
      workingCities = result.cities;
      if (result.battles.length > 0) {
        lastAIBattle = result.battles[result.battles.length - 1];
      }
    }

    const newTurn = turn + 1;
    const finished = checkGameOver({
      units: workingUnits,
      cities: workingCities,
      players,
      turn: newTurn,
    });

    set({
      turn: newTurn,
      selectedUnitId: null,
      selectedCityId: null,
      units: workingUnits,
      cities: workingCities,
      lastBattle: lastAIBattle,
      gameOver: finished,
    });
    autosave(get());
  },

  dismissBattle: () => set({ lastBattle: null }),
}));
