export const UNIT_KINDS = ['pioneer', 'laborer', 'footman'] as const;

export type UnitKind = (typeof UNIT_KINDS)[number];

export type UnitSpec = {
  name: string;
  move: number;
  attack: number;
  defense: number;
  cost: number;
  // Tiny single-glyph hint shown on the unit marker.
  glyph: string;
};

export const UNIT: Record<UnitKind, UnitSpec> = {
  pioneer: { name: 'Pioneer', move: 1, attack: 0, defense: 1, cost: 30, glyph: '◆' },
  laborer: { name: 'Laborer', move: 1, attack: 0, defense: 1, cost: 20, glyph: '●' },
  footman: { name: 'Footman', move: 1, attack: 1, defense: 1, cost: 10, glyph: '■' },
};
