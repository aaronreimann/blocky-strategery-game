import { TERRAIN } from '@/src/data/terrain';
import { UNIT, type UnitKind } from '@/src/data/units';

import type { Tile } from './map';
import type { Unit } from './types';

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

export function resolveCombat(
  attacker: Unit,
  defender: Unit,
  defenderTile: Tile,
  defenderWallsBonus = 0,
): Battle {
  const attackerRoll =
    unitAttack(attacker) + (attacker.veteran ? 1 : 0) + d6();
  const defenderRoll =
    unitDefense(defender)
    + (defender.veteran ? 1 : 0)
    + TERRAIN[defenderTile.terrain].defenseBonus
    + defenderWallsBonus
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
