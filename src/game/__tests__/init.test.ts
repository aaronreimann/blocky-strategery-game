import { describe, expect, it } from 'vitest';
import { buildFallbackLeaders } from '@/src/data/countries';
import { buildInitialState } from '@/src/game/init';

describe('initial game state generation', () => {
  const leaders = buildFallbackLeaders();

  it('generates the correct player count based on difficulty', () => {
    // Easy: 1 human + 3 AI = 4
    const easyState = buildInitialState(1, 'easy', leaders);
    expect(easyState.players.length).toBe(4);
    expect(easyState.players[0].isHuman).toBe(true);
    expect(easyState.players.filter((p) => !p.isHuman).length).toBe(3);

    // Normal: 1 human + 5 AI = 6
    const normalState = buildInitialState(1, 'normal', leaders);
    expect(normalState.players.length).toBe(6);

    // Hard: 1 human + 7 AI = 8
    const hardState = buildInitialState(1, 'hard', leaders);
    expect(hardState.players.length).toBe(8);
  });

  it('spawns starting units for each player and places goody huts', () => {
    const state = buildInitialState(10, 'easy', leaders);

    // Each player gets at least 3 starting units (Pioneer, Footman, Worker)
    for (let i = 0; i < state.players.length; i++) {
      const playerUnits = state.units.filter((u) => u.ownerIdx === i);
      expect(playerUnits.length).toBeGreaterThanOrEqual(3);
      expect(playerUnits.some((u) => u.kind === 'pioneer')).toBe(true);
      expect(playerUnits.some((u) => u.kind === 'footman')).toBe(true);
      expect(playerUnits.some((u) => u.kind === 'worker')).toBe(true);
    }

    // Goody huts placed on the map
    expect(state.huts.length).toBeGreaterThan(0);
    for (const hut of state.huts) {
      expect(hut.x).toBeGreaterThanOrEqual(0);
      expect(hut.x).toBeLessThan(state.map.width);
      expect(hut.y).toBeGreaterThanOrEqual(0);
      expect(hut.y).toBeLessThan(state.map.height);
    }
  });

  it('respects mapSize option in initial state', () => {
    const small = buildInitialState(1, 'normal', leaders, { mapSize: 'small' });
    expect(small.map.width).toBe(32);
    expect(small.map.height).toBe(24);

    const large = buildInitialState(1, 'normal', leaders, { mapSize: 'large' });
    expect(large.map.width).toBe(64);
    expect(large.map.height).toBe(48);
  });
});
