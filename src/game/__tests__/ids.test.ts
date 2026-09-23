import { describe, expect, it } from 'vitest';

import { nextCityId, nextUnitId, parseIdNum, syncIdCounters } from '@/src/game/ids';

describe('ids generation and synchronization', () => {
  it('generates sequential unit IDs with u prefix', () => {
    const id1 = nextUnitId();
    const id2 = nextUnitId();
    expect(id1.startsWith('u')).toBe(true);
    expect(id2.startsWith('u')).toBe(true);
    const n1 = parseIdNum(id1);
    const n2 = parseIdNum(id2);
    expect(n2).toBe(n1 + 1);
  });

  it('generates sequential city IDs with c prefix', () => {
    const id1 = nextCityId();
    const id2 = nextCityId();
    expect(id1.startsWith('c')).toBe(true);
    expect(id2.startsWith('c')).toBe(true);
    const n1 = parseIdNum(id1);
    const n2 = parseIdNum(id2);
    expect(n2).toBe(n1 + 1);
  });

  it('parseIdNum extracts numeric portion from ID strings', () => {
    expect(parseIdNum('u1')).toBe(1);
    expect(parseIdNum('u42')).toBe(42);
    expect(parseIdNum('c105')).toBe(105);
    expect(parseIdNum('')).toBe(0);
    expect(parseIdNum('invalid')).toBe(0);
  });

  it('syncIdCounters bumps counters so new IDs do not collide with loaded saves', () => {
    syncIdCounters(500, 300);

    const unitId = nextUnitId();
    const cityId = nextCityId();

    expect(parseIdNum(unitId)).toBeGreaterThanOrEqual(501);
    expect(parseIdNum(cityId)).toBeGreaterThanOrEqual(301);

    // Syncing with smaller values does not decrement the counters
    syncIdCounters(10, 10);
    const nextU = nextUnitId();
    expect(parseIdNum(nextU)).toBeGreaterThan(parseIdNum(unitId));
  });
});
