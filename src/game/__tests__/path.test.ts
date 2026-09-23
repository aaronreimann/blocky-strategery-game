import { describe, expect, it } from 'vitest';
import type { GameMap, Tile } from '@/src/game/map';
import { nextStepToFriendlyCity, nextStepToTiles, pathToTile } from '@/src/game/path';
import type { City, Unit } from '@/src/game/types';

describe('BFS pathfinding algorithms', () => {
  const createTestMap = (width = 10, height = 10, fillTerrain: Tile['terrain'] = 'grassland'): GameMap => {
    const tiles: Tile[] = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        tiles.push({ x, y, terrain: fillTerrain, resource: null });
      }
    }
    return { width, height, tiles, seed: 42 };
  };

  it('finds direct and detour paths via pathToTile', () => {
    const map = createTestMap(10, 10);
    const start = { x: 1, y: 1 };
    const target = { x: 1, y: 3 };

    // Clear path
    const path = pathToTile(start, target, new Set(), map, 'footman');
    expect(path).not.toBeNull();
    expect(path!.length).toBe(3); // (1,1) -> (1,2) -> (1,3)
    expect(path![0]).toEqual(start);
    expect(path![path!.length - 1]).toEqual(target);

    // Wall at (1,2) forcing detour around x=2
    const blocked = new Set(['1,2']);
    const detourPath = pathToTile(start, target, blocked, map, 'footman');
    expect(detourPath).not.toBeNull();
    expect(detourPath!.some((p) => p.x === 1 && p.y === 2)).toBe(false);

    // Completely blocked target
    const walls = new Set(['0,2', '1,2', '2,2', '0,4', '1,4', '2,4', '2,3', '0,3']);
    const trappedPath = pathToTile(start, target, walls, map, 'footman');
    expect(trappedPath).toBeNull();
  });

  it('respects unit terrain restrictions (land vs sea)', () => {
    const map = createTestMap(10, 10, 'grassland');
    // Set column 2 to ocean
    for (let y = 0; y < 10; y++) {
      map.tiles[y * 10 + 2].terrain = 'ocean';
    }

    const start = { x: 1, y: 5 };
    const target = { x: 4, y: 5 };

    // Land footman cannot cross unbroken ocean barrier
    const landPath = pathToTile(start, target, new Set(), map, 'footman');
    expect(landPath).toBeNull();

    // Galley on water cannot enter grassland
    const seaMap = createTestMap(10, 10, 'ocean');
    const galleyStart = { x: 1, y: 1 };
    const galleyTarget = { x: 1, y: 3 };
    seaMap.tiles[2 * 10 + 1].terrain = 'grassland'; // island barrier
    const seaPath = pathToTile(galleyStart, galleyTarget, new Set(), seaMap, 'galley');
    expect(seaPath).not.toBeNull();
    // Path detours around grassland island
    expect(seaPath!.some((p) => p.x === 1 && p.y === 2)).toBe(false);
  });

  it('determines the next step toward a set of candidate targets', () => {
    const map = createTestMap(10, 10);
    const start = { x: 2, y: 2 };
    const targets = new Set(['5,2', '2,6']); // (5,2) is 3 away, (2,6) is 4 away

    const step = nextStepToTiles(start, targets, new Set(), map, 'footman');
    expect(step).not.toBeNull();
    // Step should reduce distance to the closer target (5,2)
    const initialDist = Math.max(Math.abs(5 - start.x), Math.abs(2 - start.y));
    const nextDist = Math.max(Math.abs(5 - step!.x), Math.abs(2 - step!.y));
    expect(nextDist).toBe(initialDist - 1);
  });

  it('paths toward closest friendly city', () => {
    const map = createTestMap(10, 10);
    const worker: Unit = {
      id: 'w1',
      kind: 'worker',
      stack: ['worker'],
      ownerIdx: 0,
      x: 1,
      y: 1,
      movesLeft: 1,
      workingOn: null,
      workTurnsLeft: 0,
      destination: null,
      autoMode: false,
      exploreMode: false,
      veteran: false,
    };
    const cities: City[] = [
      {
        id: 'c1',
        ownerIdx: 0,
        name: 'City 1',
        x: 4,
        y: 1,
        population: 1,
        food: 0,
        buildings: [],
        building: null,
        buildQueue: [],
        production: 0,
        focus: 'balanced',
      },
    ];

    const step = nextStepToFriendlyCity(worker, cities, [worker], map);
    expect(step).not.toBeNull();
    const initialDist = Math.max(Math.abs(cities[0].x - worker.x), Math.abs(cities[0].y - worker.y));
    const nextDist = Math.max(Math.abs(cities[0].x - step!.x), Math.abs(cities[0].y - step!.y));
    expect(nextDist).toBe(initialDist - 1);
  });
});
