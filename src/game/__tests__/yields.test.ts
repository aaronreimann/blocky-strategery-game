import { describe, expect, it } from 'vitest';
import type { GameMap, Tile } from '@/src/game/map';
import type { City, Wonder } from '@/src/game/types';
import {
  cityRadius,
  computeCityYields,
  computeTradeRoutes,
  foodNeededToGrow,
  tilesInCityRadius,
} from '@/src/game/yields';

describe('city yields, growth, and trade routes', () => {
  const createMap = (width = 10, height = 10): GameMap => {
    const tiles: Tile[] = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        tiles.push({ x, y, terrain: 'grassland', resource: null });
      }
    }
    return { width, height, tiles, seed: 1 };
  };

  const createCity = (opts: Partial<City> = {}): City => ({
    id: 'c1',
    ownerIdx: 0,
    name: 'City 1',
    x: 4,
    y: 4,
    population: 1,
    food: 0,
    buildings: [],
    building: null,
    buildQueue: [],
    production: 0,
    focus: 'balanced',
    ...opts,
  });

  it('calculates foodNeededToGrow correctly', () => {
    expect(foodNeededToGrow(1)).toBe(10);
    expect(foodNeededToGrow(2)).toBe(15);
    expect(foodNeededToGrow(5)).toBe(30);
  });

  it('scales cityRadius with population tiers', () => {
    expect(cityRadius(1)).toBe(1);
    expect(cityRadius(3)).toBe(1);
    expect(cityRadius(4)).toBe(2);
    expect(cityRadius(7)).toBe(2);
    expect(cityRadius(8)).toBe(3);
  });

  it('retrieves all tiles in city radius respecting map bounds', () => {
    const map = createMap(10, 10);
    const centerCity = createCity({ x: 5, y: 5, population: 1 }); // radius 1 -> 3x3 = 9 tiles
    const tiles = tilesInCityRadius(centerCity, map);
    expect(tiles.length).toBe(9);

    const cornerCity = createCity({ x: 0, y: 0, population: 1 }); // clamped at map bounds
    const cornerTiles = tilesInCityRadius(cornerCity, map);
    expect(cornerTiles.length).toBe(4); // (0,0), (0,1), (1,0), (1,1)
  });

  it('calculates basic city yields and worked tiles', () => {
    const map = createMap(10, 10);
    const city = createCity({ x: 5, y: 5, population: 1 });
    // Grassland base: food 2, prod 0, trade 0
    // City center (2 food, 0 prod) + 1 worked tile (2 food, 0 prod) = rawFood 4, prod 0
    // Food eaten: pop 1 * 2 = 2. Net food surplus = 2.
    const yields = computeCityYields(city, map);
    expect(yields.rawFood).toBe(4);
    expect(yields.food).toBe(2);
    expect(yields.prod).toBe(0);
    expect(yields.science).toBe(1); // base pop
    expect(yields.disorder).toBe(false);

    // With a mine on the worked tile, prod increases by 1
    const withMine = computeCityYields(city, map, [], { '6,5': 'mine' });
    expect(withMine.prod).toBe(1);
  });

  it('applies building bonuses to science and gold yields', () => {
    const map = createMap(10, 10);
    const basicCity = createCity({ x: 5, y: 5, population: 4 });
    const basicYields = computeCityYields(basicCity, map);

    const sciCity = createCity({
      x: 5,
      y: 5,
      population: 4,
      buildings: ['library', 'observatory', 'university'],
    });
    const sciYields = computeCityYields(sciCity, map);
    // Library: x2, Observatory: x1.5, University: x1.5
    expect(sciYields.science).toBeGreaterThan(basicYields.science * 2);

    const marketCity = createCity({
      x: 5,
      y: 5,
      population: 4,
      buildings: ['marketplace', 'bank'],
    });
    // Set road on center tile to have trade to multiply
    const imp = { '5,5': 'road' as const };
    const marketYields = computeCityYields(marketCity, map, [], imp);
    expect(marketYields.gold).toBeGreaterThan(0);
  });

  it('applies wonder effects', () => {
    const map = createMap(10, 10);
    const city = createCity({ x: 5, y: 5, population: 2 });
    const baseYields = computeCityYields(city, map);

    const pyramids: Wonder = { kind: 'pyramids', ownerIdx: 0, cityId: 'c1' };
    const pyYields = computeCityYields(city, map, [pyramids]);
    // Pyramids grant +1 food to city center
    expect(pyYields.rawFood).toBe(baseYields.rawFood + 1);

    const gardens: Wonder = { kind: 'hanging_gardens', ownerIdx: 0, cityId: 'c1' };
    const hgYields = computeCityYields(city, map, [gardens]);
    expect(hgYields.happy).toBe(baseYields.happy + 1);
  });

  it('triggers civil disorder when unhappy citizens exceed happy citizens', () => {
    const map = createMap(10, 10);
    // Pop 6 with threshold 4 means 2 unhappy citizens. No temples/wonders means 0 happy.
    const bigCity = createCity({ x: 5, y: 5, population: 6 });
    const yields = computeCityYields(bigCity, map);
    expect(yields.unhappy).toBe(2);
    expect(yields.happy).toBe(0);
    expect(yields.disorder).toBe(true);
    expect(yields.prod).toBe(0); // Production halted in disorder
  });

  it('computes connected trade routes through overlapping city territories', () => {
    const map = createMap(20, 20);
    // Two cities 2 tiles apart (borders touch)
    const c1 = createCity({ id: 'c1', ownerIdx: 0, x: 5, y: 5, population: 1 });
    const c2 = createCity({ id: 'c2', ownerIdx: 0, x: 7, y: 5, population: 1 });

    const routes = computeTradeRoutes(0, [c1, c2], map);
    expect(routes.get('c1')).toBe(1);
    expect(routes.get('c2')).toBe(1);

    // Faraway city does not connect
    const c3 = createCity({ id: 'c3', ownerIdx: 0, x: 18, y: 18, population: 1 });
    const routesWithFar = computeTradeRoutes(0, [c1, c2, c3], map);
    expect(routesWithFar.get('c1')).toBe(1);
    expect(routesWithFar.get('c2')).toBe(1);
    expect(routesWithFar.get('c3')).toBe(0);
  });

  it('incorporates resource tile yield bonuses', () => {
    const map = createMap(10, 10);
    // Add wheat (food +2) on tile (6,5) and iron (prod +2) on tile (5,6)
    map.tiles[5 * 10 + 6].resource = 'wheat';
    map.tiles[6 * 10 + 5].resource = 'iron';

    const city = createCity({ x: 5, y: 5, population: 2 });
    const yields = computeCityYields(city, map);

    // Worked tiles include center plus 2 outer resource tiles
    // Center: 2 food, 0 prod
    // Wheat: 2 (grassland) + 2 (wheat) = 4 food
    // Iron: 0 (grassland) + 2 (iron) = 2 prod
    expect(yields.rawFood).toBeGreaterThanOrEqual(6);
    expect(yields.prod).toBeGreaterThanOrEqual(2);
  });

  it('resolves disorder with stacked religious and civic buildings', () => {
    const map = createMap(10, 10);
    // Pop 8 with threshold 4 means 4 unhappy citizens
    const largeCity = createCity({
      x: 5,
      y: 5,
      population: 8,
      buildings: ['temple', 'courthouse', 'cathedral'], // 1 + 1 + 2 = 4 happy
    });

    const yields = computeCityYields(largeCity, map);
    expect(yields.unhappy).toBe(4);
    expect(yields.happy).toBe(4);
    expect(yields.disorder).toBe(false); // unhappy is not greater than happy
  });

  it('Colossus multiplies gold only in the city that built it', () => {
    const map = createMap(10, 10);
    // Provide 2 trade so 1.5x multiplier produces distinct floor (floor(2 * 1.5) = 3 vs 2)
    const imp = {
      '5,5': 'road' as const,
      '6,5': 'road' as const,
      '8,8': 'road' as const,
      '9,8': 'road' as const,
    };

    const c1 = createCity({ id: 'c1', x: 5, y: 5, population: 1 });
    const c2 = createCity({ id: 'c2', x: 8, y: 8, population: 1 });

    const colossusWonder: Wonder = { kind: 'colossus', ownerIdx: 0, cityId: 'c1' };

    const c1Yields = computeCityYields(c1, map, [colossusWonder], imp);
    const c2Yields = computeCityYields(c2, map, [colossusWonder], imp);

    // c1 has Colossus bonus (floor(2 * 1.5) = 3 > 2)
    expect(c1Yields.gold).toBe(3);
    expect(c2Yields.gold).toBe(2);
    expect(c1Yields.gold).toBeGreaterThan(c2Yields.gold);
  });
});
