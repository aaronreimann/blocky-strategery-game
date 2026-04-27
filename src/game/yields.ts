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

export function computeCityYields(
  city: City,
  map: GameMap,
  wonders: Wonder[] = [],
  improvements: ImprovementMap = {},
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

  const outer: Tile[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
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
