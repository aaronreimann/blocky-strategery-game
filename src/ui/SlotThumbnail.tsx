import { Canvas, Circle, Rect } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { SlotPreview } from '@/src/state/saves';

import { THEME } from './palette';

type Props = {
  preview: SlotPreview;
  width: number;
  height: number;
};

export default function SlotThumbnail({ preview, width, height }: Props) {
  const tilePxX = width / preview.width;
  const tilePxY = height / preview.height;

  // Render terrain tiles + city dots. Memoized off the preview's identity so
  // the 1700+ Rects don't rebuild every render.
  const tiles = useMemo(
    () =>
      preview.tileColors.map((color, i) => {
        const x = i % preview.width;
        const y = Math.floor(i / preview.width);
        return (
          <Rect
            key={`t-${i}`}
            x={x * tilePxX}
            y={y * tilePxY}
            width={tilePxX + 0.5}
            height={tilePxY + 0.5}
            color={color}
          />
        );
      }),
    [preview.tileColors, preview.width, tilePxX, tilePxY],
  );

  const cities = useMemo(
    () =>
      preview.cities.map((c, i) => (
        <Circle
          key={`c-${i}`}
          cx={c.x * tilePxX + tilePxX / 2}
          cy={c.y * tilePxY + tilePxY / 2}
          r={1.6}
          color={c.color}
        />
      )),
    [preview.cities, tilePxX, tilePxY],
  );

  return (
    <View style={[styles.frame, { width, height }]}>
      <Canvas style={{ width, height }}>
        {tiles}
        {cities}
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: 4,
    overflow: 'hidden',
    borderColor: 'rgba(212, 184, 138, 0.45)',
    borderWidth: 1,
    backgroundColor: THEME.bg,
  },
});
