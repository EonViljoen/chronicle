import type { EventDate, Timeline, TimelineEvent } from '../types/timeline';

/*
 * Periods: events that are a stretch of time holding other events, such as a
 * war and its battles. A period has no node on the track; it's a bar under
 * the events it includes. Periods can hold other periods (a war, its
 * opening campaign, that campaign's battles).
 */

export const isPeriod = (e: Pick<TimelineEvent, 'kind'>) => e.kind === 'period';

type Lookup = Map<string, TimelineEvent>;
const lookup = (events: TimelineEvent[]): Lookup => new Map(events.map((e) => [e.id, e]));

/** Every moment a period covers, following periods inside it. Each moment once. */
export function periodMoments(period: TimelineEvent, events: TimelineEvent[] | Lookup): TimelineEvent[] {
  const byId = events instanceof Map ? events : lookup(events);
  const found = new Map<string, TimelineEvent>();
  const seen = new Set<string>([period.id]); // guards against a period inside itself
  const walk = (p: TimelineEvent) => {
    for (const id of p.includedIds ?? []) {
      const e = byId.get(id);
      if (!e || seen.has(id)) continue;
      seen.add(id);
      if (isPeriod(e)) walk(e);
      else found.set(id, e);
    }
  };
  walk(period);
  return [...found.values()];
}

/** The periods that list this event directly. */
export const periodsOf = (id: string, events: TimelineEvent[]) => events.filter((e) => isPeriod(e) && e.includedIds?.includes(id));

/** Every period that holds this one, however deep (a period can't include these, or it would hold itself). */
export function containersOf(id: string, events: TimelineEvent[]): Set<string> {
  const found = new Set<string>();
  const queue = [id];
  while (queue.length) {
    const current = queue.shift()!;
    for (const p of periodsOf(current, events)) {
      if (!found.has(p.id)) {
        found.add(p.id);
        queue.push(p.id);
      }
    }
  }
  return found;
}

/**
 * A period's dates worked out from its events: from the earliest start to
 * the latest end (or start). Undefined when it takes its own dates.
 */
function datesFromEvents(period: TimelineEvent, byId: Lookup, depth = 0): { date: EventDate; endDate?: EventDate } | undefined {
  if (period.ownDates || !period.includedIds?.length || depth > 50) return undefined;
  let start: EventDate | undefined;
  let end: EventDate | undefined;
  for (const id of period.includedIds) {
    const e = byId.get(id);
    if (!e || e.id === period.id) continue;
    const dates = (isPeriod(e) && datesFromEvents(e, byId, depth + 1)) || e;
    const last = dates.endDate ?? dates.date;
    if (!start || dates.date.sortKey < start.sortKey) start = dates.date;
    if (!end || last.sortKey > end.sortKey) end = last;
  }
  if (!start || !end) return undefined;
  // One date when it all happened at the same time ("c. 65M years before M1", not "c. 65M – c. 65M")
  return { date: start, endDate: end.sortKey === start.sortKey ? undefined : end };
}

/** What a period's dates would be, for showing in the form before saving. */
export function previewPeriodDates(period: TimelineEvent, events: TimelineEvent[]) {
  return datesFromEvents(period, lookup([...events.filter((e) => e.id !== period.id), period]));
}

/**
 * Brings periods' dates up to date with their events, and drops ids of
 * events that no longer exist. Run after every change to events.
 */
export function syncPeriods(t: Timeline): Timeline {
  if (!t.events.some(isPeriod)) return t;
  const byId = lookup(t.events);
  let changed = false;
  const events = t.events.map((e) => {
    if (!isPeriod(e)) return e;
    const includedIds = (e.includedIds ?? []).filter((id) => byId.has(id) && id !== e.id);
    const dates = datesFromEvents({ ...e, includedIds }, byId);
    const next = { ...e, includedIds, ...(dates && { date: dates.date, endDate: dates.endDate }) };
    if (JSON.stringify(next) === JSON.stringify(e)) return e;
    changed = true;
    return next;
  });
  // (A period inside a period is worked out on the way, so one pass is enough)
  return changed ? { ...t, events } : t;
}
