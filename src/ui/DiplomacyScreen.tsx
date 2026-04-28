import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { TECH, type TechId } from '@/src/data/tech';
import { relationKey, treatyFor } from '@/src/game/types';
import { useGame } from '@/src/state/game';

import CultureIcon from './CultureIcon';
import { THEME } from './palette';

type Props = {
  onClose: () => void;
};

const HUMAN_IDX = 0;
const TRIBUTE_STEPS = [0, 25, 50, 100];

export default function DiplomacyScreen({ onClose }: Props) {
  const players = useGame((s) => s.players);
  const relations = useGame((s) => s.relations);
  const treaties = useGame((s) => s.treaties);
  const proposePeace = useGame((s) => s.proposePeace);
  const declareWar = useGame((s) => s.declareWar);
  const proposeTechTrade = useGame((s) => s.proposeTechTrade);

  const [tributeFor, setTributeFor] = useState<Record<number, number>>({});
  const [tradeOpenFor, setTradeOpenFor] = useState<number | null>(null);
  const [ourTechFor, setOurTechFor] = useState<TechId | null>(null);
  const [theirTechFor, setTheirTechFor] = useState<TechId | null>(null);

  const human = players.find((p) => p.idx === HUMAN_IDX);
  const others = players.filter((p) => p.idx !== HUMAN_IDX);

  const grudgeLabel = (g: number): string => {
    if (g <= 0) return 'forgiving';
    if (g < 5) return 'cautious';
    if (g < 12) return 'resentful';
    return 'vengeful';
  };

  return (
    <Pressable style={styles.bg} onPress={onClose}>
      <Pressable style={styles.card} onPress={() => {}}>
        <View style={styles.header}>
          <Text style={styles.title}>Diplomacy</Text>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
        <Text style={styles.treasuryHint}>Treasury: {human?.gold ?? 0}g</Text>
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {others.map((p) => {
            const at = relations[relationKey(HUMAN_IDX, p.idx)] ?? 'war';
            const treaty = treatyFor(treaties, HUMAN_IDX, p.idx);
            const tribute = tributeFor[p.idx] ?? 0;
            const tradeOpen = tradeOpenFor === p.idx;
            const ourCandidates = (human?.researched ?? []).filter(
              (t) => !p.researched.includes(t),
            ) as TechId[];
            const theirCandidates = p.researched.filter(
              (t) => !(human?.researched ?? []).includes(t),
            ) as TechId[];
            const peaceLockedNote =
              at === 'peace' && treaty.peaceTurnsLeft > 0
                ? `Treaty: ${treaty.peaceTurnsLeft} turn${treaty.peaceTurnsLeft === 1 ? '' : 's'} left`
                : null;
            return (
              <View key={p.idx} style={styles.row}>
                <View style={styles.rowTop}>
                  <View style={styles.rowLeft}>
                    <CultureIcon iso={p.iso} size={28} />
                    <View style={[styles.colorChip, { backgroundColor: p.color }]} />
                    <View>
                      <Text style={styles.realmName}>{p.name}</Text>
                      {p.leader ? (
                        <Text style={styles.realmLeader}>{p.leader}</Text>
                      ) : null}
                    </View>
                  </View>
                  <View style={styles.rowRight}>
                    <Text
                      style={[
                        styles.status,
                        { color: at === 'war' ? THEME.bad : THEME.good },
                      ]}
                    >
                      {at === 'war' ? 'AT WAR' : 'AT PEACE'}
                    </Text>
                    <Text style={styles.attitude}>
                      {grudgeLabel(treaty.grudge)}
                    </Text>
                  </View>
                </View>

                {peaceLockedNote ? (
                  <Text style={styles.peaceNote}>{peaceLockedNote}</Text>
                ) : null}

                <View style={styles.actionRow}>
                  {at === 'war' ? (
                    <>
                      <View style={styles.tributeRow}>
                        <Text style={styles.tributeLabel}>Tribute:</Text>
                        {TRIBUTE_STEPS.map((g) => {
                          const can = (human?.gold ?? 0) >= g;
                          const sel = tribute === g;
                          return (
                            <Pressable
                              key={g}
                              disabled={!can}
                              style={[
                                styles.chip,
                                sel && styles.chipSel,
                                !can && styles.chipDisabled,
                              ]}
                              onPress={() =>
                                setTributeFor({ ...tributeFor, [p.idx]: g })
                              }
                            >
                              <Text
                                style={[
                                  styles.chipText,
                                  sel && styles.chipTextSel,
                                ]}
                              >
                                {g}g
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                      <Pressable
                        style={styles.btn}
                        onPress={() => {
                          proposePeace(p.idx, tribute);
                          onClose();
                        }}
                      >
                        <Text style={styles.btnText}>
                          Offer peace{tribute > 0 ? ` (+${tribute}g)` : ''}
                        </Text>
                      </Pressable>
                    </>
                  ) : (
                    <Pressable
                      style={[styles.btn, styles.btnWar]}
                      onPress={() => {
                        declareWar(p.idx);
                        onClose();
                      }}
                    >
                      <Text style={[styles.btnText, styles.btnWarText]}>
                        {treaty.peaceTurnsLeft > 0
                          ? 'Break treaty & declare war'
                          : 'Declare war'}
                      </Text>
                    </Pressable>
                  )}
                </View>

                {ourCandidates.length > 0 && theirCandidates.length > 0 ? (
                  <View style={styles.tradeBlock}>
                    <Pressable
                      style={styles.tradeToggle}
                      onPress={() => {
                        if (tradeOpen) {
                          setTradeOpenFor(null);
                          setOurTechFor(null);
                          setTheirTechFor(null);
                        } else {
                          setTradeOpenFor(p.idx);
                          setOurTechFor(null);
                          setTheirTechFor(null);
                        }
                      }}
                    >
                      <Text style={styles.tradeToggleText}>
                        {tradeOpen ? 'Cancel trade' : 'Propose tech trade…'}
                      </Text>
                    </Pressable>
                    {tradeOpen ? (
                      <View>
                        <Text style={styles.tradeLabel}>Offer one of yours:</Text>
                        <View style={styles.tradeList}>
                          {ourCandidates.map((t) => {
                            const sel = ourTechFor === t;
                            return (
                              <Pressable
                                key={t}
                                style={[
                                  styles.techChip,
                                  sel && styles.techChipSel,
                                ]}
                                onPress={() => setOurTechFor(t)}
                              >
                                <Text
                                  style={[
                                    styles.techChipText,
                                    sel && styles.techChipTextSel,
                                  ]}
                                >
                                  {TECH[t].name}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                        <Text style={styles.tradeLabel}>Request one of theirs:</Text>
                        <View style={styles.tradeList}>
                          {theirCandidates.map((t) => {
                            const sel = theirTechFor === t;
                            return (
                              <Pressable
                                key={t}
                                style={[
                                  styles.techChip,
                                  sel && styles.techChipSel,
                                ]}
                                onPress={() => setTheirTechFor(t)}
                              >
                                <Text
                                  style={[
                                    styles.techChipText,
                                    sel && styles.techChipTextSel,
                                  ]}
                                >
                                  {TECH[t].name}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                        <Pressable
                          style={[
                            styles.btn,
                            (!ourTechFor || !theirTechFor) && styles.btnDisabled,
                          ]}
                          disabled={!ourTechFor || !theirTechFor}
                          onPress={() => {
                            if (!ourTechFor || !theirTechFor) return;
                            proposeTechTrade(p.idx, ourTechFor, theirTechFor);
                            onClose();
                          }}
                        >
                          <Text style={styles.btnText}>Propose trade</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bg: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(10, 23, 41, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: 'rgba(28, 22, 18, 0.92)',
    borderColor: 'rgba(212, 184, 138, 0.45)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    width: '100%',
    maxWidth: 720,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: { color: THEME.ink, fontSize: 22, fontWeight: '900' },
  treasuryHint: { color: THEME.warn, fontSize: 11, marginBottom: 8 },
  closeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderColor: THEME.border,
    borderWidth: 1,
  },
  closeText: { color: THEME.ink, fontSize: 12, fontWeight: '700' },
  list: { flexGrow: 0 },
  listContent: { gap: 10 },
  row: {
    backgroundColor: 'rgba(10, 23, 41, 0.6)',
    borderColor: THEME.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    gap: 6,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  colorChip: { width: 18, height: 18, borderRadius: 4 },
  realmName: { color: THEME.ink, fontSize: 14, fontWeight: '700' },
  realmLeader: { color: THEME.inkMuted, fontSize: 11, marginTop: 2 },
  rowRight: { alignItems: 'flex-end', gap: 2 },
  status: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  attitude: {
    color: THEME.inkMuted,
    fontSize: 10,
    fontStyle: 'italic',
  },
  peaceNote: {
    color: THEME.inkMuted,
    fontSize: 10,
    fontStyle: 'italic',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  tributeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tributeLabel: { color: THEME.inkMuted, fontSize: 11, marginRight: 4 },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  chipSel: { backgroundColor: THEME.warn, borderColor: THEME.warn },
  chipDisabled: { opacity: 0.4 },
  chipText: { color: THEME.ink, fontSize: 11, fontWeight: '700' },
  chipTextSel: { color: '#0a1729' },
  btn: {
    backgroundColor: THEME.good,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#0a1729', fontSize: 12, fontWeight: '800' },
  btnWar: { backgroundColor: THEME.bad },
  btnWarText: { color: '#0a1729' },
  tradeBlock: { gap: 6 },
  tradeToggle: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.border,
    alignSelf: 'flex-start',
  },
  tradeToggleText: { color: THEME.ink, fontSize: 11, fontWeight: '700' },
  tradeLabel: {
    color: THEME.inkMuted,
    fontSize: 10,
    marginTop: 6,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  tradeList: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  techChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  techChipSel: { backgroundColor: THEME.good, borderColor: THEME.good },
  techChipText: { color: THEME.ink, fontSize: 11 },
  techChipTextSel: { color: '#0a1729', fontWeight: '800' },
});
