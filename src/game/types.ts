import type { BuildingKind } from '@/src/data/buildings';
import type { ImprovementKind } from '@/src/data/improvements';
import type { TechId } from '@/src/data/tech';
import type { UnitKind } from '@/src/data/units';

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

export type GameOverState = {
  kind: 'win' | 'lose' | 'draw';
  reason: string;
};

export type TurnEvent = {
  kind: 'battle' | 'grew' | 'built' | 'research' | 'captured' | 'lost';
  text: string;
};

export type Player = {
  idx: number;
  name: string;   // country name
  leader: string; // current leader (best-effort, from Wikidata cache or bundled fallback)
  color: string;
  isHuman: boolean;
  researched: TechId[];
  researching: TechId | null;
  science: number;
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
};

export type CityBuildTarget =
  | { kind: 'unit'; unit: UnitKind }
  | { kind: 'building'; building: BuildingKind };

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
  production: number;
  focus: CityFocus;
};
