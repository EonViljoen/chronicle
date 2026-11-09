import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { parseTimeline } from '../lib/validate';
import { DEFAULT_CALENDAR } from '../lib/dates';
import { SCHEMA_VERSION, type Timeline } from '../types/timeline';
import { slugify } from '../lib/ids';
import { readPref, writePref } from '../lib/prefs';
import { brand } from '../brand';
import { usePublished } from './published';
import { ensureTheme, getTheme } from './themes';

/*
 * Everything the UI needs to read and write timelines.
 * Components call these instead of touching `db` directly, so if storage
 * ever changes (say, a server), only this file changes.
 */

// ---------- Reading (React hooks) ----------
//
// `useLiveQuery` re-runs the query whenever the data changes and re-renders
// the component, so saving in one place updates every screen automatically.
// It returns `undefined` while the first query is still loading.

/** All timelines, most recently edited first. */
export function useTimelines() {
  return useLiveQuery(() => db.timelines.orderBy('updatedAt').reverse().toArray());
}

/**
 * One timeline, from the site's published files or this browser.
 * `undefined` = still loading, `null` = doesn't exist. `published` timelines
 * are read-only.
 */
export function useTimeline(id: string | undefined): { timeline: Timeline; published: boolean } | null | undefined {
  const published = usePublished();
  const local = useLiveQuery(async () => (id ? ((await db.timelines.get(id)) ?? null) : null), [id]);

  const match = published?.timelines.find((t) => t.id === id);
  if (match) return { timeline: match, published: true };
  if (published === undefined || local === undefined) return undefined; // wait for both before saying "not found"
  return local ? { timeline: local, published: false } : null;
}

// ---------- Writing ----------

const newId = () => crypto.randomUUID();

export async function createTimeline(title: string): Promise<Timeline> {
  const now = Date.now();
  const timeline: Timeline = {
    id: newId(),
    schemaVersion: SCHEMA_VERSION,
    title,
    description: '',
    calendar: DEFAULT_CALENDAR,
    eras: [],
    categories: [],
    places: [],
    map: { type: 'none' },
    events: [],
    createdAt: now,
    updatedAt: now,
  };
  await db.timelines.add(timeline);
  return timeline;
}

export async function saveTimeline(timeline: Timeline) {
  await db.timelines.put({ ...timeline, updatedAt: Date.now() });
}

/**
 * Apply a change to the latest stored copy of a timeline.
 * `recipe` gets the current timeline and returns the updated one (see
 * lib/mutations.ts). Running it inside a transaction means two quick saves
 * can't overwrite each other with stale data.
 */
export async function updateTimeline(id: string, recipe: (timeline: Timeline) => Timeline) {
  await db.transaction('rw', db.timelines, async () => {
    const current = await db.timelines.get(id);
    if (!current) throw new Error('Timeline not found');
    await db.timelines.put({ ...recipe(current), id, updatedAt: Date.now() });
  });
}

export async function deleteTimeline(id: string) {
  await db.timelines.delete(id);
}

export async function duplicateTimeline(id: string) {
  const original = await db.timelines.get(id);
  if (!original) throw new Error('Timeline not found');
  return addCopy(original, `${original.title} (copy)`);
}

/** Save an editable copy of a published timeline in this browser. */
export const copyToBrowser = (timeline: Timeline) => addCopy(timeline);

/** Store a copy under a fresh id, so imports never overwrite existing timelines. */
async function addCopy(source: Timeline, title = source.title): Promise<Timeline> {
  const now = Date.now();
  // A file may bring its theme along: add it to the library and keep just the id
  const { themeDef, ...rest } = source;
  const theme = themeDef ? await ensureTheme(themeDef) : source.theme;
  const copy: Timeline = { ...rest, theme, id: newId(), title, createdAt: now, updatedAt: now };
  await db.timelines.add(copy);
  return copy;
}

// ---------- Import / export ----------

/** Download a timeline as a .json file, with a copy of its theme so it looks the same anywhere. */
export async function exportTimeline(timeline: Timeline) {
  const themeDef = timeline.themeDef ?? (await getTheme(timeline.theme));
  const json = JSON.stringify({ ...timeline, themeDef }, null, 2);
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${slugify(timeline.title) || 'timeline'}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Read a .json file the user picked, check it, and store it as a new timeline. */
export async function importTimelineFile(file: File): Promise<Timeline> {
  let data: unknown;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error(`"${file.name}" is not valid JSON`);
  }
  return addCopy(parseTimeline(data));
}

/**
 * If the site sets a seed timeline (brand.seedUrl), add it on the visitor's
 * first visit so they land on content. Remembered per browser, so deleting
 * the seeded timeline doesn't bring it back.
 */
export async function seedOnFirstVisit(): Promise<void> {
  if (!brand.seedUrl || readPref('seeded', false)) return;
  writePref('seeded', true); // set first, so a second call can't seed twice
  try {
    const res = await fetch(brand.seedUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: unknown = await res.json();
    await addCopy(parseTimeline(data));
  } catch (e) {
    writePref('seeded', false); // try again next visit
    console.error(`Couldn't load the seed timeline from ${brand.seedUrl}`, e);
  }
}
