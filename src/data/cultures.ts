import type { TechId } from './tech';
import type { Terrain } from './terrain';
import type { UnitKind } from './units';

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
  // Short flavor blurb for the ScenarioScreen + Kingdom menu.
  blurb: string;
};

export const CULTURE_FLAVOR: Record<string, CultureFlavor> = {
  anglo_saxons: {
    color: '#c92a2a',  // Wessex crimson
    extraStartingUnit: 'footman',
    blurb: 'Fyrd levies — start with an extra Footman.',
  },
  normans: {
    color: '#e8590c',  // gold-on-red leopards → orange-red
    startingResearched: ['horseback_riding'],
    blurb: 'Mounted knights — begin with Horseback Riding researched.',
  },
  welsh: {
    color: '#d6336c',  // Y Ddraig Goch — red dragon, distinguished from anglo
    terrainCombatBonus: { terrain: 'hills', attack: 1, defense: 1 },
    blurb: 'Hill-fighters — +1 attack and defense on hill tiles.',
  },
  scots: {
    color: '#f59f00',  // Royal Banner gold
    terrainCombatBonus: { terrain: 'hills', defense: 2 },
    blurb: 'Schiltron — +2 defense on hill tiles.',
  },
  picts: {
    color: '#5c940d',  // dark olive — woad and forest
    terrainCombatBonus: { terrain: 'forest', defense: 2 },
    blurb: 'Woad warriors — +2 defense in forests.',
  },
  irish: {
    color: '#2f9e44',  // emerald
    extraStartingUnit: 'pioneer',
    blurb: 'Túatha — start with an extra Wayfarer for early expansion.',
  },
  cornish: {
    color: '#868e96',  // St Piran black-and-white → mid grey
    startingGold: 60,
    blurb: 'Tin trade — start with 60 gold in the treasury.',
  },
  cumbrians: {
    color: '#1971c2',  // Strathclyde silver-eagle on blue
    startingResearched: ['bronze_working'],
    blurb: 'Smiths of Strathclyde — start with Bronze Working researched.',
  },
  danes: {
    color: '#5f3dc4',  // raven-banner deep violet
    extraStartingUnit: 'footman',
    terrainCombatBonus: { terrain: 'coast', attack: 1 },
    blurb: 'Sea-raiders — extra Footman, +1 attack on coastal tiles.',
  },
  islesmen: {
    color: '#0c8599',  // sea teal
    startingResearched: ['sailing'],
    blurb: 'Galley lords — start with Sailing researched.',
  },
};

export function flavorFor(iso: string | undefined | null): CultureFlavor | null {
  if (!iso) return null;
  return CULTURE_FLAVOR[iso] ?? null;
}
