import { readPref, writePref } from './prefs';

/*
 * The timelines opened most recently in this browser, newest first, for the
 * "Pick up where you left off" panel. Only ids are stored (in localStorage
 * via prefs.ts); the timelines page looks them up, so a deleted timeline
 * simply drops out.
 */

const KEY = 'recent.opened';
const MAX = 8;

export function readRecent(): string[] {
  const ids = readPref<unknown>(KEY, []);
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
}

/** Move `id` to the front of the list. */
export function recordOpened(id: string) {
  writePref(KEY, [id, ...readRecent().filter((other) => other !== id)].slice(0, MAX));
}
