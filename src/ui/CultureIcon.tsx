import { Image, type ImageStyle, type StyleProp } from 'react-native';

// Static asset map keyed by Country.iso (snake_case culture key). Static
// require()s are required by Metro — no dynamic paths.
const CULTURE_ICONS: Record<string, number> = {
  anglo_saxons: require('../../assets/images/icons/culture_anglo_saxons.png'),
  normans:      require('../../assets/images/icons/culture_normans.png'),
  welsh:        require('../../assets/images/icons/culture_welsh.png'),
  scots:        require('../../assets/images/icons/culture_scots.png'),
  picts:        require('../../assets/images/icons/culture_picts.png'),
  irish:        require('../../assets/images/icons/culture_irish.png'),
  cornish:      require('../../assets/images/icons/culture_cornish.png'),
  cumbrians:    require('../../assets/images/icons/culture_cumbrians.png'),
  danes:        require('../../assets/images/icons/culture_danes.png'),
  islesmen:     require('../../assets/images/icons/culture_islesmen.png'),
};

type Props = {
  iso: string | undefined | null;
  size: number;
  style?: StyleProp<ImageStyle>;
};

export default function CultureIcon({ iso, size, style }: Props) {
  if (!iso) return null;
  const source = CULTURE_ICONS[iso];
  if (!source) return null;
  return (
    <Image
      source={source}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
    />
  );
}
