import { RESOURCE } from '@/src/data/resources';
import { TERRAIN } from '@/src/data/terrain';

import type { GameMap, Tile } from './map';
import type { City, Wonder } from './types';

function tileFood(t: Tile): number {
  return TERRAIN[t.terrain].food + (t.resource ? RESOURCE[t.resource].food : 0);
}
function tileProd(t: Tile): number {
  return TERRAIN[t.terrain].prod + (t.resource ? RESOURCE[t.resource].prod : 0);
}
function tileTrade(t: Tile): number {
  return TERRAIN[t.terrain].trade + (t.resource ? RESOURCE[t.resource].trade : 0);
}

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
  let rawFood = tileFood(center) + (hasPyramids ? 1 : 0);
  let prod = tileProd(center);
  let trade = tileTrade(center);

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
  // Pick the tiles with highest combined yield first (now resource-aware).
  outer.sort((a, b) => {
    const av = tileFood(a) + tileProd(a) + tileTrade(a);
    const bv = tileFood(b) + tileProd(b) + tileTrade(b);
    return bv - av;
  });

  const workersAvailable = Math.min(city.population, outer.length);
  const worked: Tile[] = [center];
  for (let i = 0; i < workersAvailable; i++) {
    const t = outer[i];
    rawFood += tileFood(t);
    prod += tileProd(t);
    trade += tileTrade(t);
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
