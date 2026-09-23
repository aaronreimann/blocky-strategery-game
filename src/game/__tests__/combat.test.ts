import { describe, expect, it } from 'vitest';
import {
  attackerCombatMod,
  attackOdds,
  defenderCombatMod,
  resolveCombat,
  unitAttack,
  unitDefense,
} from '@/src/game/combat';
import type { Tile } from '@/src/game/map';
import type { Player, Unit } from '@/src/game/types';

describe('combat calculations', () => {
  const dummyTile: Tile = { x: 5, y: 5, terrain: 'plains', resource: null };
  const hillsTile: Tile = { x: 5, y: 5, terrain: 'hills', resource: null };

  const createUnit = (
    kind: Unit['kind'],
    ownerIdx: number,
    opts: Partial<Unit> = {},
  ): Unit => ({
    id: 'u1',
    kind,
    stack: [kind],
    ownerIdx,
    x: 5,
    y: 5,
    movesLeft: 1,
    workingOn: null,
    workTurnsLeft: 0,
    destination: null,
    autoMode: false,
    exploreMode: false,
    veteran: false,
    ...opts,
  });

  const createPlayer = (idx: number, iso: string): Player => ({
    idx,
    name: 'Player',
    iso,
    leader: 'Leader',
    color: '#ffffff',
    isHuman: idx === 0,
    researched: [],
    researching: null,
    science: 0,
    gold: 0,
  });

  it('calculates single and stacked unit attack and defense', () => {
    const footman = createUnit('footman', 0); // atk 1, def 1
    expect(unitAttack(footman)).toBe(1);
    expect(unitDefense(footman)).toBe(1);

    const army = createUnit('footman', 0, {
      stack: ['footman', 'swordsman', 'spearman'],
    }); // footman(1,1), swordsman(4,2), spearman(1,3)
    expect(unitAttack(army)).toBe(1 + 4 + 1); // 6
    expect(unitDefense(army)).toBe(1 + 2 + 3); // 6
  });

  it('calculates attack odds using squared-ratio formula', () => {
    // Equal strength -> 50%
    const equalOdds = attackOdds(2, 2);
    expect(equalOdds.win).toBeCloseTo(0.5, 4);
    expect(equalOdds.lose).toBeCloseTo(0.5, 4);

    // 2 vs 1 -> 4 / (4 + 1) = 80% win
    const favorAttacker = attackOdds(2, 1);
    expect(favorAttacker.win).toBeCloseTo(0.8, 4);

    // 0 attack -> 0% win
    const zeroAttack = attackOdds(0, 2);
    expect(zeroAttack.win).toBe(0);
    expect(zeroAttack.lose).toBe(1);

    // 0 defense is floored at 0.5 to prevent divide by zero
    const zeroDefense = attackOdds(2, 0);
    expect(zeroDefense.win).toBeCloseTo(4 / (4 + 0.25), 4);
  });

  it('incorporates veteran status, walls, and terrain into combat modifiers', () => {
    const regularAttacker = createUnit('footman', 0);
    const veteranAttacker = createUnit('footman', 0, { veteran: true });
    const player = createPlayer(0, 'EN');

    expect(attackerCombatMod(regularAttacker, dummyTile, player)).toBe(1);
    expect(attackerCombatMod(veteranAttacker, dummyTile, player)).toBe(2); // +1 veteran

    const defender = createUnit('spearman', 1); // base defense 3
    const defenderPlayer = createPlayer(1, 'FR');

    // Hills give +1 defense bonus
    const openDefense = defenderCombatMod(defender, dummyTile, 0, defenderPlayer);
    const hillsDefense = defenderCombatMod(defender, hillsTile, 0, defenderPlayer);
    expect(hillsDefense).toBe(openDefense + 1);

    // Walls give extra defense bonus
    const wallsDefense = defenderCombatMod(defender, dummyTile, 2, defenderPlayer);
    expect(wallsDefense).toBe(openDefense + 2);
  });

  it('applies culture unique unit and terrain bonuses', () => {
    // Welsh get +1 attack/defense in hills
    const welshPlayer = createPlayer(0, 'welsh');
    const unit = createUnit('footman', 0);

    const onPlains = attackerCombatMod(unit, dummyTile, welshPlayer);
    const onHills = attackerCombatMod(unit, hillsTile, welshPlayer);
    // On hills, Welsh gets +1 attack
    expect(onHills).toBe(onPlains + 1);
  });

  it('resolves combat and returns battle details', () => {
    const attacker = createUnit('swordsman', 0); // atk 4
    const defender = createUnit('footman', 1); // def 1
    const p0 = createPlayer(0, 'EN');
    const p1 = createPlayer(1, 'FR');

    const battle = resolveCombat(attacker, defender, dummyTile, 0, [p0, p1]);
    expect(battle.attackerKind).toBe('swordsman');
    expect(battle.defenderKind).toBe('footman');
    expect(battle.attackerOwnerIdx).toBe(0);
    expect(battle.defenderOwnerIdx).toBe(1);
    expect(typeof battle.attackerWon).toBe('boolean');
    expect(battle.attackerRoll).toBe(4);
    expect(battle.defenderRoll).toBe(1);
  });
});
