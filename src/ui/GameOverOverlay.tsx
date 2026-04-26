import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getCachedLeaders } from '@/src/data/leaders';
import { useGame } from '@/src/state/game';

import { THEME } from './palette';

export default function GameOverOverlay() {
  const gameOver = useGame((s) => s.gameOver);
  const currentSlot = useGame((s) => s.currentSlot);
  const newGame = useGame((s) => s.newGame);
  const exitToTitle = useGame((s) => s.exitToTitle);

  if (!gameOver) return null;

  const title =
    gameOver.kind === 'win' ? 'Victory'
    : gameOver.kind === 'lose' ? 'Defeat'
    : 'Stalemate';

  const titleColor =
    gameOver.kind === 'win' ? THEME.good
    : gameOver.kind === 'lose' ? THEME.bad
    : THEME.warn;

  const difficulty = useGame((s) => s.difficulty);
  const onPlayAgain = async () => {
    if (currentSlot === null) return;
    const leaders = await getCachedLeaders();
    newGame(currentSlot, Date.now() & 0x7fffffff, difficulty, leaders);
  };

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
        <Text style={styles.reason}>{gameOver.reason}</Text>
        <View style={styles.buttonRow}>
          <Pressable style={[styles.btn, styles.btnPrimary]} onPress={onPlayAgain}>
            <Text style={styles.btnPrimaryText}>Play Again</Text>
          </Pressable>
          <Pressable style={styles.btn} onPress={exitToTitle}>
            <Text style={styles.btnText}>Back to Title</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(10, 23, 41, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: THEME.bgElevated,
    borderColor: THEME.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 32,
    minWidth: 320,
    maxWidth: 480,
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 12,
  },
  reason: {
    color: THEME.ink,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  btnPrimary: {
    backgroundColor: THEME.warn,
    borderColor: THEME.warn,
  },
  btnText: { color: THEME.ink, fontSize: 14, fontWeight: '700' },
  btnPrimaryText: { color: '#0a1729', fontSize: 14, fontWeight: '800' },
});
