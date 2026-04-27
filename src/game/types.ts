import type { BuildingKind } from '@/src/data/buildings';
import type { ImprovementKind } from '@/src/data/improvements';
import type { TechId } from '@/src/data/tech';
import type { UnitKind } from '@/src/data/units';
import type { WonderKind } from '@/src/data/wonders';

export const DIFFICULTIES = ['easy', 'normal', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Chieftain',
  normal: 'Prince',
  hard: 'King',
};

export const DIFFICULTY_AI_COUNT: Record<Difficulty, number> = {
  easy: 3,
  normal: 5,
  hard: 7,
};

export const MAP_SIZES = ['small', 'medium', 'large'] as const;
export type MapSize = (typeof MAP_SIZES)[number];

export const MAP_SIZE_LABELS: Record<MapSize, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
};

export const MAP_SIZE_DIMS: Record<MapSize, { w: number; h: number }> = {
  small: { w: 32, h: 24 },
  medium: { w: 48, h: 36 },
  large: { w: 64, h: 48 },
};

export const TURN_LIMIT_OPTIONS = [50, 100, 200, 0] as const;
export type TurnLimitOption = (typeof TURN_LIMIT_OPTIONS)[number];
// 0 means "Endless" — time-victory never triggers.

export type VictoryConditions = {
  conquest: boolean;
  tech: boolean;
  time: boolean;
};

export const DEFAULT_VICTORIES: VictoryConditions = {
  conquest: true,
  tech: true,
  time: true,
};

// Barbarians are a "shadow" player — they own units (Unit.ownerIdx) but are
// NOT in the players[] array. They have no tribe, no cities, no tech, no
// diplomacy. A high sentinel idx is used so any `players[idx]` lookup returns
// undefined (and UI falls back gracefully).
export const BARBARIAN_OWNER_IDX = 999;
export const BARBARIAN_COLOR = '#7c2d12'; // blood-rust red

export type ScenarioOptions = {
  difficulty: Difficulty;
  mapSize: MapSize;
  turnLimit: number; // 0 = endless
  victories: VictoryConditions;
  humanCountryQid: string | null; // null = random
};

export const DEFAULT_SCENARIO: ScenarioOptions = {
  difficulty: 'normal',
  mapSize: 'medium',
  turnLimit: 100,
  victories: DEFAULT_VICTORIES,
  humanCountryQid: null,
};

export type GameOverState = {
  kind: 'win' | 'lose' | 'draw';
  reason: string;
};

export type Relation = 'war' | 'peace';
export type RelationsMap = Record<string, Relation>;

// Symmetric relation key (always lower idx first so the same key works
// regardless of which side asks).
export function relationKey(a: number, b: number): string {
  return a < b ? `${a},${b}` : `${b},${a}`;
}

export type TurnEvent = {
  kind: 'battle' | 'grew' | 'built' | 'research' | 'captured' | 'lost' | 'event';
  text: string;
};

export type Player = {
  idx: number;
  name: string;   // country name
  iso: string;    // ISO 3166-1 alpha-2; empty if unknown
  leader: string; // current leader (best-effort, from Wikidata cache or bundled fallback)
  color: string;
  isHuman: boolean;
  researched: TechId[];
  researching: TechId | null;
  science: number;
  gold: number;
};

export type Unit = {
  id: string;
  kind: UnitKind;        // primary kind for display + spawn behavior
  stack: UnitKind[];     // stacked-army members; length 1-3, stack[0] === kind
  ownerIdx: number;
  x: number;
  y: number;
  movesLeft: number;
  workingOn: ImprovementKind | null;
  workTurnsLeft: number;
  destination: { x: number; y: number } | null;
  autoMode: boolean;     // Worker only: auto-build / connect roads
  exploreMode: boolean;  // Combat units: walk toward nearest unexplored tile
  veteran: boolean;      // built in a Barracks: +1 attack
};

export type CityBuildTarget =
  | { kind: 'unit'; unit: UnitKind }
  | { kind: 'building'; building: BuildingKind }
  | { kind: 'wonder'; wonder: WonderKind };

export type Wonder = {
  kind: WonderKind;
  ownerIdx: number;
  cityId: string;
};

export const CITY_FOCUSES = ['balanced', 'roads'] as const;
export type CityFocus = (typeof CITY_FOCUSES)[number];

export const CITY_FOCUS_LABELS: Record<CityFocus, string> = {
  balanced: 'Balanced',
  roads: 'Build Roads',
};

export type City = {
  id: string;
  ownerIdx: number;
  name: string;
  x: number;
  y: number;
  population: number;
  food: number;
  buildings: BuildingKind[];
  building: CityBuildTarget | null;
  buildQueue: CityBuildTarget[];
  production: number;
  focus: CityFocus;
};

export type Hut = {
  x: number;
  y: number;
};

export type HutReward =
  | { kind: 'gold'; amount: number }
  | { kind: 'science'; amount: number }
  | { kind: 'tech'; tech: TechId }
  | { kind: 'unit'; unit: UnitKind }
  | { kind: 'empty' };
