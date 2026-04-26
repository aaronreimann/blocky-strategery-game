import { Canvas, Circle, Group, Rect } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useDerivedValue, useSharedValue } from 'react-native-reanimated';

import { RESOURCE } from '@/src/data/resources';
import { TERRAIN } from '@/src/data/terrain';
import type { GameMap } from '@/src/game/map';

import { decorateTile } from './decor';

export const TILE_SIZE = 32;
const MIN_SCALE = 0.35;
const MAX_SCALE = 5;

type Props = { map: GameMap };

export default function MapView({ map }: Props) {
  const { width: screenW, height: screenH } = useWindowDimensions();

  const mapPxW = map.width * TILE_SIZE;
  const mapPxH = map.height * TILE_SIZE;

  const fitScale = Math.min(screenW / mapPxW, screenH / mapPxH) * 0.95;

  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);

  const startTx = useSharedValue(0);
  const startTy = useSharedValue(0);
  const startScale = useSharedValue(1);

  useEffect(() => {
    scale.value = fitScale;
    tx.value = (screenW - mapPxW * fitScale) / 2;
    ty.value = (screenH - mapPxH * fitScale) / 2;
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
      const ratio = next / startScale.value;
      tx.value = e.focalX - (e.focalX - startTx.value) * ratio;
      ty.value = e.focalY - (e.focalY - startTy.value) * ratio;
      scale.value = next;
    });

  const gesture = Gesture.Simultaneous(pan, pinch);

  const transform = useDerivedValue(() => [
    { translateX: tx.value },
    { translateY: ty.value },
    { scale: scale.value },
  ]);

  // Memoize each render layer — map data doesn't change after gen, and the
  // camera transform animates on the Group above, so children stay stable.
  const baseLayer = useMemo(
    () =>
      map.tiles.map((tile) => (
        <Rect
          key={`b-${tile.x}-${tile.y}`}
          x={tile.x * TILE_SIZE}
          y={tile.y * TILE_SIZE}
          width={TILE_SIZE}
          height={TILE_SIZE}
          color={TERRAIN[tile.terrain].color}
        />
      )),
    [map],
  );

  const decorLayer = useMemo(
    () => map.tiles.flatMap((tile) => decorateTile(tile, TILE_SIZE)),
    [map],
  );

  const resourceLayer = useMemo(
    () =>
      map.tiles
        .filter((t) => t.resource)
        .map((tile) => (
          <Circle
            key={`r-${tile.x}-${tile.y}`}
            cx={tile.x * TILE_SIZE + TILE_SIZE / 2}
            cy={tile.y * TILE_SIZE + TILE_SIZE / 2}
            r={TILE_SIZE * 0.16}
            color={RESOURCE[tile.resource!].color}
          />
        )),
    [map],
  );

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={{ flex: 1 }}>
        <Canvas style={{ flex: 1 }}>
          <Group transform={transform}>
            {baseLayer}
            {decorLayer}
            {resourceLayer}
          </Group>
        </Canvas>
      </Animated.View>
    </GestureDetector>
  );
}
