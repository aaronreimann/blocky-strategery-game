import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { WONDER, type WonderKind } from '@/src/data/wonders';

import { THEME } from './palette';

type Props = {
  kind: WonderKind;
  cityName: string;
  onDismiss: () => void;
};

export default function WonderOverlay({ kind, cityName, onDismiss }: Props) {
  const wonder = WONDER[kind];
  const scale = useSharedValue(0.7);
  const opacity = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 9, stiffness: 140 });
    opacity.value = withTiming(1, { duration: 220 });
    // Slow pulsing glow behind the card.
    glow.value = withSequence(
      withTiming(1, { duration: 800 }),
      withTiming(0.55, { duration: 1100 }),
      withTiming(1, { duration: 1100 }),
    );
    // Auto-dismiss after ~6s.
    const t = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 300 });
      scale.value = withDelay(50, withTiming(0.95, { duration: 250 }));
      setTimeout(onDismiss, 320);
    }, 6000);
    return () => clearTimeout(t);
  }, [scale, opacity, glow, onDismiss]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * 0.55,
  }));

  return (
    <Pressable style={StyleSheet.absoluteFillObject} onPress={onDismiss}>
      <View style={styles.bg} pointerEvents="none">
        <Animated.View style={[styles.glow, glowStyle]} />
      </View>
      <Animated.View style={[styles.cardWrap, cardStyle]} pointerEvents="none">
        <View style={styles.card}>
          <Text style={styles.eyebrow}>WONDER COMPLETED</Text>
          <Text style={styles.name}>{wonder.name}</Text>
          <Text style={styles.city}>built in {cityName}</Text>
          <View style={styles.divider} />
          <Text style={styles.body}>{wonder.description}</Text>
          <Text style={styles.hint}>tap anywhere to dismiss</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 23, 41, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    width: 520,
    height: 520,
    borderRadius: 260,
    backgroundColor: 'rgba(224, 176, 74, 0.55)',
  },
  cardWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: 'rgba(28, 22, 18, 0.96)',
    borderColor: THEME.warn,
    borderWidth: 2,
    borderRadius: 16,
    paddingVertical: 22,
    paddingHorizontal: 28,
    minWidth: 320,
    maxWidth: 460,
    alignItems: 'center',
    shadowColor: THEME.warn,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 16,
  },
  eyebrow: {
    color: THEME.warn,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 3,
  },
  name: {
    color: THEME.ink,
    fontSize: 32,
    fontWeight: '900',
    marginTop: 6,
    textAlign: 'center',
  },
  city: { color: THEME.inkMuted, fontSize: 13, marginTop: 4, fontStyle: 'italic' },
  divider: {
    width: 80,
    height: 1.5,
    backgroundColor: THEME.warn,
    marginVertical: 12,
    opacity: 0.7,
  },
  body: {
    color: THEME.ink,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  hint: {
    color: THEME.inkMuted,
    fontSize: 10,
    marginTop: 14,
    fontStyle: 'italic',
  },
});
