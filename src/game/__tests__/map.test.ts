import { describe, expect, it } from 'vitest';

import { chebyshev, type GameMap, getTile, neighbors, tileIndex } from '@/src/game/map';

function makeTestMap(width: number, height: number): GameMap {
  const tiles = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      tiles.push({
        x,
        y,
        terrain: 'grassland' as const,
        resource: null,
      });
    }
  }
  return { width, height, tiles, seed: 12345 };
}

describe('map helpers', () => {
  it('calculates row-major tile index correctly', () => {
    expect(tileIndex(0, 0, 10)).toBe(0);
    expect(tileIndex(5, 0, 10)).toBe(5);
    expect(tileIndex(0, 1, 10)).toBe(10);
    expect(tileIndex(7, 3, 10)).toBe(37);
  });

  it('getTile returns tile within bounds and null outside bounds', () => {
    const map = makeTestMap(8, 6);

    const validTile = getTile(map, 3, 2);
    expect(validTile).not.toBeNull();
    expect(validTile?.x).toBe(3);
    expect(validTile?.y).toBe(2);

    expect(getTile(map, -1, 0)).toBeNull();
    expect(getTile(map, 0, -1)).toBeNull();
    expect(getTile(map, 8, 2)).toBeNull();
    expect(getTile(map, 3, 6)).toBeNull();
  });

  it('neighbors returns 8 tiles for interior coordinates', () => {
    const map = makeTestMap(10, 10);
    const n = neighbors(map, 5, 5);
    expect(n.length).toBe(8);

    // Ensure center tile (5,5) is not included
    expect(n.some((t) => t.x === 5 && t.y === 5)).toBe(false);

    // Verify all 8 directions are present
    const coords = n.map((t) => `${t.x},${t.y}`);
    expect(coords).toContain('4,4');
    expect(coords).toContain('5,4');
    expect(coords).toContain('6,4');
    expect(coords).toContain('4,5');
    expect(coords).toContain('6,5');
    expect(coords).toContain('4,6');
    expect(coords).toContain('5,6');
    expect(coords).toContain('6,6');
  });

  it('neighbors respects map boundaries for corners and edges', () => {
    const map = makeTestMap(10, 10);

    // Corner (0,0) has 3 neighbors: (1,0), (0,1), (1,1)
    const corner = neighbors(map, 0, 0);
    expect(corner.length).toBe(3);

    // Edge (5,0) has 5 neighbors
    const edge = neighbors(map, 5, 0);
    expect(edge.length).toBe(5);
  });

  it('chebyshev distance returns maximum axis delta (8-directional steps)', () => {
    expect(chebyshev(0, 0, 0, 0)).toBe(0);
    expect(chebyshev(2, 3, 5, 3)).toBe(3); // Horizontal
    expect(chebyshev(2, 3, 2, 7)).toBe(4); // Vertical
    expect(chebyshev(1, 1, 4, 4)).toBe(3); // Pure diagonal is 3 steps
    expect(chebyshev(1, 2, 4, 8)).toBe(6); // max(|4-1|, |8-2|) = 6
  });
});
