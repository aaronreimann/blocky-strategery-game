import { DEFAULT_VICTORIES, type City, type GameOverState, type Player, type Unit, type VictoryConditions } from './types';

const HUMAN_PLAYER_IDX = 0;

// Legacy default; new games carry their own turn limit on the state.
export const TURN_LIMIT = 100;
const HUMAN_IDX = 0;

type Snapshot = {
  units: Unit[];
  cities: City[];
  players: Player[];
  turn: number;
  turnLimit?: number;
  victories?: VictoryConditions;
};

export function checkGameOver(state: Snapshot): GameOverState | null {
  const victories = state.victories ?? DEFAULT_VICTORIES;
  const turnLimit = state.turnLimit ?? TURN_LIMIT;

  const humanAlive =
    state.units.some((u) => u.ownerIdx === HUMAN_IDX) ||
    state.cities.some((c) => c.ownerIdx === HUMAN_IDX);

  // The human always loses when their realm falls — that's not an optional
  // victory condition, it's the floor of "is the player still in the game".
  if (!humanAlive) {
    return { kind: 'lose', reason: 'Your realm has fallen.' };
  }

  // Tech victory: any player who researches Philosophy wins.
  if (victories.tech) {
    const philosopher = state.players.find((p) => p.researched.includes('philosophy'));
    if (philosopher) {
      if (philosopher.idx === HUMAN_PLAYER_IDX) {
        return { kind: 'win', reason: 'You discover Philosophy and ascend.' };
      }
      return {
        kind: 'lose',
        reason: `${philosopher.name} (${philosopher.leader}) discovered Philosophy first.`,
      };
    }
  }

  if (victories.conquest) {
    const enemyPlayers = state.players.filter((p) => !p.isHuman);
    if (enemyPlayers.length > 0) {
      const anyEnemyAlive = enemyPlayers.some(
        (p) =>
          state.units.some((u) => u.ownerIdx === p.idx) ||
          state.cities.some((c) => c.ownerIdx === p.idx),
      );
      if (!anyEnemyAlive) {
        return {
          kind: 'win',
          reason: 'Every rival realm has fallen. The world is yours.',
        };
      }
    }
  }

  // turnLimit === 0 means "Endless" — no time check.
  if (victories.time && turnLimit > 0 && state.turn > turnLimit) {
    const scores = state.players.map((p) => ({
      idx: p.idx,
      isHuman: p.isHuman,
      cities: state.cities.filter((c) => c.ownerIdx === p.idx).length,
      units: state.units.filter((u) => u.ownerIdx === p.idx).length,
    }));
    scores.sort((a, b) => b.cities - a.cities || b.units - a.units);
    const top = scores[0];
    const tied = scores.filter((s) => s.cities === top.cities && s.units === top.units);
    if (tied.length > 1 && tied.some((s) => s.isHuman) && tied.some((s) => !s.isHuman)) {
      return { kind: 'draw', reason: 'Time runs out — no clear victor.' };
    }
    if (top.isHuman) {
      return { kind: 'win', reason: 'Time wins — you control the most cities.' };
    }
    return { kind: 'lose', reason: 'Time wins — a rival controls more cities.' };
  }

  return null;
}
