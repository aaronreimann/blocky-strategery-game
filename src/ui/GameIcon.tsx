import { Canvas, Group, Path, Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { Image, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';

import {
  ICON_PATHS,
  ICON_VIEWBOX,
  type GameIconName,
} from '@/src/data/gameIcons';

const PNG_ICONS: Record<string, any> = {
  png_pioneer: require('../../assets/images/icons/icon_pioneer.png'),
  png_worker: require('../../assets/images/icons/icon_worker.png'),
  png_footman: require('../../assets/images/icons/icon_footman.png'),
  png_spearman: require('../../assets/images/icons/icon_spearman.png'),
  png_horseman: require('../../assets/images/icons/icon_horseman.png'),
  png_swordsman: require('../../assets/images/icons/icon_swordsman.png'),
  png_catapult: require('../../assets/images/icons/icon_catapult.png'),
  png_galley: require('../../assets/images/icons/icon_galley.png'),
  png_town: require('../../assets/images/icons/icon_town.png'),
  png_capital: require('../../assets/images/icons/icon_capital.png'),
  png_goody_hut: require('../../assets/images/icons/icon_goody_hut.png'),
};

type Props = {
  name: GameIconName | string;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

// Skia-rendered medieval icons sourced from game-icons.net (via Iconify).
// We use Skia here so the app doesn't need to bundle react-native-svg as a
// new native dependency — it ships with the same Skia we already use for
// the map rendering.
export function GameIcon({ name, size = 24, color = '#f5f1e8', style }: Props) {
  if (name.startsWith('png_')) {
    const source = PNG_ICONS[name];
    if (source) {
      return (
        <Image
          source={source}
          style={[{ width: size, height: size }, style as StyleProp<ImageStyle>]}
        />
      );
    }
  }

  const skPath = useMemo(() => Skia.Path.MakeFromSVGString(ICON_PATHS[name as GameIconName]), [name]);
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
