import type { TechId } from './tech';

export const BUILDING_KINDS = ['granary', 'walls', 'library', 'marketplace', 'temple', 'courthouse', 'barracks'] as const;
export type BuildingKind = (typeof BUILDING_KINDS)[number];

export type BuildingSpec = {
  name: string;
  cost: number;
  description: string;
  tech: TechId | null;
};

export const BUILDING: Record<BuildingKind, BuildingSpec> = {
  granary: {
    name: 'Granary',
    cost: 30,
    description: 'Half stored food kept after the city grows.',
    tech: null,
  },
  walls: {
    name: 'Walls',
    cost: 40,
    description: '+1 defense for any unit defending this city.',
    tech: null,
  },
  library: {
    name: 'Library',
    cost: 50,
    description: '+100% science from this city.',
    tech: 'writing',
  },
  marketplace: {
    name: 'Marketplace',
    cost: 50,
    description: '+50% gold from this city.',
    tech: 'currency',
  },
  temple: {
    name: 'Temple',
    cost: 30,
    description: '+1 happy citizen — keeps a city of 5 from disorder.',
    tech: null,
  },
  courthouse: {
    name: 'Courthouse',
    cost: 50,
    description: '+1 happy citizen — works on top of Temple for big cities.',
    tech: null,
  },
  barracks: {
    name: 'Barracks',
    cost: 30,
    description: 'Units built here are veterans (+1 attack).',
    tech: 'bronze_working',
  },
};
