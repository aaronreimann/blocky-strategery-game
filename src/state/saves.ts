import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ImprovementMap } from '@/src/data/improvements';
import type { GameMap } from '@/src/game/map';
import type {
  City,
  Difficulty,
  GameOverState,
  Player,
  RelationsMap,
  Unit,
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
  map: GameMap;
  players: Player[];
  units: Unit[];
  cities: City[];
  improvements: ImprovementMap;
  wonders: Wonder[];
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
      humanCiv: { name: string; leader: string };
      savedAt: string;
    };

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
        humanCiv: {
          name: human?.name ?? 'You',
          leader: human?.leader ?? '',
        },
        savedAt: data.savedAt,
      });
    }
  }
  return out;
}
