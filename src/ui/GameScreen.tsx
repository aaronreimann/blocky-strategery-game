import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { TERRAIN } from '@/src/data/terrain';
import { chebyshev } from '@/src/game/map';
import MapView from '@/src/render/MapView';
import { useGame } from '@/src/state/game';

import GameOverOverlay from './GameOverOverlay';
import Hud from './Hud';
import { THEME } from './palette';

const HUMAN_IDX = 0;

export default function GameScreen() {
  const map = useGame((s) => s.map);
  const players = useGame((s) => s.players);
  const units = useGame((s) => s.units);
  const cities = useGame((s) => s.cities);
  const improvements = useGame((s) => s.improvements);
  const selectedUnitId = useGame((s) => s.selectedUnitId);
  const selectedCityId = useGame((s) => s.selectedCityId);
  const tapTile = useGame((s) => s.tapTile);
  const setUnitDestination = useGame((s) => s.setUnitDestination);

  const autoLaborerOwnerIdxs = useMemo(() => {
    const out = new Set<number>();
    for (const c of cities) {
      if (c.focus === 'roads') out.add(c.ownerIdx);
    }
    return out;
  }, [cities]);

  const { moveTiles, attackTiles } = useMemo(() => {
    const move = new Set<string>();
    const attack = new Set<string>();
    if (!map || !selectedUnitId) return { moveTiles: move, attackTiles: attack };
    const sel = units.find((u) => u.id === selectedUnitId);
    if (!sel || sel.movesLeft <= 0) return { moveTiles: move, attackTiles: attack };

    for (let dy = -sel.movesLeft; dy <= sel.movesLeft; dy++) {
      for (let dx = -sel.movesLeft; dx <= sel.movesLeft; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = sel.x + dx;
        const ny = sel.y + dy;
        if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) continue;
        if (chebyshev(sel.x, sel.y, nx, ny) > sel.movesLeft) continue;

        const t = map.tiles[ny * map.width + nx];
        if (!TERRAIN[t.terrain].passable) continue;

        const friendlyUnitHere = units.some(
          (u) => u.x === nx && u.y === ny && u.ownerIdx === sel.ownerIdx,
        );
        if (friendlyUnitHere) continue;

        const enemyUnitHere = units.some(
          (u) => u.x === nx && u.y === ny && u.ownerIdx !== sel.ownerIdx,
        );
        const enemyCityHere = cities.some(
          (c) => c.x === nx && c.y === ny && c.ownerIdx !== sel.ownerIdx,
        );
        if (enemyUnitHere || enemyCityHere) {
          attack.add(`${nx},${ny}`);
          continue;
        }

        move.add(`${nx},${ny}`);
      }
    }
    return { moveTiles: move, attackTiles: attack };
  }, [map, units, cities, selectedUnitId]);

  if (!map) return <View style={styles.root} />;

  return (
    <View style={styles.root}>
      <MapView
        map={map}
        players={players}
        units={units}
        cities={cities}
        improvements={improvements}
        selectedUnitId={selectedUnitId}
        selectedCityId={selectedCityId}
        autoLaborerOwnerIdxs={autoLaborerOwnerIdxs}
        moveTiles={moveTiles}
        attackTiles={attackTiles}
        onTileTap={tapTile}
        onSetDestination={setUnitDestination}
      />
      <Hud />
      <GameOverOverlay />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.bg },
});

// Suppress unused import warning if HUMAN_IDX isn't used elsewhere here.
void HUMAN_IDX;
