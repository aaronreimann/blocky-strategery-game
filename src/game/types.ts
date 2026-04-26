import type { BuildingKind } from '@/src/data/buildings';
import type { ImprovementKind } from '@/src/data/improvements';
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

export type Player = {
  idx: number;
  name: string;   // country name
  leader: string; // current leader (best-effort, from Wikidata cache or bundled fallback)
  color: string;
  isHuman: boolean;
};

export type Unit = {
  id: string;
  kind: UnitKind;
  ownerIdx: number;
  x: number;
  y: number;
  movesLeft: number;
  workingOn: ImprovementKind | null;
  workTurnsLeft: number;
};

export type CityBuildTarget =
  | { kind: 'unit'; unit: UnitKind }
  | { kind: 'building'; building: BuildingKind };

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
};
