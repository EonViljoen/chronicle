import { SCHEMA_VERSION, type Timeline } from '../types/timeline';

/**
 * Checks that an imported JSON file looks like a Timeline.
 * Hand-written on purpose (no schema library) so it's easy to read; it checks
 * the structure, not every field.
 */
export function assertTimeline(data: unknown): asserts data is Timeline {
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
  for (const key of ['eras', 'categories', 'places', 'events']) {
    if (!Array.isArray(t[key])) fail(`"${key}" must be a list`);
  }
  for (const [i, e] of (t.events as Record<string, unknown>[]).entries()) {
    const date = e?.date as Record<string, unknown> | undefined;
    if (typeof e?.id !== 'string' || typeof e?.title !== 'string') fail(`event ${i + 1} needs an id and title`);
    if (typeof date?.sortKey !== 'number') fail(`event "${e.title}" has no date sortKey`);
  }
}
