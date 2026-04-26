import type { Terrain } from './terrain';

export const RESOURCE_TYPES = [
  'wheat',
  'cattle',
  'fish',
  'iron',
  'horses',
  'gold',
  'wine',
  'spices',
] as const;

export type Resource = (typeof RESOURCE_TYPES)[number];

export type ResourceSpec = {
  color: string;
  food: number;
  prod: number;
  trade: number;
  on: Terrain[];
};

export const RESOURCE: Record<Resource, ResourceSpec> = {
  wheat:  { color: '#f1d96a', food: 2, prod: 0, trade: 0, on: ['grassland', 'plains'] },
  cattle: { color: '#cf8f5a', food: 2, prod: 0, trade: 0, on: ['grassland', 'plains'] },
  fish:   { color: '#7fd1e0', food: 2, prod: 0, trade: 1, on: ['coast'] },
  iron:   { color: '#b8b8c0', food: 0, prod: 2, trade: 0, on: ['hills', 'mountains'] },
  horses: { color: '#d8a36a', food: 0, prod: 1, trade: 1, on: ['plains', 'grassland'] },
  gold:   { color: '#ffd84a', food: 0, prod: 0, trade: 4, on: ['hills', 'mountains', 'desert'] },
  wine:   { color: '#a04a8c', food: 0, prod: 0, trade: 2, on: ['hills', 'plains'] },
  spices: { color: '#e0744a', food: 0, prod: 0, trade: 2, on: ['forest', 'plains'] },
};
