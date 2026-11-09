import { Color } from 'three';
import type { GalaxyConfig } from '../../types/timeline';

/**
 * A small seeded random number generator (mulberry32). Math.random() would
 * give a different galaxy on every load; with a fixed seed the stars are
 * always in the same place, so your places stay where you put them
 * relative to the arms.
 */
function seededRandom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface GalaxyPoints {
  positions: Float32Array; // x, y, z per star
  colors: Float32Array; // r, g, b per star
}

/**
 * Builds a spiral galaxy as a point cloud.
 * Each star picks an arm, a distance from the centre (biased towards the
 * core), and is swept round by a spin that grows with distance, which is
 * what makes the arms curl. Random scatter, larger further out, softens
 * the arms. Colour fades from the core colour to the arm colour.
 */
export function generateGalaxy(config: GalaxyConfig, count = 30000, seed = 40000): GalaxyPoints {
  const random = seededRandom(seed);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const core = new Color(config.coreColor);
  const arm = new Color(config.armColor);
  const mixed = new Color();

  const { radius, arms } = config;
  const spin = 1.4 / radius; // how tightly the arms wind
  const scatter = 0.32;

  // Random offset, mostly small, occasionally large ("power" squeezes it)
  const offset = (r: number) => Math.pow(random(), 3) * (random() < 0.5 ? 1 : -1) * scatter * r;

  for (let i = 0; i < count; i++) {
    const r = Math.pow(random(), 1.6) * radius;
    const armAngle = ((i % arms) / arms) * Math.PI * 2;
    const angle = armAngle + r * spin * Math.PI;

    positions[i * 3] = Math.cos(angle) * r + offset(r + 4);
    positions[i * 3 + 1] = offset(r + 4) * 0.25; // a thin disc
    positions[i * 3 + 2] = Math.sin(angle) * r + offset(r + 4);

    mixed.copy(core).lerp(arm, Math.min(1, r / (radius * 0.75)));
    colors[i * 3] = mixed.r;
    colors[i * 3 + 1] = mixed.g;
    colors[i * 3 + 2] = mixed.b;
  }

  return { positions, colors };
}
