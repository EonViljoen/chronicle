import type { Era, Faction, TimelineEvent } from '../types/timeline';
import type { EraSegment } from './eras';
import { ancestry, factionTree, mainFactionOf } from './factions';

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
}

/**
 * The bars to draw for the era on show. `shown` is that era's events in
 * order; `all` is every event in order, to find spans that began earlier
 * and are still going. A bar reaches the last event that starts on or
 * before its end date.
 */
export function spanBars(shown: TimelineEvent[], all: TimelineEvent[]): SpanBar[] {
  if (shown.length === 0) return [];
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
  return stack(bars);
}

/** Puts each bar in the first row where it doesn't touch the bar before it. */
function stack<T extends { from: number; to: number }>(bars: T[]): (T & { row: number })[] {
  const rowEnds: number[] = [];
  return [...bars]
    .sort((a, b) => a.from - b.from || b.to - a.to)
    .map((bar) => {
      let row = rowEnds.findIndex((end) => end < bar.from);
      if (row === -1) row = rowEnds.length;
      rowEnds[row] = bar.to;
      return { ...bar, row };
    });
}

// ---------- Lanes ----------

/** One row of the lanes view: a top-level faction, or events with no faction. */
export interface Lane {
  /** The top-level faction's id; undefined for "No faction". */
  id?: string;
  name: string;
  color?: string;
}

/** The top-level faction an event sits under: its main faction's, else its first faction's. */
export function laneOf(event: TimelineEvent, factions: Faction[]): string | undefined {
  const id = mainFactionOf(event) ?? event.factionIds[0];
  return id ? ancestry(id, factions)[0]?.id : undefined;
}

/** The other top-level factions an event involves: they get a faint dot in their lane. */
export function otherLanes(event: TimelineEvent, factions: Faction[]): string[] {
  const own = laneOf(event, factions);
  const roots = event.factionIds.map((id) => ancestry(id, factions)[0]?.id).filter((id): id is string => !!id && id !== own);
  return [...new Set(roots)];
}

/** The lanes for these events, in the faction tree's order, with "No faction" last. Empty lanes are left out. */
export function lanesFor(events: TimelineEvent[], factions: Faction[]): Lane[] {
  const used = new Set(events.flatMap((e) => [laneOf(e, factions) ?? '', ...otherLanes(e, factions)]));
  const lanes: Lane[] = factionTree(factions)
    .filter((row) => row.depth === 0 && used.has(row.faction.id))
    .map(({ faction }) => ({ id: faction.id, name: faction.name, color: faction.color }));
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
