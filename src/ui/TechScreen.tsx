import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  prereqsMet,
  TECH,
  TECH_IDS,
  type TechId,
} from '@/src/data/tech';
import { useGame } from '@/src/state/game';

import { GameIcon } from './GameIcon';
import { THEME } from './palette';

type Props = {
  onClose: () => void;
};

// Each tech gets a flavor glyph. Many are loose thematic matches rather than
// strict 1:1 mappings — the goal is a varied workshop wall, not literal art.
const TECH_ICON: Record<TechId, string> = {
  bronze_working: 'metal_bar',
  horseback_riding: 'horse_head',
  writing: 'wooden_sign',
  currency: 'gold_bar',
  sailing: 'caravel',
  iron_working: 'broadsword',
  mathematics: 'cog',
  philosophy: 'chess_knight',
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
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator
        >
          {TECH_IDS.map((tid) => {
            const t = TECH[tid];
            const done = human.researched.includes(tid);
            const current = human.researching === tid;
            const locked = !prereqsMet(human.researched, tid);
            const tint = done
              ? THEME.good
              : current
                ? THEME.warn
                : locked
                  ? THEME.inkMuted
                  : THEME.ink;
            const iconName = (TECH_ICON[tid] ?? 'wooden_sign') as never;
            return (
              <Pressable
                key={tid}
                disabled={done || current || locked}
                style={[
                  styles.card,
                  current && styles.cardCurrent,
                  done && styles.cardDone,
                  locked && styles.cardLocked,
                ]}
                onPress={() => onPick(tid)}
              >
                <View style={styles.iconWrap}>
                  <GameIcon name={iconName} size={42} color={tint} />
                </View>
                <Text style={[styles.cardName, { color: tint }]} numberOfLines={1}>
                  {t.name}
                </Text>
                <Text style={styles.cardUnlocks} numberOfLines={2}>
                  {t.unlocks}
                </Text>
                {done ? (
                  <View style={[styles.stamp, { borderColor: THEME.good }]}>
                    <Text style={[styles.stampText, { color: THEME.good }]}>✓</Text>
                  </View>
                ) : current ? (
                  <View style={[styles.badge, { backgroundColor: THEME.warn }]}>
                    <Text style={styles.badgeText}>
                      {human.science}/{t.cost}
                    </Text>
                  </View>
                ) : locked ? (
                  <View style={styles.lockedBadge}>
                    <Text style={styles.lockedText}>🔒</Text>
                  </View>
                ) : (
                  <View style={[styles.badge, styles.badgeAvailable]}>
                    <Text style={styles.badgeAvailableText}>{t.cost}</Text>
                  </View>
                )}
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
    paddingHorizontal: 16,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 12,
  },
  card: {
    width: '31.5%',
    aspectRatio: 1.2,
    backgroundColor: 'rgba(45, 32, 22, 0.92)',
    borderColor: 'rgba(212, 184, 138, 0.45)',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 8,
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  cardCurrent: {
    borderColor: THEME.warn,
    borderWidth: 2,
    backgroundColor: 'rgba(56, 42, 18, 0.95)',
  },
  cardDone: {
    borderColor: THEME.good,
    opacity: 0.7,
  },
  cardLocked: {
    opacity: 0.45,
  },
  iconWrap: {
    alignItems: 'center',
    marginBottom: 6,
    marginTop: 2,
  },
  cardName: {
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  cardUnlocks: {
    color: THEME.inkMuted,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 13,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 26,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#0a1729', fontSize: 11, fontWeight: '900' },
  badgeAvailable: {
    backgroundColor: 'rgba(212, 184, 138, 0.9)',
  },
  badgeAvailableText: { color: '#0a1729', fontSize: 11, fontWeight: '900' },
  stamp: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-12deg' }],
  },
  stampText: { fontSize: 14, fontWeight: '900' },
  lockedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedText: { fontSize: 14 },
});
