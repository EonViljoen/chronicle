import type { Age, Calendar, EventDate, TimelineEvent } from '../types/timeline';

/*
 * Dates and calendars.
 *
 * Every date is stored as a `sortKey` number, which sets its order. The
 * timeline's calendar turns that number into a label and back:
 *
 *   years   (before "{n} BC", after "AD {n}"):  -500 -> "500 BC"     1066 -> "AD 1066"
 *   ages    (First Age 590 years, then Second):     590 -> "1A 590"    591 -> "2A 1"
 *   cycles  (1000 years, "{year}.M{cycle}"):      2999 -> "999.M3"  -60000000 -> "60M years before M1"
 *   freeform: no calendar; events carry their own text label
 */

const compact = new Intl.NumberFormat('en', { notation: 'compact' });

/** Years print as plain digits (1066, not 1,066), huge ones compactly (60M). */
export const formatYears = (n: number) => (Math.abs(n) >= 1_000_000 ? compact.format(n) : String(n));

/** Fills {placeholders} in a template. Unknown ones are left as typed. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}

// ---------- Presets ----------

export const CALENDAR_PRESETS: { name: string; calendar: Calendar }[] = [
  { name: 'Years: 500 BCE, 1066', calendar: { type: 'years', before: '{n} BCE', after: '{n}' } },
  { name: 'Years: 500 BC, AD 1066', calendar: { type: 'years', before: '{n} BC', after: 'AD {n}' } },
  { name: 'Years: 500 BCE, 1066 CE', calendar: { type: 'years', before: '{n} BCE', after: '{n} CE' } },
  { name: 'Years before and after an event: 19 BE, 4 AE', calendar: { type: 'years', before: '{n} BE', after: '{n} AE' } },
  {
    name: 'Named ages: 3A 3019',
    calendar: {
      type: 'ages',
      format: '{age} {year}',
      ages: [
        { name: 'First Age', short: '1A', length: 1000 },
        { name: 'Second Age', short: '2A', length: 1000 },
        { name: 'Third Age', short: '3A', length: 1000 },
      ],
    },
  },
  {
    name: 'Numbered millennia: 999.M3',
    calendar: { type: 'cycles', length: 1000, format: '{year}.M{cycle}', cycleFormat: 'M{cycle}', before: '{n} years before M1' },
  },
  { name: 'Free text on every event', calendar: { type: 'freeform' } },
];

export const DEFAULT_CALENDAR: Calendar = CALENDAR_PRESETS[0].calendar;

/** Can a date in this calendar be "only the age/cycle is known"? */
export const supportsPeriod = (calendar: Calendar) => calendar.type === 'ages' || calendar.type === 'cycles';

/** A sensible date for a new event when there are no others to copy. */
export function defaultSortKey(calendar: Calendar): number {
  if (calendar.type === 'years') return new Date().getFullYear();
  if (calendar.type === 'ages') return Math.max(1, ...ageStarts(calendar.ages)); // year 1 of the last age
  return 1;
}

/** What's wrong with a calendar, if anything. Each template needs its numbers. */
export function calendarError(c: Calendar): string | undefined {
  const needs = (template: string, ...keys: string[]) => keys.every((k) => template.includes(`{${k}}`));
  switch (c.type) {
    case 'years':
      return needs(c.before, 'n') && needs(c.after, 'n') ? undefined : 'Both labels need {n} where the number goes';
    case 'ages':
      if (c.ages.length === 0) return 'Add at least one age';
      if (c.ages.some((a) => !a.name.trim())) return 'Every age needs a name';
      if (c.ages.some((a) => a.length < 1)) return 'Every age needs a length of at least 1 year';
      return needs(c.format, 'year') ? undefined : 'The date format needs {year}';
    case 'cycles':
      if (!needs(c.format, 'year', 'cycle')) return 'The date format needs {year} and {cycle}';
      if (!needs(c.cycleFormat, 'cycle')) return 'The cycle-only format needs {cycle}';
      return needs(c.before, 'n') ? undefined : 'The "before cycle 1" format needs {n}';
    case 'freeform':
      return undefined;
  }
}

// ---------- Splitting a sortKey into the calendar's parts, and back ----------

/** Where each age begins: the sortKey of its year 1. */
export function ageStarts(ages: Age[]): number[] {
  let next = 1;
  return ages.map((age) => {
    const start = next;
    next += Math.max(1, age.length);
    return start;
  });
}

/**
 * The pieces a date input edits. "Before" cases count years back from the
 * calendar's start, so they're always positive numbers.
 */
export type DateParts =
  | { type: 'years'; before: boolean; n: number }
  /** age -1: `year` years before the first age */
  | { type: 'ages'; age: number; year: number }
  /** cycle 0: `year` years before cycle 1 */
  | { type: 'cycles'; cycle: number; year: number }
  | { type: 'freeform'; n: number };

export function splitKey(key: number, calendar: Calendar): DateParts {
  switch (calendar.type) {
    case 'years':
      return { type: 'years', before: key < 0, n: Math.abs(key) };
    case 'ages': {
      const starts = ageStarts(calendar.ages);
      if (starts.length === 0 || key < 1) return { type: 'ages', age: -1, year: 1 - key };
      let age = 0;
      while (age + 1 < starts.length && starts[age + 1] <= key) age++;
      return { type: 'ages', age, year: key - starts[age] + 1 };
    }
    case 'cycles': {
      if (key < 0) return { type: 'cycles', cycle: 0, year: -key };
      const cycle = Math.floor(key / calendar.length) + 1;
      return { type: 'cycles', cycle, year: key - (cycle - 1) * calendar.length };
    }
    case 'freeform':
      return { type: 'freeform', n: key };
  }
}

export function joinKey(parts: DateParts, calendar: Calendar): number {
  switch (parts.type) {
    case 'years':
      return parts.before ? -parts.n : parts.n;
    case 'ages': {
      if (parts.age < 0 || calendar.type !== 'ages') return 1 - parts.year;
      return ageStarts(calendar.ages)[parts.age] + parts.year - 1;
    }
    case 'cycles': {
      if (parts.cycle < 1 || calendar.type !== 'cycles') return -parts.year;
      return (parts.cycle - 1) * calendar.length + parts.year;
    }
    case 'freeform':
      return parts.n;
  }
}

// ---------- Labels ----------

/** The label for a sortKey, e.g. for era start/end markers. */
export function formatKey(key: number, calendar: Calendar): string {
  // A decimal part only orders events within the same year: 2007.002 is still 007.M3, and
  // -65000000.1 is still 65M years before M1 (just a little further back)
  if (calendar.type !== 'freeform') key = Math.trunc(key);
  const parts = splitKey(key, calendar);
  if (parts.type === 'years' && calendar.type === 'years') {
    return fill(parts.before ? calendar.before : calendar.after, { n: formatYears(parts.n) });
  }
  if (parts.type === 'ages' && calendar.type === 'ages') {
    const first = calendar.ages[0];
    if (parts.age < 0) {
      return first ? `${formatYears(parts.year)} yr${parts.year === 1 ? '' : 's'} before ${first.short || first.name} 1` : String(key);
    }
    const age = calendar.ages[parts.age];
    return fill(calendar.format, { age: age.short || age.name, name: age.name, year: parts.year });
  }
  if (parts.type === 'cycles' && calendar.type === 'cycles') {
    if (parts.cycle === 0) return fill(calendar.before, { n: formatYears(parts.year) });
    const width = String(calendar.length - 1).length; // 1000-year cycles -> 3 digits
    return fill(calendar.format, { year: String(parts.year).padStart(width, '0'), cycle: parts.cycle });
  }
  return String(key);
}

/** The label when only the age or cycle is known: "Third Age", "M3". */
export function formatPeriod(key: number, calendar: Calendar): string {
  const parts = splitKey(key, calendar);
  if (parts.type === 'ages' && calendar.type === 'ages' && parts.age >= 0) return calendar.ages[parts.age].name;
  if (parts.type === 'cycles' && calendar.type === 'cycles' && parts.cycle > 0) return fill(calendar.cycleFormat, { cycle: parts.cycle });
  return formatKey(key, calendar);
}

/** The sortKey a period date sits at: the start of its age or cycle. */
export function periodStart(key: number, calendar: Calendar): number {
  const parts = splitKey(Math.trunc(key), calendar);
  if (parts.type === 'ages' && parts.age >= 0) return joinKey({ ...parts, year: 1 }, calendar);
  if (parts.type === 'cycles' && parts.cycle > 0) return joinKey({ ...parts, year: 0 }, calendar);
  return key;
}

/** What the timeline shows for an event's date. */
export function formatDate(date: EventDate, calendar: Calendar): string {
  if (date.label) return date.label;
  if (date.precision === 'period' && supportsPeriod(calendar)) return formatPeriod(date.sortKey, calendar);
  const text = formatKey(date.sortKey, calendar);
  return date.precision === 'exact' || date.precision === 'period' ? text : `c. ${text}`;
}

/** "C.A. 140" for a moment, "C.A. 140 – C.A. 180" for an event with an end date. */
export function formatSpan(event: Pick<TimelineEvent, 'date' | 'endDate'>, calendar: Calendar): string {
  const start = formatDate(event.date, calendar);
  return event.endDate ? `${start} – ${formatDate(event.endDate, calendar)}` : start;
}

/** Sort comparator: by date, then a period before the events it holds, then title so ties are stable. */
export function compareEvents(a: TimelineEvent, b: TimelineEvent): number {
  return a.date.sortKey - b.date.sortKey || Number(b.kind === 'period') - Number(a.kind === 'period') || a.title.localeCompare(b.title);
}
