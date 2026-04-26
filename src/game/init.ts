import { TERRAIN } from '@/src/data/terrain';
import { UNIT } from '@/src/data/units';
import { PLAYER_PALETTE } from '@/src/ui/palette';

import { nextUnitId } from './ids';
import { generateMap } from './mapgen';
import { chebyshev, type GameMap } from './map';
import type { City, Player, Unit } from './types';

export type InitialState = {
  map: GameMap;
  players: Player[];
  units: Unit[];
  cities: City[];
};

const PREFERRED_TERRAIN = new Set(['grassland', 'plains']);
const MIN_PLAYER_DISTANCE = 12;

function findStartTile(
  map: GameMap,
  excludeNear: { x: number; y: number; minDist: number } | null = null,
): { x: number; y: number } {
  const cx = map.width / 2;
  const cy = map.height / 2;

  const candidates = map.tiles.filter((t) => {
    if (!TERRAIN[t.terrain].passable) return false;
    if (!PREFERRED_TERRAIN.has(t.terrain)) return false;
    if (excludeNear && chebyshev(t.x, t.y, excludeNear.x, excludeNear.y) < excludeNear.minDist) {
      return false;
    }
    return true;
  });

  if (candidates.length === 0) {
    const anyLand = map.tiles.find(
      (t) =>
        TERRAIN[t.terrain].passable &&
        (!excludeNear ||
          chebyshev(t.x, t.y, excludeNear.x, excludeNear.y) >= excludeNear.minDist),
    );
    return anyLand ? { x: anyLand.x, y: anyLand.y } : { x: 0, y: 0 };
  }

  if (excludeNear) {
    candidates.sort(
      (a, b) =>
        chebyshev(b.x, b.y, excludeNear.x, excludeNear.y) -
        chebyshev(a.x, a.y, excludeNear.x, excludeNear.y),
    );
  } else {
    candidates.sort(
      (a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy),
    );
  }
  return { x: candidates[0].x, y: candidates[0].y };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function spawnStartingUnits(ownerIdx: number, start: { x: number; y: number }, map: GameMap): Unit[] {
  return [
    {
      id: nextUnitId(),
      kind: 'pioneer',
      ownerIdx,
      x: start.x,
      y: start.y,
      movesLeft: UNIT.pioneer.move,
    },
    {
      id: nextUnitId(),
      kind: 'footman',
      ownerIdx,
      x: clamp(start.x + 1, 0, map.width - 1),
      y: start.y,
      movesLeft: UNIT.footman.move,
    },
    {
      id: nextUnitId(),
      kind: 'laborer',
      ownerIdx,
      x: start.x,
      y: clamp(start.y + 1, 0, map.height - 1),
      movesLeft: UNIT.laborer.move,
    },
  ];
}

export function buildInitialState(seed: number): InitialState {
  const map = generateMap(seed);

  const humanStart = findStartTile(map);
  const aiStart = findStartTile(map, {
    x: humanStart.x,
    y: humanStart.y,
    minDist: MIN_PLAYER_DISTANCE,
  });

  const human: Player = {
    idx: 0,
    name: 'You',
    color: PLAYER_PALETTE[0],
    isHuman: true,
  };
  const ai: Player = {
    idx: 1,
    name: 'Mongols',
    color: PLAYER_PALETTE[1],
    isHuman: false,
  };

  const units: Unit[] = [
    ...spawnStartingUnits(0, humanStart, map),
    ...spawnStartingUnits(1, aiStart, map),
  ];

  return {
    map,
    players: [human, ai],
    units,
    cities: [],
  };
}
