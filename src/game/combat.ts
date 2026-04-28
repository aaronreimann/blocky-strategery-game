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
  attackerRoll: number;
  defenderRoll: number;
  // Tile coordinates of the participants — used for combat-flash markers
  // on the mini-map and main map after a death.
  attackerX: number;
  attackerY: number;
  defenderX: number;
  defenderY: number;
};

function d6(): number {
  return 1 + Math.floor(Math.random() * 6);
}

export function unitAttack(unit: Unit): number {
  return unit.stack.reduce((sum, k) => sum + UNIT[k].attack, 0);
}

export function unitDefense(unit: Unit): number {
  return unit.stack.reduce((sum, k) => sum + UNIT[k].defense, 0);
}

// Compute exact win probability for an attacker rolling 1d6 + attMod
// against a defender rolling 1d6 + defMod, where ties go to the defender
// (matches resolveCombat()'s `attackerRoll > defenderRoll`). 36 outcomes,
// closed-form.
export function attackOdds(
  attMod: number,
  defMod: number,
): { win: number; lose: number } {
  let wins = 0;
  for (let a = 1; a <= 6; a++) {
    for (let d = 1; d <= 6; d++) {
      if (attMod + a > defMod + d) wins++;
    }
  }
  return { win: wins / 36, lose: 1 - wins / 36 };
}

// Same as resolveCombat's modifier math but exposed as helpers so the UI
// can preview combat without rolling dice.
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
  const attackerCultureBonus = cultureTerrainBonus(attackerPlayer, defenderTile.terrain);
  const defenderCultureBonus = cultureTerrainBonus(defenderPlayer, defenderTile.terrain);
  const attackerUnique = uniqueUnitFor(attackerPlayer?.iso, attacker.kind);
  const defenderUnique = uniqueUnitFor(defenderPlayer?.iso, defender.kind);
  const attackerRoll =
    unitAttack(attacker)
    + (attackerUnique?.attackBonus ?? 0)
    + (attacker.veteran ? 1 : 0)
    + attackerCultureBonus.attack
    + d6();
  const defenderRoll =
    unitDefense(defender)
    + (defenderUnique?.defenseBonus ?? 0)
    + (defender.veteran ? 1 : 0)
    + TERRAIN[defenderTile.terrain].defenseBonus
    + defenderWallsBonus
    + defenderCultureBonus.defense
    + d6();
  return {
    attackerKind: attacker.kind,
    defenderKind: defender.kind,
    attackerStackSize: attacker.stack.length,
    defenderStackSize: defender.stack.length,
    attackerOwnerIdx: attacker.ownerIdx,
    defenderOwnerIdx: defender.ownerIdx,
    attackerWon: attackerRoll > defenderRoll,
    attackerRoll,
    defenderRoll,
    attackerX: attacker.x,
    attackerY: attacker.y,
    defenderX: defender.x,
    defenderY: defender.y,
  };
}
