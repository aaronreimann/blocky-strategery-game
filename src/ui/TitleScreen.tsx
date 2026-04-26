import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, ImageBackground, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { buildFallbackLeaders, type LeaderMap } from '@/src/data/countries';
import { getCachedLeaders, refreshLeaders } from '@/src/data/leaders';
import {
  DIFFICULTIES,
  DIFFICULTY_AI_COUNT,
  DIFFICULTY_LABELS,
  type Difficulty,
} from '@/src/game/types';
import { useGame } from '@/src/state/game';
import { deleteSlot, listSlots, type SlotInfo } from '@/src/state/saves';

import { THEME } from './palette';

export default function TitleScreen() {
  const newGame = useGame((s) => s.newGame);
  const loadFromSlot = useGame((s) => s.loadFromSlot);

  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [pendingSlot, setPendingSlot] = useState<number | null>(null);
  const leadersRef = useRef<LeaderMap>(buildFallbackLeaders());

  const refresh = useCallback(async () => {
    const list = await listSlots();
    setSlots(list);
  }, []);

  useEffect(() => {
    refresh();
    // Read whatever cache we have; then kick off a fresh fetch in the background.
    getCachedLeaders().then((m) => {
      leadersRef.current = m;
    });
    refreshLeaders().then((m) => {
      if (m) leadersRef.current = m;
    });
  }, [refresh]);

  const onSlotPress = async (slot: number, info: SlotInfo) => {
    if (info.empty) {
      setPendingSlot(slot);
    } else {
      const ok = await loadFromSlot(slot);
      if (!ok) setPendingSlot(slot);
    }
  };

  const onPickDifficulty = (difficulty: Difficulty) => {
    if (pendingSlot !== null) {
      newGame(pendingSlot, Date.now() & 0x7fffffff, difficulty, leadersRef.current);
    }
    setPendingSlot(null);
  };

  const onDelete = async (slot: number) => {
    await deleteSlot(slot);
    refresh();
  };

  return (
    <ImageBackground 
      source={require('../../assets/images/title-bg.png')} 
      style={{ flex: 1 }} 
      resizeMode="cover"
    >
      <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' }} />
      <SafeAreaView style={[styles.root, { backgroundColor: 'transparent' }]}>
        <View style={styles.header}>
          <Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.subtitle}>Pick a realm</Text>
        </View>

      <View style={styles.slotRow}>
        {slots.map((info) => (
          <View key={info.slot} style={styles.slotWrap}>
            <Pressable style={styles.slotCard} onPress={() => onSlotPress(info.slot, info)}>
              <Text style={styles.slotNumber}>Realm {info.slot + 1}</Text>
              {info.empty ? (
                <>
                  <Text style={styles.slotEmpty}>Empty</Text>
                  <Text style={styles.slotHint}>Tap to start</Text>
                </>
              ) : (
                <>
                  <Text style={styles.slotMeta}>
                    {info.humanCiv.name}
                    {info.humanCiv.leader ? ` · ${info.humanCiv.leader}` : ''}
                  </Text>
                  <Text style={styles.slotMetaDim}>
                    {DIFFICULTY_LABELS[info.difficulty]} · Turn {info.turn}
                  </Text>
                  <Text style={styles.slotMetaDim}>
                    {info.cityCount} {info.cityCount === 1 ? 'city' : 'cities'} ·{' '}
                    {info.unitCount} units
                  </Text>
                  <Text style={styles.slotHint}>Tap to resume</Text>
                </>
              )}
            </Pressable>
            {!info.empty && (
              <Pressable style={styles.deleteBtn} onPress={() => onDelete(info.slot)}>
                <Text style={styles.deleteBtnText}>Delete</Text>
              </Pressable>
            )}
          </View>
        ))}
      </View>

      {pendingSlot !== null && (
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Pick a difficulty</Text>
            <Text style={styles.modalSub}>Realm {pendingSlot + 1}</Text>
            <View style={styles.modalRow}>
              {DIFFICULTIES.map((d) => (
                <Pressable
                  key={d}
                  style={styles.diffBtn}
                  onPress={() => onPickDifficulty(d)}
                >
                  <Text style={styles.diffBtnLabel}>{DIFFICULTY_LABELS[d]}</Text>
                  <Text style={styles.diffBtnCount}>{DIFFICULTY_AI_COUNT[d]} enemies</Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.modalCancel} onPress={() => setPendingSlot(null)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: THEME.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: { 
    width: 420, 
    height: 180, 
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  title: { color: THEME.ink, fontSize: 44, fontWeight: '900', letterSpacing: 2 },
  subtitle: { color: THEME.inkMuted, fontSize: 14, marginTop: 6 },
  slotRow: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
    maxWidth: 760,
    justifyContent: 'center',
  },
  slotWrap: { flex: 1, maxWidth: 240, alignItems: 'center', gap: 8 },
  slotCard: {
    backgroundColor: 'rgba(28, 22, 18, 0.78)',
    borderColor: 'rgba(212, 184, 138, 0.45)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    width: '100%',
    minHeight: 160,
    justifyContent: 'center',
  },
  slotNumber: {
    color: THEME.warn,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  slotEmpty: { color: THEME.ink, fontSize: 18, fontWeight: '700' },
  slotMeta: { color: THEME.ink, fontSize: 14, fontWeight: '700', marginTop: 2 },
  slotMetaDim: { color: THEME.inkMuted, fontSize: 12, marginTop: 2 },
  slotHint: { color: THEME.inkMuted, fontSize: 11, marginTop: 8 },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderColor: THEME.border,
    borderWidth: 1,
  },
  deleteBtnText: { color: THEME.bad, fontSize: 11, fontWeight: '700' },
  modalBg: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(10, 23, 41, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: 'rgba(28, 22, 18, 0.85)',
    borderColor: 'rgba(212, 184, 138, 0.45)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    minWidth: 360,
    alignItems: 'center',
  },
  modalTitle: { color: THEME.ink, fontSize: 22, fontWeight: '800' },
  modalSub: { color: THEME.inkMuted, fontSize: 12, marginTop: 4, marginBottom: 18 },
  modalRow: { flexDirection: 'row', gap: 10 },
  diffBtn: {
    backgroundColor: THEME.bg,
    borderColor: THEME.warn,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 110,
  },
  diffBtnLabel: { color: THEME.ink, fontSize: 16, fontWeight: '800' },
  diffBtnCount: { color: THEME.inkMuted, fontSize: 11, marginTop: 4 },
  modalCancel: { marginTop: 16, paddingVertical: 8, paddingHorizontal: 16 },
  modalCancelText: { color: THEME.inkMuted, fontSize: 13, fontWeight: '600' },
});
