import { TERRAIN } from '@/src/data/terrain';

import type { GameMap, Tile } from './map';
import type { City } from './types';

export type CityYields = {
  rawFood: number;
  food: number;
  prod: number;
  science: number;
  workedTiles: Tile[];
};

const FOOD_PER_CITIZEN = 2;

export function foodNeededToGrow(population: number): number {
  return 5 + population * 5;
}

export function computeCityYields(city: City, map: GameMap): CityYields {
  const center = map.tiles[city.y * map.width + city.x];
  let rawFood = TERRAIN[center.terrain].food;
  let prod = TERRAIN[center.terrain].prod;

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
    worked.push(t);
  }

  const food = rawFood - city.population * FOOD_PER_CITIZEN;

  // Science: each citizen contributes 1 science. Library doubles the city's
  // science output.
  let science = city.population;
  if (city.buildings.includes('library')) science *= 2;

  return { rawFood, food, prod, science, workedTiles: worked };
}
