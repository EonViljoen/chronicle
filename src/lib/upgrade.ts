import { SCHEMA_VERSION, type Calendar, type DatePrecision, type EventDate, type Timeline } from '../types/timeline';

/*
 * Brings timelines saved by older versions of the app up to date. Used for
 * timelines already in the browser (see db.ts) and for imported files.
 * Each step upgrades one version, so very old files run through every step.
 */

// ---------- Version 1 shapes, as they were ----------

type V1Kind = 'year' | 'millennium' | 'freeform';
interface V1Date {
  kind: V1Kind;
  display: string;
  sortKey: number;
  precision: Exclude<DatePrecision, 'period'>;
}
type V1Timeline = Omit<Timeline, 'calendar' | 'events'> & {
  dateFormat?: V1Kind;
  events: (Omit<Timeline['events'][number], 'date'> & { date: V1Date })[];
};

/** The calendars that reproduce version 1's built-in date formats exactly. */
const V1_CALENDARS: Record<V1Kind, Calendar> = {
  year: { type: 'years', before: '{n} BCE', after: '{n}' },
  millennium: { type: 'cycles', length: 1000, format: '{year}.M{cycle}', cycleFormat: 'M{cycle}', before: '{n} years before M1' },
  freeform: { type: 'freeform' },
};

/**
 * Version 1 stored each date's label. Version 2 works labels out from the
 * timeline's calendar, so only dates in the timeline's own format can drop
 * theirs; any other date keeps its old label as free text.
 */
function upgradeDateV1(date: V1Date, format: V1Kind): EventDate {
  const { sortKey, precision, kind, display } = date;
  if (kind === 'freeform' || kind !== format) return { sortKey, precision, label: display };
  if (kind === 'millennium' && precision === 'millennium') return { sortKey, precision: 'period' }; // "M31"
  return { sortKey, precision };
}

function v1to2(t: V1Timeline): Timeline {
  const { dateFormat = 'year', events, ...rest } = t;
  return {
    ...rest,
    schemaVersion: 2,
    calendar: V1_CALENDARS[dateFormat] ?? V1_CALENDARS.year,
    events: events.map((e) => ({ ...e, date: upgradeDateV1(e.date, dateFormat) })),
  };
}

/** Returns the timeline in the current shape. Already-current ones pass through unchanged. */
export function upgradeTimeline(data: { schemaVersion: number }): Timeline {
  let t: unknown = data;
  if ((t as { schemaVersion: number }).schemaVersion < 2) t = v1to2(t as V1Timeline);
  // Future steps go here: if (version < 3) t = v2to3(t) …
  return { ...(t as Timeline), schemaVersion: SCHEMA_VERSION };
}
