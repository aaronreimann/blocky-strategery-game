import { describe, expect, it } from 'vitest';

import { BUILDING, BUILDING_KINDS } from '@/src/data/buildings';
import { TECH } from '@/src/data/tech';

describe('buildings data validation', () => {
  it('every building kind in BUILDING_KINDS has a valid definition', () => {
    for (const kind of BUILDING_KINDS) {
      const spec = BUILDING[kind];
      expect(spec).toBeDefined();
      expect(spec.name).toBeTruthy();
      expect(spec.cost).toBeGreaterThan(0);
      expect(spec.description).toBeTruthy();

      if (spec.tech !== null) {
        expect(TECH[spec.tech]).toBeDefined();
      }
    }
  });

  it('includes core infrastructure buildings with proper tech progression', () => {
    // Basic buildings available without tech
    expect(BUILDING.granary.tech).toBeNull();
    expect(BUILDING.walls.tech).toBeNull();
    expect(BUILDING.temple.tech).toBeNull();

    // Advanced buildings require specific techs
    expect(BUILDING.library.tech).toBe('writing');
    expect(BUILDING.marketplace.tech).toBe('currency');
    expect(BUILDING.bank.tech).toBe('banking');
    expect(BUILDING.university.tech).toBe('monarchy');
    expect(BUILDING.aqueduct.tech).toBe('construction');
  });
});
