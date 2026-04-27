import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BUILDING_KINDS, BUILDING } from '@/src/data/buildings';
import { RESOURCE, RESOURCE_TYPES } from '@/src/data/resources';
import { TERRAIN, TERRAIN_TYPES } from '@/src/data/terrain';
import { UNIT, UNIT_KINDS } from '@/src/data/units';
import { RESOURCE_ICON } from '@/src/render/MapView';

import { GameIcon } from './GameIcon';
import { THEME } from './palette';

const UNIT_ICON_NAME: Record<string, Parameters<typeof GameIcon>[0]['name']> = {
  pioneer: 'wood_axe',
  worker: 'stone_axe',
  footman: 'visored_helm',
  spearman: 'spear_hook',
  horseman: 'horse_head',
  swordsman: 'broadsword',
  catapult: 'catapult',
  galley: 'caravel',
};

type Props = {
  onClose: () => void;
};

export default function LegendScreen({ onClose }: Props) {
  return (
    <Pressable style={styles.bg} onPress={onClose}>
      <Pressable style={styles.card} onPress={() => {}}>
        <View style={styles.header}>
          <Text style={styles.title}>Legend</Text>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.section}>Resources (the colored dots on tiles)</Text>
          {RESOURCE_TYPES.map((r) => {
            const spec = RESOURCE[r];
            const bonus = [
              spec.food ? `+${spec.food} food` : null,
              spec.prod ? `+${spec.prod} prod` : null,
              spec.trade ? `+${spec.trade} gold` : null,
            ]
              .filter(Boolean)
              .join(' · ');
            return (
              <View key={r} style={styles.row}>
                <GameIcon name={RESOURCE_ICON[r]} size={20} color={spec.color} />
                <Text style={styles.rowName}>{r}</Text>
                <Text style={styles.rowDesc}>
                  {bonus} · on {spec.on.join(', ')}
                </Text>
              </View>
            );
          })}

          <Text style={styles.section}>Terrain</Text>
          {TERRAIN_TYPES.map((t) => {
            const spec = TERRAIN[t];
            const yields = [
              spec.food ? `${spec.food}f` : null,
              spec.prod ? `${spec.prod}p` : null,
              spec.trade ? `${spec.trade}g` : null,
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <View key={t} style={styles.row}>
                <View style={[styles.colorSquare, { backgroundColor: spec.color }]} />
                <Text style={styles.rowName}>{t}</Text>
                <Text style={styles.rowDesc}>
                  {yields || 'no yield'}
                  {!spec.passable ? ' · land units cannot enter' : ''}
                  {spec.defenseBonus ? ` · +${spec.defenseBonus} defense` : ''}
                </Text>
              </View>
            );
          })}

          <Text style={styles.section}>Units</Text>
          {UNIT_KINDS.map((k) => {
            const spec = UNIT[k];
            const iconName = UNIT_ICON_NAME[k];
            return (
              <View key={k} style={styles.row}>
                {iconName ? (
                  <GameIcon name={iconName} size={22} color={THEME.ink} />
                ) : (
                  <View style={styles.colorSquare} />
                )}
                <Text style={styles.rowName}>{spec.name}</Text>
                <Text style={styles.rowDesc}>
                  Move {spec.move} · ATK {spec.attack} · DEF {spec.defense} · cost {spec.cost}
                  {spec.tech ? ` · needs ${spec.tech.replace(/_/g, ' ')}` : ''}
                </Text>
              </View>
            );
          })}

          <Text style={styles.section}>Cities</Text>
          <View style={styles.row}>
            <GameIcon name="castle" size={22} color={THEME.ink} />
            <Text style={styles.rowName}>Capital</Text>
            <Text style={styles.rowDesc}>your first founded city</Text>
          </View>
          <View style={styles.row}>
            <GameIcon name="house" size={22} color={THEME.ink} />
            <Text style={styles.rowName}>City</Text>
            <Text style={styles.rowDesc}>any subsequent city</Text>
          </View>

          <Text style={styles.section}>Buildings</Text>
          {BUILDING_KINDS.map((b) => (
            <View key={b} style={styles.row}>
              <View style={styles.colorSquare} />
              <Text style={styles.rowName}>{BUILDING[b].name}</Text>
              <Text style={styles.rowDesc}>{BUILDING[b].description}</Text>
            </View>
          ))}

          <Text style={styles.section}>Map indicators</Text>
          <View style={styles.row}>
            <View style={[styles.indicatorBox, { borderColor: '#facc15' }]}>
              <Text style={[styles.indicatorText, { color: '#facc15' }]}>M</Text>
            </View>
            <Text style={styles.rowName}>"M" badge</Text>
            <Text style={styles.rowDesc}>
              unit has a destination set; auto-walks each turn
            </Text>
          </View>
          <View style={styles.row}>
            <View style={[styles.indicatorBox, { borderColor: '#facc15' }]}>
              <Text style={[styles.indicatorText, { color: '#facc15' }]}>A</Text>
            </View>
            <Text style={styles.rowName}>"A" badge</Text>
            <Text style={styles.rowDesc}>
              Worker on auto-pilot (city focus or per-unit)
            </Text>
          </View>
          <View style={styles.row}>
            <View style={[styles.indicatorBox, { borderColor: '#facc15' }]}>
              <Text style={[styles.indicatorText, { color: '#facc15' }]}>x2</Text>
            </View>
            <Text style={styles.rowName}>"xN" badge</Text>
            <Text style={styles.rowDesc}>
              army of N units stacked on one tile (max 3)
            </Text>
          </View>
          <View style={styles.row}>
            <View style={[styles.colorSquare, { backgroundColor: '#ffe66455' }]} />
            <Text style={styles.rowName}>Yellow tile</Text>
            <Text style={styles.rowDesc}>valid move for selected unit</Text>
          </View>
          <View style={styles.row}>
            <View style={[styles.colorSquare, { backgroundColor: '#ef444466' }]} />
            <Text style={styles.rowName}>Red tile</Text>
            <Text style={styles.rowDesc}>attack target for selected unit</Text>
          </View>
          <View style={styles.row}>
            <View style={[styles.colorSquare, { borderColor: '#ffd84a', borderWidth: 2 }]} />
            <Text style={styles.rowName}>Gold ring</Text>
            <Text style={styles.rowDesc}>
              currently selected unit or city
            </Text>
          </View>
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
    backgroundColor: 'rgba(28, 22, 18, 0.95)',
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
    marginBottom: 8,
  },
  title: { color: THEME.ink, fontSize: 22, fontWeight: '900' },
  closeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderColor: THEME.border,
    borderWidth: 1,
  },
  closeText: { color: THEME.ink, fontSize: 12, fontWeight: '700' },
  scroll: { flexGrow: 0 },
  scrollContent: { gap: 4, paddingBottom: 8 },
  section: {
    color: THEME.warn,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  colorSquare: {
    width: 18,
    height: 18,
    borderRadius: 3,
    borderColor: THEME.border,
    borderWidth: 1,
  },
  rowName: {
    color: THEME.ink,
    fontSize: 12,
    fontWeight: '700',
    minWidth: 90,
    textTransform: 'capitalize',
  },
  rowDesc: { color: THEME.inkMuted, fontSize: 11, flex: 1 },
  indicatorBox: {
    width: 18,
    height: 18,
    borderWidth: 1,
    backgroundColor: '#0a1729',
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorText: { fontSize: 10, fontWeight: '800' },
});
