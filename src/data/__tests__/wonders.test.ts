import { describe, expect, it } from 'vitest';

import { TECH } from '@/src/data/tech';
import { WONDER, WONDER_KINDS } from '@/src/data/wonders';

describe('wonders data validation', () => {
  it('every wonder kind in WONDER_KINDS has a valid definition', () => {
    for (const kind of WONDER_KINDS) {
      const spec = WONDER[kind];
      expect(spec).toBeDefined();
      expect(spec.name).toBeTruthy();
      expect(spec.cost).toBe(200);
      expect(spec.description).toBeTruthy();

      if (spec.tech !== null) {
        expect(TECH[spec.tech]).toBeDefined();
      }
    }
  });

  it('verifies historical wonder associations', () => {
    expect(WONDER.pyramids.tech).toBe('pottery');
    expect(WONDER.great_library.tech).toBe('literacy');
    expect(WONDER.great_wall.tech).toBe('masonry');
    expect(WONDER.hanging_gardens.tech).toBe('engineering');
    expect(WONDER.lighthouse.tech).toBe('sailing');
    expect(WONDER.colossus.tech).toBe('currency');
  });
});
