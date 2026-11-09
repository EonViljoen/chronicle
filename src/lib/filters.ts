import type { Calendar, TimelineEvent } from '../types/timeline';
import { formatDate } from './dates';

/** What the viewer is currently filtering by. */
export interface Filters {
  query: string;
  categoryIds: string[];
  placeId: string | null;
}

export const NO_FILTERS: Filters = { query: '', categoryIds: [], placeId: null };

export const hasFilters = (f: Filters) => f.query.trim() !== '' || f.categoryIds.length > 0 || f.placeId !== null;

/**
 * Does an event pass every active filter?
 * - categories: any of the picked ones
 * - place: happens at that place
 * - search: text appears in the title, summary, details or date
 */
export function matchesFilters(event: TimelineEvent, f: Filters, calendar: Calendar): boolean {
  if (f.categoryIds.length > 0 && !event.categoryIds.some((id) => f.categoryIds.includes(id))) return false;
  if (f.placeId && !event.placeIds.includes(f.placeId)) return false;
  const q = f.query.trim().toLowerCase();
  if (q && ![event.title, event.summary, event.body, formatDate(event.date, calendar)].some((text) => text.toLowerCase().includes(q))) {
    return false;
  }
  return true;
}
