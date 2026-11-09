import Dexie, { type EntityTable } from 'dexie';
import type { Timeline } from '../types/timeline';
import { upgradeTimeline } from '../lib/upgrade';

/**
 * The browser database (IndexedDB, via Dexie).
 *
 * Each timeline is stored as one document, with its events, eras etc.
 * nested inside. That keeps saving and exporting simple, and is plenty
 * fast for a few thousand events.
 *
 * The string in `stores` lists the primary key first, then the fields we
 * want to sort or search by. Other fields are stored but not indexed.
 */
export const db = new Dexie('timeline-builder') as Dexie & {
  timelines: EntityTable<Timeline, 'id'>;
};

db.version(1).stores({
  timelines: 'id, title, updatedAt',
});

// Version 2: dates moved to calendars (see lib/upgrade.ts). The indexes are
// unchanged; the upgrade rewrites each stored timeline once, on first open.
db.version(2)
  .stores({ timelines: 'id, title, updatedAt' })
  .upgrade((tx) =>
    tx
      .table('timelines')
      .toCollection()
      .modify((timeline, ref) => {
        ref.value = upgradeTimeline(timeline);
      }),
  );
