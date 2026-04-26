import type { Resource } from '@/src/data/resources';
import type { Terrain } from '@/src/data/terrain';

export const MAP_W = 32;
export const MAP_H = 24;

export type Tile = {
  x: number;
  y: number;
  terrain: Terrain;
  resource: Resource | null;
};

export type GameMap = {
  width: number;
  height: number;
  tiles: Tile[];
  seed: number;
};

export function tileIndex(x: number, y: number, width = MAP_W): number {
  return y * width + x;
}

export function getTile(map: GameMap, x: number, y: number): Tile | null {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return null;
  return map.tiles[tileIndex(x, y, map.width)];
}

export function neighbors(map: GameMap, x: number, y: number): Tile[] {
  const out: Tile[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const t = getTile(map, x + dx, y + dy);
      if (t) out.push(t);
    }
  }
  return out;
}

export function chebyshev(ax: number, ay: number, bx: number, by: number): number {
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}
