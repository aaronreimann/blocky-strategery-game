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

// BFS to the nearest tile that the player has NOT yet explored, starting from
// (sx, sy). Returns the first step direction (the next tile to move into), or
// null if no unexplored tile is reachable.
export function nextStepToExplore(
  start: { x: number; y: number },
  explored: Set<string>,
  blocked: Set<string>,
  map: GameMap,
  canEnter: (x: number, y: number) => boolean,
): { x: number; y: number } | null {
  if (start.x < 0 || start.y < 0 || start.x >= map.width || start.y >= map.height) return null;
  type Node = { x: number; y: number; first: { x: number; y: number } | null };
  const queue: Node[] = [{ x: start.x, y: start.y, first: null }];
  const visited = new Set<string>();
  visited.add(`${start.x},${start.y}`);
  while (queue.length > 0) {
    const node = queue.shift()!;
    const k = `${node.x},${node.y}`;
    // First node = start; only return when we land on a NEW unexplored tile.
    if (node.first && !explored.has(k)) {
      return node.first;
    }
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = node.x + dx;
        const ny = node.y + dy;
        if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) continue;
        const nk = `${nx},${ny}`;
        if (visited.has(nk)) continue;
        if (blocked.has(nk)) continue;
        if (!canEnter(nx, ny)) continue;
        visited.add(nk);
        queue.push({ x: nx, y: ny, first: node.first ?? { x: nx, y: ny } });
      }
    }
  }
  return null;
}
