import { Canvas, Circle, Group, Path, Rect } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';

import type { ImprovementMap } from '@/src/data/improvements';
import { RESOURCE } from '@/src/data/resources';
import { TERRAIN } from '@/src/data/terrain';
import type { GameMap } from '@/src/game/map';
import type { City, Player, Unit } from '@/src/game/types';

import { decorateTile } from './decor';

export const TILE_SIZE = 32;
const MIN_SCALE = 0.35;
const MAX_SCALE = 5;

type Props = {
  map: GameMap;
  players: Player[];
  units: Unit[];
  cities: City[];
  improvements: ImprovementMap;
  selectedUnitId: string | null;
  selectedCityId: string | null;
  moveTiles: Set<string>;
  attackTiles: Set<string>;
  onTileTap: (x: number, y: number) => void;
};

export default function MapView({
  map,
  players,
  units,
  cities,
  improvements,
  selectedUnitId,
  selectedCityId,
  moveTiles,
  attackTiles,
  onTileTap,
}: Props) {
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
    .minDistance(8)
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

  const tap = Gesture.Tap().onEnd((e) => {
    'worklet';
    const wx = (e.x - tx.value) / scale.value;
    const wy = (e.y - ty.value) / scale.value;
    const gx = Math.floor(wx / TILE_SIZE);
    const gy = Math.floor(wy / TILE_SIZE);
    if (gx < 0 || gy < 0 || gx >= map.width || gy >= map.height) return;
    runOnJS(onTileTap)(gx, gy);
  });

  const gesture = Gesture.Race(tap, Gesture.Simultaneous(pan, pinch));

  const transform = useDerivedValue(() => [
    { translateX: tx.value },
    { translateY: ty.value },
    { scale: scale.value },
  ]);

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

  const highlightLayer = useMemo(() => {
    const out: React.ReactNode[] = [];
    for (const key of moveTiles) {
      const [xs, ys] = key.split(',');
      out.push(
        <Rect
          key={`mv-${key}`}
          x={Number(xs) * TILE_SIZE}
          y={Number(ys) * TILE_SIZE}
          width={TILE_SIZE}
          height={TILE_SIZE}
          color="#ffe66455"
        />,
      );
    }
    for (const key of attackTiles) {
      const [xs, ys] = key.split(',');
      out.push(
        <Rect
          key={`at-${key}`}
          x={Number(xs) * TILE_SIZE}
          y={Number(ys) * TILE_SIZE}
          width={TILE_SIZE}
          height={TILE_SIZE}
          color="#ef444466"
        />,
      );
    }
    return out;
  }, [moveTiles, attackTiles]);

  const roadLayer = useMemo(() => {
    const base: React.ReactNode[] = [];
    const top: React.ReactNode[] = [];
    const isRoad = (x: number, y: number) => improvements[`${x},${y}`] === 'road';
    const ROAD_BASE = '#d4b88a';
    const ROAD_INK = '#6b4a26';
    const BASE_W = 6;
    const INK_W = 3;
    for (const key in improvements) {
      if (improvements[key] !== 'road') continue;
      const [xs, ys] = key.split(',');
      const x = Number(xs);
      const y = Number(ys);
      const cx = x * TILE_SIZE + TILE_SIZE / 2;
      const cy = y * TILE_SIZE + TILE_SIZE / 2;
      // Edges to neighbor road tiles (deduped).
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          if (!isRoad(x + dx, y + dy)) continue;
          if (dx > 0 || (dx === 0 && dy > 0)) {
            const nx = (x + dx) * TILE_SIZE + TILE_SIZE / 2;
            const ny = (y + dy) * TILE_SIZE + TILE_SIZE / 2;
            const path = `M ${cx} ${cy} L ${nx} ${ny}`;
            base.push(
              <Path
                key={`rd-b-${key}-${dx}${dy}`}
                path={path}
                color={ROAD_BASE}
                style="stroke"
                strokeWidth={BASE_W}
                strokeCap="round"
              />,
            );
            top.push(
              <Path
                key={`rd-t-${key}-${dx}${dy}`}
                path={path}
                color={ROAD_INK}
                style="stroke"
                strokeWidth={INK_W}
                strokeCap="round"
              />,
            );
          }
        }
      }
      // Junction node: a small disc so isolated/branching tiles read.
      base.push(
        <Circle key={`rd-jb-${key}`} cx={cx} cy={cy} r={BASE_W / 2} color={ROAD_BASE} />,
      );
      top.push(
        <Circle key={`rd-jt-${key}`} cx={cx} cy={cy} r={INK_W / 2} color={ROAD_INK} />,
      );
    }
    return [...base, ...top];
  }, [improvements]);

  const workIndicatorLayer = useMemo(() => {
    return units
      .filter((u) => u.workingOn && u.workTurnsLeft > 0)
      .map((u) => (
        <Circle
          key={`wk-${u.id}`}
          cx={u.x * TILE_SIZE + TILE_SIZE * 0.85}
          cy={u.y * TILE_SIZE + TILE_SIZE * 0.15}
          r={3}
          color="#facc15"
        />
      ));
  }, [units]);

  const cityLayer = useMemo(() => {
    return cities.map((c) => {
      const owner = players[c.ownerIdx];
      const cx = c.x * TILE_SIZE + TILE_SIZE / 2;
      const cy = c.y * TILE_SIZE + TILE_SIZE / 2;
      const r = TILE_SIZE * 0.42;
      // Castle silhouette: base rectangle + 3 crenellations.
      const base = `M ${cx - r} ${cy + r * 0.6}
                    L ${cx - r} ${cy - r * 0.2}
                    L ${cx - r * 0.55} ${cy - r * 0.2}
                    L ${cx - r * 0.55} ${cy - r * 0.55}
                    L ${cx - r * 0.18} ${cy - r * 0.55}
                    L ${cx - r * 0.18} ${cy - r * 0.2}
                    L ${cx + r * 0.18} ${cy - r * 0.2}
                    L ${cx + r * 0.18} ${cy - r * 0.55}
                    L ${cx + r * 0.55} ${cy - r * 0.55}
                    L ${cx + r * 0.55} ${cy - r * 0.2}
                    L ${cx + r} ${cy - r * 0.2}
                    L ${cx + r} ${cy + r * 0.6} Z`;
      return (
        <Group key={`city-${c.id}`}>
          <Path path={base} color={owner?.color ?? '#ffffff'} />
          <Path path={base} color="#000000" style="stroke" strokeWidth={1} />
        </Group>
      );
    });
  }, [cities, players]);

  const unitLayer = useMemo(() => {
    const elements: React.ReactNode[] = [];
    for (const u of units) {
      const owner = players[u.ownerIdx];
      const color = owner?.color ?? '#ffffff';
      const cx = u.x * TILE_SIZE + TILE_SIZE / 2;
      const cy = u.y * TILE_SIZE + TILE_SIZE / 2;
      const r = TILE_SIZE * 0.32;

      if (u.kind === 'pioneer') {
        const path = `M ${cx} ${cy - r} L ${cx + r} ${cy} L ${cx} ${cy + r} L ${cx - r} ${cy} Z`;
        elements.push(<Path key={`u-${u.id}-f`} path={path} color={color} />);
        elements.push(
          <Path
            key={`u-${u.id}-s`}
            path={path}
            color="#ffffff"
            style="stroke"
            strokeWidth={1.2}
          />,
        );
      } else if (u.kind === 'footman') {
        elements.push(
          <Rect
            key={`u-${u.id}-f`}
            x={cx - r}
            y={cy - r}
            width={r * 2}
            height={r * 2}
            color={color}
          />,
        );
        elements.push(
          <Rect
            key={`u-${u.id}-s`}
            x={cx - r}
            y={cy - r}
            width={r * 2}
            height={r * 2}
            color="#ffffff"
            style="stroke"
            strokeWidth={1.2}
          />,
        );
      } else {
        // laborer — circle
        elements.push(<Circle key={`u-${u.id}-f`} cx={cx} cy={cy} r={r} color={color} />);
        elements.push(
          <Circle
            key={`u-${u.id}-s`}
            cx={cx}
            cy={cy}
            r={r}
            color="#ffffff"
            style="stroke"
            strokeWidth={1.2}
          />,
        );
      }
    }
    return elements;
  }, [units, players]);

  const selectionLayer = useMemo(() => {
    let coord: { x: number; y: number } | null = null;
    if (selectedUnitId) {
      const u = units.find((x) => x.id === selectedUnitId);
      if (u) coord = { x: u.x, y: u.y };
    } else if (selectedCityId) {
      const c = cities.find((x) => x.id === selectedCityId);
      if (c) coord = { x: c.x, y: c.y };
    }
    if (!coord) return null;
    return (
      <Rect
        x={coord.x * TILE_SIZE + 1}
        y={coord.y * TILE_SIZE + 1}
        width={TILE_SIZE - 2}
        height={TILE_SIZE - 2}
        color="#ffd84a"
        style="stroke"
        strokeWidth={2}
      />
    );
  }, [selectedUnitId, selectedCityId, units, cities]);

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={{ flex: 1 }}>
        <Canvas style={{ flex: 1 }}>
          <Group transform={transform}>
            {baseLayer}
            {decorLayer}
            {roadLayer}
            {resourceLayer}
            {highlightLayer}
            {cityLayer}
            {unitLayer}
            {workIndicatorLayer}
            {selectionLayer}
          </Group>
        </Canvas>
      </Animated.View>
    </GestureDetector>
  );
}
