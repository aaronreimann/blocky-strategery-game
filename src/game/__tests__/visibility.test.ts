import { describe, expect, it } from 'vitest';
import type { GameMap, Tile } from '@/src/game/map';
import type { City, Unit } from '@/src/game/types';
import {
  CITY_VISION_RADIUS,
  computeCurrentVisibility,
  mergeExplored,
  pickExploreTarget,
  unitVisionRadius,
} from '@/src/game/visibility';

describe('fog of war and exploration algorithms', () => {
  const createMap = (width = 20, height = 20): GameMap => {
    const tiles: Tile[] = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        tiles.push({ x, y, terrain: 'grassland', resource: null });
      }
    }
    return { width, height, tiles, seed: 100 };
  };

  const createUnit = (
    kind: Unit['kind'],
    ownerIdx: number,
    x: number,
    y: number,
  ): Unit => ({
    id: `u-${x}-${y}`,
    kind,
    stack: [kind],
    ownerIdx,
    x,
    y,
    movesLeft: 1,
    workingOn: null,
    workTurnsLeft: 0,
    destination: null,
    autoMode: false,
    exploreMode: false,
    veteran: false,
  });

  const createCity = (ownerIdx: number, x: number, y: number): City => ({
    id: `c-${x}-${y}`,
    ownerIdx,
    name: 'City',
    x,
    y,
    population: 1,
    food: 0,
    buildings: [],
    building: null,
    buildQueue: [],
    production: 0,
    focus: 'balanced',
  });

  it('determines correct vision radius per unit and city', () => {
    expect(unitVisionRadius('footman')).toBe(1);
    expect(unitVisionRadius('worker')).toBe(1);
    expect(unitVisionRadius('pioneer')).toBe(1);
    expect(unitVisionRadius('catapult')).toBe(1);
    expect(unitVisionRadius('horseman')).toBe(2);
    expect(unitVisionRadius('galley')).toBe(3);
    expect(CITY_VISION_RADIUS).toBe(2);
  });

  it('computes current visibility for a player', () => {
    const map = createMap(20, 20);
    const unit = createUnit('footman', 0, 5, 5); // radius 1 -> 3x3 = 9 tiles
    const city = createCity(0, 15, 15); // radius 2 -> 5x5 = 25 tiles
    const enemyUnit = createUnit('footman', 1, 10, 10);

    const visible = computeCurrentVisibility(0, [unit, enemyUnit], [city], map);

    expect(visible.has('5,5')).toBe(true);
    expect(visible.has('4,4')).toBe(true);
    expect(visible.has('6,6')).toBe(true);
    // Out of footman range
    expect(visible.has('7,7')).toBe(false);

    // City visibility
    expect(visible.has('15,15')).toBe(true);
    expect(visible.has('13,13')).toBe(true);
    expect(visible.has('17,17')).toBe(true);

    // Enemy unit not visible if away from vision
    expect(visible.has('10,10')).toBe(false);
  });

  it('merges new visible tiles into explored history without duplicates', () => {
    const initialExplored = ['0,0', '0,1', '0,2'];
    const currentVisible = new Set(['0,1', '0,2', '0,3', '1,3']);

    const merged = mergeExplored(initialExplored, currentVisible);
    expect(merged.length).toBe(5);
    expect(merged).toContain('0,0');
    expect(merged).toContain('0,3');
    expect(merged).toContain('1,3');
  });

  it('picks nearest unexplored target and fans out with crowding penalty', () => {
    const map = createMap(20, 20);
    const explored = new Set<string>();
    // Mark a 5x5 area explored around (5,5)
    for (let y = 3; y <= 7; y++) {
      for (let x = 3; x <= 7; x++) {
        explored.add(`${x},${y}`);
      }
    }

    const start = { x: 5, y: 5 };
    const target1 = pickExploreTarget(
      start,
      explored,
      new Set(),
      map,
      () => true,
      [],
    );
    expect(target1).not.toBeNull();
    // Target must be unexplored
    expect(explored.has(`${target1!.x},${target1!.y}`)).toBe(false);

    // Second explorer starting at same position with target1 claimed should pick a different target
    const target2 = pickExploreTarget(
      start,
      explored,
      new Set(),
      map,
      () => true,
      [target1!],
    );
    expect(target2).not.toBeNull();
    expect(target2).not.toEqual(target1);
  });
});
