// Tile improvements built by Workers. Road is shipped now; farm/mine/
// irrigation slots are reserved for M6e (city tile yields) so the
// rendering and state code don't need a second refactor.

export const IMPROVEMENT_KINDS = ['road', 'farm', 'mine', 'irrigation'] as const;
export type ImprovementKind = (typeof IMPROVEMENT_KINDS)[number];

export type ImprovementSpec = {
  name: string;
  buildTurns: number;
};

export const IMPROVEMENT: Record<ImprovementKind, ImprovementSpec> = {
  road:       { name: 'Road',       buildTurns: 2 },
  farm:       { name: 'Farm',       buildTurns: 3 },
  mine:       { name: 'Mine',       buildTurns: 3 },
  irrigation: { name: 'Irrigation', buildTurns: 3 },
};

export type ImprovementMap = Record<string, ImprovementKind>;

export const tileKey = (x: number, y: number): string => `${x},${y}`;
