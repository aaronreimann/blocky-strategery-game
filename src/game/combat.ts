import { CULTURE_FLAVOR, uniqueUnitFor } from '@/src/data/cultures';
import { TERRAIN } from '@/src/data/terrain';
import { UNIT, type UnitKind } from '@/src/data/units';

import type { Tile } from './map';
import type { Player, Unit } from './types';

export type Battle = {
  attackerKind: UnitKind;
  defenderKind: UnitKind;
  attackerStackSize: number;
  defenderStackSize: number;
  attackerOwnerIdx: number;
  defenderOwnerIdx: number;
  attackerWon: boolean;
  // With the strength-ratio formula these are no longer dice rolls but
  // the final strength values (base stat + culture/veteran/terrain/walls
  // /unique-unit bonuses). The Hud shows them as the matchup numbers,
  // so a Footman of strength 2 vs a Spearman of strength 4 reads as
  // "you're the underdog" at a glance.
  attackerRoll: number;
  defenderRoll: number;
  // Tile coordinates of the participants — used for combat-flash markers
  // on the mini-map and main map after a death.
  attackerX: number;
  attackerY: number;
  defenderX: number;
  defenderY: number;
};

export function unitAttack(unit: Unit): number {
  return unit.stack.reduce((sum, k) => sum + UNIT[k].attack, 0);
}

export function unitDefense(unit: Unit): number {
  return unit.stack.reduce((sum, k) => sum + UNIT[k].defense, 0);
}

// Win probability for an attacker of given strength against a defender
// of given strength, using the squared-ratio formula
//   P(attacker wins) = atk² / (atk² + def²)
// Squaring widens the gap between similar values, so a Footman (atk 1)
// vs a Serf (def 1) is 50/50 but a Footman (atk 2) vs a Serf (def 0.5)
// is ~94% — small absolute differences in stats now actually decide
// fights instead of getting drowned out by d6 noise.
//
// Defender strength is floored at 0.5 to avoid divide-by-zero when the
// defender has 0 effective defense, and to leave non-zero attackers a
// non-zero chance of failure.
export function attackOdds(
  attMod: number,
  defMod: number,
): { win: number; lose: number } {
  const a = Math.max(0, attMod);
  const d = Math.max(0.5, defMod);
  const aa = a * a;
  const dd = d * d;
  const win = aa / (aa + dd);
  return { win, lose: 1 - win };
}

// Helpers exposed so the UI can preview a fight before the player
// commits to attacking.
export function attackerCombatMod(
  attacker: Unit,
  defenderTile: Tile,
  attackerPlayer: Player | undefined,
): number {
  const unique = uniqueUnitFor(attackerPlayer?.iso, attacker.kind);
  return (
    unitAttack(attacker)
    + (unique?.attackBonus ?? 0)
    + (attacker.veteran ? 1 : 0)
    + cultureTerrainBonus(attackerPlayer, defenderTile.terrain).attack
  );
}

export function defenderCombatMod(
  defender: Unit,
  defenderTile: Tile,
  defenderWallsBonus: number,
  defenderPlayer: Player | undefined,
): number {
  const unique = uniqueUnitFor(defenderPlayer?.iso, defender.kind);
  return (
    unitDefense(defender)
    + (unique?.defenseBonus ?? 0)
    + (defender.veteran ? 1 : 0)
    + TERRAIN[defenderTile.terrain].defenseBonus
    + defenderWallsBonus
    + cultureTerrainBonus(defenderPlayer, defenderTile.terrain).defense
  );
}

// Per-culture terrain combat bonus, looked up by player.iso. Only applies
// when fighting on the named terrain — e.g. Welsh +1 attack/defense in hills.
function cultureTerrainBonus(
  player: Player | undefined,
  terrain: Tile['terrain'],
): { attack: number; defense: number } {
  if (!player) return { attack: 0, defense: 0 };
  const flavor = CULTURE_FLAVOR[player.iso];
  if (!flavor?.terrainCombatBonus) return { attack: 0, defense: 0 };
  if (flavor.terrainCombatBonus.terrain !== terrain) {
    return { attack: 0, defense: 0 };
  }
  return {
    attack: flavor.terrainCombatBonus.attack ?? 0,
    defense: flavor.terrainCombatBonus.defense ?? 0,
  };
}

export function resolveCombat(
  attacker: Unit,
  defender: Unit,
  defenderTile: Tile,
  defenderWallsBonus = 0,
  players: Player[] = [],
): Battle {
  const attackerPlayer = players[attacker.ownerIdx];
  const defenderPlayer = players[defender.ownerIdx];
  const attackerStrength = attackerCombatMod(
    attacker,
    defenderTile,
    attackerPlayer,
  );
  const defenderStrength = defenderCombatMod(
    defender,
    defenderTile,
    defenderWallsBonus,
    defenderPlayer,
  );
  const odds = attackOdds(attackerStrength, defenderStrength);
  const attackerWon = Math.random() < odds.win;
  return {
    attackerKind: attacker.kind,
    defenderKind: defender.kind,
    attackerStackSize: attacker.stack.length,
    defenderStackSize: defender.stack.length,
    attackerOwnerIdx: attacker.ownerIdx,
    defenderOwnerIdx: defender.ownerIdx,
    attackerWon,
    attackerRoll: attackerStrength,
    defenderRoll: defenderStrength,
    attackerX: attacker.x,
    attackerY: attacker.y,
    defenderX: defender.x,
    defenderY: defender.y,
  };
}
