import type { ImprovementKind, ImprovementMap } from '@/src/data/improvements';
import { RESOURCE } from '@/src/data/resources';
import { TERRAIN } from '@/src/data/terrain';

import type { GameMap, Tile } from './map';
import type { City, Wonder } from './types';

export type CityYields = {
  rawFood: number;
  food: number;
  prod: number;
  science: number;
  gold: number;
  happy: number;
  unhappy: number;
  disorder: boolean;
  workedTiles: Tile[];
};

const FOOD_PER_CITIZEN = 2;
const HAPPY_POP_THRESHOLD = 4;

function impAt(
  improvements: ImprovementMap,
  x: number,
  y: number,
): ImprovementKind | undefined {
  return improvements[`${x},${y}`];
}

function tileFood(t: Tile, imp: ImprovementKind | undefined): number {
  let f = TERRAIN[t.terrain].food + (t.resource ? RESOURCE[t.resource].food : 0);
  if (imp === 'farm' || imp === 'irrigation') f += 1;
  return f;
}

function tileProd(t: Tile, imp: ImprovementKind | undefined): number {
  let p = TERRAIN[t.terrain].prod + (t.resource ? RESOURCE[t.resource].prod : 0);
  if (imp === 'mine') p += 1;
  return p;
}

function tileTrade(t: Tile, imp: ImprovementKind | undefined): number {
  let g = TERRAIN[t.terrain].trade + (t.resource ? RESOURCE[t.resource].trade : 0);
  if (imp === 'road') g += 1;
  return g;
}

export function foodNeededToGrow(population: number): number {
  return 5 + population * 5;
}

// City borders grow with size. Returns the chebyshev radius the city
// considers "its territory" (and what tiles it can work).
//   pop 1–3 → 1 (3×3 = 9 tiles)
//   pop 4–7 → 2 (5×5 = 25 tiles)
//   pop 8+  → 3 (7×7 = 49 tiles)
export function cityRadius(population: number): number {
  if (population >= 8) return 3;
  if (population >= 4) return 2;
  return 1;
}

// Trade routes: two of a player's cities form a route if they're linked by
// an unbroken chain of that player's territory tiles (cities project a
// radius via cityRadius). Each city earns +1 gold per *other* city it
// reaches through that chain — encourages settling close enough that your
// borders touch, and rewards building toward your neighbors.
//
// Returns: Map<cityId, number of other linked cities in the same component>.
export function computeTradeRoutes(
  playerIdx: number,
  cities: { id: string; ownerIdx: number; x: number; y: number; population: number }[],
  map: GameMap,
): Map<string, number> {
  const myCities = cities.filter((c) => c.ownerIdx === playerIdx);
  const result = new Map<string, number>();
  if (myCities.length <= 1) {
    for (const c of myCities) result.set(c.id, 0);
    return result;
  }
  // Union of territory tiles (every tile in cityRadius of any of my cities).
  const territory = new Set<string>();
  for (const c of myCities) {
    const r = cityRadius(c.population);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = c.x + dx;
        const y = c.y + dy;
        if (x < 0 || y < 0 || x >= map.width || y >= map.height) continue;
        territory.add(`${x},${y}`);
      }
    }
  }
  // BFS from each unvisited city through territory tiles to find its
  // connected component of cities, then assign each member the size minus 1.
  const visited = new Set<string>();
  const cityByTile = new Map<string, typeof myCities[number]>();
  for (const c of myCities) cityByTile.set(`${c.x},${c.y}`, c);
  for (const start of myCities) {
    if (visited.has(start.id)) continue;
    const queue: { x: number; y: number }[] = [{ x: start.x, y: start.y }];
    const seen = new Set<string>([`${start.x},${start.y}`]);
    const component: typeof myCities = [];
    while (queue.length > 0) {
      const node = queue.shift()!;
      const cityHere = cityByTile.get(`${node.x},${node.y}`);
      if (cityHere && !visited.has(cityHere.id)) component.push(cityHere);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = node.x + dx;
          const ny = node.y + dy;
          const k = `${nx},${ny}`;
          if (seen.has(k)) continue;
          if (!territory.has(k)) continue;
          seen.add(k);
          queue.push({ x: nx, y: ny });
        }
      }
    }
    const links = component.length - 1;
    for (const cc of component) {
      visited.add(cc.id);
      result.set(cc.id, links);
    }
  }
  return result;
}

export function tilesInCityRadius(
  city: { x: number; y: number; population: number },
  map: GameMap,
): Tile[] {
  const r = cityRadius(city.population);
  const out: Tile[] = [];
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const x = city.x + dx;
      const y = city.y + dy;
      if (x < 0 || y < 0 || x >= map.width || y >= map.height) continue;
      out.push(map.tiles[y * map.width + x]);
    }
  }
  return out;
}

export function computeCityYields(
  city: City,
  map: GameMap,
  wonders: Wonder[] = [],
  improvements: ImprovementMap = {},
  tradeBonus: number = 0,
): CityYields {
  const ownerWonders = wonders.filter((w) => w.ownerIdx === city.ownerIdx);
  const hasPyramids = ownerWonders.some((w) => w.kind === 'pyramids');
  const hasGreatLibrary = ownerWonders.some((w) => w.kind === 'great_library');
  const hasHangingGardens = ownerWonders.some((w) => w.kind === 'hanging_gardens');
  const hasColossusHere = ownerWonders.some(
    (w) => w.kind === 'colossus' && w.cityId === city.id,
  );

  const center = map.tiles[city.y * map.width + city.x];
  const centerImp = impAt(improvements, center.x, center.y);
  let rawFood = tileFood(center, centerImp) + (hasPyramids ? 1 : 0);
  let prod = tileProd(center, centerImp);
  let trade = tileTrade(center, centerImp);

  const r = cityRadius(city.population);
  const outer: Tile[] = [];
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx === 0 && dy === 0) continue;
      const x = city.x + dx;
      const y = city.y + dy;
      if (x < 0 || y < 0 || x >= map.width || y >= map.height) continue;
      outer.push(map.tiles[y * map.width + x]);
    }
  }
  outer.sort((a, b) => {
    const ai = impAt(improvements, a.x, a.y);
    const bi = impAt(improvements, b.x, b.y);
    const av = tileFood(a, ai) + tileProd(a, ai) + tileTrade(a, ai);
    const bv = tileFood(b, bi) + tileProd(b, bi) + tileTrade(b, bi);
    return bv - av;
  });

  const workersAvailable = Math.min(city.population, outer.length);
  const worked: Tile[] = [center];
  for (let i = 0; i < workersAvailable; i++) {
    const t = outer[i];
    const imp = impAt(improvements, t.x, t.y);
    rawFood += tileFood(t, imp);
    prod += tileProd(t, imp);
    trade += tileTrade(t, imp);
    worked.push(t);
  }

  const food = rawFood - city.population * FOOD_PER_CITIZEN;

  let science = city.population;
  if (city.buildings.includes('library')) science *= 2;
  if (hasGreatLibrary) science = Math.floor(science * 1.5);

  let gold = trade;
  if (city.buildings.includes('marketplace')) gold = Math.floor(gold * 1.5);
  if (hasColossusHere) gold = Math.floor(gold * 1.5);
  // Trade-route gold is added after multipliers — represents external
  // commerce, not local terrain trade, so marketplace doesn't compound it.
  gold += tradeBonus;

  const templeHappy = city.buildings.includes('temple') ? 1 : 0;
  const courthouseHappy = city.buildings.includes('courthouse') ? 1 : 0;
  const wonderHappy = hasHangingGardens ? 1 : 0;
  const happy = templeHappy + courthouseHappy + wonderHappy;
  const unhappy = Math.max(0, city.population - HAPPY_POP_THRESHOLD);
  const disorder = unhappy > happy;
  if (disorder) prod = 0;

  return {
    rawFood,
    food,
    prod,
    science,
    gold,
    happy,
    unhappy,
    disorder,
    workedTiles: worked,
  };
}
