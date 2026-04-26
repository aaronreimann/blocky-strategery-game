import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

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
      <View style={styles.card}>
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

        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {TECH_IDS.map((tid) => {
            const t = TECH[tid];
            const done = human.researched.includes(tid);
            const current = human.researching === tid;
            const locked = !prereqsMet(human.researched, tid);
            const status = done
              ? 'Researched'
              : current
                ? `Researching (${human.science}/${t.cost})`
                : locked
                  ? 'Locked'
                  : 'Available';
            const tint = done
              ? THEME.good
              : current
                ? THEME.warn
                : locked
                  ? THEME.inkMuted
                  : THEME.ink;
            const prereqText =
              t.prereqs.length === 0
                ? 'No prereqs'
                : 'Needs: ' + t.prereqs.map((p) => TECH[p].name).join(', ');
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
                <View style={styles.techHeader}>
                  <Text style={[styles.techName, { color: tint }]}>{t.name}</Text>
                  <Text style={[styles.techStatus, { color: tint }]}>{status}</Text>
                </View>
                <Text style={styles.techMeta}>
                  Cost {t.cost} · {prereqText}
                </Text>
                <Text style={styles.techMeta}>Unlocks: {t.unlocks}</Text>
              </Pressable>
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
    backgroundColor: THEME.bgElevated,
    borderColor: THEME.border,
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
  listContent: { gap: 8 },
  tech: {
    backgroundColor: THEME.bg,
    borderColor: THEME.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  techCurrent: { borderColor: THEME.warn },
  techDone: { borderColor: THEME.good, opacity: 0.7 },
  techLocked: { opacity: 0.5 },
  techHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  techName: { fontSize: 14, fontWeight: '800' },
  techStatus: { fontSize: 11, fontWeight: '700' },
  techMeta: { color: THEME.inkMuted, fontSize: 11, marginTop: 2 },
});
