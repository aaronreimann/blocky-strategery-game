import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGame } from '@/src/state/game';
import { deleteSlot, listSlots, type SlotInfo } from '@/src/state/saves';

import { THEME } from './palette';

export default function TitleScreen() {
  const newGame = useGame((s) => s.newGame);
  const loadFromSlot = useGame((s) => s.loadFromSlot);

  const [slots, setSlots] = useState<SlotInfo[]>([]);

  const refresh = useCallback(async () => {
    const list = await listSlots();
    setSlots(list);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onSlotPress = async (slot: number, info: SlotInfo) => {
    if (info.empty) {
      newGame(slot, Date.now() & 0x7fffffff);
    } else {
      const ok = await loadFromSlot(slot);
      if (!ok) {
        // Save was corrupt — start fresh in that slot.
        newGame(slot, Date.now() & 0x7fffffff);
      }
    }
  };

  const onDelete = async (slot: number) => {
    await deleteSlot(slot);
    refresh();
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Civ-App</Text>
        <Text style={styles.subtitle}>Pick a slot</Text>
      </View>

      <View style={styles.slotRow}>
        {slots.map((info) => (
          <View key={info.slot} style={styles.slotWrap}>
            <Pressable style={styles.slotCard} onPress={() => onSlotPress(info.slot, info)}>
              <Text style={styles.slotNumber}>Slot {info.slot + 1}</Text>
              {info.empty ? (
                <>
                  <Text style={styles.slotEmpty}>Empty</Text>
                  <Text style={styles.slotHint}>Tap to start</Text>
                </>
              ) : (
                <>
                  <Text style={styles.slotMeta}>Turn {info.turn}</Text>
                  <Text style={styles.slotMeta}>
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
    </SafeAreaView>
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
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    color: THEME.ink,
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: 2,
  },
  subtitle: {
    color: THEME.inkMuted,
    fontSize: 14,
    marginTop: 6,
  },
  slotRow: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
    maxWidth: 720,
    justifyContent: 'center',
  },
  slotWrap: {
    flex: 1,
    maxWidth: 220,
    alignItems: 'center',
    gap: 8,
  },
  slotCard: {
    backgroundColor: THEME.bgElevated,
    borderColor: THEME.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    width: '100%',
    minHeight: 140,
    justifyContent: 'center',
  },
  slotNumber: {
    color: THEME.warn,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  slotEmpty: {
    color: THEME.ink,
    fontSize: 18,
    fontWeight: '700',
  },
  slotMeta: {
    color: THEME.ink,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  slotHint: {
    color: THEME.inkMuted,
    fontSize: 11,
    marginTop: 8,
  },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderColor: THEME.border,
    borderWidth: 1,
  },
  deleteBtnText: {
    color: THEME.bad,
    fontSize: 11,
    fontWeight: '700',
  },
});
