import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BUILDING, BUILDING_KINDS } from '@/src/data/buildings';
import { IMPROVEMENT, tileKey } from '@/src/data/improvements';
import { UNIT, UNIT_KINDS } from '@/src/data/units';
import { computeCityYields, foodNeededToGrow } from '@/src/game/yields';
import {
  CITY_FOCUSES,
  CITY_FOCUS_LABELS,
  type CityBuildTarget,
} from '@/src/game/types';
import { useGame } from '@/src/state/game';

import { THEME } from './palette';

export default function Hud() {
  const turn = useGame((s) => s.turn);
  const map = useGame((s) => s.map);
  const units = useGame((s) => s.units);
  const cities = useGame((s) => s.cities);
  const improvements = useGame((s) => s.improvements);
  const players = useGame((s) => s.players);
  const currentSlot = useGame((s) => s.currentSlot);
  const selectedUnitId = useGame((s) => s.selectedUnitId);
  const selectedCityId = useGame((s) => s.selectedCityId);
  const lastBattle = useGame((s) => s.lastBattle);
  const endTurn = useGame((s) => s.endTurn);
  const foundCity = useGame((s) => s.foundCity);
  const setCityBuild = useGame((s) => s.setCityBuild);
  const setCityFocus = useGame((s) => s.setCityFocus);
  const startWork = useGame((s) => s.startWork);
  const cancelWork = useGame((s) => s.cancelWork);
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
        {players[0] ? (
          <View style={[styles.pill, { borderColor: players[0].color }]}>
            <Text style={[styles.pillText, { color: players[0].color }]}>
              {players[0].name}
              {players[0].leader ? ` · ${players[0].leader}` : ''}
            </Text>
          </View>
        ) : null}
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
            {selectedUnit.kind === 'laborer' ? (
              selectedUnit.workingOn ? (
                <View style={styles.workRow}>
                  <Text style={styles.cardMeta}>
                    Building {IMPROVEMENT[selectedUnit.workingOn].name}…{' '}
                    {selectedUnit.workTurnsLeft} turn
                    {selectedUnit.workTurnsLeft === 1 ? '' : 's'} left
                  </Text>
                  <Pressable style={styles.actionMuted} onPress={cancelWork}>
                    <Text style={styles.actionMutedText}>Cancel</Text>
                  </Pressable>
                </View>
              ) : improvements[tileKey(selectedUnit.x, selectedUnit.y)] ? (
                <Text style={styles.cardMeta}>
                  Tile already improved (
                  {IMPROVEMENT[improvements[tileKey(selectedUnit.x, selectedUnit.y)]].name})
                </Text>
              ) : (
                <Pressable style={styles.action} onPress={() => startWork('road')}>
                  <Text style={styles.actionText}>Build Road (2 turns)</Text>
                </Pressable>
              )
            ) : null}
          </View>
        ) : selectedCity ? (
          (() => {
            const yields = map ? computeCityYields(selectedCity, map) : null;
            const growthThreshold = foodNeededToGrow(selectedCity.population);
            const buildTargetLabel = (() => {
              if (!selectedCity.building) return 'Idle';
              if (selectedCity.building.kind === 'unit') {
                return UNIT[selectedCity.building.unit].name;
              }
              return BUILDING[selectedCity.building.building].name;
            })();
            const buildCost = (() => {
              if (!selectedCity.building) return 0;
              return selectedCity.building.kind === 'unit'
                ? UNIT[selectedCity.building.unit].cost
                : BUILDING[selectedCity.building.building].cost;
            })();
            const isCurrentTarget = (t: CityBuildTarget) => {
              const cur = selectedCity.building;
              if (!cur) return false;
              if (cur.kind !== t.kind) return false;
              return cur.kind === 'unit'
                ? cur.unit === (t as { unit: string }).unit
                : cur.building === (t as { building: string }).building;
            };
            const owns = (b: string) => selectedCity.buildings.includes(b as never);
            return (
              <View style={styles.card} pointerEvents="auto">
                <Text style={styles.cardTitle}>
                  {selectedCity.name} · Pop {selectedCity.population}
                </Text>
                {yields ? (
                  <Text style={styles.cardMeta}>
                    Food {selectedCity.food}/{growthThreshold} (
                    {yields.food >= 0 ? '+' : ''}
                    {yields.food}/turn) · Prod{' '}
                    {selectedCity.production}/{buildCost} (+{yields.prod}/turn)
                  </Text>
                ) : null}
                <Text style={styles.cardMeta}>Building: {buildTargetLabel}</Text>
                <View style={styles.focusRow}>
                  <Text style={styles.focusLabel}>Focus:</Text>
                  {CITY_FOCUSES.map((f) => {
                    const cur = selectedCity.focus === f;
                    return (
                      <Pressable
                        key={f}
                        style={[styles.focusBtn, cur && styles.focusBtnActive]}
                        onPress={() => setCityFocus(selectedCity.id, f)}
                      >
                        <Text
                          style={[
                            styles.focusBtnText,
                            cur && styles.focusBtnTextActive,
                          ]}
                        >
                          {CITY_FOCUS_LABELS[f]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={styles.buildRow}>
                  {UNIT_KINDS.map((kind) => {
                    const target: CityBuildTarget = { kind: 'unit', unit: kind };
                    const cur = isCurrentTarget(target);
                    return (
                      <Pressable
                        key={`u-${kind}`}
                        style={[styles.buildBtn, cur && styles.buildBtnActive]}
                        onPress={() => setCityBuild(selectedCity.id, target)}
                      >
                        <Text
                          style={[
                            styles.buildBtnText,
                            cur && styles.buildBtnTextActive,
                          ]}
                        >
                          {UNIT[kind].name}
                        </Text>
                        <Text
                          style={[
                            styles.buildBtnCost,
                            cur && styles.buildBtnTextActive,
                          ]}
                        >
                          {UNIT[kind].cost}
                        </Text>
                      </Pressable>
                    );
                  })}
                  {BUILDING_KINDS.map((kind) => {
                    const target: CityBuildTarget = { kind: 'building', building: kind };
                    const cur = isCurrentTarget(target);
                    const owned = owns(kind);
                    return (
                      <Pressable
                        key={`b-${kind}`}
                        style={[
                          styles.buildBtn,
                          styles.buildBtnBuilding,
                          cur && styles.buildBtnActive,
                          owned && styles.buildBtnOwned,
                        ]}
                        disabled={owned}
                        onPress={() => setCityBuild(selectedCity.id, target)}
                      >
                        <Text
                          style={[
                            styles.buildBtnText,
                            cur && styles.buildBtnTextActive,
                            owned && styles.buildBtnOwnedText,
                          ]}
                        >
                          {BUILDING[kind].name}
                        </Text>
                        <Text
                          style={[
                            styles.buildBtnCost,
                            cur && styles.buildBtnTextActive,
                            owned && styles.buildBtnOwnedText,
                          ]}
                        >
                          {owned ? 'owned' : BUILDING[kind].cost}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })()
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
  actionMuted: {
    marginTop: 8,
    backgroundColor: THEME.bg,
    borderColor: THEME.border,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  actionMutedText: { color: THEME.inkMuted, fontWeight: '700', fontSize: 12 },
  workRow: { marginTop: 6 },
  focusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  focusLabel: { color: THEME.inkMuted, fontSize: 11 },
  focusBtn: {
    backgroundColor: THEME.bg,
    borderColor: THEME.border,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  focusBtnActive: { backgroundColor: THEME.warn, borderColor: THEME.warn },
  focusBtnText: { color: THEME.ink, fontSize: 11, fontWeight: '700' },
  focusBtnTextActive: { color: '#0a1729' },
  buildRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
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
  buildBtnBuilding: { borderColor: THEME.warn },
  buildBtnOwned: { opacity: 0.4 },
  buildBtnText: { color: THEME.ink, fontSize: 12, fontWeight: '700' },
  buildBtnTextActive: { color: '#0a1729' },
  buildBtnOwnedText: { color: THEME.inkMuted },
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
