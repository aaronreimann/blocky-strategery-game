import { describe, expect, it } from 'vitest';

import { TECH } from '@/src/data/tech';
import { TERRAIN, TERRAIN_TYPES } from '@/src/data/terrain';
import { canEnterTerrain, UNIT, UNIT_KINDS } from '@/src/data/units';

describe('units data and movement validation', () => {
  it('every unit kind in UNIT_KINDS has a valid definition', () => {
    for (const kind of UNIT_KINDS) {
      const spec = UNIT[kind];
      expect(spec).toBeDefined();
      expect(spec.name).toBeTruthy();
      expect(spec.cost).toBeGreaterThan(0);
      expect(spec.move).toBeGreaterThanOrEqual(1);
      expect(spec.defense).toBeGreaterThanOrEqual(1);
      expect(spec.attack).toBeGreaterThanOrEqual(0);
      expect(['land', 'sea']).toContain(spec.domain);

      if (spec.tech !== null) {
        expect(TECH[spec.tech]).toBeDefined();
      }
    }
  });

  it('canEnterTerrain enforces sea unit restrictions', () => {
    // Galley is domain: sea
    expect(canEnterTerrain('galley', 'ocean')).toBe(true);
    expect(canEnterTerrain('galley', 'coast')).toBe(true);
    expect(canEnterTerrain('galley', 'grassland')).toBe(false);
    expect(canEnterTerrain('galley', 'plains')).toBe(false);
    expect(canEnterTerrain('galley', 'hills')).toBe(false);
    expect(canEnterTerrain('galley', 'mountains')).toBe(false);
  });

  it('canEnterTerrain enforces land unit restrictions based on terrain passability', () => {
    for (const terrain of TERRAIN_TYPES) {
      const isPassable = TERRAIN[terrain].passable;
      expect(canEnterTerrain('footman', terrain)).toBe(isPassable);
      expect(canEnterTerrain('pioneer', terrain)).toBe(isPassable);
      expect(canEnterTerrain('horseman', terrain)).toBe(isPassable);
    }

    // Land units cannot cross water or mountains
    expect(canEnterTerrain('footman', 'ocean')).toBe(false);
    expect(canEnterTerrain('footman', 'coast')).toBe(false);
    expect(canEnterTerrain('footman', 'mountains')).toBe(false);

    // Land units can cross fields, hills, forests
    expect(canEnterTerrain('footman', 'grassland')).toBe(true);
    expect(canEnterTerrain('footman', 'hills')).toBe(true);
    expect(canEnterTerrain('footman', 'forest')).toBe(true);
  });
});
