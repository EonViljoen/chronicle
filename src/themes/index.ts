import { useEffect } from 'react';
import type { Theme } from '../types/theme';
import type { Timeline } from '../types/timeline';
import { brand } from '../brand';
import { applyTheme } from './apply';
import { normalizeTheme } from './normalize';
import { DEFAULT_THEME, PRESETS } from './presets';

export { applyTheme } from './apply';
export { normalizeTheme } from './normalize';
export { DEFAULT_THEME, PRESETS, isPreset } from './presets';

/** The theme used outside a timeline, and for timelines that don't pick one. */
export const siteTheme = (): Theme =>
  brand.siteTheme ? normalizeTheme(brand.siteTheme) : (PRESETS.find((p) => p.id === brand.defaultTheme) ?? DEFAULT_THEME);

/**
 * Which theme a timeline shows. A published timeline brings its own copy
 * (themeDef), so it looks right whatever is in this browser's library.
 * Otherwise its id is looked up in `library` (presets + your themes).
 * Unknown ids fall back to the site default.
 */
export function resolveTheme(timeline: Pick<Timeline, 'theme' | 'themeDef'>, library: Theme[]): Theme {
  if (timeline.themeDef) return normalizeTheme(timeline.themeDef);
  return library.find((t) => t.id === timeline.theme) ?? siteTheme();
}

/**
 * Show a theme while the calling component is on screen. The theme lives on
 * <html>, outside React's tree, so applying it is a side effect: useEffect
 * applies it and the cleanup puts the site default back.
 * The effect depends on the theme's JSON, so a new object with the same
 * contents (common when data is re-read) doesn't re-apply it.
 */
export function useTheme(theme: Theme | undefined) {
  const key = theme ? JSON.stringify(theme) : '';
  useEffect(() => {
    applyTheme(key ? (JSON.parse(key) as Theme) : siteTheme());
    return () => applyTheme(siteTheme());
  }, [key]);
}
