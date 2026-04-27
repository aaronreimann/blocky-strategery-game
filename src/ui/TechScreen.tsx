import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  prereqsMet,
  TECH,
  TECH_IDS,
  type TechId,
} from '@/src/data/tech';
import { useGame } from '@/src/state/game';

import { THEME } from './palette';

type Props = {
  onClose: () => void;
};

export default function TechScreen({ onClose }: Props) {
  const players = useGame((s) => s.players);
  const setResearch = useGame((s) => s.setResearch);

  const human = players.find((p) => p.isHuman);
  if (!human) return null;

  const onPick = (t: TechId) => {
    setResearch(t);
    onClose();
  };

  return (
    <View style={styles.bg}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Tech Tree</Text>
            <Text style={styles.subtitle}>
              Science {human.science}
              {human.researching
                ? ` · Researching ${TECH[human.researching].name} (${human.science}/${TECH[human.researching].cost})`
                : ' · No research'}
            </Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator
        >
          {TECH_IDS.map((tid) => {
            const t = TECH[tid];
            const done = human.researched.includes(tid);
            const current = human.researching === tid;
            const locked = !prereqsMet(human.researched, tid);
            const status = done
              ? '✓'
              : current
                ? `${human.science}/${t.cost}`
                : locked
                  ? '🔒'
                  : `${t.cost}`;
            const tint = done
              ? THEME.good
              : current
                ? THEME.warn
                : locked
                  ? THEME.inkMuted
                  : THEME.ink;
            return (
              <Pressable
                key={tid}
                disabled={done || current || locked}
                style={[
                  styles.tech,
                  current && styles.techCurrent,
                  done && styles.techDone,
                  locked && styles.techLocked,
                ]}
                onPress={() => onPick(tid)}
              >
                <View style={styles.techMain}>
                  <Text style={[styles.techName, { color: tint }]} numberOfLines={1}>
                    {t.name}
                  </Text>
                  <Text style={styles.techUnlocks} numberOfLines={1}>
                    {t.unlocks}
                  </Text>
                </View>
                <Text style={[styles.techStatus, { color: tint }]}>{status}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(28, 22, 18, 0.97)',
  },
  safe: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
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
  list: { flex: 1 },
  listContent: { gap: 4, paddingBottom: 12 },
  tech: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.bg,
    borderColor: THEME.border,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 10,
  },
  techCurrent: { borderColor: THEME.warn },
  techDone: { borderColor: THEME.good, opacity: 0.65 },
  techLocked: { opacity: 0.5 },
  techMain: { flex: 1 },
  techName: { fontSize: 13, fontWeight: '800' },
  techUnlocks: { color: THEME.inkMuted, fontSize: 10, marginTop: 1 },
  techStatus: { fontSize: 12, fontWeight: '800', minWidth: 48, textAlign: 'right' },
});
