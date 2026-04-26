import { FontAwesome5 } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BUILDING, BUILDING_KINDS } from '@/src/data/buildings';
import { flagEmoji } from '@/src/data/countries';
import { IMPROVEMENT, tileKey } from '@/src/data/improvements';
import { TECH } from '@/src/data/tech';
import { UNIT, UNIT_KINDS } from '@/src/data/units';
import { computeCityYields, foodNeededToGrow } from '@/src/game/yields';
import {
  CITY_FOCUSES,
  CITY_FOCUS_LABELS,
  type CityBuildTarget,
} from '@/src/game/types';
import { useGame } from '@/src/state/game';

import { THEME } from './palette';
import TechScreen from './TechScreen';

function eventStyle(kind: string): { color: string } {
  switch (kind) {
    case 'battle':
      return { color: '#ef4444' };
    case 'grew':
      return { color: '#3aa675' };
    case 'built':
      return { color: '#facc15' };
    case 'research':
      return { color: '#06b6d4' };
    default:
      return { color: '#f5f1e8' };
  }
}

export default function Hud() {
  const [techOpen, setTechOpen] = useState(false);
  const [cityTab, setCityTab] = useState<'units' | 'buildings'>('units');
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
  const turnEvents = useGame((s) => s.turnEvents);
  const dismissTurnEvents = useGame((s) => s.dismissTurnEvents);
  const tilePicker = useGame((s) => s.tilePicker);
  const closeTilePicker = useGame((s) => s.closeTilePicker);
  const selectUnitFromPicker = useGame((s) => s.selectUnitFromPicker);
  const selectCityFromPicker = useGame((s) => s.selectCityFromPicker);
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

  // Reset the tab when switching to a different city; default it to whatever
  // the city is currently building.
  useEffect(() => {
    if (!selectedCity) return;
    setCityTab(selectedCity.building?.kind === 'building' ? 'buildings' : 'units');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCityId]);

  // Auto-dismiss the end-of-turn summary after a few seconds with a fade.
  const eventsOpacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (turnEvents.length === 0) return;
    eventsOpacity.setValue(1);
    const fadeTimeout = setTimeout(() => {
      Animated.timing(eventsOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) dismissTurnEvents();
      });
    }, 3500);
    return () => clearTimeout(fadeTimeout);
  }, [turnEvents, eventsOpacity, dismissTurnEvents]);

  // Friendly = human player only for HUD context.
  const myUnitsCount = units.filter((u) => u.ownerIdx === 0).length;
  const myCitiesCount = cities.filter((c) => c.ownerIdx === 0).length;
  const human = players.find((p) => p.isHuman) ?? null;
  const researched = human?.researched ?? [];
  const researching = human?.researching ?? null;
  const science = human?.science ?? 0;

  return (
    <SafeAreaView style={styles.root} pointerEvents="box-none">
      <View style={styles.topRow} pointerEvents="box-none">
        <Pressable style={styles.pillSquare} onPress={exitToTitle}>
          <FontAwesome5 name="home" size={14} color={THEME.ink} />
        </Pressable>
        {players[0] ? (
          <View style={[styles.pill, { borderColor: players[0].color }]}>
            <Text style={[styles.pillText, { color: players[0].color }]}>
              {flagEmoji(players[0].iso)} {players[0].name}
            </Text>
          </View>
        ) : null}
        <View style={styles.pill}>
          <Text style={styles.pillText}>Turn {turn}</Text>
        </View>
        <View style={styles.pill}>
          <FontAwesome5 name="chess-rook" size={12} color={THEME.ink} style={styles.pillIcon} />
          <Text style={styles.pillText}>{myCitiesCount}</Text>
          <FontAwesome5
            name="shield-alt"
            size={12}
            color={THEME.ink}
            style={[styles.pillIcon, { marginLeft: 10 }]}
          />
          <Text style={styles.pillText}>{myUnitsCount}</Text>
        </View>
        <Pressable
          style={[styles.pill, !researching && styles.pillAlert]}
          onPress={() => setTechOpen(true)}
        >
          <FontAwesome5
            name="flask"
            size={12}
            color={researching ? THEME.ink : THEME.warn}
            style={styles.pillIcon}
          />
          {researching ? (
            <Text style={styles.pillText}>
              {science}/{TECH[researching].cost} · {TECH[researching].name}
            </Text>
          ) : (
            <Text style={[styles.pillText, styles.pillAlertText]}>
              {science} · pick research
            </Text>
          )}
        </Pressable>
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

      {turnEvents.length > 0 ? (
        <Animated.View
          style={[styles.eventsWrap, { opacity: eventsOpacity }]}
          pointerEvents="box-none"
        >
          <Pressable
            onPress={dismissTurnEvents}
            style={styles.eventsCard}
            pointerEvents="auto"
          >
            <View style={styles.eventsHeader}>
              <Text style={styles.eventsTitle}>Last turn</Text>
              <Text style={styles.eventsCloseText}>tap to dismiss</Text>
            </View>
            {turnEvents.slice(0, 8).map((ev, i) => (
              <Text
                key={i}
                style={[styles.eventLine, eventStyle(ev.kind)]}
                numberOfLines={2}
              >
                · {ev.text}
              </Text>
            ))}
            {turnEvents.length > 8 ? (
              <Text style={styles.eventOverflow}>
                +{turnEvents.length - 8} more
              </Text>
            ) : null}
          </Pressable>
        </Animated.View>
      ) : null}

      <View style={styles.bottomRow} pointerEvents="box-none">
        {selectedUnit && unitSpec ? (
          <View style={styles.card} pointerEvents="auto">
            <Text style={styles.cardTitle}>
              {unitSpec.name}
              {selectedUnit.stack.length > 1 ? ` (Army x${selectedUnit.stack.length})` : ''}
            </Text>
            {selectedUnit.stack.length > 1 ? (
              <Text style={styles.cardMeta}>
                Moves {selectedUnit.movesLeft}/{unitSpec.move} · ATK{' '}
                {selectedUnit.stack.reduce((s, k) => s + UNIT[k].attack, 0)} · DEF{' '}
                {selectedUnit.stack.reduce((s, k) => s + UNIT[k].defense, 0)}
              </Text>
            ) : (
              <Text style={styles.cardMeta}>
                Moves {selectedUnit.movesLeft}/{unitSpec.move} · ATK {unitSpec.attack} · DEF {unitSpec.defense}
              </Text>
            )}
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
                <View style={styles.tabsRow}>
                  {(['units', 'buildings'] as const).map((t) => {
                    const cur = cityTab === t;
                    const isCurrentBuildHere =
                      (t === 'units' && selectedCity.building?.kind === 'unit') ||
                      (t === 'buildings' && selectedCity.building?.kind === 'building');
                    return (
                      <Pressable
                        key={t}
                        style={[styles.tab, cur && styles.tabActive]}
                        onPress={() => setCityTab(t)}
                      >
                        <Text style={[styles.tabText, cur && styles.tabTextActive]}>
                          {t === 'units' ? 'Units' : 'Buildings'}
                          {isCurrentBuildHere ? ' ●' : ''}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={styles.buildRow}>
                  {cityTab === 'units'
                    ? UNIT_KINDS.filter(
                        (k) => UNIT[k].tech === null || researched.includes(UNIT[k].tech!),
                      ).map((kind) => {
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
                      })
                    : BUILDING_KINDS.filter(
                        (k) => BUILDING[k].tech === null || researched.includes(BUILDING[k].tech!),
                      ).map((kind) => {
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

      {techOpen ? <TechScreen onClose={() => setTechOpen(false)} /> : null}

      {tilePicker ? (() => {
        const u = units.find(
          (un) => un.x === tilePicker.x && un.y === tilePicker.y && un.ownerIdx === 0,
        );
        const c = cities.find(
          (ci) => ci.x === tilePicker.x && ci.y === tilePicker.y && ci.ownerIdx === 0,
        );
        if (!u && !c) return null;
        return (
          <View style={styles.pickerBg}>
            <View style={styles.pickerCard}>
              <Text style={styles.pickerTitle}>What do you want?</Text>
              {u ? (
                <Pressable
                  style={styles.pickerBtn}
                  onPress={() => selectUnitFromPicker(u.id)}
                >
                  <Text style={styles.pickerBtnTitle}>{UNIT[u.kind].name}{u.stack.length > 1 ? ` (Army x${u.stack.length})` : ''}</Text>
                  <Text style={styles.pickerBtnSub}>Move or attack with this unit</Text>
                </Pressable>
              ) : null}
              {c ? (
                <Pressable
                  style={styles.pickerBtn}
                  onPress={() => selectCityFromPicker(c.id)}
                >
                  <Text style={styles.pickerBtnTitle}>{c.name}</Text>
                  <Text style={styles.pickerBtnSub}>Open city: build, focus</Text>
                </Pressable>
              ) : null}
              <Pressable style={styles.pickerCancel} onPress={closeTilePicker}>
                <Text style={styles.pickerCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        );
      })() : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between' },
  topRow: { flexDirection: 'row', gap: 8, padding: 12, flexWrap: 'wrap' },
  pill: {
    backgroundColor: 'rgba(21, 33, 54, 0.88)',
    borderColor: THEME.border,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pillSquare: {
    backgroundColor: 'rgba(21, 33, 54, 0.88)',
    borderColor: THEME.border,
    borderWidth: 1,
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillIcon: { marginRight: 5 },
  pillText: { color: THEME.ink, fontSize: 12, fontWeight: '600' },
  pillAlert: { borderColor: THEME.warn },
  pillAlertText: { color: THEME.warn },
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
  eventsWrap: {
    position: 'absolute',
    top: 56,
    left: 12,
    maxWidth: 320,
  },
  eventsCard: {
    backgroundColor: 'rgba(21, 33, 54, 0.92)',
    borderColor: THEME.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  eventsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  eventsTitle: { color: THEME.warn, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  eventsClose: { paddingHorizontal: 6, paddingVertical: 2 },
  eventsCloseText: { color: THEME.inkMuted, fontSize: 11, fontWeight: '700' },
  eventLine: { color: THEME.ink, fontSize: 11, marginTop: 2 },
  eventOverflow: { color: THEME.inkMuted, fontSize: 10, marginTop: 4 },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    padding: 12,
    gap: 12,
  },
  card: {
    backgroundColor: 'rgba(21, 33, 54, 0.92)',
    borderColor: THEME.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    minWidth: 240,
    maxWidth: 380,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
    borderTopColor: THEME.border,
    borderTopWidth: 1,
    paddingTop: 8,
  },
  tab: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: 'rgba(10, 23, 41, 0.6)',
  },
  tabActive: {
    backgroundColor: THEME.warn,
  },
  tabText: { color: THEME.inkMuted, fontSize: 11, fontWeight: '700' },
  tabTextActive: { color: '#0a1729' },
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
  pickerBg: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(10, 23, 41, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerCard: {
    backgroundColor: THEME.bgElevated,
    borderColor: THEME.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 18,
    minWidth: 280,
  },
  pickerTitle: {
    color: THEME.warn,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 12,
    textAlign: 'center',
  },
  pickerBtn: {
    backgroundColor: 'rgba(10, 23, 41, 0.6)',
    borderColor: THEME.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  pickerBtnTitle: { color: THEME.ink, fontSize: 14, fontWeight: '700' },
  pickerBtnSub: { color: THEME.inkMuted, fontSize: 11, marginTop: 2 },
  pickerCancel: { paddingVertical: 6, alignItems: 'center', marginTop: 4 },
  pickerCancelText: { color: THEME.inkMuted, fontSize: 12, fontWeight: '600' },
});
