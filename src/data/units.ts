import { TERRAIN, type Terrain } from './terrain';
import type { TechId } from './tech';

export const UNIT_KINDS = [
  'pioneer',
  'worker',
  'footman',
  'spearman',
  'horseman',
  'swordsman',
  'catapult',
  'galley',
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
  domain: 'land' | 'sea';
};

export const UNIT: Record<UnitKind, UnitSpec> = {
  pioneer:   { name: 'Pioneer',   move: 2, attack: 0, defense: 1, cost: 30, glyph: '◆', tech: null,               domain: 'land' },
  worker:    { name: 'Worker',    move: 1, attack: 0, defense: 1, cost: 20, glyph: '●', tech: null,               domain: 'land' },
  footman:   { name: 'Footman',   move: 1, attack: 1, defense: 1, cost: 10, glyph: '■', tech: null,               domain: 'land' },
  spearman:  { name: 'Spearman',  move: 1, attack: 1, defense: 3, cost: 20, glyph: '▲', tech: 'bronze_working',   domain: 'land' },
  horseman:  { name: 'Horseman',  move: 2, attack: 2, defense: 1, cost: 25, glyph: '▶', tech: 'horseback_riding', domain: 'land' },
  swordsman: { name: 'Swordsman', move: 1, attack: 4, defense: 2, cost: 35, glyph: '✕', tech: 'iron_working',     domain: 'land' },
  catapult:  { name: 'Catapult',  move: 1, attack: 6, defense: 1, cost: 40, glyph: '⬛', tech: 'mathematics',      domain: 'land' },
  galley:    { name: 'Galley',    move: 3, attack: 1, defense: 1, cost: 30, glyph: '⛵', tech: 'sailing',          domain: 'sea' },
};

// Per-unit terrain rules. Land units use the existing terrain.passable flag;
// sea units (galley) only travel on coast / ocean.
export function canEnterTerrain(kind: UnitKind, terrain: Terrain): boolean {
  const dom = UNIT[kind].domain;
  if (dom === 'sea') return terrain === 'coast' || terrain === 'ocean';
  return TERRAIN[terrain].passable;
}
