import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ImprovementMap } from '@/src/data/improvements';
import { TERRAIN } from '@/src/data/terrain';
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

export type SlotPreview = {
  width: number;
  height: number;
  // Row-major terrain color hex strings, length width × height.
  tileColors: string[];
  // City dots — owner color shown as a small circle on the thumbnail.
  cities: { x: number; y: number; color: string }[];
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
      preview: SlotPreview;
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

// Wipe everything this app has stored: every save slot, the history log,
// the tutorial-seen flag, and the cached leaders blob if any. Used by the
// Settings screen for a "start over completely" reset.
export async function wipeAllAppData(): Promise<void> {
  const keys: string[] = [];
  for (let i = 0; i < SLOT_COUNT; i++) keys.push(slotKey(i));
  keys.push(HISTORY_KEY, TUTORIAL_KEY, 'civ_leaders_cache_v1');
  await AsyncStorage.multiRemove(keys);
}

export async function listSlots(): Promise<SlotInfo[]> {
  const out: SlotInfo[] = [];
  for (let i = 0; i < SLOT_COUNT; i++) {
    const data = await loadSlot(i);
    if (!data) {
      out.push({ slot: i, empty: true });
    } else {
      const human = data.players.find((p) => p.isHuman);
      const tileColors = data.map.tiles.map((t) => TERRAIN[t.terrain].color);
      const cityDots = data.cities.map((c) => ({
        x: c.x,
        y: c.y,
        color: data.players[c.ownerIdx]?.color ?? '#ffffff',
      }));
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
        preview: {
          width: data.map.width,
          height: data.map.height,
          tileColors,
          cities: cityDots,
        },
      });
    }
  }
  return out;
}
