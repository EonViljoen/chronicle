import { SCHEMA_VERSION, type Calendar, type DatePrecision, type EventDate, type FlatMap, type Place, type Timeline } from '../types/timeline';

/*
 * Brings timelines saved by older versions of the app up to date. Used for
 * timelines already in the browser (see db.ts) and for imported files.
 * Each step upgrades one version, so very old files run through every step.
 */

// ---------- Version 1 shapes, as they were ----------

type V1Kind = 'year' | 'millennium' | 'freeform';
interface V1Date {
  kind: V1Kind;
  display: string;
  sortKey: number;
  precision: Exclude<DatePrecision, 'period'>;
}
type V1Timeline = Omit<Timeline, 'calendar' | 'events'> & {
  dateFormat?: V1Kind;
  events: (Omit<Timeline['events'][number], 'date'> & { date: V1Date })[];
};

/** The calendars that reproduce version 1's built-in date formats exactly. */
const V1_CALENDARS: Record<V1Kind, Calendar> = {
  year: { type: 'years', before: '{n} BCE', after: '{n}' },
  millennium: { type: 'cycles', length: 1000, format: '{year}.M{cycle}', cycleFormat: 'M{cycle}', before: '{n} years before M1' },
  freeform: { type: 'freeform' },
};

/**
 * Version 1 stored each date's label. Version 2 works labels out from the
 * timeline's calendar, so only dates in the timeline's own format can drop
 * theirs; any other date keeps its old label as free text.
 */
function upgradeDateV1(date: V1Date, format: V1Kind): EventDate {
  const { sortKey, precision, kind, display } = date;
  if (kind === 'freeform' || kind !== format) return { sortKey, precision, label: display };
  if (kind === 'millennium' && precision === 'millennium') return { sortKey, precision: 'period' }; // "M31"
  return { sortKey, precision };
}

function v1to2(t: V1Timeline): Timeline {
  const { dateFormat = 'year', events, ...rest } = t;
  return {
    ...rest,
    schemaVersion: 2,
    calendar: V1_CALENDARS[dateFormat] ?? V1_CALENDARS.year,
    events: events.map((e) => ({ ...e, date: upgradeDateV1(e.date, dateFormat) })),
  };
}

// ---------- Version 2 -> 3: categories became factions ----------

type V2Timeline = Omit<Timeline, 'factions' | 'events'> & {
  categories?: Timeline['factions'];
  factions?: Timeline['factions'];
  events: (Omit<Timeline['events'][number], 'factionIds'> & { categoryIds?: string[]; factionIds?: string[] })[];
};

function v2to3(t: V2Timeline): Timeline {
  const { categories, factions, events, ...rest } = t;
  return {
    ...rest,
    schemaVersion: 3,
    factions: factions ?? categories ?? [],
    events: events.map(({ categoryIds, factionIds, ...e }) => ({ ...e, factionIds: factionIds ?? categoryIds ?? [] })),
  };
}

// ---------- Version 3 -> 4: one flat map became a list of maps ----------

type V3Place = Omit<Place, 'pins'> & { pin?: [number, number] | null; pins?: Place['pins'] };
type V3Timeline = Omit<Timeline, 'maps' | 'places'> & {
  flatMap?: { image: string; width: number; height: number };
  maps?: FlatMap[];
  places: V3Place[];
};

/** The id the old single flat map gets. */
const V3_MAP_ID = 'map';

function v3to4(t: V3Timeline): Timeline {
  const { flatMap, maps, places, ...rest } = t;
  return {
    ...rest,
    schemaVersion: 4,
    // The single flat map becomes the first (and only) map in the list…
    maps: maps ?? (flatMap ? [{ id: V3_MAP_ID, name: 'Map', ...flatMap }] : []),
    // …and each place's pin moves onto it
    places: places.map(({ pin, pins, ...p }) => {
      if (pins) return { ...p, pins };
      return pin && flatMap ? { ...p, pins: { [V3_MAP_ID]: pin } } : p;
    }),
  };
}

// ---------- Version 4 -> 5: characters ----------

type V4Timeline = Omit<Timeline, 'characters' | 'events'> & {
  characters?: Timeline['characters'];
  events: (Omit<Timeline['events'][number], 'characterIds'> & { characterIds?: string[] })[];
};

function v4to5(t: V4Timeline): Timeline {
  return {
    ...t,
    schemaVersion: 5,
    characters: t.characters ?? [],
    events: t.events.map((e) => ({ ...e, characterIds: e.characterIds ?? [] })),
  };
}

// ---------- Version 5 -> 6: tags, relations, relationships, lore ----------

type V5Timeline = Omit<Timeline, 'relations' | 'relationships' | 'lore' | 'events'> & {
  events: (Omit<Timeline['events'][number], 'tags'> & { tags?: string[] })[];
};

function v5to6(t: V5Timeline): Timeline {
  return {
    ...t,
    schemaVersion: 6,
    relations: [],
    relationships: [],
    lore: [],
    events: t.events.map((e) => ({ ...e, tags: e.tags ?? [] })),
  };
}

// ---------- Version 6 -> 7: map regions ----------

function v6to7(t: Omit<Timeline, 'regions'>): Timeline {
  return { ...t, schemaVersion: 7, regions: [] };
}

/** Returns the timeline in the current shape. Already-current ones pass through unchanged. */
export function upgradeTimeline(data: { schemaVersion: number }): Timeline {
  let t: unknown = data;
  if ((t as { schemaVersion: number }).schemaVersion < 2) t = v1to2(t as V1Timeline);
  if ((t as { schemaVersion: number }).schemaVersion < 3) t = v2to3(t as V2Timeline);
  if ((t as { schemaVersion: number }).schemaVersion < 4) t = v3to4(t as V3Timeline);
  if ((t as { schemaVersion: number }).schemaVersion < 5) t = v4to5(t as V4Timeline);
  if ((t as { schemaVersion: number }).schemaVersion < 6) t = v5to6(t as V5Timeline);
  if ((t as { schemaVersion: number }).schemaVersion < 7) t = v6to7(t as Omit<Timeline, 'regions'>);
  // Future steps go here: if (version < 8) t = v7to8(t) …
  // A hand-made current file might leave lists out
  const current = t as Timeline;
  return {
    ...current,
    maps: current.maps ?? [],
    characters: (current.characters ?? []).map((c) => ({ ...c, description: c.description ?? '', feats: c.feats ?? [] })),
    relations: (current.relations ?? []).map((r) => ({ ...r, note: r.note ?? '' })),
    relationships: current.relationships ?? [],
    regions: (current.regions ?? []).map((r) => ({ ...r, fill: r.fill ?? 0.3, description: r.description ?? '' })),
    lore: (current.lore ?? []).map((p) => ({ ...p, category: p.category ?? '', body: p.body ?? '', sources: p.sources ?? [] })),
    events: current.events.map((e) => (e.characterIds && e.tags && e.sources ? e : { ...e, characterIds: e.characterIds ?? [], tags: e.tags ?? [], sources: e.sources ?? [] })),
    schemaVersion: SCHEMA_VERSION,
  };
}
