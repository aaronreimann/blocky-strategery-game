import { COUNTRIES, type Country, type LeaderMap } from '@/src/data/countries';
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
    let bestRespecting: { x: number; y: number } | null = null;
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
        bestRespecting = { x: t.x, y: t.y };
      }
    }
    spawns.push(bestRespecting ?? best ?? spawns[0]);
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
      workingOn: null,
      workTurnsLeft: 0,
      destination: null,
      stack: ['pioneer'],
    },
    {
      id: nextUnitId(),
      kind: 'footman',
      ownerIdx,
      x: clamp(start.x + 1, 0, map.width - 1),
      y: start.y,
      movesLeft: UNIT.footman.move,
      workingOn: null,
      workTurnsLeft: 0,
      destination: null,
      stack: ['footman'],
    },
    {
      id: nextUnitId(),
      kind: 'laborer',
      ownerIdx,
      x: start.x,
      y: clamp(start.y + 1, 0, map.height - 1),
      movesLeft: UNIT.laborer.move,
      workingOn: null,
      workTurnsLeft: 0,
      destination: null,
      stack: ['laborer'],
    },
  ];
}

function pickRandomCountries(count: number): Country[] {
  const shuffled = [...COUNTRIES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function buildInitialState(
  seed: number,
  difficulty: Difficulty,
  leaders: LeaderMap,
): InitialState {
  const map = generateMap(seed);
  const aiCount = DIFFICULTY_AI_COUNT[difficulty];
  const totalPlayers = 1 + aiCount;
  const civs = pickRandomCountries(totalPlayers);
  const spawns = pickSpawnPoints(map, totalPlayers);

  const players: Player[] = civs.map((c, idx) => ({
    idx,
    name: c.name,
    iso: c.iso,
    leader: leaders[c.qid] ?? c.fallbackLeader,
    color: PLAYER_PALETTE[idx % PLAYER_PALETTE.length],
    isHuman: idx === 0,
    researched: [],
    researching: null,
    science: 0,
  }));

  const units: Unit[] = [];
  for (let i = 0; i < totalPlayers; i++) {
    units.push(...spawnStartingUnits(i, spawns[i] ?? spawns[0], map));
  }

  return { map, players, units, cities: [] };
}
