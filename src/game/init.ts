import { TERRAIN } from '@/src/data/terrain';
import { UNIT } from '@/src/data/units';
import { PLAYER_PALETTE } from '@/src/ui/palette';

import { nextUnitId } from './ids';
import { generateMap } from './mapgen';
import { chebyshev, type GameMap } from './map';
import {
  DIFFICULTY_AI_COUNT,
  type City,
  type Difficulty,
  type Player,
  type Unit,
} from './types';

export type InitialState = {
  map: GameMap;
  players: Player[];
  units: Unit[];
  cities: City[];
};

const PREFERRED_TERRAIN = new Set(['grassland', 'plains']);

const AI_NAMES = ['Mongols', 'Romans', 'Greeks', 'Norse', 'Persians', 'Aztecs', 'Egyptians'];

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function minDistanceForPlayerCount(count: number): number {
  if (count <= 2) return 14;
  if (count <= 4) return 10;
  if (count <= 6) return 8;
  return 6;
}

function pickSpawnPoints(map: GameMap, count: number): { x: number; y: number }[] {
  const minDist = minDistanceForPlayerCount(count);
  const preferred = map.tiles.filter(
    (t) => TERRAIN[t.terrain].passable && PREFERRED_TERRAIN.has(t.terrain),
  );
  const fallback = map.tiles.filter((t) => TERRAIN[t.terrain].passable);
  const pool = preferred.length > 0 ? preferred : fallback;
  if (pool.length === 0) return [{ x: 0, y: 0 }];

  const cx = map.width / 2;
  const cy = map.height / 2;

  const sortedByCenter = [...pool].sort(
    (a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy),
  );

  const spawns: { x: number; y: number }[] = [{ x: sortedByCenter[0].x, y: sortedByCenter[0].y }];

  for (let n = 1; n < count; n++) {
    let best: { x: number; y: number } | null = null;
    let bestScore = -1;
    let bestRespectingMinDist: { x: number; y: number } | null = null;
    let bestRespectingScore = -1;

    for (const t of pool) {
      let minD = Number.POSITIVE_INFINITY;
      for (const s of spawns) {
        const d = chebyshev(t.x, t.y, s.x, s.y);
        if (d < minD) minD = d;
      }
      if (minD > bestScore) {
        bestScore = minD;
        best = { x: t.x, y: t.y };
      }
      if (minD >= minDist && minD > bestRespectingScore) {
        bestRespectingScore = minD;
        bestRespectingMinDist = { x: t.x, y: t.y };
      }
    }

    spawns.push(bestRespectingMinDist ?? best ?? spawns[0]);
  }

  return spawns;
}

function spawnStartingUnits(
  ownerIdx: number,
  start: { x: number; y: number },
  map: GameMap,
): Unit[] {
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

export function buildInitialState(seed: number, difficulty: Difficulty): InitialState {
  const map = generateMap(seed);
  const aiCount = DIFFICULTY_AI_COUNT[difficulty];
  const totalPlayers = 1 + aiCount;
  const spawns = pickSpawnPoints(map, totalPlayers);

  const players: Player[] = [
    { idx: 0, name: 'You', color: PLAYER_PALETTE[0], isHuman: true },
  ];
  const units: Unit[] = [...spawnStartingUnits(0, spawns[0], map)];

  for (let i = 0; i < aiCount; i++) {
    const idx = i + 1;
    players.push({
      idx,
      name: AI_NAMES[i % AI_NAMES.length],
      color: PLAYER_PALETTE[idx % PLAYER_PALETTE.length],
      isHuman: false,
    });
    const start = spawns[idx] ?? spawns[0];
    units.push(...spawnStartingUnits(idx, start, map));
  }

  return { map, players, units, cities: [] };
}
