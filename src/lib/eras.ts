import type { Era, TimelineEvent } from '../types/timeline';

/** The era a date falls in, if any. */
export function eraFor(sortKey: number, eras: Era[]): Era | undefined {
  return eras.find((era) => sortKey >= era.start && sortKey <= era.end);
}

/** A run of consecutive (sorted) events that share an era. */
export interface EraSegment {
  era: Era | undefined;
  /** Index of the first and last event in the run (inclusive). */
  startIndex: number;
  endIndex: number;
}

/**
 * Splits sorted events into era runs, used to draw the coloured bands.
 * Because nodes are evenly spaced (not to scale), a band covers its events,
 * not its real length in years.
 */
export function eraSegments(sortedEvents: TimelineEvent[], eras: Era[]): EraSegment[] {
  const segments: EraSegment[] = [];
  sortedEvents.forEach((event, i) => {
    const era = eraFor(event.date.sortKey, eras);
    const last = segments[segments.length - 1];
    if (last && last.era?.id === era?.id) {
      last.endIndex = i;
    } else {
      segments.push({ era, startIndex: i, endIndex: i });
    }
  });
  return segments;
}
