import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { flagEmoji } from '@/src/data/countries';
import { useGame } from '@/src/state/game';

import { THEME } from './palette';

const HUMAN_IDX = 0;

type Props = {
  onClose: () => void;
};

export default function ScoreScreen({ onClose }: Props) {
  const players = useGame((s) => s.players);
  const cities = useGame((s) => s.cities);
  const units = useGame((s) => s.units);
  const wonders = useGame((s) => s.wonders);
  const turn = useGame((s) => s.turn);

  const rows = players.map((p) => {
    const myCities = cities.filter((c) => c.ownerIdx === p.idx);
    const myUnits = units.filter((u) => u.ownerIdx === p.idx);
    const myWonders = wonders.filter((w) => w.ownerIdx === p.idx);
    const totalPop = myCities.reduce((s, c) => s + c.population, 0);
    const score =
      myCities.length * 10 +
      myUnits.length * 2 +
      p.researched.length * 5 +
      myWonders.length * 15 +
      totalPop;
    return {
      p,
      score,
      cities: myCities.length,
      units: myUnits.length,
      techs: p.researched.length,
      wonders: myWonders.length,
      pop: totalPop,
    };
  });
  rows.sort((a, b) => b.score - a.score);

  return (
    <View style={styles.bg}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Standings</Text>
            <Text style={styles.subtitle}>Turn {turn}</Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {rows.map((r, i) => {
            const isMe = r.p.idx === HUMAN_IDX;
            return (
              <View
                key={r.p.idx}
                style={[styles.row, isMe && { borderColor: r.p.color, borderWidth: 1.5 }]}
              >
                <Text style={styles.rank}>#{i + 1}</Text>
                <View style={[styles.colorChip, { backgroundColor: r.p.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>
                    {flagEmoji(r.p.iso)} {r.p.name}
                  </Text>
                  <Text style={styles.meta}>
                    {r.cities}c · {r.units}u · {r.techs}t · {r.wonders}w · pop {r.pop}
                  </Text>
                </View>
                <Text style={styles.score}>{r.score}</Text>
              </View>
            );
          })}
        </ScrollView>
        <Text style={styles.footnote}>
          Score = cities×10 + units×2 + techs×5 + wonders×15 + total population
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(10, 23, 41, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: 'rgba(28, 22, 18, 0.92)',
    borderColor: 'rgba(212, 184, 138, 0.45)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    width: '100%',
    maxWidth: 540,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: { color: THEME.ink, fontSize: 22, fontWeight: '900' },
  subtitle: { color: THEME.inkMuted, fontSize: 12, marginTop: 4 },
  closeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderColor: THEME.border,
    borderWidth: 1,
  },
  closeText: { color: THEME.ink, fontSize: 12, fontWeight: '700' },
  list: { flexGrow: 0 },
  listContent: { gap: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 23, 41, 0.6)',
    borderColor: THEME.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    gap: 10,
  },
  rank: {
    color: THEME.warn,
    fontSize: 14,
    fontWeight: '900',
    width: 28,
  },
  colorChip: { width: 16, height: 16, borderRadius: 4 },
  name: { color: THEME.ink, fontSize: 14, fontWeight: '700' },
  meta: { color: THEME.inkMuted, fontSize: 11, marginTop: 2 },
  score: { color: THEME.ink, fontSize: 18, fontWeight: '900' },
  footnote: {
    color: THEME.inkMuted,
    fontSize: 10,
    marginTop: 8,
    textAlign: 'center',
  },
});
