export const PLAYER_PALETTE = [
  '#3aa675',
  '#c25450',
  '#e0b04a',
  '#5d8ec9',
  '#a06ec5',
  '#d77a3a',
  '#4fb6c4',
  '#b8b09a',
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
