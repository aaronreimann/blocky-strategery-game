import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { flagEmoji } from '@/src/data/countries';
import { TECH } from '@/src/data/tech';
import { useGame } from '@/src/state/game';

import { THEME } from './palette';

const HUMAN_IDX = 0;

type Props = {
  onClose: () => void;
  onOpenTech: () => void;
};

export default function KingdomMenu({ onClose, onOpenTech }: Props) {
  const players = useGame((s) => s.players);
  const cities = useGame((s) => s.cities);
  const requestJumpTo = useGame((s) => s.requestJumpTo);
  const selectCity = useGame((s) => s.selectCity);

  const human = players.find((p) => p.isHuman);
  if (!human) return null;
  const myCities = cities.filter((c) => c.ownerIdx === HUMAN_IDX);
  const researching = human.researching ? TECH[human.researching] : null;

  const onCityPress = (cityId: string, x: number, y: number) => {
    selectCity(cityId);
    requestJumpTo(x, y);
    onClose();
  };

  return (
    <Pressable style={styles.bg} onPress={onClose}>
      <Pressable style={styles.card} onPress={() => {}}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{human.name}</Text>
            {human.leader ? (
              <Text style={styles.subtitle}>{human.leader}</Text>
            ) : null}
          </View>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionLabel}>Tech</Text>
        <View style={styles.techRow}>
          <View style={{ flex: 1 }}>
            {researching ? (
              <Text style={styles.techText}>
                Researching {researching.name} · {human.science}/{researching.cost}
              </Text>
            ) : (
              <Text style={[styles.techText, { color: THEME.warn }]}>
                No active research
              </Text>
            )}
            <Text style={styles.techMeta}>
              Done: {human.researched.length}/{Object.keys(TECH).length}
            </Text>
          </View>
          <Pressable
            style={styles.changeBtn}
            onPress={() => {
              onClose();
              onOpenTech();
            }}
          >
            <Text style={styles.changeBtnText}>
              {researching ? 'Change' : 'Pick'}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.sectionLabel}>Cities ({myCities.length})</Text>
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {myCities.length === 0 ? (
            <Text style={styles.emptyText}>
              No cities yet — found one with a Wayfarer.
            </Text>
          ) : (
            myCities.map((c) => (
              <Pressable
                key={c.id}
                style={styles.cityRow}
                onPress={() => onCityPress(c.id, c.x, c.y)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.cityName}>{c.name}</Text>
                  <Text style={styles.cityMeta}>
                    Pop {c.population} · ({c.x}, {c.y})
                  </Text>
                </View>
                <Text style={styles.jumpHint}>jump →</Text>
              </Pressable>
            ))
          )}
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
    maxWidth: 540,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
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
  sectionLabel: {
    color: THEME.warn,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 4,
    marginBottom: 6,
  },
  techRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 23, 41, 0.6)',
    borderColor: THEME.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  techText: { color: THEME.ink, fontSize: 13, fontWeight: '700' },
  techMeta: { color: THEME.inkMuted, fontSize: 11, marginTop: 2 },
  changeBtn: {
    backgroundColor: THEME.warn,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  changeBtnText: { color: '#0a1729', fontSize: 12, fontWeight: '800' },
  list: { flexGrow: 0 },
  listContent: { gap: 6 },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 23, 41, 0.6)',
    borderColor: THEME.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  cityName: { color: THEME.ink, fontSize: 14, fontWeight: '700' },
  cityMeta: { color: THEME.inkMuted, fontSize: 11, marginTop: 2 },
  jumpHint: { color: THEME.warn, fontSize: 11, fontWeight: '700' },
  emptyText: {
    color: THEME.inkMuted,
    fontSize: 12,
    fontStyle: 'italic',
    padding: 8,
  },
});
