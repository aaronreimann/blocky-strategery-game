import { TERRAIN } from '@/src/data/terrain';

import type { GameMap } from './map';
import type { City, Unit } from './types';

// BFS one step toward the closest friendly city other than the laborer's
// current tile. Returns the next tile to step into, or null if unreachable.
export function nextStepToFriendlyCity(
  laborer: Unit,
  cities: City[],
  units: Unit[],
  map: GameMap,
): { x: number; y: number } | null {
  const targets = new Set(
    cities
      .filter((c) => c.ownerIdx === laborer.ownerIdx)
      .filter((c) => !(c.x === laborer.x && c.y === laborer.y))
      .map((c) => `${c.x},${c.y}`),
  );
  if (targets.size === 0) return null;

  type Node = { x: number; y: number; firstStep: { x: number; y: number } | null };
  const start: Node = { x: laborer.x, y: laborer.y, firstStep: null };
  const visited = new Set<string>([`${start.x},${start.y}`]);
  const queue: Node[] = [start];

  // Pre-build a set of blocked tiles: enemy units and any other friendly unit.
  const blocked = new Set<string>();
  for (const u of units) {
    if (u.id === laborer.id) continue;
    blocked.add(`${u.x},${u.y}`);
  }
  const enemyCities = new Set(
    cities.filter((c) => c.ownerIdx !== laborer.ownerIdx).map((c) => `${c.x},${c.y}`),
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
