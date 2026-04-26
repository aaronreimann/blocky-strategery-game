import { TERRAIN } from '@/src/data/terrain';
import { UNIT, type UnitKind } from '@/src/data/units';

import type { Tile } from './map';

export type Battle = {
  attackerKind: UnitKind;
  defenderKind: UnitKind;
  attackerWon: boolean;
  attackerRoll: number;
  defenderRoll: number;
};

function d6(): number {
  return 1 + Math.floor(Math.random() * 6);
}

export function resolveCombat(
  attackerKind: UnitKind,
  defenderKind: UnitKind,
  defenderTile: Tile,
  defenderWallsBonus = 0,
): Battle {
  const attackerRoll = UNIT[attackerKind].attack + d6();
  const defenderRoll =
    UNIT[defenderKind].defense
    + TERRAIN[defenderTile.terrain].defenseBonus
    + defenderWallsBonus
    + d6();
  return {
    attackerKind,
    defenderKind,
    attackerWon: attackerRoll > defenderRoll,
    attackerRoll,
    defenderRoll,
  };
}
