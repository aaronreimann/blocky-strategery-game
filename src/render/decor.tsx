import { Circle, Path, Rect } from '@shopify/react-native-skia';
import type { ReactNode } from 'react';

import type { Tile } from '@/src/game/map';

// Deterministic 0..1 hash from tile coords + salt — keeps decoration layout
// stable across renders without needing to store it in tile state.
function h(x: number, y: number, salt = 0): number {
  let n = x * 374761393 + y * 668265263 + salt * 2147483647;
  n = (n ^ (n >>> 13)) * 1274126177;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function tri(cx: number, cy: number, w: number, hgt: number): string {
  return `M ${cx} ${cy - hgt} L ${cx - w} ${cy} L ${cx + w} ${cy} Z`;
}

export function decorateTile(tile: Tile, T: number): ReactNode[] {
  const px = tile.x * T;
  const py = tile.y * T;
  const out: ReactNode[] = [];
  const k = `${tile.x}-${tile.y}`;

  switch (tile.terrain) {
    case 'forest': {
      const count = 3 + Math.floor(h(tile.x, tile.y, 1) * 2);
      for (let i = 0; i < count; i++) {
        const cx = px + (0.2 + 0.6 * h(tile.x, tile.y, i * 7 + 1)) * T;
        const cy = py + (0.35 + 0.5 * h(tile.x, tile.y, i * 7 + 2)) * T;
        const sz = T * (0.18 + 0.06 * h(tile.x, tile.y, i * 7 + 3));
        out.push(
          <Path key={`f-${k}-${i}t`} path={tri(cx, cy, sz, sz * 1.5)} color="#1c4a26" />,
        );
        out.push(
          <Rect
            key={`f-${k}-${i}b`}
            x={cx - sz * 0.18}
            y={cy}
            width={sz * 0.36}
            height={sz * 0.4}
            color="#3a2a1a"
          />,
        );
      }
      break;
    }
    case 'mountains': {
      const cx1 = px + T * 0.5;
      const cy1 = py + T * 0.78;
      const wide = T * 0.42;
      const hgt = T * 0.7;
      out.push(
        <Path key={`m-${k}-1`} path={tri(cx1, cy1, wide, hgt)} color="#3f3f48" />,
      );
      // Snow cap (small triangle covering the upper portion).
      const capH = hgt * 0.35;
      const capW = wide * (capH / hgt);
      out.push(
        <Path
          key={`m-${k}-2`}
          path={tri(cx1, cy1 - hgt + capH, capW, capH)}
          color="#eef2f5"
        />,
      );
      // Optional second smaller peak offset.
      if (h(tile.x, tile.y, 5) > 0.5) {
        const cx2 = px + T * 0.22;
        const cy2 = py + T * 0.82;
        const w2 = T * 0.22;
        const hg2 = T * 0.4;
        out.push(<Path key={`m-${k}-3`} path={tri(cx2, cy2, w2, hg2)} color="#4a4a55" />);
      }
      break;
    }
    case 'hills': {
      // 2 small dome bumps via filled circles clipped at the bottom by the
      // tile color (cheap effect — half-disc look).
      const cx1 = px + T * 0.32;
      const cx2 = px + T * 0.68;
      const cy = py + T * 0.7;
      const r = T * 0.18;
      out.push(<Circle key={`h-${k}-1`} cx={cx1} cy={cy} r={r} color="#6b5d3a" />);
      out.push(<Circle key={`h-${k}-2`} cx={cx2} cy={cy} r={r * 0.85} color="#6b5d3a" />);
      out.push(
        <Rect
          key={`h-${k}-3`}
          x={px}
          y={cy + 1}
          width={T}
          height={T * 0.35}
          color="#8a7a4f"
        />,
      );
      break;
    }
    case 'desert': {
      // 2-3 wavy dune dashes.
      const count = 2;
      for (let i = 0; i < count; i++) {
        const cx = px + T * (0.2 + 0.55 * h(tile.x, tile.y, i + 11));
        const cy = py + T * (0.3 + 0.4 * i + 0.1 * h(tile.x, tile.y, i + 13));
        const w = T * 0.22;
        out.push(
          <Path
            key={`d-${k}-${i}`}
            path={`M ${cx - w} ${cy} Q ${cx} ${cy - 2} ${cx + w} ${cy}`}
            style="stroke"
            strokeWidth={1}
            color="#a88a48"
          />,
        );
      }
      break;
    }
    case 'tundra': {
      const count = 5;
      for (let i = 0; i < count; i++) {
        const cx = px + T * h(tile.x, tile.y, i * 3 + 21);
        const cy = py + T * h(tile.x, tile.y, i * 3 + 22);
        out.push(<Circle key={`tu-${k}-${i}`} cx={cx} cy={cy} r={1.1} color="#ffffff" />);
      }
      break;
    }
    case 'grassland': {
      // sparse tiny tufts
      if (h(tile.x, tile.y, 31) > 0.4) {
        const cx = px + T * (0.3 + 0.4 * h(tile.x, tile.y, 32));
        const cy = py + T * (0.5 + 0.4 * h(tile.x, tile.y, 33));
        out.push(<Circle key={`g-${k}-1`} cx={cx} cy={cy} r={1} color="#3d7a2e" />);
        out.push(<Circle key={`g-${k}-2`} cx={cx + 3} cy={cy} r={1} color="#3d7a2e" />);
      }
      break;
    }
    case 'plains': {
      if (h(tile.x, tile.y, 41) > 0.6) {
        const cx = px + T * (0.3 + 0.4 * h(tile.x, tile.y, 42));
        const cy = py + T * (0.4 + 0.4 * h(tile.x, tile.y, 43));
        out.push(<Circle key={`p-${k}-1`} cx={cx} cy={cy} r={1} color="#7e8a36" />);
      }
      break;
    }
    case 'ocean': {
      // sparse wave dot pattern
      if (h(tile.x, tile.y, 51) > 0.55) {
        const cx = px + T * (0.25 + 0.5 * h(tile.x, tile.y, 52));
        const cy = py + T * (0.35 + 0.3 * h(tile.x, tile.y, 53));
        out.push(
          <Path
            key={`o-${k}-1`}
            path={`M ${cx - 3} ${cy} Q ${cx} ${cy - 1.5} ${cx + 3} ${cy}`}
            style="stroke"
            strokeWidth={0.8}
            color="#3a5b8a"
          />,
        );
      }
      break;
    }
    case 'coast': {
      // brighter dot suggesting shallow water sparkle
      if (h(tile.x, tile.y, 61) > 0.4) {
        const cx = px + T * (0.3 + 0.4 * h(tile.x, tile.y, 62));
        const cy = py + T * (0.3 + 0.4 * h(tile.x, tile.y, 63));
        out.push(<Circle key={`c-${k}-1`} cx={cx} cy={cy} r={1} color="#a8d6ee" />);
      }
      break;
    }
  }

  return out;
}
