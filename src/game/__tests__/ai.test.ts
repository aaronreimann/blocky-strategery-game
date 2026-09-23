import { describe, expect, it } from 'vitest';
import { pickAINextBuild, runAITurn } from '@/src/game/ai';
import type { GameMap, Tile } from '@/src/game/map';
import type { City, Player, Unit } from '@/src/game/types';

describe('AI turn logic and build target selection', () => {
  const createMap = (width = 15, height = 15): GameMap => {
    const tiles: Tile[] = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        tiles.push({ x, y, terrain: 'grassland', resource: null });
      }
    }
    return { width, height, tiles, seed: 1 };
  };

  const createCity = (ownerIdx: number, x: number, y: number, opts: Partial<City> = {}): City => ({
    id: `c-${ownerIdx}-${x}-${y}`,
    ownerIdx,
    name: 'AI City',
    x,
    y,
    population: 2,
    food: 0,
    buildings: [],
    building: null,
    buildQueue: [],
    production: 0,
    focus: 'balanced',
    ...opts,
  });

  const createUnit = (kind: Unit['kind'], ownerIdx: number, x: number, y: number): Unit => ({
    id: `u-${ownerIdx}-${x}-${y}`,
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

  const createPlayer = (idx: number): Player => ({
    idx,
    name: `Player ${idx}`,
    iso: 'EN',
    leader: 'Leader',
    color: '#ffffff',
    isHuman: idx === 0,
    researched: ['pottery', 'bronze_working'],
    researching: null,
    science: 0,
    gold: 50,
  });

  it('prioritizes pioneer when AI has fewer than 4 cities and no pioneer', () => {
    const city = createCity(1, 5, 5);
    const target = pickAINextBuild(city, [city], [], []);
    expect(target).toEqual({ kind: 'unit', unit: 'pioneer' });
  });

  it('builds military when defense is low relative to city count', () => {
    const cities = [
      createCity(1, 2, 2),
      createCity(1, 6, 2),
      createCity(1, 10, 2),
      createCity(1, 2, 8),
    ];
    // 4 cities, 0 military -> needs military units
    const target = pickAINextBuild(cities[0], cities, [], ['bronze_working']);
    expect(target.kind).toBe('unit');
    expect(['footman', 'spearman']).toContain((target as { kind: 'unit'; unit: string }).unit);
  });

  it('runs AI turn to attack adjacent enemy or step forward', () => {
    const map = createMap(15, 15);
    const aiUnit = createUnit('footman', 1, 5, 5);
    const humanUnit = createUnit('worker', 0, 5, 6); // adjacent enemy
    const p0 = createPlayer(0);
    const p1 = createPlayer(1);

    const output = runAITurn({
      ownerIdx: 1,
      map,
      units: [aiUnit, humanUnit],
      cities: [],
      players: [p0, p1],
      atPeaceWith: new Set(),
    });

    // AI should attack the adjacent human worker
    expect(output.battles.length).toBeGreaterThan(0);
  });

  it('merges adjacent friendly military units into a stacked army', () => {
    const map = createMap(15, 15);
    const u1 = createUnit('footman', 1, 5, 5);
    const u2 = createUnit('footman', 1, 6, 5); // adjacent friendly
    u1.movesLeft = 0;
    u2.movesLeft = 0;
    const p0 = createPlayer(0);
    const p1 = createPlayer(1);

    const output = runAITurn({
      ownerIdx: 1,
      map,
      units: [u1, u2],
      cities: [],
      players: [p0, p1],
      atPeaceWith: new Set(),
    });

    // Units should merge from 2 individual units to 1 stacked army of size 2
    expect(output.units.length).toBe(1);
    expect(output.units[0].stack.length).toBe(2);
  });

  it('AI pioneer founds a city on suitable terrain when distant from existing cities', () => {
    const map = createMap(20, 20);
    // Pioneer far away from any cities (at 15, 15) on grassland
    const pioneer = createUnit('pioneer', 1, 15, 15);
    const existingCity = createCity(1, 2, 2);
    const p0 = createPlayer(0);
    const p1 = createPlayer(1);

    const output = runAITurn({
      ownerIdx: 1,
      map,
      units: [pioneer],
      cities: [existingCity],
      players: [p0, p1],
      atPeaceWith: new Set(),
    });

    // Pioneer should be consumed and a new city founded
    expect(output.cities.length).toBe(2);
    expect(output.units.some((u) => u.id === pioneer.id)).toBe(false);
    const newCity = output.cities.find((c) => c.x === 15 && c.y === 15);
    expect(newCity).toBeDefined();
    expect(newCity?.ownerIdx).toBe(1);
  });

  it('AI respects peace treaties and does not attack peaceful units', () => {
    const map = createMap(15, 15);
    const aiUnit = createUnit('footman', 1, 5, 5);
    const humanUnit = createUnit('worker', 0, 5, 6); // adjacent human unit
    const p0 = createPlayer(0);
    const p1 = createPlayer(1);

    const output = runAITurn({
      ownerIdx: 1,
      map,
      units: [aiUnit, humanUnit],
      cities: [],
      players: [p0, p1],
      atPeaceWith: new Set([0]), // At peace with player 0
    });

    // AI should NOT attack player 0 because of peace treaty
    expect(output.battles.length).toBe(0);
  });

  it('AI chooses infrastructure when well-defended with multiple cities', () => {
    const cities = [
      createCity(1, 2, 2, { population: 3 }),
      createCity(1, 8, 2, { population: 3 }),
      createCity(1, 2, 8, { population: 3 }),
      createCity(1, 8, 8, { population: 3 }),
    ];
    // 8 military units for 4 cities = 2 per city (adequate defense threshold)
    const military = Array.from({ length: 8 }, (_, i) =>
      createUnit('spearman', 1, 2 + i, 2),
    );

    const target = pickAINextBuild(
      cities[0],
      cities,
      military,
      ['pottery', 'writing'],
      [],
    );

    // Should prioritize granary or library over more military
    expect(target.kind).toBe('building');
    expect(['granary', 'library']).toContain((target as { kind: 'building'; building: string }).building);
  });
});
