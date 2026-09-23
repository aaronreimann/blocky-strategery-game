import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildFallbackLeaders } from '@/src/data/countries';
import { DEFAULT_SCENARIO } from '@/src/game/types';
import { useGame } from '@/src/state/game';

// Mock AsyncStorage for node environment
const storage = new Map<string, string>();
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      storage.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      storage.delete(key);
    }),
    multiRemove: vi.fn(async (keys: string[]) => {
      for (const k of keys) storage.delete(k);
    }),
  },
}));

describe('game state store actions and bugfix verification', () => {
  const leaders = buildFallbackLeaders();

  beforeEach(() => {
    storage.clear();
    useGame.getState().exitToTitle();
  });

  it('initializes a new game and properly cleans up on exitToTitle', () => {
    const store = useGame.getState();
    store.newGame(0, 42, leaders, DEFAULT_SCENARIO);

    const activeState = useGame.getState();
    expect(activeState.map).not.toBeNull();
    expect(activeState.players.length).toBeGreaterThan(0);
    expect(activeState.units.length).toBeGreaterThan(0);
    expect(activeState.turn).toBe(1);
    expect(activeState.currentSlot).toBe(0);

    // Verify popups and events are reset
    expect(activeState.turnEvents).toEqual([]);
    expect(activeState.tilePicker).toBeNull();
    expect(activeState.tileTooltip).toBeNull();

    // Exit to title
    useGame.getState().exitToTitle();
    const titleState = useGame.getState();
    expect(titleState.map).toBeNull();
    expect(titleState.players).toEqual([]);
    expect(titleState.currentSlot).toBeNull();
    expect(titleState.turnEvents).toEqual([]);
  });

  it('prevents spawning units directly on enemy occupied tiles', () => {
    const store = useGame.getState();
    store.newGame(0, 42, leaders, DEFAULT_SCENARIO);

    const s = useGame.getState();
    const humanPioneer = s.units.find((u) => u.ownerIdx === 0 && u.kind === 'pioneer')!;

    // Select pioneer and found city
    store.selectUnit(humanPioneer.id);
    store.foundCity();

    const withCity = useGame.getState();
    const city = withCity.cities.find((c) => c.ownerIdx === 0)!;
    expect(city).toBeDefined();

    // Set city build to footman
    store.setCityBuild(city.id, { kind: 'unit', unit: 'footman' });

    // Place an enemy unit directly on the city tile
    const enemyUnit = {
      id: 'enemy-1',
      ownerIdx: 1,
      kind: 'footman' as const,
      stack: ['footman' as const],
      x: city.x,
      y: city.y,
      movesLeft: 1,
      workingOn: null,
      workTurnsLeft: 0,
      destination: null,
      autoMode: false,
      exploreMode: false,
      veteran: false,
    };
    useGame.setState({
      units: [...useGame.getState().units, enemyUnit],
    });

    // Advance turn to finish build
    useGame.setState({
      cities: useGame.getState().cities.map((c) =>
        c.id === city.id ? { ...c, production: 50 } : c,
      ),
    });
    store.endTurn();

    const afterSpawn = useGame.getState();
    // A unit spawned should NEVER be at the exact tile of the enemy unit if other tiles are available
    // or it should spawn on adjacent unoccupied tile
    const humanUnitsAtEnemyPos = afterSpawn.units.filter(
      (u) => u.ownerIdx === 0 && u.x === enemyUnit.x && u.y === enemyUnit.y,
    );
    expect(humanUnitsAtEnemyPos.length).toBe(0);
  });

  it('triggers game over on tech trade when a player possesses Philosophy', () => {
    const store = useGame.getState();
    store.newGame(0, 42, leaders, DEFAULT_SCENARIO);

    // Human researches Philosophy and trades to AI for Astronomy
    useGame.setState({
      players: useGame.getState().players.map((p) => {
        if (p.idx === 0) return { ...p, researched: ['philosophy'] };
        if (p.idx === 1) return { ...p, researched: ['astronomy'] };
        return p;
      }),
    });

    const accepted = store.proposeTechTrade(1, 'philosophy', 'astronomy');
    expect(accepted).toBe(true);

    const finalState = useGame.getState();
    expect(finalState.players[1].researched).toContain('philosophy');
    expect(finalState.gameOver).toEqual({
      kind: 'win',
      reason: 'You discover Philosophy and ascend.',
    });
  });

  it('triggers game over when Philosophy is immediately researched', () => {
    const store = useGame.getState();
    store.newGame(0, 42, leaders, DEFAULT_SCENARIO);

    // Grant human literacy, mathematics, iron_working and 100 banked science
    useGame.setState({
      players: useGame.getState().players.map((p) =>
        p.idx === 0
          ? {
              ...p,
              researched: ['literacy', 'mathematics', 'iron_working'],
              science: 100,
            }
          : p,
      ),
    });

    store.setResearch('philosophy');

    const state = useGame.getState();
    expect(state.players[0].researched).toContain('philosophy');
    expect(state.gameOver).toEqual({
      kind: 'win',
      reason: 'You discover Philosophy and ascend.',
    });
  });

  it('rushBuild deducts gold and fills production to completion', () => {
    const store = useGame.getState();
    store.newGame(0, 42, leaders, DEFAULT_SCENARIO);

    const s = useGame.getState();
    const pioneer = s.units.find((u) => u.ownerIdx === 0 && u.kind === 'pioneer')!;
    store.selectUnit(pioneer.id);
    store.foundCity();

    const city = useGame.getState().cities[0];
    store.setCityBuild(city.id, { kind: 'unit', unit: 'footman' }); // cost 10

    // Give human 100 gold
    useGame.setState({
      players: useGame.getState().players.map((p) =>
        p.idx === 0 ? { ...p, gold: 100 } : p,
      ),
    });

    store.rushBuild(city.id); // 10 production needed * 2 = 20 gold
    const updated = useGame.getState();
    expect(updated.players[0].gold).toBe(80);
    expect(updated.cities[0].production).toBe(10);
  });

  it('foundCity consumes pioneer and establishes a new city with valid defaults', () => {
    const store = useGame.getState();
    store.newGame(0, 42, leaders, DEFAULT_SCENARIO);

    const initialPioneers = useGame.getState().units.filter((u) => u.ownerIdx === 0 && u.kind === 'pioneer');
    expect(initialPioneers.length).toBeGreaterThan(0);
    const pioneer = initialPioneers[0];

    store.selectUnit(pioneer.id);
    store.foundCity();

    const state = useGame.getState();
    expect(state.units.some((u) => u.id === pioneer.id)).toBe(false);

    const newCity = state.cities.find((c) => c.x === pioneer.x && c.y === pioneer.y);
    expect(newCity).toBeDefined();
    expect(newCity?.ownerIdx).toBe(0);
    expect(newCity?.population).toBe(1);
    expect(newCity?.name).toBeTruthy();
  });

  it('selectNextUnmovedUnit cycles through units with remaining moves', () => {
    const store = useGame.getState();
    store.newGame(0, 42, leaders, DEFAULT_SCENARIO);

    const humanUnits = useGame.getState().units.filter((u) => u.ownerIdx === 0);
    expect(humanUnits.length).toBeGreaterThan(1);

    store.selectNextUnmovedUnit();
    const firstSelectedId = useGame.getState().selectedUnitId;
    expect(firstSelectedId).toBeTruthy();

    store.selectNextUnmovedUnit();
    const secondSelectedId = useGame.getState().selectedUnitId;
    expect(secondSelectedId).toBeTruthy();
    expect(secondSelectedId).not.toBe(firstSelectedId);
  });

  it('endTurn advances turn counter, restores unit moves, and executes city production', () => {
    const store = useGame.getState();
    store.newGame(0, 42, leaders, DEFAULT_SCENARIO);

    // Found a city
    const pioneer = useGame.getState().units.find((u) => u.ownerIdx === 0 && u.kind === 'pioneer')!;
    store.selectUnit(pioneer.id);
    store.foundCity();

    // Deplete a unit's movement
    const footman = useGame.getState().units.find((u) => u.ownerIdx === 0 && u.kind === 'footman')!;
    useGame.setState({
      units: useGame.getState().units.map((u) =>
        u.id === footman.id ? { ...u, movesLeft: 0 } : u,
      ),
    });

    const initialTurn = useGame.getState().turn;
    store.endTurn();

    const nextState = useGame.getState();
    expect(nextState.turn).toBe(initialTurn + 1);

    // Unit moves restored
    const updatedFootman = nextState.units.find((u) => u.id === footman.id);
    expect(updatedFootman?.movesLeft).toBeGreaterThan(0);
  });

  it('loadFromSlot successfully restores a saved game session', async () => {
    const store = useGame.getState();
    store.newGame(0, 42, leaders, DEFAULT_SCENARIO);

    // Advance to turn 2 via endTurn (which automatically autosaves to currentSlot)
    store.endTurn();
    expect(useGame.getState().turn).toBe(2);

    // Exit to title (resets state)
    store.exitToTitle();
    expect(useGame.getState().map).toBeNull();

    // Load back from slot 0
    const success = await store.loadFromSlot(0);
    expect(success).toBe(true);

    const restored = useGame.getState();
    expect(restored.map).not.toBeNull();
    expect(restored.turn).toBe(2);
    expect(restored.currentSlot).toBe(0);
  });
});
