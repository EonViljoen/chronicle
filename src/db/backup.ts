import { db } from './db';
import type { Timeline } from '../types/timeline';
import type { Theme } from '../types/theme';
import { parseTimeline } from '../lib/validate';
import { normalizeTheme, isPreset } from '../themes';
import { readPref, writePref } from '../lib/prefs';

/*
 * Backing up everything: every timeline and theme in this browser, in one
 * JSON file. Everything lives in the browser, so this is the safety net
 * (and the way to move to another browser or computer).
 *
 * The file is versioned (`kind` + `version`), so later versions of the app
 * can still read it, e.g. to upload it to an account once there are accounts.
 * Timelines inside are stored as they are in the database; restoring runs
 * them through the same checks and upgrades as an imported timeline file.
 */

export const BACKUP_KIND = 'chronicle-backup';
export const BACKUP_VERSION = 1;

export interface BackupFile {
  kind: typeof BACKUP_KIND;
  version: number;
  /** When the backup was made (ms since 1970). */
  createdAt: number;
  timelines: Timeline[];
  /** Your own themes (built-in ones are part of the app). */
  themes: Theme[];
}

/** When this browser last made a backup, for the timelines page's reminder. */
export const lastBackupAt = () => readPref<number | null>('backup.last', null);

/** Download a backup of every timeline and theme in this browser. */
export async function downloadBackup(): Promise<{ timelines: number; themes: number }> {
  const backup: BackupFile = {
    kind: BACKUP_KIND,
    version: BACKUP_VERSION,
    createdAt: Date.now(),
    timelines: await db.timelines.toArray(),
    themes: await db.themes.toArray(),
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `chronicle-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  writePref('backup.last', backup.createdAt);
  return { timelines: backup.timelines.length, themes: backup.themes.length };
}

/** Is this parsed JSON a backup file (rather than a single timeline)? */
export const isBackup = (data: unknown): boolean => (data as { kind?: unknown } | null)?.kind === BACKUP_KIND;

/** A backup that's been read and checked, ready to restore. */
export interface ReadBackup {
  createdAt: number;
  timelines: Timeline[];
  themes: Theme[];
  /** How many of each are already in this browser (same id). */
  clashes: { timelines: number; themes: number };
  /** Items that couldn't be read, with why. The rest can still be restored. */
  skipped: string[];
}

/** Checks a parsed backup file and compares it with what's in this browser. */
export async function readBackup(data: unknown): Promise<ReadBackup> {
  if (!isBackup(data)) throw new Error("That isn't a Chronicle backup file");
  const file = data as Partial<BackupFile>;
  if (typeof file.version !== 'number' || file.version > BACKUP_VERSION) {
    throw new Error('That backup was made by a newer version of Chronicle');
  }
  const skipped: string[] = [];
  const timelines: Timeline[] = [];
  for (const [i, raw] of (Array.isArray(file.timelines) ? file.timelines : []).entries()) {
    try {
      timelines.push(parseTimeline(raw));
    } catch (e) {
      const title = (raw as { title?: unknown })?.title;
      skipped.push(`${typeof title === 'string' ? `"${title}"` : `Timeline ${i + 1}`}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  const themes: Theme[] = [];
  for (const [i, raw] of (Array.isArray(file.themes) ? file.themes : []).entries()) {
    const t = raw as Theme;
    if (typeof t?.id === 'string' && typeof t.colors === 'object' && !isPreset(t.id)) themes.push(normalizeTheme(t));
    else skipped.push(`Theme ${i + 1}: not a theme`);
  }
  const haveTimelines = new Set(await db.timelines.toCollection().primaryKeys());
  const haveThemes = new Set(await db.themes.toCollection().primaryKeys());
  return {
    createdAt: typeof file.createdAt === 'number' ? file.createdAt : 0,
    timelines,
    themes,
    clashes: {
      timelines: timelines.filter((t) => haveTimelines.has(t.id)).length,
      themes: themes.filter((t) => haveThemes.has(t.id)).length,
    },
    skipped,
  };
}

/**
 * What to do with things already in this browser:
 * - 'keep-both': restored copies get new ids and "(restored)" in their name
 * - 'replace':   the backup's version replaces the one here
 * Things only in this browser are never touched.
 */
export type ClashMode = 'keep-both' | 'replace';

/** Restores a read backup. Returns how many timelines and themes were added or replaced. */
export async function restoreBackup(backup: ReadBackup, mode: ClashMode): Promise<{ timelines: number; themes: number }> {
  await db.transaction('rw', db.timelines, db.themes, async () => {
    // Themes first: a theme restored under a new id must be followed by the timelines using it
    const themeIds = new Map<string, string>();
    for (const theme of backup.themes) {
      const existing = await db.themes.get(theme.id);
      if (existing && mode === 'keep-both' && JSON.stringify(normalizeTheme(existing)) !== JSON.stringify(theme)) {
        const id = crypto.randomUUID();
        themeIds.set(theme.id, id);
        await db.themes.add({ ...theme, id, name: `${theme.name} (restored)` });
      } else {
        await db.themes.put(theme); // new, identical, or replacing
      }
    }
    const remap = (id: string | undefined) => (id && themeIds.get(id)) ?? id;

    for (const restored of backup.timelines) {
      const t: Timeline = {
        ...restored,
        theme: remap(restored.theme),
        factions: restored.factions.map((f) => (f.themeId ? { ...f, themeId: remap(f.themeId) } : f)),
      };
      const clash = await db.timelines.get(t.id);
      if (clash && mode === 'keep-both') await db.timelines.add({ ...t, id: crypto.randomUUID(), title: `${t.title} (restored)` });
      else await db.timelines.put(t);
    }
  });
  return { timelines: backup.timelines.length, themes: backup.themes.length };
}
