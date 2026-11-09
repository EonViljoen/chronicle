import { createContext, useContext, useEffect } from 'react';
import type { Theme } from '../types/theme';

/*
 * Lets the theme editor show unsaved changes on the whole page. TimelineGate
 * owns the theme that's applied; it provides this setter, and the editor
 * calls usePreviewTheme(draft) while you edit. Passing null (or the editor
 * going away) goes back to the saved theme.
 */
export const ThemePreviewContext = createContext<(theme: Theme | null) => void>(() => {});

export function usePreviewTheme(theme: Theme | null) {
  const setPreview = useContext(ThemePreviewContext);
  const key = theme ? JSON.stringify(theme) : '';
  useEffect(() => {
    setPreview(key ? (JSON.parse(key) as Theme) : null);
  }, [key, setPreview]);
  // Separate effect so the preview is only cleared when the editor goes away
  useEffect(() => () => setPreview(null), [setPreview]);
}
