import { COUNTRIES, type Country, type LeaderMap } from '@/src/data/countries';
import { CULTURE_FLAVOR } from '@/src/data/cultures';
import { pickCheapestAvailable } from '@/src/data/tech';
import { TERRAIN } from '@/src/data/terrain';
import { UNIT, type UnitKind } from '@/src/data/units';
import { PLAYER_PALETTE } from '@/src/ui/palette';

import { nextUnitId } from './ids';
import { generateMap } from './mapgen';
import { chebyshev, type GameMap } from './map';
import {
  DIFFICULTY_AI_COUNT,
  MAP_SIZE_DIMS,
  type City,
  type Difficulty,
  type Hut,
  type MapSize,
  type Player,
  type Unit,
} from './types';

export type InitialState = {
  map: GameMap;
  players: Player[];
  units: Unit[];
  cities: City[];
  huts: Hut[];
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
      autoMode: false,
      exploreMode: false,
      veteran: false,
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
      autoMode: false,
      exploreMode: false,
      veteran: false,
    },
    {
      id: nextUnitId(),
      kind: 'worker',
      ownerIdx,
      x: start.x,
      y: clamp(start.y + 1, 0, map.height - 1),
      movesLeft: UNIT.worker.move,
      workingOn: null,
      workTurnsLeft: 0,
      destination: null,
      stack: ['worker'],
      autoMode: false,
      exploreMode: false,
      veteran: false,
    },
  ];
}

// Drop one extra culture-flavored unit on or near the starting tile,
// stepping out in concentric squares until we find an empty passable
// land tile that no other starting unit already occupies.
function spawnExtraUnit(
  ownerIdx: number,
  start: { x: number; y: number },
  map: GameMap,
  kind: UnitKind,
  alreadyPlaced: Unit[],
): Unit {
  const taken = new Set(alreadyPlaced.map((u) => `${u.x},${u.y}`));
  const candidates: { x: number; y: number }[] = [];
  for (let r = 0; r <= 3; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = start.x + dx;
        const y = start.y + dy;
        if (x < 0 || y < 0 || x >= map.width || y >= map.height) continue;
        const t = map.tiles[y * map.width + x];
        if (!TERRAIN[t.terrain].passable) continue;
        if (taken.has(`${x},${y}`)) continue;
        candidates.push({ x, y });
      }
    }
    if (candidates.length > 0) break;
  }
  const pos = candidates[0] ?? start;
  return {
    id: nextUnitId(),
    kind,
    ownerIdx,
    x: pos.x,
    y: pos.y,
    movesLeft: UNIT[kind].move,
    workingOn: null,
    workTurnsLeft: 0,
    destination: null,
    stack: [kind],
    autoMode: false,
    exploreMode: false,
    veteran: false,
  };
}

function pickRandomCountries(count: number): Country[] {
  const shuffled = [...COUNTRIES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// If a country is requested for the human, place it first (idx 0); fill the
// rest with random others (excluding the chosen one).
function pickRealms(count: number, humanQid: string | null): Country[] {
  if (!humanQid) return pickRandomCountries(count);
  const human = COUNTRIES.find((c) => c.qid === humanQid);
  if (!human) return pickRandomCountries(count);
  const rest = COUNTRIES.filter((c) => c.qid !== humanQid).sort(
    () => Math.random() - 0.5,
  );
  return [human, ...rest.slice(0, count - 1)];
}

export type BuildInitialOptions = {
  mapSize?: MapSize;
  humanCountryQid?: string | null;
};

export function buildInitialState(
  seed: number,
  difficulty: Difficulty,
  leaders: LeaderMap,
  options: BuildInitialOptions = {},
): InitialState {
  const dims = MAP_SIZE_DIMS[options.mapSize ?? 'medium'];
  const map = generateMap(seed, dims.w, dims.h);
  const aiCount = DIFFICULTY_AI_COUNT[difficulty];
  const totalPlayers = 1 + aiCount;
  const realms = pickRealms(totalPlayers, options.humanCountryQid ?? null);
  const spawns = pickSpawnPoints(map, totalPlayers);

  const players: Player[] = realms.map((c, idx) => {
    const flavor = CULTURE_FLAVOR[c.iso];
    const startingResearched = flavor?.startingResearched ?? [];
    return {
      idx,
      name: c.name,
      iso: c.iso,
      leader: leaders[c.qid] ?? c.fallbackLeader,
      color: flavor?.color ?? PLAYER_PALETTE[idx % PLAYER_PALETTE.length],
      isHuman: idx === 0,
      researched: [...startingResearched],
      researching: pickCheapestAvailable(startingResearched),
      science: 0,
      gold: flavor?.startingGold ?? 0,
    };
  });

  const units: Unit[] = [];
  for (let i = 0; i < totalPlayers; i++) {
    const start = spawns[i] ?? spawns[0];
    units.push(...spawnStartingUnits(i, start, map));
    const extra = CULTURE_FLAVOR[realms[i].iso]?.extraStartingUnit;
    if (extra) {
      units.push(spawnExtraUnit(i, start, map, extra, units));
    }
  }

  const huts = pickHutSites(map, spawns, units);

  return { map, players, units, cities: [], huts };
}

const HUT_COUNT = 14;
const HUT_MIN_DIST_FROM_SPAWN = 4;

function pickHutSites(
  map: GameMap,
  spawns: { x: number; y: number }[],
  units: Unit[],
): Hut[] {
  const occupied = new Set<string>();
  for (const u of units) occupied.add(`${u.x},${u.y}`);
  const candidates = map.tiles.filter((t) => {
    if (!TERRAIN[t.terrain].passable) return false;
    if (occupied.has(`${t.x},${t.y}`)) return false;
    for (const s of spawns) {
      if (chebyshev(s.x, s.y, t.x, t.y) < HUT_MIN_DIST_FROM_SPAWN) return false;
    }
    return true;
  });
  // Deterministic shuffle keyed off the map seed so the same world has the
  // same huts every load.
  const rng = mulberry32(map.seed * 9277 + 1);
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  return candidates.slice(0, HUT_COUNT).map((t) => ({ x: t.x, y: t.y }));
}

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
