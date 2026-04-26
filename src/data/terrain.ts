export const TERRAIN_TYPES = [
  'ocean',
  'coast',
  'grassland',
  'plains',
  'forest',
  'hills',
  'mountains',
  'desert',
  'tundra',
] as const;

export type Terrain = (typeof TERRAIN_TYPES)[number];

export type TerrainSpec = {
  color: string;
  food: number;
  prod: number;
  trade: number;
  passable: boolean;
  defenseBonus: number;
};

export const TERRAIN: Record<Terrain, TerrainSpec> = {
  ocean:     { color: '#1d3a66', food: 1, prod: 0, trade: 2, passable: false, defenseBonus: 0 },
  coast:     { color: '#3567a3', food: 1, prod: 0, trade: 2, passable: false, defenseBonus: 0 },
  grassland: { color: '#5fa84a', food: 2, prod: 0, trade: 0, passable: true,  defenseBonus: 0 },
  plains:    { color: '#a3b34a', food: 1, prod: 1, trade: 0, passable: true,  defenseBonus: 0 },
  forest:    { color: '#2f6b3a', food: 1, prod: 2, trade: 0, passable: true,  defenseBonus: 0.5 },
  hills:     { color: '#8a7a4f', food: 1, prod: 1, trade: 0, passable: true,  defenseBonus: 1.0 },
  mountains: { color: '#5a5a5a', food: 0, prod: 0, trade: 0, passable: false, defenseBonus: 1.5 },
  desert:    { color: '#d4b76a', food: 0, prod: 1, trade: 0, passable: true,  defenseBonus: 0 },
  tundra:    { color: '#a8b5b8', food: 1, prod: 0, trade: 0, passable: true,  defenseBonus: 0 },
};
