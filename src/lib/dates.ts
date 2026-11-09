import type { DateKind, DatePrecision, EventDate, TimelineEvent } from '../types/timeline';

/*
 * Every date boils down to a `sortKey` number so events from different date
 * kinds can share one ordering. For the millennium kind:
 *
 *   sortKey = (millennium - 1) * 1000 + year
 *   005.M31 -> 30005      999.M41 -> 40999
 *
 * Dates before M1 (the deep past) are negative "years before M1".
 */

const pad3 = (n: number) => String(n).padStart(3, '0');

/** 40k style date. Leave `year` out when only the millennium is known ("M31"). */
export function millenniumDate(millennium: number, year?: number): EventDate {
  const base = (millennium - 1) * 1000;
  if (year === undefined) {
    return { kind: 'millennium', display: `M${millennium}`, sortKey: base, precision: 'millennium' };
  }
  return {
    kind: 'millennium',
    display: `${pad3(year)}.M${millennium}`,
    sortKey: base + year,
    precision: 'exact',
  };
}

/** Plain calendar year. Negative years display as BCE. */
export function yearDate(year: number, precision: DatePrecision = 'exact'): EventDate {
  const display = year < 0 ? `${Math.abs(year)} BCE` : String(year);
  return { kind: 'year', display, sortKey: year, precision };
}

/** Any label you like, ordered by a sortKey you choose. */
export function freeformDate(display: string, sortKey: number, precision: DatePrecision = 'circa'): EventDate {
  return { kind: 'freeform', display, sortKey, precision };
}

/** Turn a sortKey back into a label, e.g. for era start/end markers. */
export function formatSortKey(sortKey: number, kind: DateKind): string {
  if (kind === 'millennium') {
    if (sortKey < 0) return `${Math.abs(sortKey).toLocaleString()} yrs before M1`;
    const millennium = Math.floor(sortKey / 1000) + 1;
    const year = sortKey - (millennium - 1) * 1000;
    return `${pad3(year)}.M${millennium}`;
  }
  if (kind === 'year') return yearDate(sortKey).display;
  return sortKey.toLocaleString();
}

/** Sort comparator: by date, then title so ties are stable. */
export function compareEvents(a: TimelineEvent, b: TimelineEvent): number {
  return a.date.sortKey - b.date.sortKey || a.title.localeCompare(b.title);
}
