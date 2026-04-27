import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, ImageBackground, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { buildFallbackLeaders, flagEmoji, type LeaderMap } from '@/src/data/countries';
import { getCachedLeaders, refreshLeaders } from '@/src/data/leaders';
import {
  DIFFICULTIES,
  DIFFICULTY_AI_COUNT,
  DIFFICULTY_LABELS,
  type Difficulty,
} from '@/src/game/types';
import { useGame } from '@/src/state/game';
import {
  appendHistory,
  clearHistory,
  deleteSlot,
  listSlots,
  loadHistory,
  type HistoryEntry,
  type SlotInfo,
} from '@/src/state/saves';

import { THEME } from './palette';

const RESULT_LABEL: Record<'win' | 'lose' | 'draw', string> = {
  win: 'Victory',
  lose: 'Defeat',
  draw: 'Stalemate',
};
const RESULT_COLOR: Record<'win' | 'lose' | 'draw', string> = {
  win: THEME.good,
  lose: THEME.bad,
  draw: THEME.warn,
};

export default function TitleScreen() {
  const newGame = useGame((s) => s.newGame);
  const loadFromSlot = useGame((s) => s.loadFromSlot);

  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [pendingSlot, setPendingSlot] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const leadersRef = useRef<LeaderMap>(buildFallbackLeaders());

  const refresh = useCallback(async () => {
    const [list, hist] = await Promise.all([listSlots(), loadHistory()]);
    setSlots(list);
    setHistory(hist);
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
    const info = slots.find((s) => s.slot === slot);
    if (info && !info.empty && info.gameOver) {
      const alreadyLogged = history.some(
        (h) =>
          h.turn === info.turn &&
          h.country === info.humanRealm.name &&
          h.kind === info.gameOver!.kind,
      );
      if (!alreadyLogged) {
        await appendHistory({
          at: info.savedAt,
          kind: info.gameOver.kind,
          reason: info.gameOver.reason,
          turn: info.turn,
          difficulty: info.difficulty,
          country: info.humanRealm.name,
          leader: info.humanRealm.leader,
          iso: info.humanRealm.iso,
          cityCount: info.cityCount,
          unitCount: info.unitCount,
        });
      }
    }
    await deleteSlot(slot);
    refresh();
  };

  return (
    <ImageBackground 
      source={require('../../assets/images/title-bg.png')} 
      style={{ flex: 1 }} 
      resizeMode="cover"
    >
      <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)' }} />
      <SafeAreaView style={[styles.root, { backgroundColor: 'transparent' }]}>
        <View style={styles.header}>
          <Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
        </View>

      <View style={styles.slotRow}>
        {slots.map((info) => {
          const ended = !info.empty && info.gameOver;
          return (
            <View key={info.slot} style={styles.slotWrap}>
              <Pressable
                style={[styles.slotCard, ended && { borderColor: RESULT_COLOR[ended.kind] }]}
                onPress={() => onSlotPress(info.slot, info)}
              >
                {info.empty ? (
                  <>
                    <Text style={styles.slotEmpty}>Empty</Text>
                    <Text style={styles.slotHint}>Tap to start</Text>
                  </>
                ) : (
                  <>
                    {ended && (
                      <Text style={[styles.slotResult, { color: RESULT_COLOR[ended.kind] }]}>
                        {RESULT_LABEL[ended.kind]}
                      </Text>
                    )}
                    <Text style={styles.slotMeta}>
                      {flagEmoji(info.humanRealm.iso)} {info.humanRealm.name}
                    </Text>
                    <Text style={styles.slotMetaDim}>
                      {DIFFICULTY_LABELS[info.difficulty]} · Turn {info.turn}
                    </Text>
                    <Text style={styles.slotMetaDim}>
                      {info.cityCount} {info.cityCount === 1 ? 'city' : 'cities'} ·{' '}
                      {info.unitCount} units
                    </Text>
                    <Text style={styles.slotHint}>
                      {ended ? 'Tap to view' : 'Tap to resume'}
                    </Text>
                    <Pressable
                      style={[styles.deleteBtn, ended && styles.deleteBtnStrong]}
                      onPress={() => setPendingDelete(info.slot)}
                      hitSlop={6}
                    >
                      <Text style={[styles.deleteBtnText, ended && styles.deleteBtnTextStrong]}>
                        {ended ? 'Clear' : 'Delete'}
                      </Text>
                    </Pressable>
                  </>
                )}
              </Pressable>
            </View>
          );
        })}
      </View>

      <Pressable style={styles.historyBtn} onPress={() => setHistoryOpen(true)}>
        <Text style={styles.historyBtnText}>
          History {history.length > 0 ? `(${history.length})` : ''}
        </Text>
      </Pressable>

      {pendingDelete !== null && (() => {
        const target = slots.find((s) => s.slot === pendingDelete);
        if (!target || target.empty) {
          return null;
        }
        const ended = !!target.gameOver;
        return (
          <Pressable style={styles.modalBg} onPress={() => setPendingDelete(null)}>
            <Pressable style={styles.confirmCard} onPress={() => {}}>
              <Text style={styles.modalTitle}>
                {ended ? 'Clear this slot?' : 'Delete this game?'}
              </Text>
              <Text style={styles.modalSub}>
                {flagEmoji(target.humanRealm.iso)} {target.humanRealm.name}
              </Text>
              <Text style={styles.confirmBody}>
                {ended
                  ? 'The result is already saved to History. The save itself will be removed.'
                  : `Turn ${target.turn} progress (${target.cityCount} ${target.cityCount === 1 ? 'city' : 'cities'} · ${target.unitCount} units) will be lost. This can’t be undone.`}
              </Text>
              <View style={styles.confirmRow}>
                <Pressable
                  style={styles.confirmCancel}
                  onPress={() => setPendingDelete(null)}
                >
                  <Text style={styles.confirmCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={styles.confirmDelete}
                  onPress={async () => {
                    const slot = pendingDelete;
                    setPendingDelete(null);
                    await onDelete(slot);
                  }}
                >
                  <Text style={styles.confirmDeleteText}>
                    {ended ? 'Clear slot' : 'Delete'}
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        );
      })()}

      {pendingSlot !== null && (
        <Pressable style={styles.modalBg} onPress={() => setPendingSlot(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
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
          </Pressable>
        </Pressable>
      )}

      {historyOpen && (
        <Pressable style={styles.modalBg} onPress={() => setHistoryOpen(false)}>
          <Pressable style={styles.historyCard} onPress={() => {}}>
            <View style={styles.historyHeader}>
              <Text style={styles.modalTitle}>History</Text>
              <Pressable onPress={() => setHistoryOpen(false)} style={styles.historyClose}>
                <Text style={styles.historyCloseText}>Close</Text>
              </Pressable>
            </View>
            {history.length === 0 ? (
              <Text style={styles.historyEmpty}>
                No past games yet. Win or lose a campaign and it will land here.
              </Text>
            ) : (
              <ScrollView style={styles.historyList} contentContainerStyle={{ gap: 6 }}>
                {history.map((h, i) => (
                  <View
                    key={`${h.at}-${i}`}
                    style={[styles.historyRow, { borderColor: RESULT_COLOR[h.kind] }]}
                  >
                    <Text style={[styles.historyKind, { color: RESULT_COLOR[h.kind] }]}>
                      {RESULT_LABEL[h.kind]}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyTitle}>
                        {flagEmoji(h.iso)} {h.country}
                      </Text>
                      <Text style={styles.historyMeta}>
                        {DIFFICULTY_LABELS[h.difficulty]} · Turn {h.turn} ·{' '}
                        {new Date(h.at).toLocaleDateString()}
                      </Text>
                      <Text style={styles.historyMeta} numberOfLines={2}>
                        {h.reason}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
            {history.length > 0 && (
              <Pressable
                style={styles.historyClear}
                onPress={async () => {
                  await clearHistory();
                  refresh();
                }}
              >
                <Text style={styles.historyClearText}>Clear history</Text>
              </Pressable>
            )}
          </Pressable>
        </Pressable>
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
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 120,
  },
  header: { alignItems: 'center', marginTop: 120, marginBottom: 16 },
  logo: {
    width: 600,
    height: 260,
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
  slotWrap: { flex: 1, maxWidth: 240, alignItems: 'center' },
  slotCard: {
    position: 'relative',
    backgroundColor: 'rgba(28, 22, 18, 0.78)',
    borderColor: 'rgba(212, 184, 138, 0.45)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    paddingBottom: 44,
    width: '100%',
    minHeight: 160,
    justifyContent: 'center',
  },
  slotEmpty: { color: THEME.ink, fontSize: 18, fontWeight: '700' },
  slotMeta: { color: THEME.ink, fontSize: 14, fontWeight: '700', marginTop: 2 },
  slotMetaDim: { color: THEME.inkMuted, fontSize: 12, marginTop: 2 },
  slotHint: { color: THEME.inkMuted, fontSize: 11, marginTop: 8 },
  slotResult: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
  },
  deleteBtn: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderColor: THEME.border,
    borderWidth: 1,
  },
  deleteBtnText: { color: THEME.bad, fontSize: 11, fontWeight: '700' },
  deleteBtnStrong: { backgroundColor: THEME.bad, borderColor: THEME.bad },
  deleteBtnTextStrong: { color: '#0a1729', fontWeight: '800' },
  historyBtn: {
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(212, 184, 138, 0.45)',
    backgroundColor: 'rgba(28, 22, 18, 0.6)',
  },
  historyBtnText: { color: THEME.ink, fontSize: 13, fontWeight: '700' },
  historyCard: {
    backgroundColor: 'rgba(28, 22, 18, 0.92)',
    borderColor: 'rgba(212, 184, 138, 0.45)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    width: '100%',
    maxWidth: 540,
    maxHeight: '85%',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyClose: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderColor: THEME.border,
    borderWidth: 1,
  },
  historyCloseText: { color: THEME.ink, fontSize: 12, fontWeight: '700' },
  historyEmpty: {
    color: THEME.inkMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 24,
  },
  historyList: { flexGrow: 0 },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 23, 41, 0.6)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    gap: 10,
  },
  historyKind: { fontSize: 12, fontWeight: '900', width: 64, letterSpacing: 1 },
  historyTitle: { color: THEME.ink, fontSize: 13, fontWeight: '700' },
  historyMeta: { color: THEME.inkMuted, fontSize: 11, marginTop: 2 },
  historyClear: {
    marginTop: 12,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderColor: THEME.border,
    borderWidth: 1,
  },
  historyClearText: { color: THEME.bad, fontSize: 11, fontWeight: '700' },
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
  confirmCard: {
    backgroundColor: 'rgba(28, 22, 18, 0.92)',
    borderColor: 'rgba(212, 184, 138, 0.45)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },
  confirmBody: {
    color: THEME.ink,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  confirmRow: { flexDirection: 'row', gap: 12 },
  confirmCancel: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  confirmCancelText: { color: THEME.ink, fontSize: 13, fontWeight: '700' },
  confirmDelete: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: THEME.bad,
    borderWidth: 1,
    borderColor: THEME.bad,
  },
  confirmDeleteText: { color: '#0a1729', fontSize: 13, fontWeight: '800' },
});
