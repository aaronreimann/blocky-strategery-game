import { TERRAIN } from '@/src/data/terrain';
import { UNIT, type UnitKind } from '@/src/data/units';

import { resolveCombat, type Battle } from './combat';
import { nextCityId } from './ids';
import { chebyshev, type GameMap } from './map';
import { nextStepToTiles } from './path';
import type { City, CityBuildTarget, Player, Unit } from './types';

const MIN_CITY_SPACING = 3;
const DEFAULT_PRODUCTION_PER_TURN = 3;

const AI_CITY_NAMES = [
  'Karakorum', 'Samarkand', 'Khiva', 'Bukhara', 'Tashkent',
  'Almaty', 'Bishkek', 'Urumqi', 'Kashgar', 'Mandalay',
];

const MILITARY_KINDS: UnitKind[] = ['footman', 'spearman', 'horseman', 'swordsman', 'catapult'];
function isMilitary(k: UnitKind): boolean {
  return MILITARY_KINDS.includes(k);
}

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

function buildOwnUnitBlockedSet(unit: Unit, units: Unit[]): Set<string> {
  const blocked = new Set<string>();
  for (const o of units) {
    if (o.id === unit.id) continue;
    if (o.ownerIdx === unit.ownerIdx) blocked.add(`${o.x},${o.y}`);
  }
  return blocked;
}

function moveTowardTargets(
  unit: Unit,
  units: Unit[],
  cities: City[],
  map: GameMap,
  targets: Set<string>,
): Unit[] | null {
  if (targets.size === 0) return null;
  // Block other friendly units AND enemy cities (those without unit defense
  // are direct attack targets handled by adjacent-city logic; we won't path
  // *through* enemy cities here either).
  const blocked = buildOwnUnitBlockedSet(unit, units);
  for (const c of cities) {
    if (c.ownerIdx !== unit.ownerIdx) {
      const k = `${c.x},${c.y}`;
      if (!targets.has(k)) blocked.add(k);
    }
  }
  const next = nextStepToTiles({ x: unit.x, y: unit.y }, targets, blocked, map);
  if (!next) return null;
  // Don't blunder into a target with adjacent enemy without combat handling.
  const enemyOnNext = units.some((u) => u.x === next.x && u.y === next.y && u.ownerIdx !== unit.ownerIdx);
  if (enemyOnNext) return null;
  return units.map((u) =>
    u.id === unit.id ? { ...u, x: next.x, y: next.y, movesLeft: u.movesLeft - 1 } : u,
  );
}

function findEnemyTargets(unit: Unit, units: Unit[], cities: City[]): Set<string> {
  const out = new Set<string>();
  for (const u of units) {
    if (u.ownerIdx !== unit.ownerIdx) out.add(`${u.x},${u.y}`);
  }
  for (const c of cities) {
    if (c.ownerIdx !== unit.ownerIdx) out.add(`${c.x},${c.y}`);
  }
  return out;
}

function findEmptyExpansionTargets(
  unit: Unit,
  cities: City[],
  map: GameMap,
): Set<string> {
  // Tiles that are passable, far enough from any city, and good city sites.
  const out = new Set<string>();
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const t = map.tiles[y * map.width + x];
      if (!TERRAIN[t.terrain].passable) continue;
      if (t.terrain !== 'grassland' && t.terrain !== 'plains') continue;
      const tooClose = cities.some(
        (c) => chebyshev(c.x, c.y, x, y) < MIN_CITY_SPACING,
      );
      if (tooClose) continue;
      // Prefer tiles within a reasonable distance to existing cities so the
      // pioneer doesn't trek across the whole map.
      const myCities = cities.filter((c) => c.ownerIdx === unit.ownerIdx);
      if (myCities.length > 0) {
        const minDistOurs = Math.min(...myCities.map((c) => chebyshev(c.x, c.y, x, y)));
        if (minDistOurs > 14) continue;
      }
      out.add(`${x},${y}`);
    }
  }
  return out;
}

export function pickAINextBuild(
  ownerIdx: number,
  cities: City[],
  units: Unit[],
  researched: string[],
): CityBuildTarget {
  const myCities = cities.filter((c) => c.ownerIdx === ownerIdx);
  const myUnits = units.filter((u) => u.ownerIdx === ownerIdx);
  const myPioneers = myUnits.filter((u) => u.kind === 'pioneer').length;
  const myMilitary = myUnits.filter((u) => isMilitary(u.kind)).length;

  // Expansion: keep founding cities until a few are down.
  if (myCities.length < 4 && myPioneers === 0) {
    return { kind: 'unit', unit: 'pioneer' };
  }

  // Build defense if we have very few military units relative to cities.
  if (myMilitary < myCities.length * 2) {
    const choices: UnitKind[] = ['footman'];
    if (researched.includes('bronze_working')) choices.push('spearman');
    if (researched.includes('horseback_riding')) choices.push('horseman');
    if (researched.includes('iron_working')) choices.push('swordsman');
    if (researched.includes('mathematics')) choices.push('catapult');
    // Pick the highest-cost (= most powerful) available.
    choices.sort((a, b) => UNIT[b].cost - UNIT[a].cost);
    return { kind: 'unit', unit: choices[0] };
  }

  // Otherwise keep building offensive units.
  const offensive: UnitKind[] = ['footman'];
  if (researched.includes('horseback_riding')) offensive.push('horseman');
  if (researched.includes('iron_working')) offensive.push('swordsman');
  if (researched.includes('mathematics')) offensive.push('catapult');
  offensive.sort((a, b) => UNIT[b].cost - UNIT[a].cost);
  return { kind: 'unit', unit: offensive[0] };
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
      // Found city if eligible right here.
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
          focus: 'roads',
        };
        cities = [...cities, newCity];
        units = units.filter((u) => u.id !== fresh.id);
        continue;
      }
      // Walk toward the nearest empty expansion-friendly tile.
      const targets = findEmptyExpansionTargets(fresh, cities, map);
      const moved = moveTowardTargets(fresh, units, cities, map, targets);
      if (moved) {
        units = moved;
        continue;
      }
      units = tryMove(fresh, units, cities, map);
      continue;
    }

    if (isMilitary(fresh.kind)) {
      // Adjacent enemy unit → attack.
      const enemy = findAdjacentEnemy(fresh, units);
      if (enemy) {
        const defenderTile = map.tiles[enemy.y * map.width + enemy.x];
        const cityHere = cities.find(
          (c) => c.x === enemy.x && c.y === enemy.y && c.ownerIdx === enemy.ownerIdx,
        );
        const wallsBonus = cityHere?.buildings.includes('walls') ? 1 : 0;
        const battle = resolveCombat(
          fresh.kind,
          enemy.kind,
          fresh.ownerIdx,
          enemy.ownerIdx,
          defenderTile,
          wallsBonus,
        );
        battles.push(battle);
        if (battle.attackerWon) {
          const cityToCapture = cities.find(
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
                    destination: null,
                  }
                : u,
            );
          if (cityToCapture) {
            cities = cities.map((c) =>
              c.id === cityToCapture.id ? { ...c, ownerIdx: myIdx, production: 0 } : c,
            );
          }
        } else {
          units = units.filter((u) => u.id !== fresh.id);
        }
        continue;
      }

      // Adjacent undefended enemy city → walk in and capture.
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

      // No adjacent target — march toward the nearest enemy unit/city.
      const targets = findEnemyTargets(fresh, units, cities);
      const stepped = moveTowardTargets(fresh, units, cities, map, targets);
      if (stepped) {
        units = stepped;
        continue;
      }
      units = tryMove(fresh, units, cities, map);
      continue;
    }

    // Laborer or other non-combat unit — wander.
    units = tryMove(fresh, units, cities, map);
  }

  return { units, cities, battles };
}

// Re-export so other modules can use it without importing from data.
export { DEFAULT_PRODUCTION_PER_TURN };
