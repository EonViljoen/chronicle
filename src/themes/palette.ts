import { useSyncExternalStore } from 'react';

/*
 * The active theme's colours, read live from the CSS variables on <html>.
 *
 * Most of the app is styled by CSS, which picks up a new theme by itself.
 * The 3D starmap is drawn by three.js instead, which needs actual colour
 * values, so it reads them with this hook. Reading the variables (rather
 * than taking a Theme object) means it follows everything that changes the
 * theme: the timeline's theme, a faction's theme while its event is
 * selected, and the theme editor's live preview.
 */

export interface Palette {
  accent: string;
  highlight: string;
  bg: string;
}

const NAMES = ['--accent', '--highlight', '--bg'] as const;
const FALLBACK = '#c9a227|#c9a227|#121214';

/** The three colours as one string, so React can tell cheaply whether they changed. */
function snapshot(): string {
  const style = getComputedStyle(document.documentElement);
  const values = NAMES.map((name) => style.getPropertyValue(name).trim());
  return values.every(Boolean) ? values.join('|') : FALLBACK;
}

/** Calls `onChange` whenever <html>'s inline style changes (that's where themes are applied). */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
  return () => observer.disconnect();
}

/**
 * useSyncExternalStore is React's hook for reading something that lives
 * outside React (here, the DOM) and re-rendering when it changes.
 */
export function useThemePalette(): Palette {
  const key = useSyncExternalStore(subscribe, snapshot, () => FALLBACK);
  const [accent, highlight, bg] = key.split('|');
  return { accent, highlight, bg };
}
