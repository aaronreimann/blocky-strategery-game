import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { IMPROVEMENT, type ImprovementKind } from '@/src/data/improvements';
import { RESOURCE } from '@/src/data/resources';
import { TERRAIN } from '@/src/data/terrain';
import type { GameMap } from '@/src/game/map';

import { THEME } from './palette';

type Props = {
  x: number;
  y: number;
  screenX: number;
  screenY: number;
  map: GameMap;
  improvement: ImprovementKind | undefined;
  onDismiss: () => void;
};

const POPUP_WIDTH = 240;
const POPUP_HEIGHT = 170;
const TAIL_OFFSET = 18;
const EDGE_PADDING = 8;

const TERRAIN_LABEL: Record<string, string> = {
  ocean: 'Ocean',
  coast: 'Coast',
  grassland: 'Grassland',
  plains: 'Plains',
  forest: 'Forest',
  hills: 'Hills',
  mountains: 'Mountains',
  desert: 'Desert',
  tundra: 'Tundra',
};

const RESOURCE_LABEL: Record<string, string> = {
  wheat: 'Wheat',
  cattle: 'Cattle',
  fish: 'Fish',
  iron: 'Iron',
  horses: 'Horses',
  gold: 'Gold',
  wine: 'Wine',
  spices: 'Spices',
};

export default function TileYieldTooltip({
  x,
  y,
  screenX,
  screenY,
  map,
  improvement,
  onDismiss,
}: Props) {
  const { width: screenW } = useWindowDimensions();
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);

  const tile = map.tiles[y * map.width + x];
  const t = TERRAIN[tile.terrain];
  const r = tile.resource ? RESOURCE[tile.resource] : null;

  // Yield math mirrors yields.ts: terrain + resource + improvement bonuses.
  let food = t.food + (r?.food ?? 0);
  let prod = t.prod + (r?.prod ?? 0);
  let trade = t.trade + (r?.trade ?? 0);
  if (improvement === 'farm' || improvement === 'irrigation') food += 1;
  if (improvement === 'mine') prod += 1;
  if (improvement === 'road') trade += 1;

  const showAbove = screenY > POPUP_HEIGHT + TAIL_OFFSET + EDGE_PADDING;
  const top = showAbove ? screenY - POPUP_HEIGHT - TAIL_OFFSET : screenY + TAIL_OFFSET;
  const rawLeft = screenX - POPUP_WIDTH / 2;
  const left = Math.max(
    EDGE_PADDING,
    Math.min(screenW - POPUP_WIDTH - EDGE_PADDING, rawLeft),
  );

  useEffect(() => {
    scale.value = withSpring(1, { damping: 11, stiffness: 220 });
    opacity.value = withTiming(1, { duration: 140 });
  }, [scale, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  const transformOrigin = showAbove
    ? `${screenX - left}px ${POPUP_HEIGHT}px`
    : `${screenX - left}px 0px`;

  return (
    <Pressable style={[StyleSheet.absoluteFillObject, styles.dim]} onPress={onDismiss}>
      <Animated.View
        style={[
          styles.card,
          { top, left, width: POPUP_WIDTH, transformOrigin },
          animStyle,
        ]}
      >
        <Pressable style={styles.cardInner} onPress={() => {}}>
          <Text style={styles.title}>
            {TERRAIN_LABEL[tile.terrain] ?? tile.terrain}
            {tile.resource ? ` · ${RESOURCE_LABEL[tile.resource]}` : ''}
          </Text>
          <Text style={styles.coords}>
            ({x}, {y}){' · def +'}{t.defenseBonus.toFixed(1)}
            {!t.passable ? ' · impassable' : ''}
          </Text>
          <View style={styles.divider} />
          <View style={styles.yieldRow}>
            <YieldChip label="Food" value={food} color={THEME.good} />
            <YieldChip label="Prod" value={prod} color={'#ef4444'} />
            <YieldChip label="Trade" value={trade} color={THEME.warn} />
          </View>
          {improvement ? (
            <Text style={styles.note}>
              Improved: {IMPROVEMENT[improvement].name}
              {improvement === 'farm' || improvement === 'irrigation' ? ' (+1 food)' : ''}
              {improvement === 'mine' ? ' (+1 prod)' : ''}
              {improvement === 'road' ? ' (+1 trade)' : ''}
            </Text>
          ) : null}
          {r ? (
            <Text style={styles.note}>
              Resource bonus: +{r.food} food · +{r.prod} prod · +{r.trade} trade
            </Text>
          ) : null}
        </Pressable>
      </Animated.View>
    </Pressable>
  );
}

function YieldChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipLabel}>{label}</Text>
      <Text style={[styles.chipValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dim: { backgroundColor: 'rgba(10, 23, 41, 0.35)' },
  card: {
    position: 'absolute',
    backgroundColor: 'rgba(28, 22, 18, 0.96)',
    borderColor: 'rgba(212, 184, 138, 0.55)',
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  cardInner: {},
  title: { color: THEME.ink, fontSize: 14, fontWeight: '900' },
  coords: { color: THEME.inkMuted, fontSize: 11, marginTop: 2 },
  divider: {
    height: 1,
    backgroundColor: 'rgba(212, 184, 138, 0.3)',
    marginVertical: 8,
  },
  yieldRow: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  chip: {
    flex: 1,
    backgroundColor: 'rgba(45, 32, 22, 0.85)',
    borderColor: THEME.border,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 6,
    alignItems: 'center',
  },
  chipLabel: {
    color: THEME.inkMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  chipValue: { fontSize: 18, fontWeight: '900', marginTop: 2 },
  note: { color: THEME.inkMuted, fontSize: 11, marginTop: 8, fontStyle: 'italic' },
});
