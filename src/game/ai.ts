import { BUILDING, type BuildingKind } from '@/src/data/buildings';
import { TERRAIN } from '@/src/data/terrain';
import { canEnterTerrain, UNIT, type UnitKind } from '@/src/data/units';
import { WONDER, WONDER_KINDS } from '@/src/data/wonders';

import { resolveCombat, type Battle } from './combat';
import { nextCityId } from './ids';
import { chebyshev, type GameMap } from './map';
import { nextStepToTiles } from './path';
import type { City, CityBuildTarget, Player, Unit, Wonder } from './types';

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
  players: Player[];
  atPeaceWith: Set<number>;
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

function findAdjacentEnemy(unit: Unit, units: Unit[], atPeaceWith: Set<number>): Unit | null {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = unit.x + dx;
      const ny = unit.y + dy;
      const enemy = units.find(
        (u) =>
          u.x === nx &&
          u.y === ny &&
          u.ownerIdx !== unit.ownerIdx &&
          !atPeaceWith.has(u.ownerIdx),
      );
      if (enemy) return enemy;
    }
  }
  return null;
}

function findAdjacentUndefendedEnemyCity(
  unit: Unit,
  cities: City[],
  units: Unit[],
  atPeaceWith: Set<number>,
): City | null {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = unit.x + dx;
      const ny = unit.y + dy;
      const city = cities.find(
        (c) =>
          c.x === nx &&
          c.y === ny &&
          c.ownerIdx !== unit.ownerIdx &&
          !atPeaceWith.has(c.ownerIdx),
      );
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
    if (!canEnterTerrain(unit.kind, tile.terrain)) continue;
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
  const next = nextStepToTiles({ x: unit.x, y: unit.y }, targets, blocked, map, unit.kind);
  if (!next) return null;
  // Don't blunder into a target with adjacent enemy without combat handling.
  const enemyOnNext = units.some((u) => u.x === next.x && u.y === next.y && u.ownerIdx !== unit.ownerIdx);
  if (enemyOnNext) return null;
  return units.map((u) =>
    u.id === unit.id ? { ...u, x: next.x, y: next.y, movesLeft: u.movesLeft - 1 } : u,
  );
}

function findEnemyTargets(
  unit: Unit,
  units: Unit[],
  cities: City[],
  atPeaceWith: Set<number>,
): Set<string> {
  const out = new Set<string>();
  for (const u of units) {
    if (u.ownerIdx !== unit.ownerIdx && !atPeaceWith.has(u.ownerIdx)) {
      out.add(`${u.x},${u.y}`);
    }
  }
  for (const c of cities) {
    if (c.ownerIdx !== unit.ownerIdx && !atPeaceWith.has(c.ownerIdx)) {
      out.add(`${c.x},${c.y}`);
    }
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
  city: City,
  cities: City[],
  units: Unit[],
  researched: string[],
  wonders: Wonder[] = [],
): CityBuildTarget {
  const ownerIdx = city.ownerIdx;
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
    choices.sort((a, b) => UNIT[b].cost - UNIT[a].cost);
    return { kind: 'unit', unit: choices[0] };
  }

  // Build infrastructure that THIS city is missing.
  const buildingPriority: BuildingKind[] = [
    'granary', 'library', 'marketplace', 'walls', 'barracks', 'temple', 'courthouse',
  ];
  for (const b of buildingPriority) {
    if (city.buildings.includes(b)) continue;
    const tech = BUILDING[b].tech;
    if (tech !== null && !researched.includes(tech)) continue;
    if (b === 'temple' && city.population < 3) continue;
    if (b === 'courthouse' && city.population < 5) continue;
    return { kind: 'building', building: b };
  }

  // Well-defended + infrastructure built — grab an available wonder.
  for (const wkind of WONDER_KINDS) {
    if (wonders.some((w) => w.kind === wkind)) continue;
    const tech = WONDER[wkind].tech;
    if (tech !== null && !researched.includes(tech)) continue;
    return { kind: 'wonder', wonder: wkind };
  }

  // Default: more offensive units.
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
  const atPeaceWith = input.atPeaceWith;

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
          buildQueue: [],
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
      // Defensive doctrine: if this unit is the sole defender of one of
      // our own cities, only act if there's an immediate adjacent threat
      // — otherwise hold position so the city stays garrisoned.
      const hereCity = cities.find(
        (c) => c.x === fresh.x && c.y === fresh.y && c.ownerIdx === myIdx,
      );
      const isLastDefender =
        !!hereCity &&
        !units.some(
          (o) =>
            o.id !== fresh.id &&
            o.x === fresh.x &&
            o.y === fresh.y &&
            o.ownerIdx === myIdx &&
            isMilitary(o.kind),
        );

      // Adjacent enemy unit → attack.
      const enemy = findAdjacentEnemy(fresh, units, atPeaceWith);

      if (isLastDefender && !enemy) {
        // Hold the city.
        continue;
      }
      if (enemy) {
        const defenderTile = map.tiles[enemy.y * map.width + enemy.x];
        const cityHere = cities.find(
          (c) => c.x === enemy.x && c.y === enemy.y && c.ownerIdx === enemy.ownerIdx,
        );
        const wallsBonus = cityHere?.buildings.includes('walls') ? 1 : 0;
        const battle = resolveCombat(fresh, enemy, defenderTile, wallsBonus, input.players);
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
      const undefendedCity = findAdjacentUndefendedEnemyCity(fresh, cities, units, atPeaceWith);
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
      const targets = findEnemyTargets(fresh, units, cities, atPeaceWith);
      const stepped = moveTowardTargets(fresh, units, cities, map, targets);
      if (stepped) {
        units = stepped;
        continue;
      }
      units = tryMove(fresh, units, cities, map);
      continue;
    }

    // Worker or other non-combat unit — wander.
    units = tryMove(fresh, units, cities, map);
  }

  // Stack pass: merge two adjacent friendly military units if total stack
  // size would stay ≤ 3. Up to 2 merges per turn to keep things tame.
  let merges = 0;
  let didMerge = true;
  while (didMerge && merges < 2) {
    didMerge = false;
    const myMil = units.filter(
      (u) => u.ownerIdx === myIdx && isMilitary(u.kind) && u.stack.length < 3,
    );
    outer: for (let i = 0; i < myMil.length; i++) {
      for (let j = i + 1; j < myMil.length; j++) {
        const a = myMil[i];
        const b = myMil[j];
        if (chebyshev(a.x, a.y, b.x, b.y) !== 1) continue;
        if (a.stack.length + b.stack.length > 3) continue;
        // Source unit (a) is consumed; receiver (b) keeps position and
        // grows its stack.
        units = units
          .filter((u) => u.id !== a.id)
          .map((u) =>
            u.id === b.id ? { ...u, stack: [...u.stack, ...a.stack] } : u,
          );
        didMerge = true;
        merges += 1;
        break outer;
      }
    }
  }

  return { units, cities, battles };
}

// Re-export so other modules can use it without importing from data.
export { DEFAULT_PRODUCTION_PER_TURN };
