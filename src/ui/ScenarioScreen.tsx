import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COUNTRIES, type LeaderMap } from '@/src/data/countries';
import { CULTURE_FLAVOR } from '@/src/data/cultures';
import {
  DEFAULT_SCENARIO,
  DIFFICULTIES,
  DIFFICULTY_AI_COUNT,
  DIFFICULTY_LABELS,
  MAP_SIZE_DIMS,
  MAP_SIZE_LABELS,
  MAP_SIZES,
  TURN_LIMIT_OPTIONS,
  type Difficulty,
  type MapSize,
  type ScenarioOptions,
} from '@/src/game/types';

import CultureIcon from './CultureIcon';
import { THEME } from './palette';

type Props = {
  slot: number;
  leaders: LeaderMap;
  onCancel: () => void;
  onStart: (scenario: ScenarioOptions) => void;
};

const TURN_LIMIT_LABEL = (n: number) => (n === 0 ? 'Endless' : `${n} turns`);

export default function ScenarioScreen({ slot, leaders, onCancel, onStart }: Props) {
  const [difficulty, setDifficulty] = useState<Difficulty>(DEFAULT_SCENARIO.difficulty);
  const [mapSize, setMapSize] = useState<MapSize>(DEFAULT_SCENARIO.mapSize);
  const [turnLimit, setTurnLimit] = useState<number>(DEFAULT_SCENARIO.turnLimit);
  const [countryQid, setCountryQid] = useState<string | null>(
    DEFAULT_SCENARIO.humanCountryQid,
  );
  const [vConquest, setVConquest] = useState(true);
  const [vTech, setVTech] = useState(true);
  const [vTime, setVTime] = useState(true);

  const handleStart = () => {
    onStart({
      difficulty,
      mapSize,
      turnLimit,
      victories: { conquest: vConquest, tech: vTech, time: vTime },
      humanCountryQid: countryQid,
    });
  };

  const human =
    countryQid === null
      ? null
      : COUNTRIES.find((c) => c.qid === countryQid) ?? null;
  // Reference `leaders` so the prop stays useful if cultures ever get
  // dynamic leader names again. Currently always empty for cult_* qids.
  void leaders;

  return (
    <View style={styles.bg}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Set up your realm</Text>
            <Text style={styles.subtitle}>Realm slot {slot + 1}</Text>
          </View>
          <Pressable onPress={onCancel} style={styles.closeBtn}>
            <Text style={styles.closeText}>Cancel</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Country</Text>
            <Text style={styles.sectionHint}>
              {human
                ? `${human.name} — ${CULTURE_FLAVOR[human.iso]?.blurb ?? 'no special bonus'}`
                : 'Random — chosen at game start'}
            </Text>
            <View style={styles.countryGrid}>
              <Pressable
                style={[styles.countryChip, countryQid === null && styles.chipActive]}
                onPress={() => setCountryQid(null)}
              >
                <Text style={[styles.countryFlag, countryQid === null && styles.chipActiveText]}>
                  🎲
                </Text>
                <Text style={[styles.countryName, countryQid === null && styles.chipActiveText]}>
                  Random
                </Text>
              </Pressable>
              {COUNTRIES.map((c) => {
                const cur = countryQid === c.qid;
                return (
                  <Pressable
                    key={c.qid}
                    style={[styles.countryChip, cur && styles.chipActive]}
                    onPress={() => setCountryQid(c.qid)}
                  >
                    <CultureIcon iso={c.iso} size={22} />
                    <Text
                      style={[
                        styles.countryName,
                        cur && styles.chipActiveText,
                      ]}
                      numberOfLines={1}
                    >
                      {c.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Difficulty</Text>
            <View style={styles.row}>
              {DIFFICULTIES.map((d) => {
                const cur = d === difficulty;
                return (
                  <Pressable
                    key={d}
                    style={[styles.pill, cur && styles.pillActive]}
                    onPress={() => setDifficulty(d)}
                  >
                    <Text style={[styles.pillText, cur && styles.pillActiveText]}>
                      {DIFFICULTY_LABELS[d]}
                    </Text>
                    <Text style={[styles.pillSub, cur && styles.pillActiveText]}>
                      {DIFFICULTY_AI_COUNT[d]} enemies
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Map size</Text>
            <View style={styles.row}>
              {MAP_SIZES.map((s) => {
                const cur = s === mapSize;
                const dims = MAP_SIZE_DIMS[s];
                return (
                  <Pressable
                    key={s}
                    style={[styles.pill, cur && styles.pillActive]}
                    onPress={() => setMapSize(s)}
                  >
                    <Text style={[styles.pillText, cur && styles.pillActiveText]}>
                      {MAP_SIZE_LABELS[s]}
                    </Text>
                    <Text style={[styles.pillSub, cur && styles.pillActiveText]}>
                      {dims.w}×{dims.h}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Turn limit</Text>
            <View style={styles.row}>
              {TURN_LIMIT_OPTIONS.map((n) => {
                const cur = n === turnLimit;
                return (
                  <Pressable
                    key={n}
                    style={[styles.pill, cur && styles.pillActive]}
                    onPress={() => setTurnLimit(n)}
                  >
                    <Text style={[styles.pillText, cur && styles.pillActiveText]}>
                      {TURN_LIMIT_LABEL(n)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Victory conditions</Text>
            <View style={styles.row}>
              <Toggle label="Conquest" hint="Take every rival capital" value={vConquest} onToggle={() => setVConquest((v) => !v)} />
              <Toggle label="Tech" hint="First to Philosophy wins" value={vTech} onToggle={() => setVTech((v) => !v)} />
              <Toggle label="Time" hint="Most cities at turn limit" value={vTime} onToggle={() => setVTime((v) => !v)} />
            </View>
          </View>
        </ScrollView>

        <Pressable style={styles.startBtn} onPress={handleStart}>
          <Text style={styles.startText}>Start</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

function Toggle({
  label,
  hint,
  value,
  onToggle,
}: {
  label: string;
  hint: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      style={[styles.pill, value && styles.pillActive]}
      onPress={onToggle}
    >
      <Text style={[styles.pillText, value && styles.pillActiveText]}>
        {value ? '✓ ' : ''}{label}
      </Text>
      <Text style={[styles.pillSub, value && styles.pillActiveText]}>{hint}</Text>
    </Pressable>
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
    marginBottom: 8,
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
  listContent: { paddingBottom: 12 },
  section: { marginTop: 14 },
  sectionTitle: {
    color: THEME.warn,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
  },
  sectionHint: { color: THEME.inkMuted, fontSize: 11, marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    backgroundColor: 'rgba(45, 32, 22, 0.9)',
    borderColor: 'rgba(212, 184, 138, 0.45)',
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 90,
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: THEME.warn,
    borderColor: THEME.warn,
  },
  pillText: { color: THEME.ink, fontSize: 13, fontWeight: '800' },
  pillSub: { color: THEME.inkMuted, fontSize: 10, marginTop: 2 },
  pillActiveText: { color: '#0a1729' },
  countryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  countryChip: {
    width: '22%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(45, 32, 22, 0.9)',
    borderColor: 'rgba(212, 184, 138, 0.45)',
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  chipActive: {
    backgroundColor: THEME.warn,
    borderColor: THEME.warn,
  },
  chipActiveText: { color: '#0a1729' },
  countryFlag: { fontSize: 14 },
  cultureBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(212, 184, 138, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cultureBadgeText: { color: '#0a1729', fontSize: 12, fontWeight: '900' },
  countryName: { color: THEME.ink, fontSize: 11, fontWeight: '700', flex: 1 },
  startBtn: {
    marginTop: 12,
    alignSelf: 'center',
    backgroundColor: THEME.warn,
    paddingHorizontal: 36,
    paddingVertical: 12,
    borderRadius: 10,
  },
  startText: { color: '#0a1729', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
});
