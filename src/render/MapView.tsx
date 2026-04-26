import { Canvas, Circle, Group, Rect } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useDerivedValue, useSharedValue } from 'react-native-reanimated';

import { RESOURCE } from '@/src/data/resources';
import { TERRAIN } from '@/src/data/terrain';
import type { GameMap } from '@/src/game/map';

export const TILE_SIZE = 32;
const MIN_SCALE = 0.4;
const MAX_SCALE = 4;

type Props = { map: GameMap };

export default function MapView({ map }: Props) {
  const { width: screenW, height: screenH } = useWindowDimensions();

  const mapPxW = map.width * TILE_SIZE;
  const mapPxH = map.height * TILE_SIZE;

  // Default scale: fit the map width into the screen with a little margin.
  const fitScale = Math.min(screenW / mapPxW, screenH / mapPxH) * 0.95;

  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);

  const startTx = useSharedValue(0);
  const startTy = useSharedValue(0);
  const startScale = useSharedValue(1);

  // Initialize camera to center the map at fit-scale.
  useEffect(() => {
    scale.value = fitScale;
    tx.value = (screenW - mapPxW * fitScale) / 2;
    ty.value = (screenH - mapPxH * fitScale) / 2;
    // We intentionally only run this on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pan = Gesture.Pan()
    .onStart(() => {
      startTx.value = tx.value;
      startTy.value = ty.value;
    })
    .onUpdate((e) => {
      tx.value = startTx.value + e.translationX;
      ty.value = startTy.value + e.translationY;
    });

  const pinch = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
      startTx.value = tx.value;
      startTy.value = ty.value;
    })
    .onUpdate((e) => {
      const next = Math.min(Math.max(startScale.value * e.scale, MIN_SCALE), MAX_SCALE);
      // Zoom around the gesture focal point so the world point under the
      // fingers stays put.
      const focalX = e.focalX;
      const focalY = e.focalY;
      const ratio = next / startScale.value;
      tx.value = focalX - (focalX - startTx.value) * ratio;
      ty.value = focalY - (focalY - startTy.value) * ratio;
      scale.value = next;
    });

  const gesture = Gesture.Simultaneous(pan, pinch);

  const transform = useDerivedValue(() => [
    { translateX: tx.value },
    { translateY: ty.value },
    { scale: scale.value },
  ]);

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={{ flex: 1 }}>
        <Canvas style={{ flex: 1 }}>
          <Group transform={transform}>
            {map.tiles.map((tile) => (
              <Rect
                key={`t-${tile.x}-${tile.y}`}
                x={tile.x * TILE_SIZE}
                y={tile.y * TILE_SIZE}
                width={TILE_SIZE}
                height={TILE_SIZE}
                color={TERRAIN[tile.terrain].color}
              />
            ))}
            {map.tiles.map((tile) =>
              tile.resource ? (
                <Circle
                  key={`r-${tile.x}-${tile.y}`}
                  cx={tile.x * TILE_SIZE + TILE_SIZE / 2}
                  cy={tile.y * TILE_SIZE + TILE_SIZE / 2}
                  r={TILE_SIZE * 0.18}
                  color={RESOURCE[tile.resource].color}
                />
              ) : null,
            )}
          </Group>
        </Canvas>
      </Animated.View>
    </GestureDetector>
  );
}
