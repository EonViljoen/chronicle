import type { Calendar, TimelineEvent } from '../types/timeline';
import { formatDate } from './dates';

/** What the viewer is currently filtering by. */
export interface Filters {
  query: string;
  factionIds: string[];
  placeId: string | null;
}

export const NO_FILTERS: Filters = { query: '', factionIds: [], placeId: null };

export const hasFilters = (f: Filters) => f.query.trim() !== '' || f.factionIds.length > 0 || f.placeId !== null;

/**
 * Does an event pass every active filter?
 * - factions: any of the picked ones (the caller adds their sub-factions)
 * - place: happens at that place
 * - search: text appears in the title, summary, details or date
 */
export function matchesFilters(event: TimelineEvent, f: Filters, calendar: Calendar): boolean {
  if (f.factionIds.length > 0 && !event.factionIds.some((id) => f.factionIds.includes(id))) return false;
  if (f.placeId && !event.placeIds.includes(f.placeId)) return false;
  const q = f.query.trim().toLowerCase();
  if (q && ![event.title, event.summary, event.body, formatDate(event.date, calendar)].some((text) => text.toLowerCase().includes(q))) {
    return false;
  }
  return true;
}
