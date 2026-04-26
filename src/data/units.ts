import type { TechId } from './tech';

export const UNIT_KINDS = [
  'pioneer',
  'worker',
  'footman',
  'spearman',
  'horseman',
  'swordsman',
  'catapult',
] as const;

export type UnitKind = (typeof UNIT_KINDS)[number];

export type UnitSpec = {
  name: string;
  move: number;
  attack: number;
  defense: number;
  cost: number;
  glyph: string;
  tech: TechId | null;
};

export const UNIT: Record<UnitKind, UnitSpec> = {
  pioneer:   { name: 'Pioneer',   move: 1, attack: 0, defense: 1, cost: 30, glyph: '◆', tech: null },
  worker:    { name: 'Worker',    move: 1, attack: 0, defense: 1, cost: 20, glyph: '●', tech: null },
  footman:   { name: 'Footman',   move: 1, attack: 1, defense: 1, cost: 10, glyph: '■', tech: null },
  spearman:  { name: 'Spearman',  move: 1, attack: 1, defense: 3, cost: 20, glyph: '▲', tech: 'bronze_working' },
  horseman:  { name: 'Horseman',  move: 2, attack: 2, defense: 1, cost: 25, glyph: '▶', tech: 'horseback_riding' },
  swordsman: { name: 'Swordsman', move: 1, attack: 4, defense: 2, cost: 35, glyph: '✕', tech: 'iron_working' },
  catapult:  { name: 'Catapult',  move: 1, attack: 6, defense: 1, cost: 40, glyph: '⬛', tech: 'mathematics' },
};
