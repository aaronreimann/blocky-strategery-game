import type { TechId } from './tech';

export const WONDER_KINDS = [
  'pyramids',
  'great_library',
  'great_wall',
  'hanging_gardens',
  'lighthouse',
  'colossus',
] as const;
export type WonderKind = (typeof WONDER_KINDS)[number];

export type WonderSpec = {
  name: string;
  cost: number;
  description: string;
  tech: TechId | null;
};

export const WONDER: Record<WonderKind, WonderSpec> = {
  pyramids: {
    name: 'Pyramids',
    cost: 200,
    description: '+1 food in each of your cities.',
    tech: null,
  },
  great_library: {
    name: 'Great Library',
    cost: 200,
    description: '+50% science across all of your cities.',
    tech: 'writing',
  },
  great_wall: {
    name: 'Great Wall',
    cost: 200,
    description: '+1 defense for units in any of your cities.',
    tech: 'bronze_working',
  },
  hanging_gardens: {
    name: 'Hanging Gardens',
    cost: 200,
    description: '+1 happy citizen in each of your cities.',
    tech: null,
  },
  lighthouse: {
    name: 'Lighthouse',
    cost: 200,
    description: 'All your sea units gain +1 movement.',
    tech: 'sailing',
  },
  colossus: {
    name: 'Colossus',
    cost: 200,
    description: '+50% gold in the city that built it.',
    tech: 'currency',
  },
};
