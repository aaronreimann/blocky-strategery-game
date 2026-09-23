import { describe, expect, it } from 'vitest';
import {
  pickCheapestAvailable,
  prereqsMet,
  TECH,
  TECH_IDS,
} from '@/src/data/tech';

describe('tech tree data and algorithms', () => {
  it('has valid prereqs for all defined technologies', () => {
    for (const techId of TECH_IDS) {
      const spec = TECH[techId];
      expect(spec).toBeDefined();
      expect(spec.cost).toBeGreaterThan(0);
      for (const prereq of spec.prereqs) {
        expect(TECH_IDS).toContain(prereq);
      }
    }
  });

  it('correctly determines if prereqs are met', () => {
    // Pottery has no prereqs
    expect(prereqsMet([], 'pottery')).toBe(true);

    // Writing requires alphabet
    expect(prereqsMet([], 'writing')).toBe(false);
    expect(prereqsMet(['alphabet'], 'writing')).toBe(true);

    // Engineering requires construction and the_wheel
    expect(prereqsMet(['construction'], 'engineering')).toBe(false);
    expect(prereqsMet(['the_wheel'], 'engineering')).toBe(false);
    expect(prereqsMet(['construction', 'the_wheel'], 'engineering')).toBe(true);
  });

  it('picks the cheapest available tech based on researched techs', () => {
    // At start, cheapest tech with 0 prereqs is cost 15 (e.g. pottery, bronze_working, etc.)
    const first = pickCheapestAvailable([]);
    expect(first).toBeDefined();
    expect(TECH[first!].cost).toBe(15);
    expect(TECH[first!].prereqs.length).toBe(0);

    // When all techs are researched, returns null
    const all = [...TECH_IDS];
    expect(pickCheapestAvailable(all)).toBeNull();
  });
});
