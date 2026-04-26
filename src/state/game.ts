import { create } from 'zustand';

import { TERRAIN } from '@/src/data/terrain';
import { UNIT } from '@/src/data/units';
import { buildInitialState } from '@/src/game/init';
import { chebyshev, type GameMap } from '@/src/game/map';
import type { City, Player, Unit } from '@/src/game/types';

const MIN_CITY_SPACING = 3;

type GameState = {
  map: GameMap | null;
  players: Player[];
  units: Unit[];
  cities: City[];
  turn: number;
  selectedUnitId: string | null;

  init: (seed: number) => void;
  selectUnit: (id: string | null) => void;
  tapTile: (x: number, y: number) => void;
  foundCity: () => void;
  endTurn: () => void;
};

let cityCounter = 0;
function nextCityId(): string {
  cityCounter += 1;
  return `c${cityCounter}`;
}

const CITY_NAMES = [
  'Rivermouth', 'Highkeep', 'Stonehold', 'Goldfield', 'Ironreach',
  'Saltmarsh', 'Greenvale', 'Northwatch', 'Sunhaven', 'Whitefall',
];

export const useGame = create<GameState>((set, get) => ({
  map: null,
  players: [],
  units: [],
  cities: [],
  turn: 1,
  selectedUnitId: null,

  init: (seed) => {
    const initial = buildInitialState(seed);
    set({
      map: initial.map,
      players: initial.players,
      units: initial.units,
      cities: initial.cities,
      turn: 1,
      selectedUnitId: null,
    });
  },

  selectUnit: (id) => set({ selectedUnitId: id }),

  tapTile: (x, y) => {
    const { units, selectedUnitId, map } = get();
    if (!map) return;

    const unitAtTile = units.find((u) => u.x === x && u.y === y && u.ownerIdx === 0);
    const selected = units.find((u) => u.id === selectedUnitId) ?? null;

    // No selection → select unit if there is one here.
    if (!selected) {
      set({ selectedUnitId: unitAtTile?.id ?? null });
      return;
    }

    // Tapped a friendly unit other than the selected one → switch selection.
    if (unitAtTile && unitAtTile.id !== selected.id) {
      set({ selectedUnitId: unitAtTile.id });
      return;
    }

    // Tapped the selected unit's own tile → deselect.
    if (unitAtTile && unitAtTile.id === selected.id) {
      set({ selectedUnitId: null });
      return;
    }

    // Otherwise, attempt to move there.
    if (selected.movesLeft <= 0) return;
    const dist = chebyshev(selected.x, selected.y, x, y);
    if (dist > selected.movesLeft) return;

    const targetTile = map.tiles[y * map.width + x];
    if (!TERRAIN[targetTile.terrain].passable) return;

    // No stacking — block move into another friendly unit.
    if (units.some((u) => u.x === x && u.y === y && u.ownerIdx === selected.ownerIdx)) return;

    set({
      units: units.map((u) =>
        u.id === selected.id ? { ...u, x, y, movesLeft: u.movesLeft - dist } : u,
      ),
    });
  },

  foundCity: () => {
    const { units, selectedUnitId, cities, map } = get();
    if (!map) return;
    const selected = units.find((u) => u.id === selectedUnitId);
    if (!selected || selected.kind !== 'pioneer') return;

    // Min spacing from existing cities.
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
    };

    set({
      cities: [...cities, newCity],
      // Pioneer is consumed when founding a city.
      units: units.filter((u) => u.id !== selected.id),
      selectedUnitId: null,
    });
  },

  endTurn: () => {
    const { units, turn } = get();
    set({
      turn: turn + 1,
      selectedUnitId: null,
      units: units.map((u) => ({ ...u, movesLeft: UNIT[u.kind].move })),
    });
  },
}));
