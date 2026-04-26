import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { generateMap } from '@/src/game/mapgen';
import MapView from '@/src/render/MapView';
import { THEME } from '@/src/ui/palette';

const SEED = 42;

export default function Home() {
  const map = useMemo(() => generateMap(SEED), []);

  return (
    <View style={styles.root}>
      <MapView map={map} />
      <SafeAreaView style={styles.hud} pointerEvents="none">
        <Text style={styles.label}>Civ-App · seed {SEED} · drag to pan, pinch to zoom</Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.bg },
  hud: { position: 'absolute', top: 0, left: 0, right: 0, padding: 12 },
  label: { color: THEME.inkMuted, fontSize: 12 },
});
