import type { Category, Era, Place, Timeline, TimelineEvent } from '../types/timeline';

/*
 * Pure functions: each takes a timeline and returns a NEW timeline with one
 * change applied. Nothing is modified in place. React (and Dexie's live
 * queries) rely on new objects to notice that something changed, and pure
 * functions are easy to test.
 *
 * Deleting something also removes references to it, so events never point
 * at a category, place or event that no longer exists.
 */

/** Replace the item with the same id, or add it if it's new. */
export function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];
}

const without = (ids: string[], id: string) => ids.filter((x) => x !== id);

export const saveEra = (t: Timeline, era: Era): Timeline => ({ ...t, eras: upsert(t.eras, era) });
export const removeEra = (t: Timeline, id: string): Timeline => ({ ...t, eras: t.eras.filter((e) => e.id !== id) });

export const saveCategory = (t: Timeline, category: Category): Timeline => ({
  ...t,
  categories: upsert(t.categories, category),
});
export const removeCategory = (t: Timeline, id: string): Timeline => ({
  ...t,
  categories: t.categories.filter((c) => c.id !== id),
  events: t.events.map((e) => ({ ...e, categoryIds: without(e.categoryIds, id) })),
});

export const savePlace = (t: Timeline, place: Place): Timeline => ({ ...t, places: upsert(t.places, place) });
export const removePlace = (t: Timeline, id: string): Timeline => ({
  ...t,
  places: t.places.filter((p) => p.id !== id),
  events: t.events.map((e) => ({ ...e, placeIds: without(e.placeIds, id) })),
});

/**
 * Saves an event and keeps "related" links two-way: if A lists B as related,
 * B lists A too, and unlinking on one side unlinks both.
 */
export function saveEvent(t: Timeline, event: TimelineEvent): Timeline {
  const related = new Set(event.relatedIds);
  const events = upsert(t.events, event).map((e) => {
    if (e.id === event.id) return e;
    const linked = e.relatedIds.includes(event.id);
    if (related.has(e.id) && !linked) return { ...e, relatedIds: [...e.relatedIds, event.id] };
    if (!related.has(e.id) && linked) return { ...e, relatedIds: without(e.relatedIds, event.id) };
    return e;
  });
  return { ...t, events };
}

export const removeEvent = (t: Timeline, id: string): Timeline => ({
  ...t,
  events: t.events.filter((e) => e.id !== id).map((e) => ({ ...e, relatedIds: without(e.relatedIds, id) })),
});

/** How many events use a category or place (for delete warnings). */
export const countUsage = (t: Timeline, key: 'categoryIds' | 'placeIds', id: string) =>
  t.events.filter((e) => e[key].includes(id)).length;
