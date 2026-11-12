import type { Character, Faction, Era, FactionRelation, FlatMap, LorePage, Place, Relationship, Timeline, TimelineEvent } from '../types/timeline';
import { renameLinks, type LinkKind } from './links';
import { isPeriod, syncPeriods } from './periods';

/*
 * Pure functions: each takes a timeline and returns a NEW timeline with one
 * change applied. Nothing is modified in place. React (and Dexie's live
 * queries) rely on new objects to notice that something changed, and pure
 * functions are easy to test.
 *
 * Deleting something also removes references to it, so events never point
 * at a faction, place or event that no longer exists.
 */

/** Replace the item with the same id, or add it if it's new. */
export function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];
}

const without = (ids: string[], id: string) => ids.filter((x) => x !== id);

/**
 * When something linkable is renamed, [[links]] to its old name are
 * rewritten so they keep working (see lib/links.ts).
 */
function keepLinks(before: Timeline, after: Timeline, kind: LinkKind, id: string, newName: string): Timeline {
  const old =
    kind === 'event'
      ? before.events.find((e) => e.id === id)?.title
      : kind === 'lore'
        ? before.lore.find((p) => p.id === id)?.title
        : (kind === 'character' ? before.characters : kind === 'place' ? before.places : before.factions).find((x) => x.id === id)?.name;
  return old === undefined ? after : renameLinks(after, before, kind, old, newName);
}

export const saveEra = (t: Timeline, era: Era): Timeline => ({ ...t, eras: upsert(t.eras, era) });
export const removeEra = (t: Timeline, id: string): Timeline => ({ ...t, eras: t.eras.filter((e) => e.id !== id) });

export const saveFaction = (t: Timeline, faction: Faction): Timeline =>
  keepLinks(t, { ...t, factions: upsert(t.factions, faction) }, 'faction', faction.id, faction.name);
/** Deletes a faction. Its sub-factions and characters move up to its parent, so they aren't lost. */
export function removeFaction(t: Timeline, id: string): Timeline {
  const parentId = t.factions.find((c) => c.id === id)?.parentId;
  return {
    ...t,
    factions: t.factions
      .filter((c) => c.id !== id)
      .map((c) => (c.parentId === id ? { ...c, parentId } : c)),
    characters: t.characters.map((c) => (c.factionId === id ? { ...c, factionId: parentId } : c)),
    relations: t.relations.filter((r) => r.fromId !== id && r.toId !== id),
    events: t.events.map((e) => ({
      ...e,
      factionIds: without(e.factionIds, id),
      mainFactionId: e.mainFactionId === id ? undefined : e.mainFactionId,
    })),
  };
}

export const savePlace = (t: Timeline, place: Place): Timeline =>
  keepLinks(t, { ...t, places: upsert(t.places, place) }, 'place', place.id, place.name);
/** Deletes a place. Events lose it, and a map it opened stays, but no longer opens from here. */
export const removePlace = (t: Timeline, id: string): Timeline => ({
  ...t,
  places: t.places.filter((p) => p.id !== id),
  maps: t.maps.map((m) => (m.placeId === id ? { ...m, placeId: undefined } : m)),
  events: t.events.map((e) => ({ ...e, placeIds: without(e.placeIds, id) })),
});

export const saveCharacter = (t: Timeline, character: Character): Timeline =>
  keepLinks(t, { ...t, characters: upsert(t.characters, character) }, 'character', character.id, character.name);
/**
 * Saves a character along with the events they're in. Events hold that link
 * (`characterIds`), so each event gains or loses the character to match.
 */
export function saveCharacterWithEvents(t: Timeline, { eventIds, ...character }: Character & { eventIds: string[] }): Timeline {
  const inEvent = new Set(eventIds);
  const next = saveCharacter(t, character);
  return {
    ...next,
    events: next.events.map((e) => {
      const listed = e.characterIds.includes(character.id);
      if (inEvent.has(e.id) && !listed) return { ...e, characterIds: [...e.characterIds, character.id] };
      if (!inEvent.has(e.id) && listed) return { ...e, characterIds: without(e.characterIds, character.id) };
      return e;
    }),
  };
}
/**
 * A character's relationships as their form edits them: from their side,
 * so "child of Aldric" is stored as Aldric → parent → them.
 */
export interface RelationshipDraft {
  kind: Relationship['kind'] | 'child' | 'student';
  otherId: string;
}

/** One relationship as seen from `id`'s side. */
export function fromSide(r: Relationship, id: string): RelationshipDraft {
  if (r.fromId === id) return { kind: r.kind, otherId: r.toId };
  // The other end of a one-way link reads the other way round
  const kind = r.kind === 'parent' ? 'child' : r.kind === 'mentor' ? 'student' : r.kind;
  return { kind, otherId: r.fromId };
}

/** Back from a character's side to how it's stored. */
function toStored({ kind, otherId }: RelationshipDraft, id: string): Relationship {
  if (kind === 'child') return { kind: 'parent', fromId: otherId, toId: id };
  if (kind === 'student') return { kind: 'mentor', fromId: otherId, toId: id };
  return { kind, fromId: id, toId: otherId };
}

/** Is this the same link, whichever way round it was written? Two-way kinds match either way. */
const sameLink = (a: Relationship, b: Relationship) =>
  a.kind === b.kind &&
  ((a.fromId === b.fromId && a.toId === b.toId) || (a.kind !== 'parent' && a.kind !== 'mentor' && a.fromId === b.toId && a.toId === b.fromId));

/**
 * Saves a character along with the events they're in and their
 * relationships. Every relationship touching them is replaced by the
 * form's list (duplicates and links to themselves are dropped).
 */
export function saveCharacterFull(
  t: Timeline,
  { relationships, ...character }: Character & { eventIds: string[]; relationships: RelationshipDraft[] },
): Timeline {
  const next = saveCharacterWithEvents(t, character);
  const mine: Relationship[] = [];
  for (const draft of relationships) {
    if (!draft.otherId || draft.otherId === character.id) continue;
    const r = toStored(draft, character.id);
    if (!mine.some((m) => sameLink(m, r))) mine.push(r);
  }
  return {
    ...next,
    relationships: [...next.relationships.filter((r) => r.fromId !== character.id && r.toId !== character.id), ...mine],
  };
}

/** Deletes a character. Events no longer list them, and their relationships go. */
export const removeCharacter = (t: Timeline, id: string): Timeline => ({
  ...t,
  characters: t.characters.filter((c) => c.id !== id),
  relationships: t.relationships.filter((r) => r.fromId !== id && r.toId !== id),
  events: t.events.map((e) => ({ ...e, characterIds: without(e.characterIds, id) })),
});

export const saveRelation = (t: Timeline, relation: FactionRelation): Timeline => ({ ...t, relations: upsert(t.relations, relation) });
export const removeRelation = (t: Timeline, id: string): Timeline => ({ ...t, relations: t.relations.filter((r) => r.id !== id) });

export const saveLore = (t: Timeline, page: LorePage): Timeline => keepLinks(t, { ...t, lore: upsert(t.lore, page) }, 'lore', page.id, page.title);
export const removeLore = (t: Timeline, id: string): Timeline => ({ ...t, lore: t.lore.filter((p) => p.id !== id) });

export const saveMap = (t: Timeline, map: FlatMap): Timeline => ({ ...t, maps: upsert(t.maps, map) });

/**
 * Deletes a flat map. Places lose their pin on it; maps inside it move up to
 * its parent (like sub-factions), no longer opened from a place; and if it
 * was the master map, the timeline starts on its first top-level map again.
 */
export function removeMap(t: Timeline, id: string): Timeline {
  const parentId = t.maps.find((m) => m.id === id)?.parentId;
  return {
    ...t,
    maps: t.maps.filter((m) => m.id !== id).map((m) => (m.parentId === id ? { ...m, parentId, placeId: undefined } : m)),
    masterMapId: t.masterMapId === id ? undefined : t.masterMapId,
    places: t.places.map((p) => {
      if (!p.pins?.[id]) return p;
      const pins = { ...p.pins };
      delete pins[id];
      return { ...p, pins };
    }),
  };
}

/**
 * Where a flat map would swap to when moved one step earlier or later among
 * the maps that share its parent: [its index, the other map's index], or
 * null when it's already first or last of them (nothing to swap with).
 */
function mapSwap(maps: Timeline['maps'], id: string, direction: -1 | 1): [number, number] | null {
  const i = maps.findIndex((m) => m.id === id);
  if (i === -1) return null;
  for (let j = i + direction; j >= 0 && j < maps.length; j += direction) {
    if (maps[j].parentId === maps[i].parentId) return [i, j];
  }
  return null;
}

/** Can the map move that way? (The Maps tab greys out the arrow when it can't.) */
export const canMoveMap = (t: Timeline, id: string, direction: -1 | 1) => mapSwap(t.maps, id, direction) !== null;

/** Moves a flat map one step earlier or later among the maps that share its parent. */
export function moveMap(t: Timeline, id: string, direction: -1 | 1): Timeline {
  const swap = mapSwap(t.maps, id, direction);
  if (!swap) return t;
  const [i, j] = swap;
  const maps = [...t.maps];
  [maps[i], maps[j]] = [maps[j], maps[i]];
  return { ...t, maps };
}

/**
 * An event as the form edits it: the event plus the periods it's part of.
 * Periods store what they include (`includedIds`), so saving writes
 * `partOfIds` back onto them.
 */
export type EventDraft = TimelineEvent & { partOfIds: string[] };

/**
 * Saves an event and keeps "related" links two-way: if A lists B as related,
 * B lists A too, and unlinking on one side unlinks both. With `partOfIds`
 * (from the form), the periods it's part of are updated to match, and
 * periods' dates follow their events.
 */
export function saveEvent(t: Timeline, draft: TimelineEvent | EventDraft): Timeline {
  const { partOfIds, ...event } = draft as EventDraft;
  // A moment doesn't include anything; keep the fields off it
  if (!isPeriod(event)) {
    delete event.includedIds;
    delete event.ownDates;
  }
  const partOf = partOfIds && new Set(partOfIds);
  const related = new Set(event.relatedIds);
  const events = upsert(t.events, event).map((e) => {
    if (e.id === event.id) return e;
    let next = e;
    const linked = e.relatedIds.includes(event.id);
    if (related.has(e.id) && !linked) next = { ...next, relatedIds: [...e.relatedIds, event.id] };
    if (!related.has(e.id) && linked) next = { ...next, relatedIds: without(e.relatedIds, event.id) };
    if (partOf && isPeriod(e)) {
      const included = e.includedIds?.includes(event.id) ?? false;
      if (partOf.has(e.id) && !included) next = { ...next, includedIds: [...(e.includedIds ?? []), event.id] };
      if (!partOf.has(e.id) && included) next = { ...next, includedIds: without(e.includedIds ?? [], event.id) };
    }
    return next;
  });
  return syncPeriods(keepLinks(t, { ...t, events }, 'event', event.id, event.title));
}

/** Deletes an event. Related events and periods no longer list it, and periods' dates follow. */
export const removeEvent = (t: Timeline, id: string): Timeline =>
  syncPeriods({
    ...t,
    events: t.events.filter((e) => e.id !== id).map((e) => ({ ...e, relatedIds: without(e.relatedIds, id) })),
  });

/** How many events use a faction, place or character (for delete warnings). */
export const countUsage = (t: Timeline, key: 'factionIds' | 'placeIds' | 'characterIds', id: string) =>
  t.events.filter((e) => e[key].includes(id)).length;
