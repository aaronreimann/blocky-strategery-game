import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { TERRAIN } from '@/src/data/terrain';
import { chebyshev } from '@/src/game/map';
import MapView from '@/src/render/MapView';
import { useGame } from '@/src/state/game';

import Hud from './Hud';
import { THEME } from './palette';

export default function GameScreen() {
  const map = useGame((s) => s.map);
  const players = useGame((s) => s.players);
  const units = useGame((s) => s.units);
  const cities = useGame((s) => s.cities);
  const selectedUnitId = useGame((s) => s.selectedUnitId);
  const selectedCityId = useGame((s) => s.selectedCityId);
  const tapTile = useGame((s) => s.tapTile);

  const highlightTiles = useMemo(() => {
    const set = new Set<string>();
    if (!map || !selectedUnitId) return set;
    const sel = units.find((u) => u.id === selectedUnitId);
    if (!sel || sel.movesLeft <= 0) return set;

    for (let dy = -sel.movesLeft; dy <= sel.movesLeft; dy++) {
      for (let dx = -sel.movesLeft; dx <= sel.movesLeft; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = sel.x + dx;
        const ny = sel.y + dy;
        if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) continue;
        if (chebyshev(sel.x, sel.y, nx, ny) > sel.movesLeft) continue;
        const t = map.tiles[ny * map.width + nx];
        if (!TERRAIN[t.terrain].passable) continue;
        if (units.some((u) => u.x === nx && u.y === ny && u.ownerIdx === sel.ownerIdx)) continue;
        set.add(`${nx},${ny}`);
      }
    }
    return set;
  }, [map, units, selectedUnitId]);

  if (!map) return <View style={styles.root} />;

  return (
    <View style={styles.root}>
      <MapView
        map={map}
        players={players}
        units={units}
        cities={cities}
        selectedUnitId={selectedUnitId}
        selectedCityId={selectedCityId}
        highlightTiles={highlightTiles}
        onTileTap={tapTile}
      />
      <Hud />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.bg },
});
