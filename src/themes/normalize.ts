import type { Theme } from '../types/theme';
import { DEFAULT_THEME } from './presets';

/*
 * Themes come from files (imports, exported timelines, published sites), so
 * they can be missing fields or hold nonsense. normalizeTheme fills gaps from
 * the default theme and drops values of the wrong type, so the rest of the
 * app can trust every field. It also means themes saved by older versions
 * pick up new options with sensible defaults.
 */

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Copies each field of `base` from `raw` when it has the same type. Recurses into objects. */
function merge<T extends Obj>(base: T, raw: unknown): T {
  if (!isObj(raw)) return structuredClone(base);
  const out: Obj = {};
  for (const [key, value] of Object.entries(base)) {
    const incoming = raw[key];
    if (isObj(value)) out[key] = merge(value, incoming);
    else out[key] = typeof incoming === typeof value ? incoming : value;
  }
  return out as T;
}

const NODE_SHAPES = ['circle', 'diamond', 'square'];

export function normalizeTheme(raw: unknown): Theme {
  const t = merge(DEFAULT_THEME as unknown as Obj, raw) as unknown as Theme;
  // Enums: fall back when the value isn't one we know
  if (!NODE_SHAPES.includes(t.shape.node)) t.shape.node = DEFAULT_THEME.shape.node;
  if (!['plain', 'vignette', 'texture'].includes(t.ornaments.background)) t.ornaments.background = 'plain';
  if (!['line', 'double'].includes(t.ornaments.headerRule)) t.ornaments.headerRule = 'line';
  if (!['none', 'engraved'].includes(t.ornaments.frame)) t.ornaments.frame = 'none';
  if (!['plain', 'engraved'].includes(t.ornaments.buttons)) t.ornaments.buttons = 'plain';
  t.fonts.size = Math.min(130, Math.max(80, t.fonts.size));
  t.shape.radius = Math.min(24, Math.max(0, t.shape.radius));
  t.ornaments.glyph = t.ornaments.glyph.slice(0, 4);
  return t;
}
