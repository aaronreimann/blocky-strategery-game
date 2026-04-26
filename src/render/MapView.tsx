import {
  Canvas,
  Circle,
  Group,
  matchFont,
  Path,
  Rect,
  Text as SkText,
} from '@shopify/react-native-skia';
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
import MiniMap from './MiniMap';

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
  autoLaborerOwnerIdxs: Set<number>;
  moveTiles: Set<string>;
  attackTiles: Set<string>;
  onTileTap: (x: number, y: number) => void;
  onSetDestination: (unitId: string, x: number, y: number) => void;
};

const BADGE_FONT = matchFont({ fontFamily: 'Helvetica', fontSize: 9, fontWeight: 'bold' });

export default function MapView({
  map,
  players,
  units,
  cities,
  improvements,
  selectedUnitId,
  selectedCityId,
  autoLaborerOwnerIdxs,
  moveTiles,
  attackTiles,
  onTileTap,
  onSetDestination,
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

  // Drag-from-selected-unit state, synced from React props each render so the
  // gesture worklets can read it without runOnJS round trips.
  const selUnitGridX = useSharedValue(-1);
  const selUnitGridY = useSharedValue(-1);
  const selUnitId = useSharedValue<string | null>(null);
  const isDraggingUnit = useSharedValue(false);
  const dragWorldX = useSharedValue(0);
  const dragWorldY = useSharedValue(0);

  useEffect(() => {
    if (selectedUnitId) {
      const u = units.find((x) => x.id === selectedUnitId);
      if (u) {
        selUnitGridX.value = u.x;
        selUnitGridY.value = u.y;
        selUnitId.value = u.id;
        return;
      }
    }
    selUnitGridX.value = -1;
    selUnitGridY.value = -1;
    selUnitId.value = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUnitId, units]);

  const fireSetDestination = (gx: number, gy: number) => {
    const id = selUnitId.value;
    if (!id) return;
    onSetDestination(id, gx, gy);
  };

  useEffect(() => {
    scale.value = fitScale;
    tx.value = (screenW - mapPxW * fitScale) / 2;
    ty.value = (screenH - mapPxH * fitScale) / 2;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pan = Gesture.Pan()
    .minDistance(8)
    .onStart((e) => {
      'worklet';
      startTx.value = tx.value;
      startTy.value = ty.value;
      // If the gesture began on the selected unit's tile, treat as a
      // destination drag rather than a camera pan.
      const wx = (e.x - tx.value) / scale.value;
      const wy = (e.y - ty.value) / scale.value;
      const gx = Math.floor(wx / TILE_SIZE);
      const gy = Math.floor(wy / TILE_SIZE);
      if (gx === selUnitGridX.value && gy === selUnitGridY.value && selUnitId.value !== null) {
        isDraggingUnit.value = true;
        dragWorldX.value = wx;
        dragWorldY.value = wy;
      } else {
        isDraggingUnit.value = false;
      }
    })
    .onUpdate((e) => {
      'worklet';
      if (isDraggingUnit.value) {
        const wx = (e.x - tx.value) / scale.value;
        const wy = (e.y - ty.value) / scale.value;
        dragWorldX.value = wx;
        dragWorldY.value = wy;
      } else {
        tx.value = startTx.value + e.translationX;
        ty.value = startTy.value + e.translationY;
      }
    })
    .onEnd((e) => {
      'worklet';
      if (isDraggingUnit.value) {
        const wx = (e.x - tx.value) / scale.value;
        const wy = (e.y - ty.value) / scale.value;
        const gx = Math.floor(wx / TILE_SIZE);
        const gy = Math.floor(wy / TILE_SIZE);
        runOnJS(fireSetDestination)(gx, gy);
        isDraggingUnit.value = false;
      }
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

  // A/M badges in the bottom-right of each unit's tile + xN stack badges
  // in the top-right.
  const badgeLayer = useMemo(() => {
    const out: React.ReactNode[] = [];
    const drawBadge = (key: string, x: number, y: number, text: string) => {
      out.push(
        <Rect key={`${key}-bg`} x={x} y={y} width={10} height={9} color="#0a1729" />,
      );
      out.push(
        <Rect
          key={`${key}-bo`}
          x={x}
          y={y}
          width={10}
          height={9}
          color="#facc15"
          style="stroke"
          strokeWidth={1}
        />,
      );
      out.push(
        <SkText
          key={`${key}-t`}
          x={x + 1.5}
          y={y + 7.5}
          text={text}
          font={BADGE_FONT}
          color="#facc15"
        />,
      );
    };

    for (const u of units) {
      const hasDest = u.destination !== null;
      const isAuto = u.kind === 'laborer' && autoLaborerOwnerIdxs.has(u.ownerIdx) && !hasDest;
      if (hasDest || isAuto) {
        const letter = hasDest ? 'M' : 'A';
        drawBadge(
          `bd-am-${u.id}`,
          u.x * TILE_SIZE + TILE_SIZE - 11,
          u.y * TILE_SIZE + TILE_SIZE - 10,
          letter,
        );
      }
      if (u.stack.length > 1) {
        drawBadge(
          `bd-stk-${u.id}`,
          u.x * TILE_SIZE + TILE_SIZE - 11,
          u.y * TILE_SIZE + 1,
          `x${u.stack.length}`,
        );
      }
    }
    return out;
  }, [units, autoLaborerOwnerIdxs]);

  // Direction arrows on each highlight tile pointing from selected unit
  // toward that tile, so it's obvious where the unit can step.
  const arrowLayer = useMemo(() => {
    const out: React.ReactNode[] = [];
    if (!selectedUnitId) return out;
    const sel = units.find((u) => u.id === selectedUnitId);
    if (!sel) return out;

    const drawArrow = (
      key: string,
      gx: number,
      gy: number,
      color: string,
    ) => {
      const dx = gx - sel.x;
      const dy = gy - sel.y;
      if (dx === 0 && dy === 0) return;
      const len = Math.hypot(dx, dy);
      const ux = dx / len;
      const uy = dy / len;
      const cx = gx * TILE_SIZE + TILE_SIZE / 2;
      const cy = gy * TILE_SIZE + TILE_SIZE / 2;
      const size = TILE_SIZE * 0.28;
      const tipX = cx + ux * size;
      const tipY = cy + uy * size;
      const px = -uy;
      const py = ux;
      const baseX = cx - ux * size * 0.4;
      const baseY = cy - uy * size * 0.4;
      const c1X = baseX + px * size * 0.6;
      const c1Y = baseY + py * size * 0.6;
      const c2X = baseX - px * size * 0.6;
      const c2Y = baseY - py * size * 0.6;
      const path = `M ${tipX} ${tipY} L ${c1X} ${c1Y} L ${c2X} ${c2Y} Z`;
      out.push(<Path key={`ar-${key}-f`} path={path} color={color} />);
      out.push(
        <Path
          key={`ar-${key}-s`}
          path={path}
          color="#0a1729"
          style="stroke"
          strokeWidth={0.8}
        />,
      );
    };

    for (const k of moveTiles) {
      const [xs, ys] = k.split(',');
      drawArrow(`m-${k}`, Number(xs), Number(ys), '#facc15');
    }
    for (const k of attackTiles) {
      const [xs, ys] = k.split(',');
      drawArrow(`a-${k}`, Number(xs), Number(ys), '#ef4444');
    }
    return out;
  }, [selectedUnitId, units, moveTiles, attackTiles]);

  // Destination markers (yellow ring on each unit's destination tile).
  const destLayer = useMemo(() => {
    return units
      .filter((u) => u.destination !== null && u.ownerIdx === 0)
      .map((u) => (
        <Rect
          key={`dst-${u.id}`}
          x={u.destination!.x * TILE_SIZE + 2}
          y={u.destination!.y * TILE_SIZE + 2}
          width={TILE_SIZE - 4}
          height={TILE_SIZE - 4}
          color="#facc15"
          style="stroke"
          strokeWidth={1.5}
        />
      ));
  }, [units]);

  // Live drag indicator: line from selected unit center to current drag pos.
  const dragLinePath = useDerivedValue(() => {
    if (!isDraggingUnit.value) {
      return `M 0 0`;
    }
    const sx = selUnitGridX.value * TILE_SIZE + TILE_SIZE / 2;
    const sy = selUnitGridY.value * TILE_SIZE + TILE_SIZE / 2;
    return `M ${sx} ${sy} L ${dragWorldX.value} ${dragWorldY.value}`;
  });
  const dragOpacity = useDerivedValue(() => (isDraggingUnit.value ? 1 : 0));

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
            color={u.stack.length > 1 ? '#facc15' : '#ffffff'}
            style="stroke"
            strokeWidth={u.stack.length > 1 ? 2.2 : 1.2}
          />,
        );
      } else if (u.kind === 'laborer') {
        elements.push(<Circle key={`u-${u.id}-f`} cx={cx} cy={cy} r={r} color={color} />);
        elements.push(
          <Circle
            key={`u-${u.id}-s`}
            cx={cx}
            cy={cy}
            r={r}
            color={u.stack.length > 1 ? '#facc15' : '#ffffff'}
            style="stroke"
            strokeWidth={u.stack.length > 1 ? 2.2 : 1.2}
          />,
        );
      } else if (u.kind === 'horseman') {
        // right-pointing triangle
        const path = `M ${cx - r} ${cy - r} L ${cx + r} ${cy} L ${cx - r} ${cy + r} Z`;
        elements.push(<Path key={`u-${u.id}-f`} path={path} color={color} />);
        elements.push(
          <Path
            key={`u-${u.id}-s`}
            path={path}
            color={u.stack.length > 1 ? '#facc15' : '#ffffff'}
            style="stroke"
            strokeWidth={u.stack.length > 1 ? 2.2 : 1.2}
          />,
        );
      } else if (u.kind === 'spearman') {
        // square + spear (white triangle on top)
        elements.push(
          <Rect key={`u-${u.id}-f`} x={cx - r} y={cy - r * 0.7} width={r * 2} height={r * 1.7} color={color} />,
        );
        elements.push(
          <Rect
            key={`u-${u.id}-s`}
            x={cx - r}
            y={cy - r * 0.7}
            width={r * 2}
            height={r * 1.7}
            color={u.stack.length > 1 ? '#facc15' : '#ffffff'}
            style="stroke"
            strokeWidth={u.stack.length > 1 ? 2.2 : 1.2}
          />,
        );
        const spear = `M ${cx} ${cy - r * 1.4} L ${cx - r * 0.4} ${cy - r * 0.7} L ${cx + r * 0.4} ${cy - r * 0.7} Z`;
        elements.push(<Path key={`u-${u.id}-sp`} path={spear} color="#ffffff" />);
      } else if (u.kind === 'swordsman') {
        // bigger square with white X
        const sr = r * 1.1;
        elements.push(
          <Rect key={`u-${u.id}-f`} x={cx - sr} y={cy - sr} width={sr * 2} height={sr * 2} color={color} />,
        );
        elements.push(
          <Rect
            key={`u-${u.id}-s`}
            x={cx - sr}
            y={cy - sr}
            width={sr * 2}
            height={sr * 2}
            color={u.stack.length > 1 ? '#facc15' : '#ffffff'}
            style="stroke"
            strokeWidth={u.stack.length > 1 ? 2.2 : 1.4}
          />,
        );
        const x1 = `M ${cx - sr * 0.5} ${cy - sr * 0.5} L ${cx + sr * 0.5} ${cy + sr * 0.5}`;
        const x2 = `M ${cx + sr * 0.5} ${cy - sr * 0.5} L ${cx - sr * 0.5} ${cy + sr * 0.5}`;
        elements.push(<Path key={`u-${u.id}-x1`} path={x1} color="#ffffff" style="stroke" strokeWidth={1.4} />);
        elements.push(<Path key={`u-${u.id}-x2`} path={x2} color="#ffffff" style="stroke" strokeWidth={1.4} />);
      } else if (u.kind === 'catapult') {
        // wide rectangle (wagon)
        const w = r * 1.4;
        const h = r * 0.8;
        elements.push(
          <Rect key={`u-${u.id}-f`} x={cx - w} y={cy - h} width={w * 2} height={h * 2} color={color} />,
        );
        elements.push(
          <Rect
            key={`u-${u.id}-s`}
            x={cx - w}
            y={cy - h}
            width={w * 2}
            height={h * 2}
            color={u.stack.length > 1 ? '#facc15' : '#ffffff'}
            style="stroke"
            strokeWidth={u.stack.length > 1 ? 2.2 : 1.2}
          />,
        );
        // little wheel dots
        elements.push(<Circle key={`u-${u.id}-w1`} cx={cx - w * 0.6} cy={cy + h * 0.7} r={2} color="#ffffff" />);
        elements.push(<Circle key={`u-${u.id}-w2`} cx={cx + w * 0.6} cy={cy + h * 0.7} r={2} color="#ffffff" />);
      } else {
        // footman — plain square
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
            color={u.stack.length > 1 ? '#facc15' : '#ffffff'}
            style="stroke"
            strokeWidth={u.stack.length > 1 ? 2.2 : 1.2}
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

  const jumpTo = (worldX: number, worldY: number) => {
    tx.value = screenW / 2 - worldX * scale.value;
    ty.value = screenH / 2 - worldY * scale.value;
  };

  return (
    <Animated.View style={{ flex: 1 }}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={{ flex: 1 }}>
          <Canvas style={{ flex: 1 }}>
            <Group transform={transform}>
            {baseLayer}
            {decorLayer}
            {roadLayer}
            {resourceLayer}
            {highlightLayer}
            {arrowLayer}
            {destLayer}
            {cityLayer}
            {unitLayer}
            {workIndicatorLayer}
            {badgeLayer}
            {selectionLayer}
            <Path
              path={dragLinePath}
              color="#facc15"
              style="stroke"
              strokeWidth={2}
              opacity={dragOpacity}
            />
          </Group>
          </Canvas>
        </Animated.View>
      </GestureDetector>
      <MiniMap
        map={map}
        cities={cities}
        players={players}
        cameraTx={tx}
        cameraTy={ty}
        cameraScale={scale}
        screenW={screenW}
        screenH={screenH}
        tileSize={TILE_SIZE}
        onJumpTo={jumpTo}
      />
    </Animated.View>
  );
}
