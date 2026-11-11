import type { Theme, ThemeGlow } from '../types/theme';

/** The era glow every built-in theme starts with: the era's colour, centred on the timeline. */
export const DEFAULT_GLOW: ThemeGlow = { color: 'era', strength: 42, width: 70, height: 520, x: 50, y: 420, spread: 60 };

/*
 * Built-in themes. They can't be edited, only copied, so they stay a known
 * starting point. Ids are stable: timelines and exports refer to them.
 */
export const PRESETS: Theme[] = [
  {
    id: 'default',
    name: 'Chronicle',
    colors: {
      bg: '#121214', surface: '#1b1b1f', surface2: '#24242a', border: '#34343c', text: '#e8e4da',
      muted: '#9a958a', accent: '#c9a227', accentInk: '#1a1505', highlight: '#c9a227', danger: '#d0453c',
    },
    fonts: { heading: 'Cinzel', display: 'Cinzel', body: 'Inter', size: 100 },
    shape: { radius: 8, node: 'circle' },
    ornaments: { background: 'plain', headerRule: 'line', frame: 'none', buttons: 'plain', glyph: '', dropCap: false },
    glow: DEFAULT_GLOW,
  },
  {
    id: 'parchment',
    name: 'Parchment',
    colors: {
      bg: '#e9dfc7', surface: '#f3ead4', surface2: '#e2d5b6', border: '#c2ae86', text: '#2b2116',
      muted: '#6e5d45', accent: '#8a2f1d', accentInk: '#f8f1e0', highlight: '#8a2f1d', danger: '#a32618',
    },
    fonts: { heading: 'IM Fell English SC', display: 'IM Fell English SC', body: 'IM Fell English', size: 105 },
    shape: { radius: 3, node: 'circle' },
    ornaments: { background: 'vignette', headerRule: 'line', frame: 'none', buttons: 'plain', glyph: '', dropCap: true },
    glow: DEFAULT_GLOW,
  },
  {
    id: 'void',
    name: 'Void',
    colors: {
      bg: '#070b12', surface: '#0d1420', surface2: '#142033', border: '#1f3350', text: '#dbe7f5',
      muted: '#7d93ae', accent: '#39d0ff', accentInk: '#021018', highlight: '#39d0ff', danger: '#ff5a6e',
    },
    fonts: { heading: 'Orbitron', display: 'Orbitron', body: 'Exo 2', size: 100 },
    shape: { radius: 2, node: 'square' },
    ornaments: { background: 'vignette', headerRule: 'line', frame: 'none', buttons: 'plain', glyph: '', dropCap: false },
    glow: DEFAULT_GLOW,
  },
  {
    id: 'gothic',
    name: 'Gothic',
    colors: {
      bg: '#0c0b0a', surface: '#15120f', surface2: '#201a15', border: '#3a2f24', text: '#e8dfca',
      muted: '#9c8d74', accent: '#c0913a', accentInk: '#140d03', highlight: '#8e1b1b', danger: '#b3261e',
    },
    fonts: { heading: 'UnifrakturMaguntia', display: 'Cinzel', body: 'EB Garamond', size: 108 },
    shape: { radius: 2, node: 'diamond' },
    ornaments: { background: 'texture', headerRule: 'double', frame: 'engraved', buttons: 'engraved', glyph: '✠', dropCap: true },
    glow: DEFAULT_GLOW,
  },
];

export const DEFAULT_THEME = PRESETS[0];

/**
 * The starting point for a new theme based on nothing ("None" in Create
 * custom theme): plain greys, one clean font, no ornaments. Not a preset,
 * so it isn't listed or usable on its own.
 */
export const BLANK_THEME: Theme = {
  id: 'blank',
  name: 'New theme',
  colors: {
    bg: '#16171a', surface: '#1f2024', surface2: '#2a2b30', border: '#3a3b42', text: '#e6e6e6',
    muted: '#9a9ba3', accent: '#7aa2f7', accentInk: '#0b1220', highlight: '#7aa2f7', danger: '#e05d5d',
  },
  fonts: { heading: 'Inter', display: 'Inter', body: 'Inter', size: 100 },
  shape: { radius: 6, node: 'circle' },
  ornaments: { background: 'plain', headerRule: 'line', frame: 'none', buttons: 'plain', glyph: '', dropCap: false },
  glow: DEFAULT_GLOW,
};
export const isPreset = (id: string) => PRESETS.some((p) => p.id === id);
