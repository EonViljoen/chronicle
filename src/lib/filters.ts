import type { Calendar, TimelineEvent } from '../types/timeline';
import { formatSpan } from './dates';

/** What the viewer is currently filtering by. */
export interface Filters {
  query: string;
  factionIds: string[];
  placeId: string | null;
  /** Any of these tags. */
  tags: string[];
}

export const NO_FILTERS: Filters = { query: '', factionIds: [], placeId: null, tags: [] };

export const hasFilters = (f: Filters) => f.query.trim() !== '' || f.factionIds.length > 0 || f.placeId !== null || f.tags.length > 0;

/**
 * Does an event pass every active filter?
 * - factions: any of the picked ones (the caller adds their sub-factions)
 * - place: happens at that place
 * - tags: has any of the picked tags
 * - search: text appears in the title, summary, details, date or tags
 */
export function matchesFilters(event: TimelineEvent, f: Filters, calendar: Calendar): boolean {
  if (f.factionIds.length > 0 && !event.factionIds.some((id) => f.factionIds.includes(id))) return false;
  if (f.placeId && !event.placeIds.includes(f.placeId)) return false;
  if (f.tags.length > 0 && !event.tags.some((t) => f.tags.includes(t))) return false;
  const q = f.query.trim().toLowerCase();
  if (q && ![event.title, event.summary, event.body, formatSpan(event, calendar), ...event.tags].some((text) => text.toLowerCase().includes(q))) {
    return false;
  }
  return true;
}
