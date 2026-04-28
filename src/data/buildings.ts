import type { TechId } from './tech';

export const BUILDING_KINDS = [
  'granary',
  'walls',
  'barracks',
  'library',
  'marketplace',
  'temple',
  'courthouse',
  'aqueduct',
  'observatory',
  'university',
  'bank',
  'cathedral',
] as const;
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
    tech: 'code_of_laws',
  },
  barracks: {
    name: 'Barracks',
    cost: 30,
    description: 'Units built here are veterans (+1 attack).',
    tech: 'bronze_working',
  },
  aqueduct: {
    name: 'Aqueduct',
    cost: 60,
    description: 'Required for the city to grow past size 6.',
    tech: 'construction',
  },
  observatory: {
    name: 'Observatory',
    cost: 60,
    description: '+50% science. Stacks with Library.',
    tech: 'astronomy',
  },
  university: {
    name: 'University',
    cost: 80,
    description: '+50% science. Stacks with Library and Observatory.',
    tech: 'monarchy',
  },
  bank: {
    name: 'Bank',
    cost: 60,
    description: '+50% gold. Stacks with Marketplace.',
    tech: 'banking',
  },
  cathedral: {
    name: 'Cathedral',
    cost: 80,
    description: '+2 happy citizens.',
    tech: 'theology',
  },
};
