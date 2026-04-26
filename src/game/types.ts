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
  name: string;
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
};

export type City = {
  id: string;
  ownerIdx: number;
  name: string;
  x: number;
  y: number;
  population: number;
  building: UnitKind | null;
  production: number;
  productionPerTurn: number;
};
