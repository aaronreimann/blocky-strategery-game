import { describe, expect, it } from 'vitest';

import { buildFallbackLeaders, COUNTRIES, cultureIconKey, flagEmoji } from '@/src/data/countries';
import { CULTURE_FLAVOR, effectiveUnitName, flavorFor, uniqueUnitFor } from '@/src/data/cultures';
import { UNIT } from '@/src/data/units';

describe('cultures and nations data', () => {
  it('every country has a matching entry in CULTURE_FLAVOR', () => {
    expect(COUNTRIES.length).toBe(10);
    expect(Object.keys(CULTURE_FLAVOR).length).toBe(10);
    for (const country of COUNTRIES) {
      const flavor = flavorFor(country.iso);
      expect(flavor).toBeDefined();
      expect(flavor?.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(flavor?.blurb).toBeTruthy();
    }
  });

  it('flavorFor returns null for undefined or unknown keys', () => {
    expect(flavorFor(undefined)).toBeNull();
    expect(flavorFor(null)).toBeNull();
    expect(flavorFor('atlantis')).toBeNull();
  });

  it('uniqueUnitFor correctly matches culture replacements and ignores non-replaced units', () => {
    // Welsh unique unit is Longbowman (replaces footman)
    const welshFootman = uniqueUnitFor('welsh', 'footman');
    expect(welshFootman).not.toBeNull();
    expect(welshFootman?.name).toBe('Longbowman');
    expect(welshFootman?.attackBonus).toBe(1);

    // Welsh does not replace spearmen
    expect(uniqueUnitFor('welsh', 'spearman')).toBeNull();

    // Danes unique unit is Berserker (replaces footman)
    const daneFootman = uniqueUnitFor('danes', 'footman');
    expect(daneFootman?.name).toBe('Berserker');
    expect(daneFootman?.attackBonus).toBe(2);

    // Islesmen unique unit is Birlinn (replaces galley)
    const islesGalley = uniqueUnitFor('islesmen', 'galley');
    expect(islesGalley?.name).toBe('Birlinn');
    expect(islesGalley?.attackBonus).toBe(1);
    expect(islesGalley?.moveBonus).toBe(1);
  });

  it('effectiveUnitName returns unique name when available and default name otherwise', () => {
    expect(effectiveUnitName('welsh', 'footman')).toBe('Longbowman');
    expect(effectiveUnitName('welsh', 'spearman')).toBe(UNIT.spearman.name);
    expect(effectiveUnitName('danes', 'footman')).toBe('Berserker');
    expect(effectiveUnitName(null, 'footman')).toBe(UNIT.footman.name);
  });

  it('buildFallbackLeaders generates keys for each country qid', () => {
    const fallbacks = buildFallbackLeaders();
    for (const country of COUNTRIES) {
      expect(country.qid in fallbacks).toBe(true);
    }
  });

  it('flagEmoji returns emoji only for 2-letter uppercase ISO codes and empty string otherwise', () => {
    expect(flagEmoji('GB')).toBeTruthy();
    expect(flagEmoji('FR')).toBeTruthy();
    expect(flagEmoji('welsh')).toBe('');
    expect(flagEmoji('')).toBe('');
    expect(flagEmoji(null)).toBe('');
  });

  it('cultureIconKey returns iso or null', () => {
    expect(cultureIconKey('welsh')).toBe('welsh');
    expect(cultureIconKey(null)).toBeNull();
  });
});
