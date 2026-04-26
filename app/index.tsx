import { Canvas, Rect } from '@shopify/react-native-skia';
import { useWindowDimensions, View, Text, StyleSheet } from 'react-native';

import { PLAYER_PALETTE } from '@/src/ui/palette';

export default function Home() {
  const { width, height } = useWindowDimensions();

  return (
    <View style={styles.root}>
      <Canvas style={{ width, height }}>
        {PLAYER_PALETTE.map((color, i) => (
          <Rect
            key={color}
            x={20 + i * 70}
            y={20}
            width={60}
            height={60}
            color={color}
          />
        ))}
      </Canvas>
      <View style={styles.overlay} pointerEvents="none">
        <Text style={styles.title}>Civ-App</Text>
        <Text style={styles.subtitle}>M0 scaffold — Skia rendering 8 player colors</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a1729' },
  overlay: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  title: { color: '#f5f1e8', fontSize: 32, fontWeight: '700', letterSpacing: 1 },
  subtitle: { color: '#8a9bb8', fontSize: 14, marginTop: 4 },
});
