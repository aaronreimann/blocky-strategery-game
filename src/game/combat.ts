import { CULTURE_FLAVOR } from '@/src/data/cultures';
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
  const attackerRoll =
    unitAttack(attacker)
    + (attacker.veteran ? 1 : 0)
    + attackerCultureBonus.attack
    + d6();
  const defenderRoll =
    unitDefense(defender)
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
  };
}
