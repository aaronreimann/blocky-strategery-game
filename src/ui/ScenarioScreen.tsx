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

const TURN_LIMIT_LABEL = (n: number) =>
  n === 0 ? 'Endless' : n === 50 ? 'Quick · 50' : n === 200 ? 'Long · 200' : `Standard · ${n}`;

const DIFFICULTY_BLURB: Record<Difficulty, string> = {
  easy: 'Chieftain — gentle pace, 3 rival tribes.',
  normal: 'Prince — balanced, 5 rival tribes.',
  hard: 'King — punishing, 7 rivals with bonuses.',
};

const MAP_SIZE_BLURB: Record<MapSize, string> = {
  small: 'Cramped continent — fast contact.',
  medium: 'Standard world — room to expand.',
  large: 'Sprawling map — long arc, more breathing room.',
};

const STEPS = ['Tribe', 'Difficulty & Map', 'Rules'];

export default function ScenarioScreen({ slot, leaders, onCancel, onStart }: Props) {
  void leaders;
  const [step, setStep] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>(DEFAULT_SCENARIO.difficulty);
  const [mapSize, setMapSize] = useState<MapSize>(DEFAULT_SCENARIO.mapSize);
  const [turnLimit, setTurnLimit] = useState<number>(DEFAULT_SCENARIO.turnLimit);
  const [tribeQid, setTribeQid] = useState<string | null>(DEFAULT_SCENARIO.humanCountryQid);
  const [vConquest, setVConquest] = useState(true);
  const [vTech, setVTech] = useState(true);
  const [vTime, setVTime] = useState(true);

  const handleStart = () => {
    onStart({
      difficulty,
      mapSize,
      turnLimit,
      victories: { conquest: vConquest, tech: vTech, time: vTime },
      humanCountryQid: tribeQid,
    });
  };

  const isLastStep = step === STEPS.length - 1;

  return (
    <View style={styles.bg}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Set up your realm</Text>
            <Text style={styles.subtitle}>
              Realm slot {slot + 1} · Step {step + 1} of {STEPS.length} · {STEPS[step]}
            </Text>
          </View>
          <Pressable onPress={onCancel} style={styles.closeBtn}>
            <Text style={styles.closeText}>Cancel</Text>
          </Pressable>
        </View>

        <ScrollView
          key={`step-${step}`}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator
        >
          {step === 0 ? (
            <TribeStep tribeQid={tribeQid} onPick={setTribeQid} />
          ) : step === 1 ? (
            <DifficultyMapStep
              difficulty={difficulty}
              mapSize={mapSize}
              onPickDifficulty={setDifficulty}
              onPickMapSize={setMapSize}
            />
          ) : (
            <RulesStep
              turnLimit={turnLimit}
              vConquest={vConquest}
              vTech={vTech}
              vTime={vTime}
              onPickTurnLimit={setTurnLimit}
              onToggleConquest={() => setVConquest((v) => !v)}
              onToggleTech={() => setVTech((v) => !v)}
              onToggleTime={() => setVTime((v) => !v)}
            />
          )}
        </ScrollView>

        <View style={styles.navBar}>
          <Pressable
            style={[styles.navBtn, step === 0 && styles.navBtnDim]}
            disabled={step === 0}
            onPress={() => setStep((s) => Math.max(0, s - 1))}
          >
            <Text style={styles.navBtnText}>Back</Text>
          </Pressable>
          <View style={styles.dots}>
            {STEPS.map((_, i) => (
              <Pressable
                key={i}
                onPress={() => setStep(i)}
                hitSlop={8}
                style={[styles.dot, i === step && styles.dotActive]}
              />
            ))}
          </View>
          <Pressable
            style={[styles.navBtn, isLastStep ? styles.startBtn : styles.navBtnPrimary]}
            onPress={() => (isLastStep ? handleStart() : setStep((s) => s + 1))}
          >
            <Text style={[styles.navBtnText, isLastStep && styles.startText]}>
              {isLastStep ? 'Start' : 'Next'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

function TribeStep({
  tribeQid,
  onPick,
}: {
  tribeQid: string | null;
  onPick: (qid: string | null) => void;
}) {
  return (
    <View style={styles.tribeGrid}>
      <Pressable
        style={[styles.tribeCard, tribeQid === null && styles.tribeCardActive]}
        onPress={() => onPick(null)}
      >
        <View style={styles.tribeIcon}>
          <Text style={styles.tribeRandomGlyph}>🎲</Text>
        </View>
        <Text style={[styles.tribeName, tribeQid === null && styles.tribeNameActive]}>
          Random
        </Text>
        <Text style={styles.tribeBlurb}>Picked at game start.</Text>
      </Pressable>
      {COUNTRIES.map((c) => {
        const cur = tribeQid === c.qid;
        const blurb = CULTURE_FLAVOR[c.iso]?.blurb ?? '';
        return (
          <Pressable
            key={c.qid}
            style={[styles.tribeCard, cur && styles.tribeCardActive]}
            onPress={() => onPick(c.qid)}
          >
            <View style={styles.tribeIcon}>
              <CultureIcon iso={c.iso} size={48} />
            </View>
            <Text style={[styles.tribeName, cur && styles.tribeNameActive]}>{c.name}</Text>
            <Text style={styles.tribeBlurb} numberOfLines={3}>
              {blurb}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function DifficultyMapStep({
  difficulty,
  mapSize,
  onPickDifficulty,
  onPickMapSize,
}: {
  difficulty: Difficulty;
  mapSize: MapSize;
  onPickDifficulty: (d: Difficulty) => void;
  onPickMapSize: (m: MapSize) => void;
}) {
  return (
    <>
      <Text style={styles.sectionTitle}>Difficulty</Text>
      <View style={styles.bigRow}>
        {DIFFICULTIES.map((d) => {
          const cur = d === difficulty;
          return (
            <Pressable
              key={d}
              style={[styles.bigCard, cur && styles.bigCardActive]}
              onPress={() => onPickDifficulty(d)}
            >
              <Text style={[styles.bigCardLabel, cur && styles.bigCardLabelActive]}>
                {DIFFICULTY_LABELS[d]}
              </Text>
              <Text style={[styles.bigCardSub, cur && styles.bigCardSubActive]}>
                {DIFFICULTY_AI_COUNT[d]} rival tribes
              </Text>
              <Text style={[styles.bigCardBlurb, cur && styles.bigCardSubActive]}>
                {DIFFICULTY_BLURB[d]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Map size</Text>
      <View style={styles.bigRow}>
        {MAP_SIZES.map((s) => {
          const cur = s === mapSize;
          const dims = MAP_SIZE_DIMS[s];
          return (
            <Pressable
              key={s}
              style={[styles.bigCard, cur && styles.bigCardActive]}
              onPress={() => onPickMapSize(s)}
            >
              <Text style={[styles.bigCardLabel, cur && styles.bigCardLabelActive]}>
                {MAP_SIZE_LABELS[s]}
              </Text>
              <Text style={[styles.bigCardSub, cur && styles.bigCardSubActive]}>
                {dims.w}×{dims.h}
              </Text>
              <Text style={[styles.bigCardBlurb, cur && styles.bigCardSubActive]}>
                {MAP_SIZE_BLURB[s]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

function RulesStep({
  turnLimit,
  vConquest,
  vTech,
  vTime,
  onPickTurnLimit,
  onToggleConquest,
  onToggleTech,
  onToggleTime,
}: {
  turnLimit: number;
  vConquest: boolean;
  vTech: boolean;
  vTime: boolean;
  onPickTurnLimit: (n: number) => void;
  onToggleConquest: () => void;
  onToggleTech: () => void;
  onToggleTime: () => void;
}) {
  return (
    <>
      <Text style={styles.sectionTitle}>Turn limit</Text>
      <View style={styles.bigRow}>
        {TURN_LIMIT_OPTIONS.map((n) => {
          const cur = n === turnLimit;
          return (
            <Pressable
              key={n}
              style={[styles.bigCard, cur && styles.bigCardActive]}
              onPress={() => onPickTurnLimit(n)}
            >
              <Text style={[styles.bigCardLabel, cur && styles.bigCardLabelActive]}>
                {TURN_LIMIT_LABEL(n)}
              </Text>
              <Text style={[styles.bigCardBlurb, cur && styles.bigCardSubActive]}>
                {n === 0
                  ? 'No time-victory check; play forever.'
                  : `Game ends at turn ${n} — most tribes wins.`}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Victory conditions</Text>
      <View style={styles.toggleRowGroup}>
        <Toggle
          label="Conquest"
          blurb="Capture every rival's last city."
          value={vConquest}
          onToggle={onToggleConquest}
        />
        <Toggle
          label="Tech"
          blurb="First to research Philosophy."
          value={vTech}
          onToggle={onToggleTech}
        />
        <Toggle
          label="Time"
          blurb="Most cities at the turn limit."
          value={vTime}
          onToggle={onToggleTime}
        />
      </View>
    </>
  );
}

function Toggle({
  label,
  blurb,
  value,
  onToggle,
}: {
  label: string;
  blurb: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      style={[styles.toggleCard, value && styles.toggleRowOn]}
      onPress={onToggle}
    >
      <View style={styles.toggleCardHeader}>
        <View style={[styles.toggleBox, value && styles.toggleBoxOn]}>
          <Text style={[styles.toggleCheck, value && styles.toggleCheckOn]}>
            {value ? '✓' : ''}
          </Text>
        </View>
        <Text style={[styles.toggleLabel, value && styles.toggleLabelOn]}>{label}</Text>
      </View>
      <Text style={styles.toggleBlurb}>{blurb}</Text>
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
  listContent: { paddingBottom: 12 },

  sectionTitle: {
    color: THEME.warn,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 6,
  },

  // Tribe grid (step 1)
  tribeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tribeCard: {
    width: '32%',
    backgroundColor: 'rgba(45, 32, 22, 0.9)',
    borderColor: 'rgba(212, 184, 138, 0.45)',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  tribeCardActive: {
    backgroundColor: THEME.warn,
    borderColor: THEME.warn,
  },
  tribeIcon: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  tribeRandomGlyph: { fontSize: 36 },
  tribeName: {
    color: THEME.ink,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  tribeNameActive: { color: '#0a1729' },
  tribeBlurb: {
    color: THEME.inkMuted,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 13,
  },

  // Big-card row (steps 2 + 3)
  bigRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  bigCard: {
    flex: 1,
    minWidth: 120,
    backgroundColor: 'rgba(45, 32, 22, 0.9)',
    borderColor: 'rgba(212, 184, 138, 0.45)',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  bigCardActive: {
    backgroundColor: THEME.warn,
    borderColor: THEME.warn,
  },
  bigCardLabel: {
    color: THEME.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  bigCardLabelActive: { color: '#0a1729' },
  bigCardSub: { color: THEME.inkMuted, fontSize: 11, marginTop: 2 },
  bigCardSubActive: { color: '#0a1729' },
  bigCardBlurb: {
    color: THEME.inkMuted,
    fontSize: 11,
    marginTop: 6,
    lineHeight: 14,
  },

  // Victory toggles (step 3) — three cards in one row.
  toggleRowGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleCard: {
    flex: 1,
    backgroundColor: 'rgba(45, 32, 22, 0.9)',
    borderColor: 'rgba(212, 184, 138, 0.45)',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  toggleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  toggleRowOn: { borderColor: THEME.warn },
  toggleBox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderColor: THEME.border,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBoxOn: { borderColor: THEME.warn, backgroundColor: THEME.warn },
  toggleCheck: { color: '#0a1729', fontSize: 14, fontWeight: '900' },
  toggleCheckOn: { color: '#0a1729' },
  toggleLabel: { color: THEME.ink, fontSize: 14, fontWeight: '800' },
  toggleLabelOn: { color: THEME.ink },
  toggleBlurb: { color: THEME.inkMuted, fontSize: 11, marginTop: 2 },

  // Bottom navigation
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    gap: 12,
  },
  navBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    borderColor: THEME.border,
    borderWidth: 1,
    minWidth: 88,
    alignItems: 'center',
  },
  navBtnPrimary: {
    backgroundColor: 'rgba(212, 184, 138, 0.25)',
    borderColor: 'rgba(212, 184, 138, 0.7)',
  },
  navBtnDim: { opacity: 0.35 },
  navBtnText: { color: THEME.ink, fontSize: 14, fontWeight: '800' },
  startBtn: {
    backgroundColor: THEME.warn,
    borderColor: THEME.warn,
    paddingHorizontal: 28,
  },
  startText: { color: '#0a1729' },
  dots: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(212, 184, 138, 0.35)',
  },
  dotActive: { backgroundColor: THEME.warn, width: 22 },
});
