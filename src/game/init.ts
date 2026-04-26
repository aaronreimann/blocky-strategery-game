import { TERRAIN } from '@/src/data/terrain';
import { UNIT } from '@/src/data/units';
import { PLAYER_PALETTE } from '@/src/ui/palette';

import { generateMap } from './mapgen';
import type { City, Player, Unit } from './types';
import type { GameMap } from './map';

export type InitialState = {
  map: GameMap;
  players: Player[];
  units: Unit[];
  cities: City[];
};

function findStartTile(map: GameMap): { x: number; y: number } {
  // Prefer grassland/plains close to the center of the map.
  const cx = map.width / 2;
  const cy = map.height / 2;
  const candidates = map.tiles.filter(
    (t) => TERRAIN[t.terrain].passable && (t.terrain === 'grassland' || t.terrain === 'plains'),
  );
  candidates.sort(
    (a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy),
  );
  if (candidates.length > 0) return { x: candidates[0].x, y: candidates[0].y };
  // Fallback: any passable tile.
  const anyLand = map.tiles.find((t) => TERRAIN[t.terrain].passable);
  return anyLand ? { x: anyLand.x, y: anyLand.y } : { x: 0, y: 0 };
}

let unitCounter = 0;
function nextUnitId(): string {
  unitCounter += 1;
  return `u${unitCounter}`;
}

export function buildInitialState(seed: number): InitialState {
  const map = generateMap(seed);
  const start = findStartTile(map);

  const human: Player = {
    idx: 0,
    name: 'You',
    color: PLAYER_PALETTE[0],
    isHuman: true,
  };

  const units: Unit[] = [
    {
      id: nextUnitId(),
      kind: 'pioneer',
      ownerIdx: 0,
      x: start.x,
      y: start.y,
      movesLeft: UNIT.pioneer.move,
    },
    {
      id: nextUnitId(),
      kind: 'footman',
      ownerIdx: 0,
      x: clamp(start.x + 1, 0, map.width - 1),
      y: start.y,
      movesLeft: UNIT.footman.move,
    },
    {
      id: nextUnitId(),
      kind: 'laborer',
      ownerIdx: 0,
      x: start.x,
      y: clamp(start.y + 1, 0, map.height - 1),
      movesLeft: UNIT.laborer.move,
    },
  ];

  return {
    map,
    players: [human],
    units,
    cities: [],
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
