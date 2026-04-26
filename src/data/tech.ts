export const TECH_IDS = [
  'bronze_working',
  'horseback_riding',
  'writing',
  'currency',
  'iron_working',
  'mathematics',
  'philosophy',
] as const;
export type TechId = (typeof TECH_IDS)[number];

export type TechSpec = {
  name: string;
  cost: number;
  prereqs: TechId[];
  unlocks: string;
};

export const TECH: Record<TechId, TechSpec> = {
  bronze_working:   { name: 'Bronze Working',   cost: 15, prereqs: [],                                                       unlocks: 'Spearman (defensive)' },
  horseback_riding: { name: 'Horseback Riding', cost: 15, prereqs: [],                                                       unlocks: 'Horseman (fast)' },
  writing:          { name: 'Writing',          cost: 25, prereqs: [],                                                       unlocks: 'Library (+100% science)' },
  currency:         { name: 'Currency',         cost: 25, prereqs: [],                                                       unlocks: 'Marketplace (+50% gold)' },
  iron_working:     { name: 'Iron Working',     cost: 40, prereqs: ['bronze_working'],                                       unlocks: 'Swordsman (heavy attacker)' },
  mathematics:      { name: 'Mathematics',      cost: 40, prereqs: ['bronze_working'],                                       unlocks: 'Catapult (siege)' },
  philosophy:       { name: 'Philosophy',       cost: 60, prereqs: ['iron_working', 'mathematics', 'writing'],               unlocks: 'WIN: Tech Victory' },
};

export function prereqsMet(researched: TechId[], tech: TechId): boolean {
  return TECH[tech].prereqs.every((p) => researched.includes(p));
}

export function pickCheapestAvailable(researched: TechId[]): TechId | null {
  const candidates = TECH_IDS.filter(
    (t) => !researched.includes(t) && prereqsMet(researched, t),
  );
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => TECH[a].cost - TECH[b].cost);
  return candidates[0];
}
