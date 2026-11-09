import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import type { Theme } from '../types/theme';
import { PRESETS, isPreset, normalizeTheme } from '../themes';
import { slugify } from '../lib/ids';

/*
 * The theme library: the built-in presets plus themes you've made, which are
 * stored in the browser like timelines. Timelines refer to themes by id.
 */

/** Every theme: presets first, then yours by name. Yours appear once loaded. */
export function useThemes(): Theme[] {
  const saved = useLiveQuery(() => db.themes.orderBy('name').toArray());
  return [...PRESETS, ...(saved ?? [])];
}

const sameTheme = (a: Theme, b: Theme) => JSON.stringify(normalizeTheme(a)) === JSON.stringify(normalizeTheme(b));

export async function saveTheme(theme: Theme) {
  if (isPreset(theme.id)) throw new Error("Built-in themes can't be changed. Make a copy instead.");
  await db.themes.put(normalizeTheme(theme));
}

/** Save a copy under a new id and name, and return it. */
export async function copyTheme(theme: Theme, name = `${theme.name} (copy)`): Promise<Theme> {
  const copy = normalizeTheme({ ...structuredClone(theme), id: crypto.randomUUID(), name });
  await db.themes.add(copy);
  return copy;
}

/** Delete a theme. Timelines using it go back to the site default. */
export async function deleteTheme(id: string) {
  await db.transaction('rw', db.themes, db.timelines, async () => {
    await db.themes.delete(id);
    await db.timelines.toCollection().modify((t) => {
      if (t.theme === id) delete t.theme;
    });
  });
}

/**
 * Make sure a theme that came with a file is in the library, and return the
 * id to use. Presets and identical themes are reused; a different theme
 * that happens to share an id is saved as a copy, so nothing is overwritten.
 */
export async function ensureTheme(incoming: Theme): Promise<string> {
  const theme = normalizeTheme(incoming);
  const preset = PRESETS.find((p) => p.id === theme.id);
  if (preset) return sameTheme(preset, theme) ? preset.id : (await copyTheme(theme, theme.name)).id;
  const existing = await db.themes.get(theme.id);
  if (!existing) {
    await db.themes.add(theme);
    return theme.id;
  }
  if (sameTheme(existing, theme)) return theme.id;
  return (await copyTheme(theme, theme.name)).id;
}

/** Look up a theme by id: presets, then the library. */
export async function getTheme(id: string | undefined): Promise<Theme | undefined> {
  if (!id) return undefined;
  return PRESETS.find((p) => p.id === id) ?? (await db.themes.get(id));
}

// ---------- Theme files ----------

export function exportTheme(theme: Theme) {
  const json = JSON.stringify({ kind: 'chronicle-theme', theme }, null, 2);
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${slugify(theme.name) || 'theme'}.theme.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Read a theme file and add it to the library. Returns the theme's id. */
export async function importThemeFile(file: File): Promise<string> {
  let data: unknown;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error(`"${file.name}" is not valid JSON`);
  }
  const raw = (data as { kind?: string; theme?: unknown }).kind === 'chronicle-theme' ? (data as { theme: unknown }).theme : data;
  if (typeof raw !== 'object' || raw === null || typeof (raw as Theme).colors !== 'object') {
    throw new Error(`"${file.name}" isn't a theme file`);
  }
  // A file without an id gets a fresh one, rather than borrowing the default theme's
  const theme = raw as Theme;
  return ensureTheme(typeof theme.id === 'string' && theme.id ? theme : { ...theme, id: crypto.randomUUID() });
}
