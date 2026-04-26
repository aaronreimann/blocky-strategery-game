import { create } from 'zustand';

import { TERRAIN } from '@/src/data/terrain';
import { UNIT, type UnitKind } from '@/src/data/units';
import { nextCityId, nextUnitId } from '@/src/game/ids';
import { buildInitialState } from '@/src/game/init';
import { chebyshev, type GameMap } from '@/src/game/map';
import type { City, Player, Unit } from '@/src/game/types';

const MIN_CITY_SPACING = 3;
const DEFAULT_PRODUCTION_PER_TURN = 3;

type GameState = {
  map: GameMap | null;
  players: Player[];
  units: Unit[];
  cities: City[];
  turn: number;
  selectedUnitId: string | null;
  selectedCityId: string | null;

  init: (seed: number) => void;
  selectUnit: (id: string | null) => void;
  selectCity: (id: string | null) => void;
  tapTile: (x: number, y: number) => void;
  foundCity: () => void;
  setCityBuild: (cityId: string, kind: UnitKind) => void;
  endTurn: () => void;
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
  // Try city tile first, then 8 neighbors in deterministic order.
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

export const useGame = create<GameState>((set, get) => ({
  map: null,
  players: [],
  units: [],
  cities: [],
  turn: 1,
  selectedUnitId: null,
  selectedCityId: null,

  init: (seed) => {
    const initial = buildInitialState(seed);
    set({
      map: initial.map,
      players: initial.players,
      units: initial.units,
      cities: initial.cities,
      turn: 1,
      selectedUnitId: null,
      selectedCityId: null,
    });
  },

  selectUnit: (id) => set({ selectedUnitId: id, selectedCityId: id ? null : get().selectedCityId }),
  selectCity: (id) => set({ selectedCityId: id, selectedUnitId: id ? null : get().selectedUnitId }),

  tapTile: (x, y) => {
    const { units, cities, selectedUnitId, selectedCityId, map } = get();
    if (!map) return;

    const unitAtTile = units.find((u) => u.x === x && u.y === y && u.ownerIdx === 0);
    const friendlyCityAtTile = cities.find((c) => c.x === x && c.y === y && c.ownerIdx === 0);
    const selected = units.find((u) => u.id === selectedUnitId) ?? null;

    // Unit currently selected → handle switch / deselect / move.
    if (selected) {
      if (unitAtTile && unitAtTile.id !== selected.id) {
        set({ selectedUnitId: unitAtTile.id, selectedCityId: null });
        return;
      }
      if (unitAtTile && unitAtTile.id === selected.id) {
        set({ selectedUnitId: null, selectedCityId: null });
        return;
      }
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
      return;
    }

    // Nothing selected → prefer unit, then city, then nothing.
    if (unitAtTile) {
      set({ selectedUnitId: unitAtTile.id, selectedCityId: null });
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
    const { units, selectedUnitId, cities, map } = get();
    if (!map) return;
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
  },

  setCityBuild: (cityId, kind) => {
    set({
      cities: get().cities.map((c) => (c.id === cityId ? { ...c, building: kind } : c)),
    });
  },

  endTurn: () => {
    const { units, cities, turn, map } = get();
    if (!map) return;

    const refreshedUnits: Unit[] = units.map((u) => ({
      ...u,
      movesLeft: UNIT[u.kind].move,
    }));

    const newCities: City[] = cities.map((city) => {
      const accrued = city.production + city.productionPerTurn;
      if (!city.building) {
        return { ...city, production: accrued };
      }
      const cost = UNIT[city.building].cost;
      if (accrued < cost) {
        return { ...city, production: accrued };
      }
      const spawnPos = findSpawnTile(city, refreshedUnits, map);
      if (!spawnPos) {
        // No room — hold production until next turn.
        return { ...city, production: accrued };
      }
      refreshedUnits.push({
        id: nextUnitId(),
        kind: city.building,
        ownerIdx: city.ownerIdx,
        x: spawnPos.x,
        y: spawnPos.y,
        movesLeft: UNIT[city.building].move,
      });
      return { ...city, production: accrued - cost };
    });

    set({
      turn: turn + 1,
      selectedUnitId: null,
      selectedCityId: null,
      units: refreshedUnits,
      cities: newCities,
    });
  },
}));
