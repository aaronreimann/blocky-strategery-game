import {
  Canvas,
  Circle,
  DashPathEffect,
  Group,
  matchFont,
  Path,
  Rect,
  Skia,
  Text as SkText,
  useFont,
  useImage,
  Image as SkiaImage,
  type SkPath,
} from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';

import {
  ICON_PATHS,
  ICON_VIEWBOX,
  type GameIconName,
} from '@/src/data/gameIcons';
import type { ImprovementMap } from '@/src/data/improvements';
import { RESOURCE, type Resource } from '@/src/data/resources';
import { TERRAIN } from '@/src/data/terrain';
import { type UnitKind } from '@/src/data/units';
import type { GameMap } from '@/src/game/map';
import type { City, Hut, Player, Unit } from '@/src/game/types';
import { cityRadius } from '@/src/game/yields';

import { pathToTile } from '@/src/game/path';
import { useGame } from '@/src/state/game';

import { decorateTile } from './decor';
import MiniMap from './MiniMap';

// Map every unit/city kind to a game-icons glyph (medieval theme).
const UNIT_ICON: Record<UnitKind, GameIconName> = {
  pioneer:   'wood_axe',
  worker:    'stone_axe',
  footman:   'visored_helm',
  spearman:  'spear_hook',
  horseman:  'horse_head',
  swordsman: 'broadsword',
  catapult:  'catapult',
  galley:    'caravel',
};
const CITY_CAPITAL_ICON: GameIconName = 'castle';
const CITY_HOUSE_ICON: GameIconName = 'house';

// Resource → game-icons mapping (rendered in the resource's color so the
// existing color legend still applies).
export const RESOURCE_ICON: Record<Resource, GameIconName> = {
  wheat: 'wheat',
  cattle: 'cow',
  fish: 'salmon',
  iron: 'metal_bar',
  horses: 'horse_head',
  gold: 'gold_bar',
  wine: 'wine_bottle',
  spices: 'salt_shaker',
};
const RESOURCE_ICON_SIZE = 14;

// Pixel size each icon renders at on the map (camera then scales further).
const ICON_SIZE = 26;

// Multiply each RGB channel of a #rrggbb color by `factor` (0–1) to get a
// darker shade. Used to derive the medallion border color from the owner.
function darken(hex: string, factor: number): string {
  const h = hex.startsWith('#') ? hex.slice(1) : hex;
  if (h.length !== 6) return hex;
  const r = Math.max(0, Math.round(parseInt(h.slice(0, 2), 16) * factor));
  const g = Math.max(0, Math.round(parseInt(h.slice(2, 4), 16) * factor));
  const b = Math.max(0, Math.round(parseInt(h.slice(4, 6), 16) * factor));
  const hex2 = (n: number) => n.toString(16).padStart(2, '0');
  return `#${hex2(r)}${hex2(g)}${hex2(b)}`;
}

// Cache parsed Skia paths so we only convert each SVG string once.
const PATH_CACHE = new Map<GameIconName, SkPath | null>();
function iconPath(name: GameIconName): SkPath | null {
  if (!PATH_CACHE.has(name)) {
    PATH_CACHE.set(name, Skia.Path.MakeFromSVGString(ICON_PATHS[name]));
  }
  return PATH_CACHE.get(name) ?? null;
}

export const TILE_SIZE = 32;
const MIN_SCALE = 0.35;
const MAX_SCALE = 5;

type Props = {
  map: GameMap;
  players: Player[];
  units: Unit[];
  cities: City[];
  huts: Hut[];
  improvements: ImprovementMap;
  selectedUnitId: string | null;
  selectedCityId: string | null;
  autoWorkerOwnerIdxs: Set<number>;
  moveTiles: Set<string>;
  attackTiles: Set<string>;
  onTileTap: (x: number, y: number) => void;
  onSetDestination: (unitId: string, x: number, y: number) => void;
  onTileLongPress: (x: number, y: number) => void;
};

const BADGE_FONT = matchFont({ fontFamily: 'Helvetica', fontSize: 9, fontWeight: 'bold' });

export default function MapView({
  map,
  players,
  units,
  cities,
  huts,
  improvements,
  selectedUnitId,
  selectedCityId,
  autoWorkerOwnerIdxs,
  moveTiles,
  attackTiles,
  onTileTap,
  onSetDestination,
  onTileLongPress,
}: Props) {
  const pioneerImg = useImage(require('../../assets/images/icons/icon_pioneer.png'));
  const workerImg = useImage(require('../../assets/images/icons/icon_worker.png'));
  const footmanImg = useImage(require('../../assets/images/icons/icon_footman.png'));
  const spearmanImg = useImage(require('../../assets/images/icons/icon_spearman.png'));
  const horsemanImg = useImage(require('../../assets/images/icons/icon_horseman.png'));
  const swordsmanImg = useImage(require('../../assets/images/icons/icon_swordsman.png'));
  const catapultImg = useImage(require('../../assets/images/icons/icon_catapult.png'));
  const galleyImg = useImage(require('../../assets/images/icons/icon_galley.png'));
  const townImg = useImage(require('../../assets/images/icons/icon_town.png'));
  const capitalImg = useImage(require('../../assets/images/icons/icon_capital.png'));
  const goodyHutImg = useImage(require('../../assets/images/icons/icon_goody_hut.png'));
  const { width: screenW, height: screenH } = useWindowDimensions();

  // Font Awesome 5 Solid for unit + city icons. While loading we just skip
  // rendering them (units appear a beat later on first launch).
  const iconFont = useFont(
    require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Solid.ttf'),
    ICON_SIZE,
  );

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

  const longPress = Gesture.LongPress()
    .minDuration(380)
    .onStart((e) => {
      'worklet';
      const wx = (e.x - tx.value) / scale.value;
      const wy = (e.y - ty.value) / scale.value;
      const gx = Math.floor(wx / TILE_SIZE);
      const gy = Math.floor(wy / TILE_SIZE);
      if (gx < 0 || gy < 0 || gx >= map.width || gy >= map.height) return;
      runOnJS(onTileLongPress)(gx, gy);
    });

  const gesture = Gesture.Race(longPress, tap, Gesture.Simultaneous(pan, pinch));

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

  // Owner-colored territory borders. Tile is "owned" by the closest city of
  // any owner whose radius includes it; ties go to the older city. We draw a
  // soft tint over each owned tile, then a thin edge line wherever a tile's
  // neighbor belongs to a different (or no) owner.
  const borderLayer = useMemo(() => {
    const ownerByTile = new Map<string, number>();
    const cityIdByTile = new Map<string, string>();
    for (const c of cities) {
      const r = cityRadius(c.population);
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const x = c.x + dx;
          const y = c.y + dy;
          if (x < 0 || y < 0 || x >= map.width || y >= map.height) continue;
          const k = `${x},${y}`;
          const existing = ownerByTile.get(k);
          if (existing === undefined) {
            ownerByTile.set(k, c.ownerIdx);
            cityIdByTile.set(k, c.id);
          } else if (existing !== c.ownerIdx) {
            // Conflict: keep the older claim (cities are appended over time).
            // No-op since the existing claim wins.
          }
        }
      }
    }
    const fills: React.ReactNode[] = [];
    const edges: React.ReactNode[] = [];
    const STROKE = 2;
    const DASH: number[] = [5, 4];
    const dashEdge = (key: string, path: string, color: string) => (
      <Path
        key={key}
        path={path}
        color={color}
        style="stroke"
        strokeWidth={STROKE}
      >
        <DashPathEffect intervals={DASH} />
      </Path>
    );
    for (const [k, ownerIdx] of ownerByTile) {
      const [xs, ys] = k.split(',');
      const x = Number(xs);
      const y = Number(ys);
      const color = players[ownerIdx]?.color ?? '#ffffff';
      // Soft fill (low alpha so terrain stays readable).
      fills.push(
        <Rect
          key={`bf-${k}`}
          x={x * TILE_SIZE}
          y={y * TILE_SIZE}
          width={TILE_SIZE}
          height={TILE_SIZE}
          color={`${color}22`}
        />,
      );
      const tx = x * TILE_SIZE;
      const ty = y * TILE_SIZE;
      // Edges where the neighbor isn't the same owner — drawn as dashed
      // stroked paths instead of solid rect strips.
      const top = ownerByTile.get(`${x},${y - 1}`);
      const bottom = ownerByTile.get(`${x},${y + 1}`);
      const left = ownerByTile.get(`${x - 1},${y}`);
      const right = ownerByTile.get(`${x + 1},${y}`);
      if (top !== ownerIdx) {
        edges.push(
          dashEdge(`bt-${k}`, `M ${tx} ${ty + 1} L ${tx + TILE_SIZE} ${ty + 1}`, color),
        );
      }
      if (bottom !== ownerIdx) {
        edges.push(
          dashEdge(
            `bb-${k}`,
            `M ${tx} ${ty + TILE_SIZE - 1} L ${tx + TILE_SIZE} ${ty + TILE_SIZE - 1}`,
            color,
          ),
        );
      }
      if (left !== ownerIdx) {
        edges.push(
          dashEdge(`bl-${k}`, `M ${tx + 1} ${ty} L ${tx + 1} ${ty + TILE_SIZE}`, color),
        );
      }
      if (right !== ownerIdx) {
        edges.push(
          dashEdge(
            `br-${k}`,
            `M ${tx + TILE_SIZE - 1} ${ty} L ${tx + TILE_SIZE - 1} ${ty + TILE_SIZE}`,
            color,
          ),
        );
      }
    }
    const out: React.ReactNode[] = [...fills, ...edges];
    return out;
  }, [cities, players, map.width, map.height]);

  const resourceLayer = useMemo(() => {
    const scale = RESOURCE_ICON_SIZE / ICON_VIEWBOX;
    const out: React.ReactNode[] = [];
    for (const tile of map.tiles) {
      if (!tile.resource) continue;
      const path = iconPath(RESOURCE_ICON[tile.resource]);
      if (!path) continue;
      const cx = tile.x * TILE_SIZE + TILE_SIZE / 2;
      const cy = tile.y * TILE_SIZE + TILE_SIZE / 2;
      const ox = cx - RESOURCE_ICON_SIZE / 2;
      const oy = cy - RESOURCE_ICON_SIZE / 2;
      out.push(
        <Group
          key={`r-${tile.x}-${tile.y}`}
          transform={[{ translateX: ox }, { translateY: oy }, { scale }]}
        >
          <Path
            path={path}
            color="rgba(0,0,0,0.6)"
            transform={[{ translateX: 18 }, { translateY: 18 }]}
          />
          <Path path={path} color={RESOURCE[tile.resource].color} />
        </Group>,
      );
    }
    return out;
  }, [map]);

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

  const farmMineIrrigationLayer = useMemo(() => {
    const out: React.ReactNode[] = [];
    for (const key in improvements) {
      const imp = improvements[key];
      if (imp === 'road') continue; // roads have their own layer
      const [xs, ys] = key.split(',');
      const x = Number(xs);
      const y = Number(ys);
      const cx = x * TILE_SIZE + TILE_SIZE / 2;
      const cy = y * TILE_SIZE + TILE_SIZE / 2;
      if (imp === 'farm') {
        // 2x2 cross-hatch suggesting fields
        const grid = `M ${cx - 7} ${cy - 4} L ${cx + 7} ${cy - 4} M ${cx - 7} ${cy + 4} L ${cx + 7} ${cy + 4} M ${cx - 4} ${cy - 7} L ${cx - 4} ${cy + 7} M ${cx + 4} ${cy - 7} L ${cx + 4} ${cy + 7}`;
        out.push(
          <Path
            key={`fm-${key}`}
            path={grid}
            color="#7a4f1c"
            style="stroke"
            strokeWidth={1.2}
          />,
        );
      } else if (imp === 'mine') {
        // dark triangular peak
        const tri = `M ${cx - 6} ${cy + 6} L ${cx} ${cy - 6} L ${cx + 6} ${cy + 6} Z`;
        out.push(
          <Path key={`mn-${key}-f`} path={tri} color="#1f1f1f" />,
        );
        out.push(
          <Path
            key={`mn-${key}-s`}
            path={tri}
            color="#facc15"
            style="stroke"
            strokeWidth={0.8}
          />,
        );
      } else if (imp === 'irrigation') {
        // two wavy blue lines suggesting channels
        out.push(
          <Path
            key={`ir-${key}-1`}
            path={`M ${cx - 8} ${cy - 3} Q ${cx - 3} ${cy - 5} ${cx} ${cy - 3} Q ${cx + 3} ${cy - 1} ${cx + 8} ${cy - 3}`}
            color="#3a7ac0"
            style="stroke"
            strokeWidth={1.2}
          />,
        );
        out.push(
          <Path
            key={`ir-${key}-2`}
            path={`M ${cx - 8} ${cy + 3} Q ${cx - 3} ${cy + 1} ${cx} ${cy + 3} Q ${cx + 3} ${cy + 5} ${cx + 8} ${cy + 3}`}
            color="#3a7ac0"
            style="stroke"
            strokeWidth={1.2}
          />,
        );
      }
    }
    return out;
  }, [improvements]);

  const roadLayer = useMemo(() => {
    const base: React.ReactNode[] = [];
    const top: React.ReactNode[] = [];
    const isRoad = (x: number, y: number) => improvements[`${x},${y}`] === 'road';
    const ROAD_BASE = '#d4b88a';
    const ROAD_INK = '#6b4a26';
    const BASE_W = 5;
    const INK_W = 2;
    // Deterministic per-(segment, sample) hash → [0, 1).
    const hash01 = (
      x: number,
      y: number,
      dx: number,
      dy: number,
      salt: number,
    ) => {
      let h =
        (x * 73856093) ^
        (y * 19349663) ^
        ((dx + 2) * 83492791) ^
        ((dy + 2) * 2971215073) ^
        (salt * 1376312589);
      h = (h ^ (h >>> 13)) >>> 0;
      h = ((h * 1597334677) ^ (h >>> 16)) >>> 0;
      return (h & 0xffff) / 0xffff;
    };
    const wander = (
      x: number,
      y: number,
      dx: number,
      dy: number,
      salt: number,
      amp: number,
    ) => (hash01(x, y, dx, dy, salt) * 2 - 1) * amp;
    // 5 interior samples per segment, each pushed perpendicular by up to
    // ±10px (≈⅓ of a tile). Connect with cubic Bezier through midpoints
    // (Catmull-Rom-ish) so the path stays smooth instead of zig-zagging.
    const SAMPLES = 5;
    const AMP = 10;
    for (const key in improvements) {
      if (improvements[key] !== 'road') continue;
      const [xs, ys] = key.split(',');
      const x = Number(xs);
      const y = Number(ys);
      const cx = x * TILE_SIZE + TILE_SIZE / 2;
      const cy = y * TILE_SIZE + TILE_SIZE / 2;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          if (!isRoad(x + dx, y + dy)) continue;
          if (!(dx > 0 || (dx === 0 && dy > 0))) continue;
          const nx = (x + dx) * TILE_SIZE + TILE_SIZE / 2;
          const ny = (y + dy) * TILE_SIZE + TILE_SIZE / 2;
          const sx = nx - cx;
          const sy = ny - cy;
          const len = Math.hypot(sx, sy) || 1;
          const px = -sy / len;
          const py = sx / len;
          // Build the polyline of (interior) sample points.
          const pts: { x: number; y: number }[] = [{ x: cx, y: cy }];
          for (let i = 1; i <= SAMPLES; i++) {
            const t = i / (SAMPLES + 1);
            const bx = cx + sx * t;
            const by = cy + sy * t;
            // Larger wander in the middle, tapering near the endpoints so
            // segments meet cleanly at tile centers.
            const taper = Math.sin(t * Math.PI); // 0 at ends, 1 in middle
            const o = wander(x, y, dx, dy, i, AMP) * taper;
            pts.push({ x: bx + px * o, y: by + py * o });
          }
          pts.push({ x: nx, y: ny });
          // Smooth cubic through points using a Catmull-Rom → Bezier
          // conversion (alpha=0.5 for centripetal feel).
          let path = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
          for (let i = 0; i < pts.length - 1; i++) {
            const p0 = pts[Math.max(0, i - 1)];
            const p1 = pts[i];
            const p2 = pts[i + 1];
            const p3 = pts[Math.min(pts.length - 1, i + 2)];
            const c1x = p1.x + (p2.x - p0.x) / 6;
            const c1y = p1.y + (p2.y - p0.y) / 6;
            const c2x = p2.x - (p3.x - p1.x) / 6;
            const c2y = p2.y - (p3.y - p1.y) / 6;
            path += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
          }
          base.push(
            <Path
              key={`rd-b-${key}-${dx}${dy}`}
              path={path}
              color={ROAD_BASE}
              style="stroke"
              strokeWidth={BASE_W}
              strokeCap="round"
              strokeJoin="round"
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
              strokeJoin="round"
            />,
          );
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
      const isAuto =
        u.kind === 'worker' &&
        (u.autoMode || autoWorkerOwnerIdxs.has(u.ownerIdx)) &&
        !hasDest;
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
  }, [units, autoWorkerOwnerIdxs]);

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

  // Planned-path overlay for the selected unit's destination. Shows the
  // BFS-computed route the unit will take over the coming turns.
  const destinationPathLayer = useMemo(() => {
    if (!selectedUnitId) return null;
    const sel = units.find((u) => u.id === selectedUnitId);
    if (!sel || !sel.destination) return null;
    const blocked = new Set<string>();
    for (const o of units) {
      if (o.id !== sel.id) blocked.add(`${o.x},${o.y}`);
    }
    for (const c of cities) {
      if (c.ownerIdx !== sel.ownerIdx) blocked.add(`${c.x},${c.y}`);
    }
    const path = pathToTile(
      { x: sel.x, y: sel.y },
      sel.destination,
      blocked,
      map,
      sel.kind,
    );
    if (!path || path.length < 2) return null;
    const d = path
      .map((p, i) => {
        const cx = p.x * TILE_SIZE + TILE_SIZE / 2;
        const cy = p.y * TILE_SIZE + TILE_SIZE / 2;
        return `${i === 0 ? 'M' : 'L'} ${cx} ${cy}`;
      })
      .join(' ');
    return [
      <Path
        key="dest-path-shadow"
        path={d}
        color="#0a1729"
        style="stroke"
        strokeWidth={4}
        opacity={0.6}
      />,
      <Path
        key="dest-path"
        path={d}
        color="#facc15"
        style="stroke"
        strokeWidth={2}
        opacity={0.95}
      />,
      ...path.slice(1).map((p, i) => (
        <Circle
          key={`dest-dot-${i}`}
          cx={p.x * TILE_SIZE + TILE_SIZE / 2}
          cy={p.y * TILE_SIZE + TILE_SIZE / 2}
          r={2.5}
          color="#facc15"
        />
      )),
    ];
  }, [selectedUnitId, units, cities, map]);

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
    // First-founded city per player is treated as their capital.
    const firstCityByPlayer = new Map<number, string>();
    for (const c of cities) {
      if (!firstCityByPlayer.has(c.ownerIdx)) {
        firstCityByPlayer.set(c.ownerIdx, c.id);
      }
    }
    return cities.map((c) => {
      const owner = players[c.ownerIdx];
      const color = owner?.color ?? '#ffffff';
      const isCapital = firstCityByPlayer.get(c.ownerIdx) === c.id;
      const img = isCapital ? capitalImg : townImg;
      if (!img) return null;
      const cx = c.x * TILE_SIZE + TILE_SIZE / 2;
      const cy = c.y * TILE_SIZE + TILE_SIZE / 2;
      const PAINTED_SIZE = Math.round(TILE_SIZE * 1.4);
      const pox = cx - PAINTED_SIZE / 2;
      const poy = cy - PAINTED_SIZE / 2;
      const borderColor = darken(color, 0.55);
      return (
        <Group key={`city-${c.id}`}>
          <Circle cx={cx} cy={cy} r={PAINTED_SIZE * 0.45} color={color} opacity={0.6} />
          <Circle
            cx={cx}
            cy={cy}
            r={PAINTED_SIZE * 0.45}
            color={borderColor}
            style="stroke"
            strokeWidth={2}
          />
          <SkiaImage
            image={img}
            x={pox}
            y={poy - 4}
            width={PAINTED_SIZE}
            height={PAINTED_SIZE}
          />
        </Group>
      );
    });
  }, [cities, players, townImg, capitalImg]);

  const hutLayer = useMemo(() => {
    if (!goodyHutImg) return [] as React.ReactNode[];
    return huts.map((h) => {
      const cx = h.x * TILE_SIZE + TILE_SIZE / 2;
      const cy = h.y * TILE_SIZE + TILE_SIZE / 2;
      const PAINTED_SIZE = Math.round(TILE_SIZE * 1.2);
      const pox = cx - PAINTED_SIZE / 2;
      const poy = cy - PAINTED_SIZE / 2;
      return (
        <SkiaImage
          key={`hut-${h.x}-${h.y}`}
          image={goodyHutImg}
          x={pox}
          y={poy}
          width={PAINTED_SIZE}
          height={PAINTED_SIZE}
        />
      );
    });
  }, [huts, goodyHutImg]);

  const unitLayer = useMemo(() => {
    const elements: React.ReactNode[] = [];
    for (const u of units) {
      const owner = players[u.ownerIdx];
      const color = owner?.color ?? '#ffffff';
      
      const cx = u.x * TILE_SIZE + TILE_SIZE / 2;
      const cy = u.y * TILE_SIZE + TILE_SIZE / 2;
      
      if (u.stack.length > 1) {
        elements.push(
          <Circle
            key={`u-${u.id}-ring`}
            cx={cx}
            cy={cy}
            r={ICON_SIZE * 0.6}
            color="#facc15"
            style="stroke"
            strokeWidth={2}
          />,
        );
      }

      let img = null;
      if (u.kind === 'pioneer') img = pioneerImg;
      else if (u.kind === 'worker') img = workerImg;
      else if (u.kind === 'footman') img = footmanImg;
      else if (u.kind === 'spearman') img = spearmanImg;
      else if (u.kind === 'horseman') img = horsemanImg;
      else if (u.kind === 'swordsman') img = swordsmanImg;
      else if (u.kind === 'catapult') img = catapultImg;
      else if (u.kind === 'galley') img = galleyImg;

      if (img) {
        // Disc sits inside the tile with a small margin (10% smaller than
        // the tile edge). Character canvas stays at 0.85× tile so the
        // figure may slightly overflow the disc — that's intentional.
        const DISC_R = TILE_SIZE * 0.45;
        const PAINTED_SIZE = Math.round(TILE_SIZE * 0.85);
        const pox = cx - PAINTED_SIZE / 2;
        const poy = cy - PAINTED_SIZE / 2;
        const borderColor = darken(color, 0.55);
        elements.push(
          <Circle key={`u-${u.id}-bg`} cx={cx} cy={cy} r={DISC_R} color={color} />,
        );
        elements.push(
          <Circle
            key={`u-${u.id}-bdr`}
            cx={cx}
            cy={cy}
            r={DISC_R}
            color={borderColor}
            style="stroke"
            strokeWidth={1.5}
          />,
        );
        elements.push(
          <SkiaImage
            key={`u-${u.id}`}
            image={img}
            x={pox}
            y={poy}
            width={PAINTED_SIZE}
            height={PAINTED_SIZE}
          />,
        );
      }
    }
    return elements;
  }, [units, players, pioneerImg, workerImg, footmanImg, spearmanImg, horsemanImg, swordsmanImg, catapultImg, galleyImg]);

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

  // Honor jump-to requests from elsewhere in the UI (Kingdom Menu).
  const pendingJumpTo = useGame((s) => s.pendingJumpTo);
  const clearJumpRequest = useGame((s) => s.clearJumpRequest);
  useEffect(() => {
    if (!pendingJumpTo) return;
    jumpTo(
      pendingJumpTo.x * TILE_SIZE + TILE_SIZE / 2,
      pendingJumpTo.y * TILE_SIZE + TILE_SIZE / 2,
    );
    clearJumpRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingJumpTo]);

  return (
    <Animated.View style={{ flex: 1 }}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={{ flex: 1 }}>
          <Canvas style={{ flex: 1 }}>
            <Group transform={transform}>
            {baseLayer}
            {borderLayer}
            {decorLayer}
            {farmMineIrrigationLayer}
            {roadLayer}
            {resourceLayer}
            {highlightLayer}
            {arrowLayer}
            {destinationPathLayer}
            {destLayer}
            {hutLayer}
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
