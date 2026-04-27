import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ImprovementMap } from '@/src/data/improvements';
import type { GameMap } from '@/src/game/map';
import type {
  City,
  Difficulty,
  GameOverState,
  Hut,
  Player,
  RelationsMap,
  Unit,
  VictoryConditions,
  Wonder,
} from '@/src/game/types';

export const SLOT_COUNT = 3;
const SAVE_VERSION = 2;
const KEY_PREFIX = 'civ_save_';

const slotKey = (slot: number) => `${KEY_PREFIX}${slot}`;

export type SaveData = {
  version: number;
  seed: number;
  turn: number;
  difficulty: Difficulty;
  turnLimit?: number;
  victories?: VictoryConditions;
  humanVisibility?: string[];
  map: GameMap;
  players: Player[];
  units: Unit[];
  cities: City[];
  improvements: ImprovementMap;
  wonders: Wonder[];
  huts: Hut[];
  relations: RelationsMap;
  gameOver: GameOverState | null;
  savedAt: string;
};

export type SlotInfo =
  | { slot: number; empty: true }
  | {
      slot: number;
      empty: false;
      turn: number;
      cityCount: number;
      unitCount: number;
      difficulty: Difficulty;
      humanRealm: { name: string; leader: string; iso: string };
      gameOver: GameOverState | null;
      savedAt: string;
    };

export type HistoryEntry = {
  at: string;          // ISO timestamp when game ended
  kind: 'win' | 'lose' | 'draw';
  reason: string;
  turn: number;
  difficulty: Difficulty;
  country: string;
  leader: string;
  iso: string;
  cityCount: number;
  unitCount: number;
};

const HISTORY_KEY = 'civ_history';
const HISTORY_MAX = 50;

export async function saveSlot(slot: number, data: Omit<SaveData, 'version' | 'savedAt'>): Promise<void> {
  const payload: SaveData = {
    ...data,
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(slotKey(slot), JSON.stringify(payload));
}

export async function loadSlot(slot: number): Promise<SaveData | null> {
  const raw = await AsyncStorage.getItem(slotKey(slot));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SaveData> & { version: number };
    if (parsed.version !== SAVE_VERSION) return null;
    // Forward-compat default for saves written before difficulty existed.
    return {
      ...(parsed as SaveData),
      difficulty: parsed.difficulty ?? 'normal',
    };
  } catch {
    return null;
  }
}

export async function deleteSlot(slot: number): Promise<void> {
  await AsyncStorage.removeItem(slotKey(slot));
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export async function appendHistory(entry: HistoryEntry): Promise<void> {
  const list = await loadHistory();
  list.unshift(entry);
  if (list.length > HISTORY_MAX) list.length = HISTORY_MAX;
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(list));
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(HISTORY_KEY);
}

const TUTORIAL_KEY = 'civ_tutorial_seen';

export async function isTutorialSeen(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(TUTORIAL_KEY);
  return raw === '1';
}

export async function markTutorialSeen(): Promise<void> {
  await AsyncStorage.setItem(TUTORIAL_KEY, '1');
}

export async function resetTutorial(): Promise<void> {
  await AsyncStorage.removeItem(TUTORIAL_KEY);
}

export async function listSlots(): Promise<SlotInfo[]> {
  const out: SlotInfo[] = [];
  for (let i = 0; i < SLOT_COUNT; i++) {
    const data = await loadSlot(i);
    if (!data) {
      out.push({ slot: i, empty: true });
    } else {
      const human = data.players.find((p) => p.isHuman);
      out.push({
        slot: i,
        empty: false,
        turn: data.turn,
        cityCount: data.cities.length,
        unitCount: data.units.length,
        difficulty: data.difficulty,
        humanRealm: {
          name: human?.name ?? 'You',
          leader: human?.leader ?? '',
          iso: human?.iso ?? '',
        },
        gameOver: data.gameOver ?? null,
        savedAt: data.savedAt,
      });
    }
  }
  return out;
}
