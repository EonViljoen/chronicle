import { createContext, useContext, useEffect } from 'react';
import type { Theme } from '../types/theme';

/*
 * Lets a component deep inside a timeline page swap the whole page's theme
 * for a while. TimelineGate owns the theme that's applied and provides this
 * setter; it shows `override ?? savedTheme`.
 *
 * Two users: the theme editor (unsaved changes, previewed live) and the
 * viewer (the selected event's main faction, or a single faction filter).
 * Passing null, or the component going away, goes back to the saved theme.
 */
export const ThemeOverrideContext = createContext<(theme: Theme | null) => void>(() => {});

export function useThemeOverride(theme: Theme | null) {
  const setOverride = useContext(ThemeOverrideContext);
  const key = theme ? JSON.stringify(theme) : '';
  useEffect(() => {
    setOverride(key ? (JSON.parse(key) as Theme) : null);
  }, [key, setOverride]);
  // Separate effect so the override is only cleared when the component goes away
  useEffect(() => () => setOverride(null), [setOverride]);
}
