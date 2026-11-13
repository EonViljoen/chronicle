import type { Era, Faction, TimelineEvent } from '../types/timeline';
import type { EraSegment } from './eras';
import { ancestry, factionTree, mainFactionOf } from './factions';
import { isPeriod, periodMoments } from './periods';

/*
 * Layout for the viewer's stage, as plain functions: which row a span's bar
 * goes in, which lane an event sits in, and the era overview strip. The
 * stage spaces events evenly by column (their order), not to scale, so
 * everything here is in columns: column i is the i-th event of the era on
 * show.
 */

// ---------- Spans ----------

/** A bar for an event with an end date. */
export interface SpanBar {
  event: TimelineEvent;
  /** First column; -1 = it started in an earlier era (the bar comes in from the left edge). */
  from: number;
  /** Last column; `columns` = it carries on past this era (the bar runs off the right edge). */
  to: number;
  /** Which row of bars it's in, so bars don't overlap. */
  row: number;
  /** A period: it brackets its events' nodes instead of starting at a node of its own. */
  period?: boolean;
}

/**
 * The bars to draw for the era on show. `shown` is that era's events in
 * order (moments only); `all` is every event in order, periods included,
 * to find spans that began earlier and are still going.
 * - An event with an end date: a bar from its node to the last event that
 *   starts on or before its end date.
 * - A period: a bar across the events it includes (or, with none picked,
 *   the events between its dates).
 */
export function spanBars(shown: TimelineEvent[], all: TimelineEvent[]): SpanBar[] {
  if (shown.length === 0) return [];
  const periods = all.filter(isPeriod);
  all = all.filter((e) => !isPeriod(e));
  const first = shown[0].date.sortKey;
  const last = shown[shown.length - 1].date.sortKey;
  const lastCol = (end: number) => {
    let col = -1;
    shown.forEach((e, i) => {
      if (e.date.sortKey <= end) col = i;
    });
    return col;
  };
  const shownIds = new Set(shown.map((e) => e.id));
  // An end date past the last event here, with later events elsewhere, carries on
  const later = all.some((e) => e.date.sortKey > last && !shownIds.has(e.id));
  const ends = (end: number, col: number) => (end > last && later ? shown.length : col);

  const bars: Omit<SpanBar, 'row'>[] = [];
  // Spans that started in an earlier era and reach into this one
  for (const e of all) {
    if (!e.endDate || shownIds.has(e.id) || e.date.sortKey >= first || e.endDate.sortKey < first) continue;
    bars.push({ event: e, from: -1, to: ends(e.endDate.sortKey, lastCol(e.endDate.sortKey)) });
  }
  // Spans that start here
  shown.forEach((e, i) => {
    if (!e.endDate) return;
    bars.push({ event: e, from: i, to: ends(e.endDate.sortKey, Math.max(i, lastCol(e.endDate.sortKey))) });
  });

  // Periods: across the columns of their events here. Events of theirs in an
  // earlier or later era make the bar come in from the left or run off the right.
  const column = new Map(shown.map((e, i) => [e.id, i]));
  const byId = new Map([...all, ...periods].map((e) => [e.id, e]));
  for (const p of periods) {
    const moments = periodMoments(p, byId);
    let cols: number[];
    let before: boolean;
    let after: boolean;
    if (moments.length > 0) {
      cols = moments.map((m) => column.get(m.id)).filter((c): c is number => c !== undefined);
      before = moments.some((m) => !column.has(m.id) && m.date.sortKey <= first);
      after = moments.some((m) => !column.has(m.id) && m.date.sortKey >= last);
    } else {
      // No events picked: the events between its dates
      const start = p.date.sortKey;
      const end = (p.endDate ?? p.date).sortKey;
      cols = shown.flatMap((e, i) => (e.date.sortKey >= start && e.date.sortKey <= end ? [i] : []));
      before = start < first && all.some((e) => !column.has(e.id) && e.date.sortKey >= start && e.date.sortKey < first);
      after = end > last && all.some((e) => !column.has(e.id) && e.date.sortKey > last && e.date.sortKey <= end);
    }
    // Not here at all (it only reaches events in other eras)
    if (cols.length === 0 && !(before && after)) continue;
    const from = before ? -1 : Math.min(...cols);
    const to = after ? shown.length : Math.max(...cols);
    bars.push({ event: p, from, to, period: true });
  }
  return stack(bars);
}

/** Puts each bar in the first row where it doesn't touch the bar before it. */
function stack<T extends { from: number; to: number }>(bars: T[]): (T & { row: number })[] {
  const rowEnds: number[] = [];
  return [...bars]
    // Starting together, the shorter goes first (nearer the events): a battle's
    // campaign sits above the war that holds it
    .sort((a, b) => a.from - b.from || a.to - b.to)
    .map((bar) => {
      let row = rowEnds.findIndex((end) => end < bar.from);
      if (row === -1) row = rowEnds.length;
      rowEnds[row] = bar.to;
      return { ...bar, row };
    });
}

// ---------- Lanes ----------

/** One row of the lanes view: a faction (parent or child), or events with no faction. */
export interface Lane {
  /** The faction's id; undefined for "No faction". */
  id?: string;
  name: string;
  /** For a child faction, the factions above it: "Imperium › Space Marines" shows "Imperium" small. */
  parents?: string;
  color?: string;
  imageUrl?: string;
}

/** The faction id if it still exists (a deleted faction's events go to "No faction"). */
const known = (id: string | undefined, factions: Faction[]) => (id && factions.some((f) => f.id === id) ? id : undefined);

/**
 * The lane an event sits in: its own faction's, at whatever depth. An event of
 * the Space Marines goes in the Space Marines lane; only events of the Imperium
 * itself go in the Imperium lane. Its main faction, else its first faction.
 */
export function laneOf(event: TimelineEvent, factions: Faction[]): string | undefined {
  return known(mainFactionOf(event) ?? event.factionIds[0], factions);
}

/** The other factions an event involves: they get a faint dot in their lane. */
export function otherLanes(event: TimelineEvent, factions: Faction[]): string[] {
  const own = laneOf(event, factions);
  return [...new Set(event.factionIds.filter((id) => id !== own && known(id, factions)))];
}

/** The lanes for these events, in the faction tree's order (a parent above its children), with "No faction" last. Empty lanes are left out. */
export function lanesFor(events: TimelineEvent[], factions: Faction[]): Lane[] {
  const used = new Set(events.flatMap((e) => [laneOf(e, factions) ?? '', ...otherLanes(e, factions)]));
  const lanes: Lane[] = factionTree(factions)
    .filter((row) => used.has(row.faction.id))
    .map(({ faction }) => {
      const chain = ancestry(faction.id, factions);
      return {
        id: faction.id,
        name: faction.name,
        parents: chain.length > 1 ? chain.slice(0, -1).map((f) => f.name).join(' › ') : undefined,
        color: faction.color,
        // A child without its own picture shows its nearest parent's
        imageUrl: [...chain].reverse().find((f) => f.imageUrl)?.imageUrl,
      };
    });
  if (used.has('')) lanes.push({ name: 'No faction' });
  return lanes;
}

// ---------- Era overview strip ----------

/** One piece of the strip: a run of events (an era, or outside every era), or an empty era. */
export interface StripItem {
  key: string;
  era?: Era;
  /** The run of events, or undefined for an era with none. */
  segment?: number;
  count: number;
}

/**
 * Every era in order, as the strip shows them: each run of events, plus
 * eras with no events (drawn thin, so the gap is visible).
 */
export function stripItems(segments: EraSegment[], events: TimelineEvent[], eras: Era[]): StripItem[] {
  // `at` (where it starts) is only for sorting; it rides along harmlessly
  const items: (StripItem & { at: number })[] = segments.map((s, i) => ({
    key: `s${i}`,
    era: s.era,
    segment: i,
    count: s.endIndex - s.startIndex + 1,
    at: events[s.startIndex].date.sortKey,
  }));
  const withEvents = new Set(segments.map((s) => s.era?.id));
  for (const era of eras) {
    if (!withEvents.has(era.id)) items.push({ key: `e${era.id}`, era, count: 0, at: era.start });
  }
  return items.sort((a, b) => a.at - b.at);
}
