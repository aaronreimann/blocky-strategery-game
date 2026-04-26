// Bright, saturated colors that contrast against green/brown/blue terrain.
// No greens, no browns, no muddy blues.
export const PLAYER_PALETTE = [
  '#ef4444', // red       — human player by default
  '#f97316', // orange
  '#facc15', // yellow
  '#ec4899', // magenta
  '#a855f7', // purple
  '#6366f1', // indigo
  '#06b6d4', // cyan
  '#f8fafc', // white
] as const;

export type PlayerColor = (typeof PLAYER_PALETTE)[number];

export const THEME = {
  bg: '#0a1729',
  bgElevated: '#152136',
  ink: '#f5f1e8',
  inkMuted: '#8a9bb8',
  border: '#2a3a55',
  good: '#3aa675',
  bad: '#c25450',
  warn: '#e0b04a',
} as const;
