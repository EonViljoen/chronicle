import type { ReactNode } from 'react';
import type { Timeline, TimelineEvent } from '../../types/timeline';
import { compareEvents, formatSpan } from '../../lib/dates';

/** One line in a history: an event, or a marker such as "Born". */
export interface ChronologyEntry {
  key: string;
  sortKey: number;
  date: string;
  title: ReactNode;
  /** A line under the title. */
  note?: ReactNode;
  /** Where clicking the title goes. */
  to?: string;
  /** Markers (born, died) get a different dot. */
  marker?: boolean;
}

/** Turns events into entries that open each one on the timeline. */
export function eventEntries(events: TimelineEvent[], timeline: Timeline, note?: (e: TimelineEvent) => ReactNode): ChronologyEntry[] {
  return [...events].sort(compareEvents).map((e) => ({
    key: e.id,
    sortKey: e.date.sortKey,
    date: formatSpan(e, timeline.calendar),
    title: e.title,
    note: note ? note(e) : e.summary || undefined,
    to: `/t/${timeline.id}?event=${encodeURIComponent(e.id)}`,
  }));
}
