import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  appendHistory,
  clearHistory,
  deleteSlot,
  type HistoryEntry,
  isTutorialSeen,
  listSlots,
  loadHistory,
  loadSlot,
  markTutorialSeen,
  resetTutorial,
  saveSlot,
  wipeAllAppData,
} from '@/src/state/saves';

const { memoryStore } = vi.hoisted(() => ({
  memoryStore: new Map<string, string>(),
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => memoryStore.get(key) ?? null),
    setItem: vi.fn(async (key: string, val: string) => {
      memoryStore.set(key, val);
    }),
    removeItem: vi.fn(async (key: string) => {
      memoryStore.delete(key);
    }),
    multiRemove: vi.fn(async (keys: string[]) => {
      for (const k of keys) memoryStore.delete(k);
    }),
  },
}));

const minimalSaveData = {
  seed: 42,
  turn: 10,
  difficulty: 'normal' as const,
  map: {
    width: 2,
    height: 2,
    tiles: [
      { x: 0, y: 0, terrain: 'grassland' as const, resource: null },
      { x: 1, y: 0, terrain: 'plains' as const, resource: null },
      { x: 0, y: 1, terrain: 'hills' as const, resource: null },
      { x: 1, y: 1, terrain: 'forest' as const, resource: null },
    ],
    seed: 42,
  },
  players: [
    {
      idx: 0,
      name: 'Arthur',
      leader: 'King Arthur',
      iso: 'welsh',
      color: '#d6336c',
      isHuman: true,
      gold: 50,
      researched: ['pottery' as const],
      researching: null,
      science: 10,
    },
  ],
  units: [
    {
      id: 'u1',
      ownerIdx: 0,
      kind: 'footman' as const,
      stack: ['footman' as const],
      x: 0,
      y: 0,
      movesLeft: 1,
      workingOn: null,
      workTurnsLeft: 0,
      destination: null,
      autoMode: false,
      exploreMode: false,
      veteran: false,
    },
  ],
  cities: [
    {
      id: 'c1',
      name: 'Camelot',
      ownerIdx: 0,
      x: 0,
      y: 0,
      population: 1,
      food: 0,
      production: 0,
      building: { kind: 'unit' as const, unit: 'footman' as const },
      buildQueue: [],
      buildings: [],
      focus: 'balanced' as const,
    },
  ],
  improvements: {},
  wonders: [],
  huts: [],
  relations: {},
  gameOver: null,
};

describe('game saves persistence', () => {
  beforeEach(() => {
    memoryStore.clear();
  });

  it('saveSlot and loadSlot round-trips game data correctly', async () => {
    await saveSlot(0, minimalSaveData);

    const loaded = await loadSlot(0);
    expect(loaded).not.toBeNull();
    expect(loaded?.turn).toBe(10);
    expect(loaded?.version).toBe(2);
    expect(loaded?.cities.length).toBe(1);
    expect(loaded?.units.length).toBe(1);
    expect(loaded?.savedAt).toBeTruthy();
  });

  it('loadSlot returns null for empty or non-existent slot', async () => {
    const loaded = await loadSlot(1);
    expect(loaded).toBeNull();
  });

  it('loadSlot rejects mismatched save version', async () => {
    memoryStore.set('civ_save_0', JSON.stringify({ ...minimalSaveData, version: 999 }));
    const loaded = await loadSlot(0);
    expect(loaded).toBeNull();
  });

  it('deleteSlot removes the specified slot', async () => {
    await saveSlot(0, minimalSaveData);
    expect(await loadSlot(0)).not.toBeNull();

    await deleteSlot(0);
    expect(await loadSlot(0)).toBeNull();
  });

  it('listSlots returns metadata and preview information for occupied slots', async () => {
    await saveSlot(1, minimalSaveData);

    const slots = await listSlots();
    expect(slots.length).toBe(3);

    expect(slots[0].empty).toBe(true);
    expect(slots[1].empty).toBe(false);

    if (!slots[1].empty) {
      expect(slots[1].turn).toBe(10);
      expect(slots[1].cityCount).toBe(1);
      expect(slots[1].unitCount).toBe(1);
      expect(slots[1].humanRealm.name).toBe('Arthur');
      expect(slots[1].preview.width).toBe(2);
      expect(slots[1].preview.height).toBe(2);
      expect(slots[1].preview.tileColors.length).toBe(4);
      expect(slots[1].preview.cities.length).toBe(1);
    }
  });

  it('history records can be appended, loaded, and cleared', async () => {
    expect(await loadHistory()).toEqual([]);

    const entry1: HistoryEntry = {
      at: new Date().toISOString(),
      kind: 'win',
      reason: 'Philosophical Enlightenment',
      turn: 45,
      difficulty: 'normal',
      country: 'Welsh',
      leader: 'Arthur',
      iso: 'welsh',
      cityCount: 5,
      unitCount: 8,
    };

    await appendHistory(entry1);
    const history = await loadHistory();
    expect(history.length).toBe(1);
    expect(history[0].reason).toBe('Philosophical Enlightenment');

    await clearHistory();
    expect(await loadHistory()).toEqual([]);
  });

  it('history preserves a maximum of 50 entries', async () => {
    for (let i = 0; i < 55; i++) {
      await appendHistory({
        at: new Date().toISOString(),
        kind: 'win',
        reason: `Game ${i}`,
        turn: i,
        difficulty: 'normal',
        country: 'Welsh',
        leader: 'Arthur',
        iso: 'welsh',
        cityCount: 1,
        unitCount: 1,
      });
    }

    const history = await loadHistory();
    expect(history.length).toBe(50);
    expect(history[0].reason).toBe('Game 54'); // Most recent first
  });

  it('tutorial tracking flag updates and resets correctly', async () => {
    expect(await isTutorialSeen()).toBe(false);

    await markTutorialSeen();
    expect(await isTutorialSeen()).toBe(true);

    await resetTutorial();
    expect(await isTutorialSeen()).toBe(false);
  });

  it('wipeAllAppData clears all saves, history, and flags', async () => {
    await saveSlot(0, minimalSaveData);
    await markTutorialSeen();
    await appendHistory({
      at: new Date().toISOString(),
      kind: 'win',
      reason: 'Win',
      turn: 1,
      difficulty: 'normal',
      country: 'Welsh',
      leader: 'Arthur',
      iso: 'welsh',
      cityCount: 1,
      unitCount: 1,
    });

    await wipeAllAppData();

    expect(await loadSlot(0)).toBeNull();
    expect(await isTutorialSeen()).toBe(false);
    expect(await loadHistory()).toEqual([]);
  });
});
