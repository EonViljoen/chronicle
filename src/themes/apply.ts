import type { Theme } from '../types/theme';
import { fontStack, googleFontsUrl } from './fonts';

/*
 * Applies a theme to the page: colours, fonts and sizes become CSS custom
 * properties on <html>, and the switch-like options become data attributes
 * (data-node="diamond", data-frame="engraved"…) that index.css styles.
 * Everything visual lives in index.css; this file only flips the switches.
 */

/** Rough brightness of a #rrggbb colour, 0 (black) to 1 (white). */
function brightness(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/** CSS string for content: "✠" with quotes and backslashes escaped. */
const cssString = (s: string) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const { colors, fonts, shape, ornaments } = theme;

  const vars: Record<string, string> = {
    '--bg': colors.bg,
    '--surface': colors.surface,
    '--surface-2': colors.surface2,
    '--border': colors.border,
    '--text': colors.text,
    '--muted': colors.muted,
    '--accent': colors.accent,
    '--accent-ink': colors.accentInk,
    '--highlight': colors.highlight,
    '--danger': colors.danger,
    '--radius': `${shape.radius}px`,
    '--font-heading': fontStack(fonts.heading),
    '--font-display': fontStack(fonts.display),
    '--font-body': fontStack(fonts.body),
    '--font-size': `${fonts.size}%`,
    '--glyph': cssString(ornaments.glyph),
  };
  for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);

  // Light or dark form controls and scrollbars, from the background colour
  root.style.colorScheme = brightness(colors.bg) > 0.5 ? 'light' : 'dark';

  Object.assign(root.dataset, {
    node: shape.node,
    background: ornaments.background,
    headerRule: ornaments.headerRule,
    frame: ornaments.frame,
    buttons: ornaments.buttons,
    glyph: ornaments.glyph ? 'on' : 'off',
    dropCap: ornaments.dropCap ? 'on' : 'off',
  });

  loadFonts([fonts.heading, fonts.display, fonts.body]);
}

/** Adds one Google Fonts <link> per distinct set of fonts, once. */
export function loadFonts(names: string[]) {
  const url = googleFontsUrl(names);
  if (!url || document.querySelector(`link[href="${CSS.escape(url)}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  document.head.append(link);
}
