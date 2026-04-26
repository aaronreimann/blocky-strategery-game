import { Canvas, Group, Path, Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import {
  ICON_PATHS,
  ICON_VIEWBOX,
  type GameIconName,
} from '@/src/data/gameIcons';

type Props = {
  name: GameIconName;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

// Skia-rendered medieval icons sourced from game-icons.net (via Iconify).
// We use Skia here so the app doesn't need to bundle react-native-svg as a
// new native dependency — it ships with the same Skia we already use for
// the map rendering.
export function GameIcon({ name, size = 24, color = '#f5f1e8', style }: Props) {
  const skPath = useMemo(() => Skia.Path.MakeFromSVGString(ICON_PATHS[name]), [name]);
  if (!skPath) return null;
  const scale = size / ICON_VIEWBOX;
  return (
    <Canvas style={[{ width: size, height: size }, style]}>
      <Group transform={[{ scale }]}>
        <Path path={skPath} color={color} />
      </Group>
    </Canvas>
  );
}
