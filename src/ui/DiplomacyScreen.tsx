import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { flagEmoji } from '@/src/data/countries';
import { relationKey } from '@/src/game/types';
import { useGame } from '@/src/state/game';

import { THEME } from './palette';

type Props = {
  onClose: () => void;
};

const HUMAN_IDX = 0;

export default function DiplomacyScreen({ onClose }: Props) {
  const players = useGame((s) => s.players);
  const relations = useGame((s) => s.relations);
  const proposePeace = useGame((s) => s.proposePeace);
  const declareWar = useGame((s) => s.declareWar);

  const others = players.filter((p) => p.idx !== HUMAN_IDX);

  return (
    <View style={styles.bg}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>Diplomacy</Text>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {others.map((p) => {
            const at = relations[relationKey(HUMAN_IDX, p.idx)] ?? 'war';
            return (
              <View key={p.idx} style={styles.row}>
                <View style={styles.rowLeft}>
                  <View style={[styles.colorChip, { backgroundColor: p.color }]} />
                  <View>
                    <Text style={styles.civName}>
                      {flagEmoji(p.iso)} {p.name}
                    </Text>
                    <Text style={styles.civLeader}>{p.leader}</Text>
                  </View>
                </View>
                <View style={styles.rowRight}>
                  <Text
                    style={[
                      styles.status,
                      { color: at === 'war' ? THEME.bad : THEME.good },
                    ]}
                  >
                    {at === 'war' ? 'AT WAR' : 'AT PEACE'}
                  </Text>
                  {at === 'war' ? (
                    <Pressable
                      style={styles.btn}
                      onPress={() => {
                        proposePeace(p.idx);
                        onClose();
                      }}
                    >
                      <Text style={styles.btnText}>Offer peace</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={[styles.btn, styles.btnWar]}
                      onPress={() => {
                        declareWar(p.idx);
                        onClose();
                      }}
                    >
                      <Text style={[styles.btnText, styles.btnWarText]}>Declare war</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
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
    maxWidth: 720,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: { color: THEME.ink, fontSize: 22, fontWeight: '900' },
  closeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderColor: THEME.border,
    borderWidth: 1,
  },
  closeText: { color: THEME.ink, fontSize: 12, fontWeight: '700' },
  list: { flexGrow: 0 },
  listContent: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(10, 23, 41, 0.6)',
    borderColor: THEME.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  colorChip: { width: 18, height: 18, borderRadius: 4 },
  civName: { color: THEME.ink, fontSize: 14, fontWeight: '700' },
  civLeader: { color: THEME.inkMuted, fontSize: 11, marginTop: 2 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  status: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  btn: {
    backgroundColor: THEME.good,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  btnText: { color: '#0a1729', fontSize: 12, fontWeight: '800' },
  btnWar: { backgroundColor: THEME.bad },
  btnWarText: { color: '#0a1729' },
});
