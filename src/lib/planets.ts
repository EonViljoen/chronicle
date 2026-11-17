import type { PlanetLook, SurfaceSettings } from '../types/timeline';

/*
 * Planets: a planet is a map whose picture wraps round a globe (see FlatMap
 * in types/timeline.ts). Its picture is "equirectangular", like most world
 * maps: twice as wide as it's tall, x running round the equator and y from
 * pole to pole. So a pin's [x, y] fractions are its longitude and latitude.
 *
 * With no picture of your own, a surface is generated: continents from
 * smooth random noise, sampled on the sphere itself so there's no seam where
 * the picture's edges meet, and no stretching at the poles.
 */

/** A pin's longitude and latitude in degrees: [x, y] -> [−180…180 (E is +), 90…−90 (N is +)]. */
export const toLatLong = ([x, y]: [number, number]): [lat: number, long: number] => [90 - y * 180, x * 360 - 180];

/** Back from degrees to a pin's fractions. */
export const fromLatLong = (lat: number, long: number): [number, number] => [
  Math.round(((((long + 180) % 360) + 360) % 360 / 360) * 10000) / 10000,
  Math.round(((90 - Math.max(-90, Math.min(90, lat))) / 180) * 10000) / 10000,
];

/** "12.5° N, 40.1° W" */
export function formatLatLong(pin: [number, number]): string {
  const [lat, long] = toLatLong(pin);
  const f = (n: number) => Math.abs(n).toFixed(1).replace(/\.0$/, '');
  return `${f(lat)}° ${lat >= 0 ? 'N' : 'S'}, ${f(long)}° ${long >= 0 ? 'E' : 'W'}`;
}

/**
 * Where a pin sits on a sphere of radius r, matching how three.js wraps a
 * picture round its SphereGeometry (x = 0 and 1 meet at the back).
 */
export function pinToSphere([x, y]: [number, number], r = 1): [number, number, number] {
  const phi = x * Math.PI * 2;
  const theta = y * Math.PI;
  return [-r * Math.cos(phi) * Math.sin(theta), r * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta)];
}

export const DEFAULT_SURFACE: SurfaceSettings = { seed: 1, sea: '#1d3f6e', land: '#4f7a3a', high: '#a89a7c', water: 60, ice: true };

export const defaultLook = (generated?: SurfaceSettings): PlanetLook => ({
  atmosphere: 'theme',
  rings: false,
  ringColor: '#c9b48a',
  clouds: true,
  generated,
});

// ---------- Noise ----------

/** A repeatable pseudo-random value 0–1 for a lattice point. */
function hash(x: number, y: number, z: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647 + seed * 144665) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Smooth 3D value noise, 0–1. */
function noise(x: number, y: number, z: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const u = smooth(x - xi);
  const v = smooth(y - yi);
  const w = smooth(z - zi);
  const c = (dx: number, dy: number, dz: number) => hash(xi + dx, yi + dy, zi + dz, seed);
  return lerp(
    lerp(lerp(c(0, 0, 0), c(1, 0, 0), u), lerp(c(0, 1, 0), c(1, 1, 0), u), v),
    lerp(lerp(c(0, 0, 1), c(1, 0, 1), u), lerp(c(0, 1, 1), c(1, 1, 1), u), v),
    w,
  );
}

/** Layers of noise at finer and finer scales ("fractal" noise): big continents with ragged coasts. */
function fractal(x: number, y: number, z: number, seed: number, octaves: number): number {
  let total = 0;
  let amplitude = 1;
  let frequency = 1;
  let max = 0;
  for (let i = 0; i < octaves; i++) {
    total += noise(x * frequency, y * frequency, z * frequency, seed + i * 31) * amplitude;
    max += amplitude;
    amplitude *= 0.5;
    frequency *= 2.03;
  }
  return total / max;
}

/** For every pixel of a w × h equirectangular picture, its point on the unit sphere. */
function* spherePixels(w: number, h: number) {
  for (let py = 0; py < h; py++) {
    const theta = ((py + 0.5) / h) * Math.PI;
    const sinT = Math.sin(theta);
    const y = Math.cos(theta);
    for (let px = 0; px < w; px++) {
      const phi = ((px + 0.5) / w) * Math.PI * 2;
      yield { i: py * w + px, x: -Math.cos(phi) * sinT, y, z: Math.sin(phi) * sinT, lat: 90 - ((py + 0.5) / h) * 180 };
    }
  }
}

const rgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t);

// ---------- Surfaces ----------

/** Surface pictures are drawn this big: plenty for a globe, small enough to store. */
export const SURFACE_WIDTH = 1536;

/**
 * Draws a planet surface as a WebP (or PNG) data: URL, twice as wide as tall.
 * `water` sets how much is sea: the height that many percent of the surface
 * lies under becomes the shoreline.
 */
export function generateSurface(s: SurfaceSettings, width = SURFACE_WIDTH): { image: string; width: number; height: number } {
  const height = width / 2;
  const heights = new Float32Array(width * height);
  const seed = Math.round(s.seed) || 1;
  for (const p of spherePixels(width, height)) {
    // Warp the sample point a little for less blobby continents
    const warp = fractal(p.x * 1.5 + 7, p.y * 1.5, p.z * 1.5, seed + 99, 3) - 0.5;
    heights[p.i] = fractal(p.x * 1.8 + warp, p.y * 1.8 + warp, p.z * 1.8 - warp, seed, 6);
  }

  // The shoreline: sort a sample of heights and take the water percentile
  const sample = Array.from({ length: 4000 }, (_, k) => heights[Math.floor((k / 4000) * heights.length)]).sort((a, b) => a - b);
  const shore = sample[Math.min(sample.length - 1, Math.floor((Math.max(0, Math.min(100, s.water)) / 100) * sample.length))];
  const top = sample[sample.length - 1];
  const bottom = sample[0];

  const sea = rgb(s.sea);
  const deep = sea.map((v) => v * 0.55);
  const land = rgb(s.land);
  const high = rgb(s.high);
  const ice = [236, 242, 246];

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(width, height);
  for (const p of spherePixels(width, height)) {
    const h = heights[p.i];
    let c: number[];
    if (h < shore) {
      const depth = (shore - h) / Math.max(1e-6, shore - bottom);
      c = mix(sea, deep, Math.min(1, depth * 1.6));
    } else {
      const rise = (h - shore) / Math.max(1e-6, top - shore);
      c = mix(land, high, Math.min(1, Math.max(0, (rise - 0.25) * 1.6)));
      // A touch of light along the coast
      if (rise < 0.04) c = mix(c, [210, 200, 160], 0.35 * (1 - rise / 0.04));
    }
    if (s.ice) {
      const wobble = (fractal(p.x * 4, p.y * 4, p.z * 4, seed + 7, 3) - 0.5) * 14;
      const cap = Math.abs(p.lat) + wobble - (h > shore ? 6 : 0);
      if (cap > 74) c = mix(c, ice, Math.min(1, (cap - 74) / 4));
    }
    const o = p.i * 4;
    img.data[o] = c[0];
    img.data[o + 1] = c[1];
    img.data[o + 2] = c[2];
    img.data[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const webp = canvas.toDataURL('image/webp', 0.86);
  return { image: webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/png'), width, height };
}

/** A transparent cloud layer for the globe, drawn on the fly (it isn't stored). */
export function generateClouds(seed: number, width = 1024): HTMLCanvasElement {
  const height = width / 2;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(width, height);
  for (const p of spherePixels(width, height)) {
    // Stretched along the equator, like weather bands
    const n = fractal(p.x * 2.4, p.y * 5, p.z * 2.4, seed + 500, 5);
    const a = Math.max(0, Math.min(1, (n - 0.52) * 4));
    const o = p.i * 4;
    img.data[o] = img.data[o + 1] = img.data[o + 2] = 255;
    img.data[o + 3] = a * 210;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** A random seed for "Another one". */
export const randomSeed = () => Math.floor(Math.random() * 1e6) + 1;
