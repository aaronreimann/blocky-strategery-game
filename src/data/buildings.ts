export const BUILDING_KINDS = ['granary', 'walls'] as const;
export type BuildingKind = (typeof BUILDING_KINDS)[number];

export type BuildingSpec = {
  name: string;
  cost: number;
  description: string;
};

export const BUILDING: Record<BuildingKind, BuildingSpec> = {
  granary: {
    name: 'Granary',
    cost: 30,
    description: 'Half stored food kept after the city grows.',
  },
  walls: {
    name: 'Walls',
    cost: 40,
    description: '+1 defense for any unit defending this city.',
  },
};
