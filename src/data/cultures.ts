import type { TechId } from './tech';
import type { Terrain } from './terrain';
import { UNIT, type UnitKind } from './units';

// Small starting twists so picking a culture matters. Conservative on purpose
// — each culture gets exactly one of these knobs (or two for tightly-themed
// pairs) to keep balancing simple.
export type CultureFlavor = {
  // Heraldic player color — used for unit/city medallions, territory
  // borders, and HUD. Each tribe gets a distinct hue rooted in its real
  // device (Welsh red dragon → red, Scots royal banner → gold, etc).
  color: string;
  // Bonus gold the player starts with (above the default 0).
  startingGold?: number;
  // Techs the player begins the game already having researched.
  startingResearched?: TechId[];
  // Extra unit spawned at game start (in addition to the default Wayfarer +
  // Footman + Serf trio). Spawned on or near the starting tile.
  extraStartingUnit?: UnitKind;
  // Combat modifier when this culture's unit is the attacker or defender on
  // the named terrain. Stacks with terrain.defenseBonus already in TERRAIN.
  terrainCombatBonus?: {
    terrain: Terrain;
    attack?: number;
    defense?: number;
  };
  // The culture's signature unit. When the player builds the `replaces`
  // unit kind, the unit gets the unique's display name and stat bonuses.
  // Map sprite stays the same as the base unit (no new art needed).
  uniqueUnit?: {
    replaces: UnitKind;
    name: string;
    attackBonus?: number;
    defenseBonus?: number;
    moveBonus?: number;
  };
  // Short flavor blurb for the ScenarioScreen + Kingdom menu.
  blurb: string;
};

export const CULTURE_FLAVOR: Record<string, CultureFlavor> = {
  anglo_saxons: {
    color: '#c92a2a',  // Wessex crimson
    extraStartingUnit: 'footman',
    uniqueUnit: { replaces: 'footman', name: 'Huscarl', defenseBonus: 1 },
    blurb: 'Fyrd levies — extra Footman; Footmen are Huscarls (+1 def).',
  },
  normans: {
    color: '#e8590c',  // gold-on-red leopards → orange-red
    startingResearched: ['horseback_riding'],
    uniqueUnit: { replaces: 'horseman', name: 'Knight', attackBonus: 1 },
    blurb: 'Mounted knights — start with Horseback Riding; Horsemen are Knights (+1 atk).',
  },
  welsh: {
    color: '#d6336c',  // Y Ddraig Goch — red dragon, distinguished from anglo
    terrainCombatBonus: { terrain: 'hills', attack: 1, defense: 1 },
    uniqueUnit: { replaces: 'footman', name: 'Longbowman', attackBonus: 1 },
    blurb: 'Hill-fighters — +1 atk/def on hills; Footmen are Longbowmen (+1 atk).',
  },
  scots: {
    color: '#f59f00',  // Royal Banner gold
    terrainCombatBonus: { terrain: 'hills', defense: 2 },
    uniqueUnit: { replaces: 'spearman', name: 'Highlander', attackBonus: 1 },
    blurb: 'Schiltron — +2 def on hills; Spearmen are Highlanders (+1 atk).',
  },
  picts: {
    color: '#5c940d',  // dark olive — woad and forest
    terrainCombatBonus: { terrain: 'forest', defense: 2 },
    uniqueUnit: { replaces: 'footman', name: 'Painted Warrior', defenseBonus: 1 },
    blurb: 'Woad warriors — +2 def in forests; Footmen are Painted Warriors (+1 def).',
  },
  irish: {
    color: '#2f9e44',  // emerald
    extraStartingUnit: 'pioneer',
    uniqueUnit: { replaces: 'swordsman', name: 'Gallowglass', defenseBonus: 1 },
    blurb: 'Túatha — extra Wayfarer; Swordsmen are Gallowglasses (+1 def).',
  },
  cornish: {
    color: '#868e96',  // St Piran black-and-white → mid grey
    startingGold: 60,
    uniqueUnit: { replaces: 'footman', name: 'Marauder', moveBonus: 1 },
    blurb: 'Tin trade — 60 starting gold; Footmen are Marauders (+1 move).',
  },
  cumbrians: {
    color: '#1971c2',  // Strathclyde silver-eagle on blue
    startingResearched: ['bronze_working'],
    uniqueUnit: { replaces: 'spearman', name: 'Hammerman', attackBonus: 1 },
    blurb: 'Smiths of Strathclyde — start with Bronze Working; Spearmen are Hammermen (+1 atk).',
  },
  danes: {
    color: '#5f3dc4',  // raven-banner deep violet
    extraStartingUnit: 'footman',
    terrainCombatBonus: { terrain: 'coast', attack: 1 },
    uniqueUnit: { replaces: 'footman', name: 'Berserker', attackBonus: 2 },
    blurb: 'Sea-raiders — extra Footman, +1 atk on coast; Footmen are Berserkers (+2 atk).',
  },
  islesmen: {
    color: '#0c8599',  // sea teal
    startingResearched: ['sailing'],
    uniqueUnit: { replaces: 'galley', name: 'Birlinn', attackBonus: 1, moveBonus: 1 },
    blurb: 'Galley lords — start with Sailing; Galleys are Birlinns (+1 atk, +1 move).',
  },
};

// Look up the player's unique replacement for a given unit kind, if any.
export function uniqueUnitFor(
  iso: string | undefined | null,
  kind: UnitKind,
): NonNullable<CultureFlavor['uniqueUnit']> | null {
  const flavor = flavorFor(iso);
  if (!flavor?.uniqueUnit) return null;
  if (flavor.uniqueUnit.replaces !== kind) return null;
  return flavor.uniqueUnit;
}

// The display name for a unit owned by `iso` of kind `kind`. Falls back to
// the base unit name when there's no unique.
export function effectiveUnitName(
  iso: string | undefined | null,
  kind: UnitKind,
): string {
  const unique = uniqueUnitFor(iso, kind);
  return unique?.name ?? UNIT[kind].name;
}

export function flavorFor(iso: string | undefined | null): CultureFlavor | null {
  if (!iso) return null;
  return CULTURE_FLAVOR[iso] ?? null;
}
