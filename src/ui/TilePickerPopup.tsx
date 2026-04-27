import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { UNIT } from '@/src/data/units';
import type { City, Unit } from '@/src/game/types';

import { GameIcon } from './GameIcon';
import { THEME } from './palette';

type Props = {
  unit: Unit | null;
  city: City | null;
  screenX: number;
  screenY: number;
  ownerColor: string;
  onPickUnit: () => void;
  onPickCity: () => void;
  onDismiss: () => void;
};

const POPUP_WIDTH = 220;
const POPUP_HEIGHT = 110;
const TAIL_OFFSET = 18;
const EDGE_PADDING = 8;

const PNG_FOR_UNIT_KIND: Record<string, string> = {
  pioneer: 'png_pioneer',
  worker: 'png_worker',
  footman: 'png_footman',
  spearman: 'png_spearman',
  horseman: 'png_horseman',
  swordsman: 'png_swordsman',
  catapult: 'png_catapult',
  galley: 'png_galley',
};

export default function TilePickerPopup({
  unit,
  city,
  screenX,
  screenY,
  ownerColor,
  onPickUnit,
  onPickCity,
  onDismiss,
}: Props) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);

  // Decide whether to anchor above or below the finger based on available
  // space, then clamp horizontally so the card never clips off-screen.
  const showAbove = screenY > POPUP_HEIGHT + TAIL_OFFSET + EDGE_PADDING;
  const top = showAbove
    ? screenY - POPUP_HEIGHT - TAIL_OFFSET
    : screenY + TAIL_OFFSET;
  const rawLeft = screenX - POPUP_WIDTH / 2;
  const left = Math.max(
    EDGE_PADDING,
    Math.min(screenW - POPUP_WIDTH - EDGE_PADDING, rawLeft),
  );

  useEffect(() => {
    scale.value = withSpring(1, { damping: 10, stiffness: 220 });
    opacity.value = withTiming(1, { duration: 140 });
  }, [scale, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  // Origin of the scale-in is the side closest to the finger so the card
  // visually "pops out" from the tile, not from its own center.
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
          <View style={styles.row}>
            {unit ? (
              <Pressable
                style={[styles.option, { borderColor: ownerColor }]}
                onPress={onPickUnit}
              >
                <View style={[styles.iconWrap, { backgroundColor: ownerColor }]}>
                  <GameIcon
                    name={(PNG_FOR_UNIT_KIND[unit.kind] ?? 'png_footman') as never}
                    size={36}
                  />
                </View>
                <Text style={styles.optionLabel} numberOfLines={1}>
                  {UNIT[unit.kind].name}
                  {unit.stack.length > 1 ? ` ×${unit.stack.length}` : ''}
                </Text>
              </Pressable>
            ) : null}
            {city ? (
              <Pressable
                style={[styles.option, { borderColor: ownerColor }]}
                onPress={onPickCity}
              >
                <View style={[styles.iconWrap, { backgroundColor: ownerColor }]}>
                  <GameIcon name={'png_town' as never} size={36} />
                </View>
                <Text style={styles.optionLabel} numberOfLines={1}>
                  {city.name}
                </Text>
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.hint}>Tap one. Tap outside to dismiss.</Text>
        </Pressable>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dim: {
    backgroundColor: 'rgba(10, 23, 41, 0.35)',
  },
  card: {
    position: 'absolute',
    backgroundColor: 'rgba(28, 22, 18, 0.96)',
    borderColor: 'rgba(212, 184, 138, 0.55)',
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  cardInner: {},
  row: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  option: {
    width: 88,
    backgroundColor: 'rgba(45, 32, 22, 0.9)',
    borderWidth: 2,
    borderRadius: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  optionLabel: {
    color: THEME.ink,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
    paddingHorizontal: 4,
    textAlign: 'center',
  },
  hint: {
    color: THEME.inkMuted,
    fontSize: 9,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 6,
  },
});
