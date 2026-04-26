import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { UNIT, UNIT_KINDS, type UnitKind } from '@/src/data/units';
import { useGame } from '@/src/state/game';

import { THEME } from './palette';

export default function Hud() {
  const turn = useGame((s) => s.turn);
  const units = useGame((s) => s.units);
  const cities = useGame((s) => s.cities);
  const players = useGame((s) => s.players);
  const currentSlot = useGame((s) => s.currentSlot);
  const selectedUnitId = useGame((s) => s.selectedUnitId);
  const selectedCityId = useGame((s) => s.selectedCityId);
  const lastBattle = useGame((s) => s.lastBattle);
  const endTurn = useGame((s) => s.endTurn);
  const foundCity = useGame((s) => s.foundCity);
  const setCityBuild = useGame((s) => s.setCityBuild);
  const exitToTitle = useGame((s) => s.exitToTitle);
  const dismissBattle = useGame((s) => s.dismissBattle);

  const selectedUnit = selectedUnitId ? units.find((u) => u.id === selectedUnitId) : null;
  const unitSpec = selectedUnit ? UNIT[selectedUnit.kind] : null;
  const selectedCity = selectedCityId ? cities.find((c) => c.id === selectedCityId) : null;

  // Friendly = human player only for HUD context.
  const myUnitsCount = units.filter((u) => u.ownerIdx === 0).length;
  const myCitiesCount = cities.filter((c) => c.ownerIdx === 0).length;

  return (
    <SafeAreaView style={styles.root} pointerEvents="box-none">
      <View style={styles.topRow} pointerEvents="box-none">
        <Pressable style={styles.pill} onPress={exitToTitle}>
          <Text style={styles.pillText}>← Title</Text>
        </Pressable>
        <View style={styles.pill}>
          <Text style={styles.pillText}>
            Realm {currentSlot !== null ? currentSlot + 1 : '?'} · Turn {turn}
          </Text>
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillText}>
            Cities {myCitiesCount} · Units {myUnitsCount}
          </Text>
        </View>
        {players.length > 1 ? (
          <View style={[styles.pill, { borderColor: players[1].color }]}>
            <Text style={[styles.pillText, { color: players[1].color }]}>
              vs {players[1].name}
            </Text>
          </View>
        ) : null}
      </View>

      {lastBattle ? (
        <View style={styles.toastWrap} pointerEvents="box-none">
          <Pressable style={styles.toast} onPress={dismissBattle}>
            <Text style={styles.toastText}>
              {UNIT[lastBattle.attackerKind].name} {lastBattle.attackerWon ? 'beat' : 'lost to'}{' '}
              {UNIT[lastBattle.defenderKind].name} ({lastBattle.attackerRoll} vs{' '}
              {lastBattle.defenderRoll})
            </Text>
            <Text style={styles.toastDismiss}>tap to dismiss</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.bottomRow} pointerEvents="box-none">
        {selectedUnit && unitSpec ? (
          <View style={styles.card} pointerEvents="auto">
            <Text style={styles.cardTitle}>{unitSpec.name}</Text>
            <Text style={styles.cardMeta}>
              Moves {selectedUnit.movesLeft}/{unitSpec.move} · ATK {unitSpec.attack} · DEF {unitSpec.defense}
            </Text>
            {selectedUnit.kind === 'pioneer' ? (
              <Pressable style={styles.action} onPress={foundCity}>
                <Text style={styles.actionText}>Found City</Text>
              </Pressable>
            ) : null}
          </View>
        ) : selectedCity ? (
          <View style={styles.card} pointerEvents="auto">
            <Text style={styles.cardTitle}>{selectedCity.name}</Text>
            <Text style={styles.cardMeta}>
              Pop {selectedCity.population} · +{selectedCity.productionPerTurn}/turn
            </Text>
            {selectedCity.building ? (
              <Text style={styles.cardMeta}>
                Building: {UNIT[selectedCity.building].name} ({selectedCity.production}/
                {UNIT[selectedCity.building].cost})
              </Text>
            ) : (
              <Text style={styles.cardMeta}>Idle — pick something to build</Text>
            )}
            <View style={styles.buildRow}>
              {UNIT_KINDS.map((kind) => {
                const isCurrent = selectedCity.building === kind;
                return (
                  <Pressable
                    key={kind}
                    style={[styles.buildBtn, isCurrent && styles.buildBtnActive]}
                    onPress={() => setCityBuild(selectedCity.id, kind as UnitKind)}
                  >
                    <Text style={[styles.buildBtnText, isCurrent && styles.buildBtnTextActive]}>
                      {UNIT[kind].name}
                    </Text>
                    <Text style={[styles.buildBtnCost, isCurrent && styles.buildBtnTextActive]}>
                      {UNIT[kind].cost}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={styles.hint} pointerEvents="none">
            <Text style={styles.hintText}>
              Tap a unit/city · yellow tiles = move · red tiles = attack
            </Text>
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
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between' },
  topRow: { flexDirection: 'row', gap: 8, padding: 12, flexWrap: 'wrap' },
  pill: {
    backgroundColor: THEME.bgElevated,
    borderColor: THEME.border,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillText: { color: THEME.ink, fontSize: 12, fontWeight: '600' },
  toastWrap: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  toast: {
    backgroundColor: THEME.bgElevated,
    borderColor: THEME.warn,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  toastText: { color: THEME.ink, fontSize: 13, fontWeight: '700' },
  toastDismiss: { color: THEME.inkMuted, fontSize: 10, marginTop: 2 },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    padding: 12,
    gap: 12,
  },
  card: {
    backgroundColor: THEME.bgElevated,
    borderColor: THEME.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    minWidth: 240,
    maxWidth: 360,
  },
  cardTitle: { color: THEME.ink, fontSize: 14, fontWeight: '700' },
  cardMeta: { color: THEME.inkMuted, fontSize: 11, marginTop: 2 },
  action: {
    marginTop: 8,
    backgroundColor: THEME.good,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  actionText: { color: '#0a1729', fontWeight: '700', fontSize: 13 },
  buildRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  buildBtn: {
    backgroundColor: THEME.bg,
    borderColor: THEME.border,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    minWidth: 60,
  },
  buildBtnActive: { backgroundColor: THEME.good, borderColor: THEME.good },
  buildBtnText: { color: THEME.ink, fontSize: 12, fontWeight: '700' },
  buildBtnTextActive: { color: '#0a1729' },
  buildBtnCost: { color: THEME.inkMuted, fontSize: 10 },
  hint: { flex: 1, alignSelf: 'center' },
  hintText: { color: THEME.inkMuted, fontSize: 11, textAlign: 'center' },
  endTurn: {
    backgroundColor: THEME.warn,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  endTurnText: { color: '#0a1729', fontWeight: '800', fontSize: 14 },
});
