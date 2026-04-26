import { TERRAIN } from '@/src/data/terrain';

import type { GameMap } from './map';
import type { City, Unit } from './types';

// BFS from `start` to a specific `target`. Returns the full path (inclusive
// of both start and target) or null if unreachable. `blocked` tiles are
// walls except for the target tile itself.
export function pathToTile(
  start: { x: number; y: number },
  target: { x: number; y: number },
  blocked: Set<string>,
  map: GameMap,
): { x: number; y: number }[] | null {
  if (start.x === target.x && start.y === target.y) {
    return [{ x: start.x, y: start.y }];
  }
  const targetKey = `${target.x},${target.y}`;
  type Node = { x: number; y: number; prev: Node | null };
  const queue: Node[] = [{ x: start.x, y: start.y, prev: null }];
  const visited = new Set<string>([`${start.x},${start.y}`]);
  while (queue.length > 0) {
    const node = queue.shift()!;
    if (node.x === target.x && node.y === target.y) {
      const out: { x: number; y: number }[] = [];
      let cur: Node | null = node;
      while (cur) {
        out.unshift({ x: cur.x, y: cur.y });
        cur = cur.prev;
      }
      return out;
    }
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = node.x + dx;
        const ny = node.y + dy;
        if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) continue;
        const k = `${nx},${ny}`;
        if (visited.has(k)) continue;
        const tile = map.tiles[ny * map.width + nx];
        if (!TERRAIN[tile.terrain].passable) continue;
        if (blocked.has(k) && k !== targetKey) continue;
        visited.add(k);
        queue.push({ x: nx, y: ny, prev: node });
      }
    }
  }
  return null;
}

// BFS from `start` to the nearest tile in `targets`. Returns the first step.
// Tiles in `blocked` are treated as walls unless they are targets themselves
// (so a unit can step *onto* its target, but not through other obstacles).
export function nextStepToTiles(
  start: { x: number; y: number },
  targets: Set<string>,
  blocked: Set<string>,
  map: GameMap,
): { x: number; y: number } | null {
  if (targets.size === 0) return null;
  const startKey = `${start.x},${start.y}`;
  if (targets.has(startKey)) return null;

  type Node = { x: number; y: number; firstStep: { x: number; y: number } | null };
  const queue: Node[] = [{ x: start.x, y: start.y, firstStep: null }];
  const visited = new Set<string>([startKey]);

  while (queue.length > 0) {
    const node = queue.shift()!;
    const k = `${node.x},${node.y}`;
    if (k !== startKey && targets.has(k)) {
      return node.firstStep;
    }
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = node.x + dx;
        const ny = node.y + dy;
        if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) continue;
        const nk = `${nx},${ny}`;
        if (visited.has(nk)) continue;
        const tile = map.tiles[ny * map.width + nx];
        if (!TERRAIN[tile.terrain].passable) continue;
        if (blocked.has(nk) && !targets.has(nk)) continue;
        visited.add(nk);
        const firstStep = node.firstStep ?? { x: nx, y: ny };
        queue.push({ x: nx, y: ny, firstStep });
      }
    }
  }
  return null;
}

// BFS one step toward the closest friendly city other than the worker's
// current tile. Returns the next tile to step into, or null if unreachable.
export function nextStepToFriendlyCity(
  worker: Unit,
  cities: City[],
  units: Unit[],
  map: GameMap,
): { x: number; y: number } | null {
  const targets = new Set(
    cities
      .filter((c) => c.ownerIdx === worker.ownerIdx)
      .filter((c) => !(c.x === worker.x && c.y === worker.y))
      .map((c) => `${c.x},${c.y}`),
  );
  if (targets.size === 0) return null;

  type Node = { x: number; y: number; firstStep: { x: number; y: number } | null };
  const start: Node = { x: worker.x, y: worker.y, firstStep: null };
  const visited = new Set<string>([`${start.x},${start.y}`]);
  const queue: Node[] = [start];

  // Pre-build a set of blocked tiles: enemy units and any other friendly unit.
  const blocked = new Set<string>();
  for (const u of units) {
    if (u.id === worker.id) continue;
    blocked.add(`${u.x},${u.y}`);
  }
  const enemyCities = new Set(
    cities.filter((c) => c.ownerIdx !== worker.ownerIdx).map((c) => `${c.x},${c.y}`),
  );

  while (queue.length > 0) {
    const node = queue.shift()!;
    const k = `${node.x},${node.y}`;
    if (k !== `${start.x},${start.y}` && targets.has(k)) {
      return node.firstStep;
    }
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = node.x + dx;
        const ny = node.y + dy;
        if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) continue;
        const nk = `${nx},${ny}`;
        if (visited.has(nk)) continue;
        const tile = map.tiles[ny * map.width + nx];
        if (!TERRAIN[tile.terrain].passable) continue;
        // Allow stepping into a friendly destination city, but not enemy cities.
        if (enemyCities.has(nk)) continue;
        // Allow stepping onto target tile even if technically "blocked" by
        // the city (cities do not occupy a unit slot in our model).
        if (blocked.has(nk) && !targets.has(nk)) continue;
        visited.add(nk);
        const firstStep = node.firstStep ?? { x: nx, y: ny };
        queue.push({ x: nx, y: ny, firstStep });
      }
    }
  }
  return null;
}
