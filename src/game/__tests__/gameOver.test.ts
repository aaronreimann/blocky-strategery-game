import { describe, expect, it } from 'vitest';
import { checkGameOver } from '@/src/game/gameOver';
import type { City, Player, Unit, VictoryConditions } from '@/src/game/types';

describe('game over victory and defeat evaluations', () => {
  const createPlayer = (idx: number, isHuman: boolean, opts: Partial<Player> = {}): Player => ({
    idx,
    name: isHuman ? 'Human' : `AI ${idx}`,
    iso: isHuman ? 'EN' : 'FR',
    leader: 'Leader',
    color: '#ffffff',
    isHuman,
    researched: [],
    researching: null,
    science: 0,
    gold: 0,
    ...opts,
  });

  const createUnit = (ownerIdx: number): Unit => ({
    id: `u-${ownerIdx}`,
    kind: 'footman',
    stack: ['footman'],
    ownerIdx,
    x: 1,
    y: 1,
    movesLeft: 1,
    workingOn: null,
    workTurnsLeft: 0,
    destination: null,
    autoMode: false,
    exploreMode: false,
    veteran: false,
  });

  const createCity = (ownerIdx: number): City => ({
    id: `c-${ownerIdx}`,
    ownerIdx,
    name: 'City',
    x: 1,
    y: 1,
    population: 1,
    food: 0,
    buildings: [],
    building: null,
    buildQueue: [],
    production: 0,
    focus: 'balanced',
  });

  const defaultVictories: VictoryConditions = {
    conquest: true,
    tech: true,
    time: true,
  };

  it('triggers loss when human has no units and no cities', () => {
    const p0 = createPlayer(0, true);
    const p1 = createPlayer(1, false);

    const gameOver = checkGameOver({
      units: [createUnit(1)],
      cities: [createCity(1)],
      players: [p0, p1],
      turn: 10,
      victories: defaultVictories,
    });

    expect(gameOver).toEqual({
      kind: 'lose',
      reason: 'Your realm has fallen.',
    });
  });

  it('evaluates tech victory when Philosophy is researched', () => {
    const p0 = createPlayer(0, true, { researched: ['philosophy'] });
    const p1 = createPlayer(1, false);

    const humanWin = checkGameOver({
      units: [createUnit(0), createUnit(1)],
      cities: [createCity(0), createCity(1)],
      players: [p0, p1],
      turn: 10,
      victories: defaultVictories,
    });

    expect(humanWin).toEqual({
      kind: 'win',
      reason: 'You discover Philosophy and ascend.',
    });

    // AI discovers philosophy first
    const p0Behind = createPlayer(0, true);
    const p1Philo = createPlayer(1, false, { researched: ['philosophy'] });

    const aiWin = checkGameOver({
      units: [createUnit(0), createUnit(1)],
      cities: [createCity(0), createCity(1)],
      players: [p0Behind, p1Philo],
      turn: 10,
      victories: defaultVictories,
    });

    expect(aiWin?.kind).toBe('lose');
    expect(aiWin?.reason).toContain('discovered Philosophy first');
  });

  it('evaluates conquest victory when all rivals have no cities or units left', () => {
    const p0 = createPlayer(0, true);
    const p1 = createPlayer(1, false);

    const humanConquest = checkGameOver({
      units: [createUnit(0)],
      cities: [createCity(0)],
      players: [p0, p1],
      turn: 15,
      victories: defaultVictories,
    });

    expect(humanConquest).toEqual({
      kind: 'win',
      reason: 'Every rival realm has fallen. The world is yours.',
    });
  });

  it('evaluates time victory and tiebreak when turn limit is exceeded', () => {
    const p0 = createPlayer(0, true);
    const p1 = createPlayer(1, false);

    // Human controls more cities
    const humanLeads = checkGameOver({
      units: [createUnit(0), createUnit(1)],
      cities: [createCity(0), createCity(0), createCity(1)],
      players: [p0, p1],
      turn: 101,
      turnLimit: 100,
      victories: defaultVictories,
    });

    expect(humanLeads).toEqual({
      kind: 'win',
      reason: 'Time wins — you control the most cities.',
    });

    // Endless mode (turnLimit = 0) disables time victory
    const endless = checkGameOver({
      units: [createUnit(0), createUnit(1)],
      cities: [createCity(0), createCity(1)],
      players: [p0, p1],
      turn: 300,
      turnLimit: 0,
      victories: defaultVictories,
    });
    expect(endless).toBeNull();
  });
});
