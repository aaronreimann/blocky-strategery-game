import type { UnitKind } from '@/src/data/units';

import { chebyshev, type GameMap } from './map';
import type { City, Unit } from './types';

// How many tiles each unit kind can see (chebyshev distance from its tile).
export function unitVisionRadius(kind: UnitKind): number {
  switch (kind) {
    case 'horseman':
      return 2;
    case 'galley':
      return 3;
    case 'catapult':
      return 1;
    default:
      return 1;
  }
}

export const CITY_VISION_RADIUS = 2;

// Tiles currently in any of the player's units' or cities' vision radius.
export function computeCurrentVisibility(
  ownerIdx: number,
  units: Unit[],
  cities: City[],
  map: GameMap,
): Set<string> {
  const out = new Set<string>();
  const reveal = (cx: number, cy: number, r: number) => {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= map.width || y >= map.height) continue;
        if (chebyshev(cx, cy, x, y) > r) continue;
        out.add(`${x},${y}`);
      }
    }
  };
  for (const u of units) {
    if (u.ownerIdx !== ownerIdx) continue;
    reveal(u.x, u.y, unitVisionRadius(u.kind));
  }
  for (const c of cities) {
    if (c.ownerIdx !== ownerIdx) continue;
    reveal(c.x, c.y, CITY_VISION_RADIUS);
  }
  return out;
}

// Merge a fresh "currently visible" set into a permanent "ever explored" list,
// returning the new array.
export function mergeExplored(
  explored: string[],
  currentlyVisible: Iterable<string>,
): string[] {
  const set = new Set(explored);
  for (const k of currentlyVisible) set.add(k);
  return [...set];
}

// Pick a target unexplored tile for an explorer, taking into account targets
// already claimed by *other* explorers this turn so multiple explorers spread
// out instead of converging on the closest frontier. Searches up to MAX_DEPTH
// tiles by BFS, scores each unexplored hit, and returns the best one (or null
// if nothing reachable).
//
// Score is "BFS depth + crowding penalty" — lower is better. Crowding penalty
// for a candidate tile is `MAX_DEPTH * exp(-d/AVOID)`, summed over claimed
// targets, where d is the chebyshev distance to each. Tiles within ~3 squares
// of a claim cost ~half the search radius to consider; tiles 6+ squares away
// barely register.
const MAX_EXPLORE_DEPTH = 14;
const AVOID_RADIUS = 4;

export function pickExploreTarget(
  start: { x: number; y: number },
  explored: Set<string>,
  blocked: Set<string>,
  map: GameMap,
  canEnter: (x: number, y: number) => boolean,
  claimedTargets: { x: number; y: number }[] = [],
): { x: number; y: number } | null {
  if (start.x < 0 || start.y < 0 || start.x >= map.width || start.y >= map.height) {
    return null;
  }
  type Node = { x: number; y: number; depth: number };
  const queue: Node[] = [{ x: start.x, y: start.y, depth: 0 }];
  const visited = new Set<string>();
  visited.add(`${start.x},${start.y}`);
  let best: { tile: { x: number; y: number }; score: number } | null = null;
  while (queue.length > 0) {
    const node = queue.shift()!;
    if (node.depth > MAX_EXPLORE_DEPTH) continue;
    const k = `${node.x},${node.y}`;
    if (node.depth > 0 && !explored.has(k)) {
      let crowding = 0;
      for (const c of claimedTargets) {
        const d = Math.max(Math.abs(c.x - node.x), Math.abs(c.y - node.y));
        crowding += MAX_EXPLORE_DEPTH * Math.exp(-d / AVOID_RADIUS);
      }
      const score = node.depth + crowding;
      if (!best || score < best.score) {
        best = { tile: { x: node.x, y: node.y }, score };
      }
    }
    if (node.depth >= MAX_EXPLORE_DEPTH) continue;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = node.x + dx;
        const ny = node.y + dy;
        if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) continue;
        const nk = `${nx},${ny}`;
        if (visited.has(nk)) continue;
        if (blocked.has(nk) && (nx !== start.x || ny !== start.y)) continue;
        if (!canEnter(nx, ny) && explored.has(nk)) continue; // can pass over unexplored
        visited.add(nk);
        queue.push({ x: nx, y: ny, depth: node.depth + 1 });
      }
    }
  }
  return best?.tile ?? null;
}
