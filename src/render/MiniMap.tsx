import { Canvas, Circle, Group, Rect } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { TERRAIN } from '@/src/data/terrain';
import type { GameMap } from '@/src/game/map';
import type { City, Player } from '@/src/game/types';

const MM_W = 144;
const MM_H = 108;

type Props = {
  map: GameMap;
  cities: City[];
  players: Player[];
  cameraTx: SharedValue<number>;
  cameraTy: SharedValue<number>;
  cameraScale: SharedValue<number>;
  screenW: number;
  screenH: number;
  tileSize: number;
  onJumpTo: (worldX: number, worldY: number) => void;
};

export default function MiniMap({
  map,
  cities,
  players,
  cameraTx,
  cameraTy,
  cameraScale,
  screenW,
  screenH,
  tileSize,
  onJumpTo,
}: Props) {
  const worldW = map.width * tileSize;
  const worldH = map.height * tileSize;
  const sx = MM_W / worldW;
  const sy = MM_H / worldH;
  const tilePx = MM_W / map.width;

  const terrainLayer = useMemo(
    () =>
      map.tiles.map((t) => (
        <Rect
          key={`mm-${t.x}-${t.y}`}
          x={t.x * tilePx}
          y={t.y * tilePx}
          width={tilePx + 0.5}
          height={tilePx + 0.5}
          color={TERRAIN[t.terrain].color}
        />
      )),
    [map, tilePx],
  );

  const cityLayer = useMemo(
    () =>
      cities.map((c) => (
        <Circle
          key={`mmc-${c.id}`}
          cx={c.x * tilePx + tilePx / 2}
          cy={c.y * tilePx + tilePx / 2}
          r={2.2}
          color={players[c.ownerIdx]?.color ?? '#ffffff'}
        />
      )),
    [cities, players, tilePx],
  );

  // Viewport rectangle reflects current camera. World rect visible on screen
  // is x=[-tx/s, -tx/s + screenW/s], y=[-ty/s, -ty/s + screenH/s]; map that
  // into mini-map space.
  const viewX = useDerivedValue(() => (-cameraTx.value / cameraScale.value) * sx);
  const viewY = useDerivedValue(() => (-cameraTy.value / cameraScale.value) * sy);
  const viewW = useDerivedValue(() => (screenW / cameraScale.value) * sx);
  const viewH = useDerivedValue(() => (screenH / cameraScale.value) * sy);

  const tap = Gesture.Tap().onEnd((e) => {
    'worklet';
    const wx = (e.x / MM_W) * worldW;
    const wy = (e.y / MM_H) * worldH;
    runOnJS(onJumpTo)(wx, wy);
  });

  return (
    <GestureDetector gesture={tap}>
      <View style={styles.wrap}>
        <Canvas style={{ width: MM_W, height: MM_H }}>
          <Group>
            {terrainLayer}
            {cityLayer}
            <Rect
              x={viewX}
              y={viewY}
              width={viewW}
              height={viewH}
              color="#ffd84a"
              style="stroke"
              strokeWidth={1.5}
            />
          </Group>
        </Canvas>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 56,
    right: 12,
    width: MM_W,
    height: MM_H,
    borderColor: 'rgba(255, 216, 74, 0.6)',
    borderWidth: 1.5,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(10, 23, 41, 0.85)',
  },
});
