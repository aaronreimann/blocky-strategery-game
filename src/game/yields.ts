import { TERRAIN } from '@/src/data/terrain';

import type { GameMap, Tile } from './map';
import type { City, Wonder } from './types';

export type CityYields = {
  rawFood: number;
  food: number;
  prod: number;
  science: number;
  gold: number;
  workedTiles: Tile[];
};

const FOOD_PER_CITIZEN = 2;

export function foodNeededToGrow(population: number): number {
  return 5 + population * 5;
}

export function computeCityYields(
  city: City,
  map: GameMap,
  wonders: Wonder[] = [],
): CityYields {
  const ownerWonders = wonders.filter((w) => w.ownerIdx === city.ownerIdx);
  const hasPyramids = ownerWonders.some((w) => w.kind === 'pyramids');
  const hasGreatLibrary = ownerWonders.some((w) => w.kind === 'great_library');
  const center = map.tiles[city.y * map.width + city.x];
  let rawFood = TERRAIN[center.terrain].food + (hasPyramids ? 1 : 0);
  let prod = TERRAIN[center.terrain].prod;
  let trade = TERRAIN[center.terrain].trade;

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
    const av = TERRAIN[a.terrain].food + TERRAIN[a.terrain].prod;
    const bv = TERRAIN[b.terrain].food + TERRAIN[b.terrain].prod;
    return bv - av;
  });

  const workersAvailable = Math.min(city.population, outer.length);
  const worked: Tile[] = [center];
  for (let i = 0; i < workersAvailable; i++) {
    const t = outer[i];
    rawFood += TERRAIN[t.terrain].food;
    prod += TERRAIN[t.terrain].prod;
    trade += TERRAIN[t.terrain].trade;
    worked.push(t);
  }

  const food = rawFood - city.population * FOOD_PER_CITIZEN;

  // Science: each citizen contributes 1 science. Library doubles it. Great
  // Library is a flat +50% on top.
  let science = city.population;
  if (city.buildings.includes('library')) science *= 2;
  if (hasGreatLibrary) science = Math.floor(science * 1.5);

  // Gold from trade yields. Marketplace adds +50%.
  let gold = trade;
  if (city.buildings.includes('marketplace')) gold = Math.floor(gold * 1.5);

  return { rawFood, food, prod, science, gold, workedTiles: worked };
}
