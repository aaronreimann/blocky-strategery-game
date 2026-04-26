import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { UNIT } from '@/src/data/units';
import { useGame } from '@/src/state/game';

import { THEME } from './palette';

export default function Hud() {
  const turn = useGame((s) => s.turn);
  const units = useGame((s) => s.units);
  const cities = useGame((s) => s.cities);
  const selectedUnitId = useGame((s) => s.selectedUnitId);
  const endTurn = useGame((s) => s.endTurn);
  const foundCity = useGame((s) => s.foundCity);

  const selected = selectedUnitId ? units.find((u) => u.id === selectedUnitId) : null;
  const spec = selected ? UNIT[selected.kind] : null;

  return (
    <SafeAreaView style={styles.root} pointerEvents="box-none">
      {/* Top bar */}
      <View style={styles.topRow} pointerEvents="box-none">
        <View style={styles.pill}>
          <Text style={styles.pillText}>Turn {turn}</Text>
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillText}>Cities {cities.length}</Text>
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillText}>Units {units.length}</Text>
        </View>
      </View>

      {/* Bottom bar */}
      <View style={styles.bottomRow} pointerEvents="box-none">
        {selected && spec ? (
          <View style={styles.unitCard} pointerEvents="auto">
            <Text style={styles.unitName}>{spec.name}</Text>
            <Text style={styles.unitMeta}>
              Moves {selected.movesLeft}/{spec.move} · ATK {spec.attack} · DEF {spec.defense}
            </Text>
            {selected.kind === 'pioneer' ? (
              <Pressable style={styles.action} onPress={foundCity}>
                <Text style={styles.actionText}>Found City</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View style={styles.hint} pointerEvents="none">
            <Text style={styles.hintText}>Tap a unit to select · drag to pan · pinch to zoom</Text>
          </View>
        )}

        <Pressable style={styles.endTurn} onPress={endTurn}>
          <Text style={styles.endTurnText}>End Turn</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
  },
  pill: {
    backgroundColor: THEME.bgElevated,
    borderColor: THEME.border,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillText: {
    color: THEME.ink,
    fontSize: 12,
    fontWeight: '600',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    padding: 12,
    gap: 12,
  },
  unitCard: {
    backgroundColor: THEME.bgElevated,
    borderColor: THEME.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    minWidth: 200,
  },
  unitName: {
    color: THEME.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  unitMeta: {
    color: THEME.inkMuted,
    fontSize: 11,
    marginTop: 2,
  },
  action: {
    marginTop: 8,
    backgroundColor: THEME.good,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  actionText: {
    color: '#0a1729',
    fontWeight: '700',
    fontSize: 13,
  },
  hint: {
    flex: 1,
    alignSelf: 'center',
  },
  hintText: {
    color: THEME.inkMuted,
    fontSize: 11,
    textAlign: 'center',
  },
  endTurn: {
    backgroundColor: THEME.warn,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  endTurnText: {
    color: '#0a1729',
    fontWeight: '800',
    fontSize: 14,
  },
});
