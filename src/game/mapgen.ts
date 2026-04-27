import { createNoise2D } from 'simplex-noise';

import { RESOURCE, RESOURCE_TYPES, type Resource } from '@/src/data/resources';
import type { Terrain } from '@/src/data/terrain';

import { type GameMap, type Tile, getTile, tileIndex } from './map';

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fbm(noise: (x: number, y: number) => number, x: number, y: number, octaves = 4): number {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise(x * freq, y * freq);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

function pickTerrain(elev: number, moist: number, lat: number): Terrain {
  if (elev < 0.42) return 'ocean';
  if (lat > 0.85) return 'tundra';
  if (elev > 0.78) return 'mountains';
  if (elev > 0.62) return 'hills';
  if (moist < 0.3) return 'desert';
  if (moist < 0.55) return 'plains';
  if (moist > 0.75) return 'forest';
  return 'grassland';
}

export function generateMap(
  seed = 1,
  width = 48,
  height = 36,
): GameMap {
  const rng = mulberry32(seed);
  const elevNoise = createNoise2D(mulberry32(seed * 31 + 7));
  const moistNoise = createNoise2D(mulberry32(seed * 17 + 91));

  const tiles: Tile[] = new Array(width * height);

  // Pass 1: terrain from noise + island falloff (push edges toward ocean).
  const cx = width / 2;
  const cy = height / 2;
  const maxDist = Math.hypot(cx, cy);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = x / width;
      const ny = y / height;
      const distFromCenter = Math.hypot(x - cx, y - cy) / maxDist; // 0..1
      const island = 1 - distFromCenter; // higher in middle

      const rawElev = (fbm(elevNoise, nx * 4, ny * 4, 5) + 1) * 0.5; // 0..1
      const elev = rawElev * 0.7 + island * 0.3;

      const moist = (fbm(moistNoise, nx * 6, ny * 6, 3) + 1) * 0.5;
      const lat = Math.abs(y - cy) / cy; // 0 at equator, 1 at poles

      const terrain = pickTerrain(elev, moist, lat);
      tiles[tileIndex(x, y, width)] = { x, y, terrain, resource: null };
    }
  }

  const map: GameMap = { width, height, tiles, seed };

  // Pass 2: ocean bordering land becomes coast.
  const coastFlips: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const t = tiles[tileIndex(x, y, width)];
      if (t.terrain !== 'ocean') continue;
      let touchesLand = false;
      for (let dy = -1; dy <= 1 && !touchesLand; dy++) {
        for (let dx = -1; dx <= 1 && !touchesLand; dx++) {
          if (dx === 0 && dy === 0) continue;
          const n = getTile(map, x + dx, y + dy);
          if (n && n.terrain !== 'ocean' && n.terrain !== 'coast') touchesLand = true;
        }
      }
      if (touchesLand) coastFlips.push(tileIndex(x, y, width));
    }
  }
  for (const i of coastFlips) tiles[i].terrain = 'coast';

  // Pass 3: sprinkle resources. ~8% of land tiles get one.
  const RESOURCE_DENSITY = 0.08;
  for (const tile of tiles) {
    if (tile.terrain === 'ocean') continue;
    if (rng() > RESOURCE_DENSITY) continue;
    const candidates: Resource[] = RESOURCE_TYPES.filter((r) =>
      RESOURCE[r].on.includes(tile.terrain),
    );
    if (candidates.length === 0) continue;
    tile.resource = candidates[Math.floor(rng() * candidates.length)];
  }

  return map;
}
