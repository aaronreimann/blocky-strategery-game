import { describe, expect, it } from 'vitest';
import { getTile } from '@/src/game/map';
import { generateMap } from '@/src/game/mapgen';

describe('procedural map generation', () => {
  it('generates a map with requested dimensions and tile count', () => {
    const width = 32;
    const height = 24;
    const map = generateMap(1234, width, height);

    expect(map.width).toBe(width);
    expect(map.height).toBe(height);
    expect(map.tiles.length).toBe(width * height);
    expect(map.seed).toBe(1234);

    const tile = getTile(map, 10, 10);
    expect(tile).toBeDefined();
    expect(tile!.x).toBe(10);
    expect(tile!.y).toBe(10);
    expect(tile!.terrain).toBeDefined();
  });

  it('is completely deterministic for identical seeds and dimensions', () => {
    const map1 = generateMap(42, 32, 24);
    const map2 = generateMap(42, 32, 24);

    for (let i = 0; i < map1.tiles.length; i++) {
      expect(map1.tiles[i].terrain).toBe(map2.tiles[i].terrain);
      expect(map1.tiles[i].resource).toBe(map2.tiles[i].resource);
    }
  });

  it('generates different maps for different seeds', () => {
    const map1 = generateMap(1, 32, 24);
    const map2 = generateMap(2, 32, 24);

    let differences = 0;
    for (let i = 0; i < map1.tiles.length; i++) {
      if (map1.tiles[i].terrain !== map2.tiles[i].terrain) differences++;
    }
    expect(differences).toBeGreaterThan(0);
  });

  it('generates coast tiles buffering ocean from land', () => {
    const map = generateMap(99, 48, 36);
    const coastTiles = map.tiles.filter((t) => t.terrain === 'coast');
    expect(coastTiles.length).toBeGreaterThan(0);

    // Each coast tile should touch land
    for (const coast of coastTiles) {
      let touchesLand = false;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const neighbor = getTile(map, coast.x + dx, coast.y + dy);
          if (neighbor && neighbor.terrain !== 'ocean' && neighbor.terrain !== 'coast') {
            touchesLand = true;
          }
        }
      }
      expect(touchesLand).toBe(true);
    }
  });
});
