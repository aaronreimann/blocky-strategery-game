import { TERRAIN } from '@/src/data/terrain';

import { resolveCombat, type Battle } from './combat';
import { nextCityId } from './ids';
import { chebyshev, type GameMap } from './map';
import type { City, Unit } from './types';

const MIN_CITY_SPACING = 3;

const AI_CITY_NAMES = [
  'Karakorum', 'Samarkand', 'Khiva', 'Bukhara', 'Tashkent',
  'Almaty', 'Bishkek', 'Urumqi', 'Kashgar', 'Mandalay',
];

export type AITurnInput = {
  ownerIdx: number;
  map: GameMap;
  units: Unit[];
  cities: City[];
};

export type AITurnOutput = {
  units: Unit[];
  cities: City[];
  battles: Battle[];
};

function shuffled<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function tileGoodForCity(map: GameMap, x: number, y: number): boolean {
  const t = map.tiles[y * map.width + x];
  return TERRAIN[t.terrain].passable && t.terrain !== 'desert' && t.terrain !== 'tundra';
}

function findAdjacentEnemy(unit: Unit, units: Unit[]): Unit | null {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = unit.x + dx;
      const ny = unit.y + dy;
      const enemy = units.find((u) => u.x === nx && u.y === ny && u.ownerIdx !== unit.ownerIdx);
      if (enemy) return enemy;
    }
  }
  return null;
}

function findAdjacentUndefendedEnemyCity(
  unit: Unit,
  cities: City[],
  units: Unit[],
): City | null {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = unit.x + dx;
      const ny = unit.y + dy;
      const city = cities.find((c) => c.x === nx && c.y === ny && c.ownerIdx !== unit.ownerIdx);
      if (!city) continue;
      const defender = units.find((u) => u.x === nx && u.y === ny && u.ownerIdx !== unit.ownerIdx);
      if (!defender) return city;
    }
  }
  return null;
}

function tryMove(unit: Unit, units: Unit[], cities: City[], map: GameMap): Unit[] {
  const dirs = shuffled([
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1], [0, 1],
    [1, -1], [1, 0], [1, 1],
  ]);
  for (const [dx, dy] of dirs) {
    const nx = unit.x + dx;
    const ny = unit.y + dy;
    if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) continue;
    const tile = map.tiles[ny * map.width + nx];
    if (!TERRAIN[tile.terrain].passable) continue;
    if (units.some((u) => u.x === nx && u.y === ny && u.ownerIdx === unit.ownerIdx)) continue;
    if (cities.some((c) => c.x === nx && c.y === ny && c.ownerIdx !== unit.ownerIdx)) continue;
    return units.map((u) =>
      u.id === unit.id ? { ...u, x: nx, y: ny, movesLeft: u.movesLeft - 1 } : u,
    );
  }
  return units;
}

export function runAITurn(input: AITurnInput): AITurnOutput {
  let units = [...input.units];
  let cities = [...input.cities];
  const battles: Battle[] = [];
  const myIdx = input.ownerIdx;
  const map = input.map;

  const myUnitIds = units.filter((u) => u.ownerIdx === myIdx).map((u) => u.id);

  for (const id of myUnitIds) {
    const fresh = units.find((u) => u.id === id);
    if (!fresh) continue;
    if (fresh.movesLeft <= 0) continue;

    if (fresh.kind === 'pioneer') {
      const tooClose = cities.some(
        (c) => chebyshev(c.x, c.y, fresh.x, fresh.y) < MIN_CITY_SPACING,
      );
      if (!tooClose && tileGoodForCity(map, fresh.x, fresh.y)) {
        const myCityCount = cities.filter((c) => c.ownerIdx === myIdx).length;
        const newCity: City = {
          id: nextCityId(),
          ownerIdx: myIdx,
          name: AI_CITY_NAMES[myCityCount % AI_CITY_NAMES.length],
          x: fresh.x,
          y: fresh.y,
          population: 1,
          food: 0,
          buildings: [],
          building: { kind: 'unit', unit: 'footman' },
          production: 0,
        };
        cities = [...cities, newCity];
        units = units.filter((u) => u.id !== fresh.id);
        continue;
      }
      units = tryMove(fresh, units, cities, map);
      continue;
    }

    if (fresh.kind === 'footman') {
      const enemy = findAdjacentEnemy(fresh, units);
      if (enemy) {
        const defenderTile = map.tiles[enemy.y * map.width + enemy.x];
        const cityHere = cities.find(
          (c) => c.x === enemy.x && c.y === enemy.y && c.ownerIdx === enemy.ownerIdx,
        );
        const wallsBonus = cityHere?.buildings.includes('walls') ? 1 : 0;
        const battle = resolveCombat(fresh.kind, enemy.kind, defenderTile, wallsBonus);
        battles.push(battle);
        if (battle.attackerWon) {
          // Move attacker onto defender's tile; capture any enemy city there.
          const cityHere = cities.find(
            (c) => c.x === enemy.x && c.y === enemy.y && c.ownerIdx !== myIdx,
          );
          units = units
            .filter((u) => u.id !== enemy.id)
            .map((u) =>
              u.id === fresh.id
                ? {
                    ...u,
                    x: enemy.x,
                    y: enemy.y,
                    movesLeft: 0,
                    workingOn: null,
                    workTurnsLeft: 0,
                  }
                : u,
            );
          if (cityHere) {
            cities = cities.map((c) =>
              c.id === cityHere.id ? { ...c, ownerIdx: myIdx, production: 0 } : c,
            );
          }
        } else {
          units = units.filter((u) => u.id !== fresh.id);
        }
        continue;
      }

      const undefendedCity = findAdjacentUndefendedEnemyCity(fresh, cities, units);
      if (undefendedCity) {
        units = units.map((u) =>
          u.id === fresh.id
            ? { ...u, x: undefendedCity.x, y: undefendedCity.y, movesLeft: 0 }
            : u,
        );
        cities = cities.map((c) =>
          c.id === undefendedCity.id ? { ...c, ownerIdx: myIdx, production: 0 } : c,
        );
        continue;
      }

      units = tryMove(fresh, units, cities, map);
      continue;
    }

    units = tryMove(fresh, units, cities, map);
  }

  return { units, cities, battles };
}
