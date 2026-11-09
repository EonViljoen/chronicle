import { SCHEMA_VERSION, type Timeline } from '../types/timeline';
import { upgradeTimeline } from './upgrade';

const CALENDAR_TYPES = ['years', 'ages', 'cycles', 'freeform'];

/**
 * Checks an imported JSON file and returns it as a current Timeline,
 * upgrading files made by older versions of the app.
 */
export function parseTimeline(data: unknown): Timeline {
  assertTimelineShape(data);
  const timeline = upgradeTimeline(data);
  if (!CALENDAR_TYPES.includes(timeline.calendar?.type)) throw new Error('Not a valid timeline file: unknown calendar');
  return timeline;
}

/**
 * Checks that a JSON file looks like a Timeline of any version.
 * Hand-written on purpose (no schema library) so it's easy to read; it checks
 * the structure, not every field.
 */
function assertTimelineShape(data: unknown): asserts data is { schemaVersion: number } {
  const fail = (msg: string): never => {
    throw new Error(`Not a valid timeline file: ${msg}`);
  };

  if (typeof data !== 'object' || data === null) fail('expected a JSON object');
  const t = data as Record<string, unknown>;

  if (typeof t.title !== 'string') fail('missing "title"');
  if (typeof t.schemaVersion !== 'number') fail('missing "schemaVersion"');
  if ((t.schemaVersion as number) > SCHEMA_VERSION) {
    fail(`made by a newer version of the app (schema ${t.schemaVersion})`);
  }
  for (const key of ['eras', 'places', 'events']) {
    if (!Array.isArray(t[key])) fail(`"${key}" must be a list`);
  }
  // Files from before schema 3 call factions "categories"
  if (!Array.isArray(t.factions) && !Array.isArray(t.categories)) fail('"factions" must be a list');
  for (const [i, e] of (t.events as Record<string, unknown>[]).entries()) {
    const date = e?.date as Record<string, unknown> | undefined;
    if (typeof e?.id !== 'string' || typeof e?.title !== 'string') fail(`event ${i + 1} needs an id and title`);
    if (typeof date?.sortKey !== 'number') fail(`event "${e.title}" has no date sortKey`);
  }
}
