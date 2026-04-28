export const TECH_IDS = [
  'pottery',
  'bronze_working',
  'horseback_riding',
  'masonry',
  'alphabet',
  'sailing',
  'writing',
  'currency',
  'the_wheel',
  'iron_working',
  'mathematics',
  'literacy',
  'code_of_laws',
  'construction',
  'monarchy',
  'engineering',
  'astronomy',
  'banking',
  'theology',
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
  pottery:          { name: 'Pottery',          cost: 15, prereqs: [],                                    unlocks: 'Pyramids wonder' },
  bronze_working:   { name: 'Bronze Working',   cost: 15, prereqs: [],                                    unlocks: 'Spearman' },
  horseback_riding: { name: 'Horseback Riding', cost: 15, prereqs: [],                                    unlocks: 'Horseman' },
  masonry:          { name: 'Masonry',          cost: 20, prereqs: [],                                    unlocks: 'Great Wall wonder' },
  alphabet:         { name: 'Alphabet',         cost: 15, prereqs: [],                                    unlocks: 'Foundation for Code of Laws and Literacy' },
  sailing:          { name: 'Sailing',          cost: 20, prereqs: [],                                    unlocks: 'Galley' },
  writing:          { name: 'Writing',          cost: 25, prereqs: ['alphabet'],                          unlocks: 'Library' },
  currency:         { name: 'Currency',         cost: 25, prereqs: [],                                    unlocks: 'Marketplace' },
  the_wheel:        { name: 'The Wheel',        cost: 20, prereqs: ['horseback_riding'],                  unlocks: 'Foundation for Engineering' },
  iron_working:     { name: 'Iron Working',     cost: 40, prereqs: ['bronze_working'],                    unlocks: 'Swordsman' },
  mathematics:      { name: 'Mathematics',      cost: 40, prereqs: ['bronze_working', 'alphabet'],        unlocks: 'Catapult' },
  literacy:         { name: 'Literacy',         cost: 35, prereqs: ['alphabet', 'writing'],               unlocks: 'Great Library wonder' },
  code_of_laws:     { name: 'Code of Laws',     cost: 30, prereqs: ['alphabet'],                          unlocks: 'Courthouse' },
  construction:     { name: 'Construction',     cost: 35, prereqs: ['masonry', 'currency'],               unlocks: 'Aqueduct' },
  monarchy:         { name: 'Monarchy',         cost: 45, prereqs: ['code_of_laws'],                      unlocks: 'University' },
  engineering:      { name: 'Engineering',      cost: 45, prereqs: ['construction', 'the_wheel'],         unlocks: 'Hanging Gardens wonder' },
  astronomy:        { name: 'Astronomy',        cost: 50, prereqs: ['mathematics', 'sailing'],            unlocks: 'Observatory' },
  banking:          { name: 'Banking',          cost: 55, prereqs: ['currency', 'code_of_laws'],          unlocks: 'Bank' },
  theology:         { name: 'Theology',         cost: 50, prereqs: ['monarchy'],                          unlocks: 'Cathedral' },
  philosophy:       { name: 'Philosophy',       cost: 70, prereqs: ['literacy', 'mathematics', 'iron_working'], unlocks: 'WIN: Tech Victory' },
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
