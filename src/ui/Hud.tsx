import { FontAwesome5 } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BUILDING, BUILDING_KINDS } from '@/src/data/buildings';
import { flagEmoji } from '@/src/data/countries';
import { IMPROVEMENT, tileKey } from '@/src/data/improvements';
import { TECH } from '@/src/data/tech';
import { UNIT, UNIT_KINDS } from '@/src/data/units';
import { WONDER, WONDER_KINDS } from '@/src/data/wonders';
import { computeCityYields, foodNeededToGrow } from '@/src/game/yields';
import {
  CITY_FOCUSES,
  CITY_FOCUS_LABELS,
  type CityBuildTarget,
} from '@/src/game/types';
import { useGame } from '@/src/state/game';
import { isTutorialSeen, markTutorialSeen } from '@/src/state/saves';

import DiplomacyScreen from './DiplomacyScreen';
import KingdomMenu from './KingdomMenu';
import { GameIcon } from './GameIcon';
import LegendScreen from './LegendScreen';
import { THEME } from './palette';
import ScoreScreen from './ScoreScreen';
import TechScreen from './TechScreen';
import TutorialOverlay from './TutorialOverlay';

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
    case 'event':
      return { color: '#a855f7' };
    default:
      return { color: '#f5f1e8' };
  }
}

export default function Hud() {
  const [techOpen, setTechOpen] = useState(false);
  const [diploOpen, setDiploOpen] = useState(false);
  const [kingdomOpen, setKingdomOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [scoreOpen, setScoreOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [cityTab, setCityTab] = useState<'units' | 'buildings' | 'wonders'>('units');
  const turn = useGame((s) => s.turn);
  const map = useGame((s) => s.map);
  const units = useGame((s) => s.units);
  const cities = useGame((s) => s.cities);
  const improvements = useGame((s) => s.improvements);
  const wonders = useGame((s) => s.wonders);
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
  const enqueueBuild = useGame((s) => s.enqueueBuild);
  const removeFromQueue = useGame((s) => s.removeFromQueue);
  const setCityFocus = useGame((s) => s.setCityFocus);
  const startWork = useGame((s) => s.startWork);
  const cancelWork = useGame((s) => s.cancelWork);
  const armSetDestination = useGame((s) => s.armSetDestination);
  const cancelSetDestination = useGame((s) => s.cancelSetDestination);
  const awaitingDestinationFor = useGame((s) => s.awaitingDestinationFor);
  const clearUnitDestination = useGame((s) => s.clearUnitDestination);
  const toggleWorkerAuto = useGame((s) => s.toggleWorkerAuto);
  const exitToTitle = useGame((s) => s.exitToTitle);
  const dismissBattle = useGame((s) => s.dismissBattle);

  const selectedUnit = selectedUnitId ? units.find((u) => u.id === selectedUnitId) : null;
  const unitSpec = selectedUnit ? UNIT[selectedUnit.kind] : null;
  const selectedCity = selectedCityId ? cities.find((c) => c.id === selectedCityId) : null;

  // Reset the tab when switching to a different city; default it to whatever
  // the city is currently building.
  useEffect(() => {
    if (!selectedCity) return;
    const k = selectedCity.building?.kind;
    setCityTab(k === 'building' ? 'buildings' : k === 'wonder' ? 'wonders' : 'units');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCityId]);

  // First-run tutorial: open automatically on first session, then never
  // again until the user explicitly resets. Reopenable from the Help pill.
  useEffect(() => {
    let cancelled = false;
    isTutorialSeen().then((seen) => {
      if (!cancelled && !seen) setTutorialOpen(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const closeTutorial = () => {
    setTutorialOpen(false);
    markTutorialSeen().catch(() => {});
  };

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
  const gold = human?.gold ?? 0;
  const rushBuild = useGame((s) => s.rushBuild);

  return (
    <SafeAreaView style={styles.root} pointerEvents="box-none">
      <View style={styles.topRow} pointerEvents="box-none">
        <Pressable style={styles.pillSquare} onPress={exitToTitle}>
          <FontAwesome5 name="home" size={14} color={THEME.ink} />
        </Pressable>
        <View style={styles.pill}>
          <Text style={styles.pillText}>Turn {turn}</Text>
        </View>
        <View style={styles.pill}>
          <GameIcon name="castle" size={16} color={THEME.ink} style={styles.pillIcon} />
          <Text style={styles.pillText}>{myCitiesCount}</Text>
          <GameIcon
            name="crossed_swords"
            size={16}
            color={THEME.ink}
            style={[styles.pillIcon, { marginLeft: 10 }]}
          />
          <Text style={styles.pillText}>{myUnitsCount}</Text>
        </View>
        <Pressable style={styles.pill} onPress={() => setTechOpen(true)}>
          <FontAwesome5
            name="flask"
            size={12}
            color={THEME.ink}
            style={styles.pillIcon}
          />
          {researching ? (
            <Text style={styles.pillText}>
              {science}/{TECH[researching].cost}
            </Text>
          ) : (
            <Text style={styles.pillText}>All researched</Text>
          )}
        </Pressable>
        <View style={styles.pill}>
          <GameIcon name="gold_bar" size={16} color={THEME.warn} style={styles.pillIcon} />
          <Text style={styles.pillText}>{gold}</Text>
        </View>
        <Pressable style={styles.pillSquare} onPress={() => setDiploOpen(true)}>
          <FontAwesome5 name="handshake" size={14} color={THEME.ink} />
        </Pressable>
        <Pressable
          style={styles.pillSquare}
          onPress={() => setLegendOpen(true)}
          onLongPress={() => setTutorialOpen(true)}
        >
          <FontAwesome5 name="question" size={14} color={THEME.ink} />
        </Pressable>
        <Pressable style={styles.pillSquare} onPress={() => setTutorialOpen(true)}>
          <FontAwesome5 name="book" size={13} color={THEME.ink} />
        </Pressable>
        <Pressable style={styles.pillSquare} onPress={() => setScoreOpen(true)}>
          <FontAwesome5 name="trophy" size={14} color={THEME.ink} />
        </Pressable>
        <View style={{ flex: 1 }} />
        {players[0] ? (
          <Pressable
            style={[styles.pill, { borderColor: players[0].color }]}
            onPress={() => setKingdomOpen(true)}
          >
            <Text style={[styles.pillText, { color: players[0].color }]}>
              {flagEmoji(players[0].iso)} {players[0].name}
            </Text>
          </Pressable>
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

      <View style={styles.bottomRightStack} pointerEvents="box-none">
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
            <View style={styles.unitActionsRow}>
              {awaitingDestinationFor === selectedUnit.id ? (
                <Pressable style={styles.actionMuted} onPress={cancelSetDestination}>
                  <Text style={styles.actionMutedText}>Cancel — tap a tile to send, or here to abort</Text>
                </Pressable>
              ) : (
                <Pressable style={styles.actionMuted} onPress={armSetDestination}>
                  <Text style={styles.actionMutedText}>Set destination…</Text>
                </Pressable>
              )}
              {selectedUnit.destination ? (
                <Pressable
                  style={styles.actionMuted}
                  onPress={() => clearUnitDestination(selectedUnit.id)}
                >
                  <Text style={styles.actionMutedText}>Cancel destination</Text>
                </Pressable>
              ) : null}
              {selectedUnit.kind === 'worker' ? (
                <Pressable
                  style={[
                    styles.actionMuted,
                    selectedUnit.autoMode && styles.actionAutoOn,
                  ]}
                  onPress={toggleWorkerAuto}
                >
                  <Text
                    style={[
                      styles.actionMutedText,
                      selectedUnit.autoMode && styles.actionAutoOnText,
                    ]}
                  >
                    Auto: {selectedUnit.autoMode ? 'on' : 'off'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
            {selectedUnit.kind === 'worker' ? (
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
                (() => {
                  if (!map) return null;
                  const tile = map.tiles[selectedUnit.y * map.width + selectedUnit.x];
                  const t = tile.terrain;
                  type ImpKind = 'road' | 'farm' | 'mine' | 'irrigation';
                  const opts: { kind: ImpKind; label: string }[] = [];
                  if (t !== 'ocean' && t !== 'mountains') {
                    opts.push({ kind: 'road', label: 'Road' });
                  }
                  if (t === 'grassland' || t === 'plains' || t === 'desert') {
                    opts.push({ kind: 'farm', label: 'Farm' });
                  }
                  if (t === 'hills' || t === 'mountains') {
                    opts.push({ kind: 'mine', label: 'Mine' });
                  }
                  if (t === 'grassland' || t === 'plains' || t === 'desert') {
                    let waterAdj = false;
                    for (let dy = -1; dy <= 1 && !waterAdj; dy++) {
                      for (let dx = -1; dx <= 1 && !waterAdj; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const nx = selectedUnit.x + dx;
                        const ny = selectedUnit.y + dy;
                        if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) continue;
                        const nt = map.tiles[ny * map.width + nx].terrain;
                        if (nt === 'coast' || nt === 'ocean') waterAdj = true;
                      }
                    }
                    if (waterAdj) opts.push({ kind: 'irrigation', label: 'Irrigation' });
                  }
                  if (opts.length === 0) {
                    return <Text style={styles.cardMeta}>Nothing to build on this tile.</Text>;
                  }
                  return (
                    <View style={styles.unitActionsRow}>
                      {opts.map((o) => (
                        <Pressable
                          key={o.kind}
                          style={styles.actionMuted}
                          onPress={() => startWork(o.kind)}
                        >
                          <Text style={styles.actionMutedText}>Build {o.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                  );
                })()
              )
            ) : null}
          </View>
        ) : selectedCity ? (
          (() => {
            const yields = map ? computeCityYields(selectedCity, map, wonders, improvements) : null;
            const growthThreshold = foodNeededToGrow(selectedCity.population);
            const buildTargetLabel = (() => {
              const b = selectedCity.building;
              if (!b) return 'Idle';
              if (b.kind === 'unit') return UNIT[b.unit].name;
              if (b.kind === 'building') return BUILDING[b.building].name;
              return WONDER[b.wonder].name;
            })();
            const buildCost = (() => {
              const b = selectedCity.building;
              if (!b) return 0;
              if (b.kind === 'unit') return UNIT[b.unit].cost;
              if (b.kind === 'building') return BUILDING[b.building].cost;
              return WONDER[b.wonder].cost;
            })();
            const isCurrentTarget = (t: CityBuildTarget) => {
              const cur = selectedCity.building;
              if (!cur) return false;
              if (cur.kind !== t.kind) return false;
              if (cur.kind === 'unit' && t.kind === 'unit') return cur.unit === t.unit;
              if (cur.kind === 'building' && t.kind === 'building')
                return cur.building === t.building;
              if (cur.kind === 'wonder' && t.kind === 'wonder')
                return cur.wonder === t.wonder;
              return false;
            };
            const owns = (b: string) => selectedCity.buildings.includes(b as never);
            const wonderTaken = (w: string) =>
              wonders.some((x) => x.kind === w);
            return (
              <View style={styles.card} pointerEvents="auto">
                <Text style={styles.cardTitle}>
                  {selectedCity.name} · Pop {selectedCity.population}
                </Text>
                {yields ? (
                  <Text style={styles.cardMeta}>
                    Food {selectedCity.food}/{growthThreshold} (
                    {yields.food >= 0 ? '+' : ''}
                    {yields.food}/t) · Prod {selectedCity.production}/{buildCost} (+
                    {yields.prod}/t) · Gold +{yields.gold}/t
                  </Text>
                ) : null}
                {yields?.disorder ? (
                  <Text style={[styles.cardMeta, { color: THEME.bad, fontWeight: '700' }]}>
                    Disorder · {yields.unhappy} unhappy vs {yields.happy} happy · production halted
                  </Text>
                ) : null}
                <Text style={styles.cardMeta}>Building: {buildTargetLabel}</Text>
                {selectedCity.buildQueue.length > 0 ? (
                  <View style={styles.queueRow}>
                    <Text style={styles.queueLabel}>Up next:</Text>
                    {selectedCity.buildQueue.map((q, i) => {
                      const label =
                        q.kind === 'unit'
                          ? UNIT[q.unit].name
                          : q.kind === 'building'
                            ? BUILDING[q.building].name
                            : WONDER[q.wonder].name;
                      return (
                        <Pressable
                          key={`q-${i}`}
                          style={styles.queueChip}
                          onPress={() => removeFromQueue(selectedCity.id, i)}
                        >
                          <Text style={styles.queueChipText}>{label} ✕</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
                {selectedCity.building &&
                selectedCity.production < buildCost ? (() => {
                  const remaining = buildCost - selectedCity.production;
                  const rushCost = remaining * 2;
                  const canAfford = gold >= rushCost;
                  return (
                    <Pressable
                      style={[
                        styles.actionMuted,
                        { marginTop: 6 },
                        !canAfford && { opacity: 0.45 },
                      ]}
                      disabled={!canAfford}
                      onPress={() => rushBuild(selectedCity.id)}
                    >
                      <Text style={styles.actionMutedText}>
                        Rush · {rushCost} gold
                      </Text>
                    </Pressable>
                  );
                })() : null}
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
                  {(['units', 'buildings', 'wonders'] as const).map((t) => {
                    const cur = cityTab === t;
                    const isCurrentBuildHere =
                      (t === 'units' && selectedCity.building?.kind === 'unit') ||
                      (t === 'buildings' && selectedCity.building?.kind === 'building') ||
                      (t === 'wonders' && selectedCity.building?.kind === 'wonder');
                    const label =
                      t === 'units' ? 'Units' : t === 'buildings' ? 'Buildings' : 'Wonders';
                    return (
                      <Pressable
                        key={t}
                        style={[styles.tab, cur && styles.tabActive]}
                        onPress={() => setCityTab(t)}
                      >
                        <Text style={[styles.tabText, cur && styles.tabTextActive]}>
                          {label}
                          {isCurrentBuildHere ? ' ●' : ''}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={styles.queueHint}>Tap to build · long-press to queue</Text>
                <View style={styles.buildRow}>
                  {cityTab === 'wonders'
                    ? WONDER_KINDS.filter(
                        (k) => WONDER[k].tech === null || researched.includes(WONDER[k].tech!),
                      ).map((kind) => {
                        const target: CityBuildTarget = { kind: 'wonder', wonder: kind };
                        const cur = isCurrentTarget(target);
                        const taken = wonderTaken(kind);
                        return (
                          <Pressable
                            key={`w-${kind}`}
                            style={[
                              styles.buildBtn,
                              styles.buildBtnBuilding,
                              cur && styles.buildBtnActive,
                              taken && styles.buildBtnOwned,
                            ]}
                            disabled={taken}
                            onPress={() => setCityBuild(selectedCity.id, target)}
                            onLongPress={() => enqueueBuild(selectedCity.id, target)}
                          >
                            <Text
                              style={[
                                styles.buildBtnText,
                                cur && styles.buildBtnTextActive,
                                taken && styles.buildBtnOwnedText,
                              ]}
                            >
                              {WONDER[kind].name}
                            </Text>
                            <Text
                              style={[
                                styles.buildBtnCost,
                                cur && styles.buildBtnTextActive,
                                taken && styles.buildBtnOwnedText,
                              ]}
                            >
                              {taken ? 'taken' : WONDER[kind].cost}
                            </Text>
                          </Pressable>
                        );
                      })
                    : cityTab === 'units'
                    ? UNIT_KINDS.filter((k) => {
                        if (UNIT[k].tech !== null && !researched.includes(UNIT[k].tech!)) {
                          return false;
                        }
                        if (UNIT[k].domain === 'sea' && map) {
                          // Sea units need a water tile adjacent to the city.
                          for (let dy = -1; dy <= 1; dy++) {
                            for (let dx = -1; dx <= 1; dx++) {
                              if (dx === 0 && dy === 0) continue;
                              const nx = selectedCity.x + dx;
                              const ny = selectedCity.y + dy;
                              if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) continue;
                              const t = map.tiles[ny * map.width + nx];
                              if (t.terrain === 'coast' || t.terrain === 'ocean') return true;
                            }
                          }
                          return false;
                        }
                        return true;
                      }).map((kind) => {
                        const target: CityBuildTarget = { kind: 'unit', unit: kind };
                        const cur = isCurrentTarget(target);
                        return (
                          <Pressable
                            key={`u-${kind}`}
                            style={[styles.buildBtn, cur && styles.buildBtnActive]}
                            onPress={() => setCityBuild(selectedCity.id, target)}
                            onLongPress={() => enqueueBuild(selectedCity.id, target)}
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
                            onLongPress={() => enqueueBuild(selectedCity.id, target)}
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
        ) : null}

        <Pressable style={styles.endTurn} onPress={endTurn}>
          <Text style={styles.endTurnText}>End Turn</Text>
        </Pressable>
      </View>

      {techOpen ? <TechScreen onClose={() => setTechOpen(false)} /> : null}
      {diploOpen ? <DiplomacyScreen onClose={() => setDiploOpen(false)} /> : null}
      {kingdomOpen ? (
        <KingdomMenu
          onClose={() => setKingdomOpen(false)}
          onOpenTech={() => setTechOpen(true)}
        />
      ) : null}
      {legendOpen ? <LegendScreen onClose={() => setLegendOpen(false)} /> : null}
      {scoreOpen ? <ScoreScreen onClose={() => setScoreOpen(false)} /> : null}
      {tutorialOpen ? <TutorialOverlay onClose={closeTutorial} /> : null}

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
  bottomRightStack: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    alignItems: 'flex-end',
    gap: 8,
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
  actionAutoOn: { backgroundColor: THEME.warn, borderColor: THEME.warn },
  actionAutoOnText: { color: '#0a1729' },
  workRow: { marginTop: 6 },
  unitActionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  queueRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  queueLabel: { color: THEME.inkMuted, fontSize: 11 },
  queueChip: {
    backgroundColor: THEME.bg,
    borderColor: THEME.border,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  queueChipText: { color: THEME.ink, fontSize: 11, fontWeight: '700' },
  queueHint: { color: THEME.inkMuted, fontSize: 10, marginTop: 8, fontStyle: 'italic' },
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
