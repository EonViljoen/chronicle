import { useEffect } from 'react';
import { brand } from '../brand';
import type { ThemeMeta } from './types';

export type { ThemeMeta };

/*
 * Every folder in src/themes with an index.ts is a theme. import.meta.glob is
 * a Vite feature: at build time it finds the matching files and imports them,
 * so adding a theme never means editing this file. `eager: true` imports them
 * straight away (each theme's CSS is small) instead of lazily.
 */
const modules = import.meta.glob<{ default: ThemeMeta }>('./*/index.ts', { eager: true });

/** All themes, the default first, then by name. */
export const themes: ThemeMeta[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => (a.id === 'default' ? -1 : b.id === 'default' ? 1 : a.name.localeCompare(b.name)));

/**
 * The theme for an id. Unknown ids (say, a timeline imported from a site that
 * has extra themes) fall back to the site default, then the base theme.
 */
export function themeFor(id: string | undefined): ThemeMeta {
  const byId = (x: string | undefined) => themes.find((t) => t.id === x);
  return byId(id) ?? byId(brand.defaultTheme) ?? byId('default') ?? themes[0];
}

/** Puts the theme on <html data-theme="…"> and loads its fonts once. */
export function applyTheme(id: string | undefined) {
  const theme = themeFor(id);
  document.documentElement.dataset.theme = theme.id;
  if (theme.fontsUrl && !document.querySelector(`link[data-theme-fonts="${theme.id}"]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = theme.fontsUrl;
    link.dataset.themeFonts = theme.id;
    document.head.append(link);
  }
}

/**
 * Use a theme while this component is on screen. The theme is set on <html>,
 * outside React's tree, so it's a side effect: useEffect applies it, and the
 * cleanup puts the site default back when the component goes away.
 */
export function useTheme(id: string | undefined) {
  useEffect(() => {
    applyTheme(id);
    return () => applyTheme(brand.defaultTheme);
  }, [id]);
}
