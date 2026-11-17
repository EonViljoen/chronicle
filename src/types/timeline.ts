import type { Theme } from './theme';

/**
 * The data model for a timeline.
 *
 * Nothing in here is tied to one setting: a history, a fantasy world or a
 * sci-fi saga all fit the same shapes. Everything a user creates in the
 * editor ends up as one of these.
 */

/**
 * Bump this when the shape changes. Older timelines (stored or imported)
 * are upgraded on the way in; see lib/upgrade.ts.
 * 2: `dateFormat` became `calendar`; dates lost `kind` and `display`.
 * 3: categories were renamed factions (`factions`, `factionIds`).
 * 4: one `flatMap` became a list of named `maps`; a place's `pin` became `pins` (one per map).
 * 5: `characters`, and events' `characterIds`.
 * 6: events' `tags`; `relations` (between factions), `relationships` (between characters) and `lore` pages.
 * 7: map `regions`; flat maps can be planets (`kind: 'planet'`).
 */
export const SCHEMA_VERSION = 7;

/** The header and footer of an exported website. */
export interface WebsiteSettings {
  name: string;
  tagline: string;
  /** The small symbol before the name */
  mark: string;
  footer: string;
}

/**
 * How a timeline counts and labels its years. Every event date is a
 * `sortKey` number; the calendar turns that number into a label, so editing
 * the calendar relabels every date at once without changing their order.
 *
 * - years:    one count with labels either side of year 0 ("500 BC", "AD 1066", "19 BBY")
 * - ages:     named ages that each count from 1 ("T.A. 3019", "4E 201")
 * - cycles:   fixed-length numbered cycles ("999.M41": year 999 of the 41st millennium)
 * - freeform: no calendar; each event has its own text label
 *
 * Templates use {n}, {year}, {cycle}, {age} and {name} placeholders.
 */
export type Calendar =
  | {
      type: 'years';
      /** For negative sortKeys, e.g. "{n} BC". {n} is the distance from year 0. */
      before: string;
      /** For year 0 and later, e.g. "AD {n}". */
      after: string;
    }
  | {
      type: 'ages';
      /** In order. The first age starts at sortKey 1. */
      ages: Age[];
      /** e.g. "{age} {year}" with {age} the age's short label. */
      format: string;
    }
  | {
      type: 'cycles';
      /** Years per cycle, e.g. 1000. Years in a cycle run 0 to length - 1. */
      length: number;
      /** e.g. "{year}.M{cycle}". {year} is zero-padded to the cycle's width. */
      format: string;
      /** When only the cycle is known, e.g. "M{cycle}". */
      cycleFormat: string;
      /** Before cycle 1, e.g. "{n} years before M1". */
      before: string;
    }
  | { type: 'freeform' };

export type CalendarType = Calendar['type'];

export interface Age {
  name: string;
  /** Short label used in dates, e.g. "T.A.". */
  short: string;
  /** How many years the age lasts. Ignored for the last age, which is open-ended. */
  length: number;
}

/**
 * - exact:   the label as is
 * - circa, decade, century, millennium: approximate, shown with "c."
 * - period:  only the age or cycle is known ("M31", "Third Age")
 */
export type DatePrecision = 'exact' | 'circa' | 'decade' | 'century' | 'millennium' | 'period';

export interface EventDate {
  /** A single number used for ordering, and turned into a label by the calendar. Higher = later. */
  sortKey: number;
  precision: DatePrecision;
  /** Set for a free-text date ("Time immemorial"); it replaces the calendar's label. */
  label?: string;
}

/** A coloured band behind the timeline, e.g. "The Horus Heresy". */
export interface Era {
  id: string;
  name: string;
  color: string;
  /** Inclusive sortKey range. */
  start: number;
  end: number;
}

/**
 * A tag with a colour, e.g. factions, characters or themes. Factions nest:
 * a faction with a `parentId` sits under that faction, to any depth
 * ("Imperium › Space Marines › Ultramarines"). See lib/factions.ts.
 */
export interface Faction {
  id: string;
  name: string;
  color: string;
  /** The faction this one sits under. Unset = top level. */
  parentId?: string;
  /** Optional. Who they are: Markdown, with [[links]]. Shown on the faction's page. */
  description?: string;
  /** A picture (banner, crest, emblem): a data: URL (uploaded) or a web address. */
  imageUrl?: string;
  /**
   * A theme (id) the page switches to when this faction is in focus: the
   * selected event's main faction, or the only faction filtered on. Unset =
   * use the nearest parent faction's theme, else the timeline's.
   */
  themeId?: string;
}

/** A location that events can happen at, e.g. a city or a star system. */
export interface Place {
  id: string;
  name: string;
  description: string;
  /** Position on the 3D starmap, or null if not placed yet. */
  position: [x: number, y: number, z: number] | null;
  /**
   * Positions on flat maps, by map id, as fractions of the image's width and
   * height (0–1). A place can be on several maps, or on none.
   */
  pins?: Record<string, [x: number, y: number]>;
}

/** Something a character is known for: a deed, a skill, a title. */
export interface Feat {
  name: string;
  /** Optional. Markdown, with [[links]]. */
  description: string;
}

/**
 * A person (or creature, ship, AI…) in the timeline. Events list the
 * characters in them (`characterIds`), which gives each character a life
 * story on their own page.
 */
export interface Character {
  id: string;
  name: string;
  /** Markdown, with [[links]]. */
  description: string;
  /** A picture: a data: URL (uploaded) or a web address. */
  imageUrl?: string;
  /** The faction they belong to. Unset = independent. */
  factionId?: string;
  born?: EventDate;
  died?: EventDate;
  feats: Feat[];
}

/**
 * How two factions stand with each other, e.g. at war or allied.
 * - ally, war, rival, trade, truce: two-way, so the order doesn't matter
 * - vassal: one-way, `fromId` serves `toId`
 */
export type RelationKind = 'ally' | 'war' | 'rival' | 'trade' | 'truce' | 'vassal';

/** A relation between two factions, optionally from one date to another. */
export interface FactionRelation {
  id: string;
  kind: RelationKind;
  fromId: string;
  toId: string;
  /** When it began. Unset = from the start (or unknown). */
  start?: EventDate;
  /** When it ended. Unset = still going (or unknown). */
  end?: EventDate;
  /** Optional. Markdown, with [[links]]. */
  note: string;
}

/**
 * A link between two characters.
 * - parent: one-way, `fromId` is a parent of `toId` (this draws the family tree)
 * - mentor: one-way, `fromId` taught `toId`
 * - spouse, sibling, friend, rival, enemy: two-way
 */
export type RelationshipKind = 'parent' | 'spouse' | 'sibling' | 'mentor' | 'friend' | 'rival' | 'enemy';

export interface Relationship {
  kind: RelationshipKind;
  fromId: string;
  toId: string;
}

/**
 * A free-form page that isn't an event, character, place or faction: a
 * religion, a language, an artefact, a custom. Linkable with [[links]].
 */
export interface LorePage {
  id: string;
  title: string;
  /** Pages are listed under their category, e.g. "Religions". Empty = "Other". */
  category: string;
  /** Markdown, with [[links]] and [^1] citations of `sources`. */
  body: string;
  imageUrl?: string;
  sources: string[];
}

/** The 3D starmap's settings. A discriminated union: check `type` first. */
export type MapConfig =
  | { type: 'none' }
  | {
      type: 'galaxy3d';
      arms: number;
      radius: number;
      /**
       * Where the galaxy's colours come from. 'theme' (or unset): the arms
       * use the theme's accent colour and the core its highlight, so the
       * galaxy follows theme changes. 'custom': coreColor and armColor.
       */
      colors?: 'theme' | 'custom';
      coreColor: string;
      armColor: string;
    };

/** The id the 3D starmap goes by wherever maps are referred to (it isn't in `maps`). */
export const STARMAP_ID = 'starmap';

/**
 * A flat map: your own image (a drawn fantasy map, a galaxy chart…) that
 * places are pinned on. A timeline has any number, alongside the 3D starmap.
 *
 * Maps nest like factions: a map can sit inside another map (`parentId`,
 * which may be STARMAP_ID), opened by clicking one of the parent's places
 * (`placeId`), e.g. galaxy → sector → planet → city. See lib/maps.ts.
 */
export interface FlatMap {
  id: string;
  name: string;
  /**
   * Unset: a flat picture. 'planet': the picture is a planet's surface,
   * wrapped round a 3D globe (a 2:1 "equirectangular" picture, like a world
   * map). Pins work the same: x is the longitude and y the latitude, as
   * fractions (0 = 180° W / 90° N, 1 = 180° E / 90° S).
   */
  kind?: 'planet';
  /** How a planet looks. Only for planets. */
  planet?: PlanetLook;
  /** The picture, as a data: URL (uploaded or generated) or a web address. */
  image: string;
  /** The picture's size in pixels, for its shape before it loads. */
  width: number;
  height: number;
  /** The map this one sits inside. Unset = top level. */
  parentId?: string;
  /** The place on the parent map that opens this one. */
  placeId?: string;
}

/** A planet's look, apart from its surface picture. */
export interface PlanetLook {
  /** The glow round the edge: a colour, 'theme' (the theme's accent) or 'none'. */
  atmosphere: string;
  rings: boolean;
  ringColor: string;
  clouds: boolean;
  /** Set when the surface was generated rather than uploaded, so it can be drawn again with other settings. */
  generated?: SurfaceSettings;
}

/** The settings a generated planet surface was drawn with (see lib/planets.ts). */
export interface SurfaceSettings {
  /** The same seed always draws the same continents. */
  seed: number;
  sea: string;
  land: string;
  /** Mountains and high ground. */
  high: string;
  /** How much of the surface is sea, in percent. */
  water: number;
  /** Ice caps at the poles. */
  ice: boolean;
}

/**
 * The shape of a region:
 * - polygon: on a flat map or a planet, corners as fractions of the picture (0–1), like pins
 * - slice:   on the starmap, a pie-shaped segment of the galaxy, from one angle to another
 *            (degrees, 0 = towards +X, counting anticlockwise seen from above) between two
 *            distances from the centre
 * - cloud:   on the starmap, a glowing cloud round a point, for a single feature (a storm, a nebula)
 */
export type RegionShape =
  | { type: 'polygon'; points: [x: number, y: number][] }
  | { type: 'slice'; from: number; to: number; inner: number; outer: number }
  | { type: 'cloud'; center: [x: number, y: number, z: number]; radius: number };

/**
 * A named area on a map: a province, a segment of a galaxy, a storm. The
 * places inside it are worked out from their pins (see lib/regions.ts).
 */
export interface Region {
  id: string;
  name: string;
  /** The map it's drawn on: a flat map's or planet's id, or STARMAP_ID. */
  mapId: string;
  shape: RegionShape;
  /** The faction holding it. Its colour is used unless `color` is set. */
  factionId?: string;
  /** Its own colour. Unset = the faction's, else the theme's accent. */
  color?: string;
  /** How strongly it's filled in, 0–1. */
  fill: number;
  /** Where its name sits, as fractions like a pin (flat maps and planets). Unset = the middle. */
  labelAt?: [x: number, y: number];
  /** Optional. Markdown, with [[links]]. */
  description: string;
}

/** The 3D galaxy variant of MapConfig. */
export type GalaxyConfig = Extract<MapConfig, { type: 'galaxy3d' }>;

export interface TimelineEvent {
  id: string;
  /**
   * Unset: a moment, drawn as a node on the track. 'period': a stretch of
   * time that holds other events (a war and its battles): no node, only a bar
   * under the track across the events it includes. See lib/periods.ts.
   */
  kind?: 'period';
  /** A period's events (moments, or periods inside it). */
  includedIds?: string[];
  /**
   * A period with events normally takes its dates from them (first to last).
   * Set to keep its own dates instead, e.g. a war that began before its first battle.
   */
  ownDates?: boolean;
  title: string;
  /** One line, shown on hover. */
  summary: string;
  /** Long form, Markdown. */
  body: string;
  imageUrl?: string;
  date: EventDate;
  /**
   * Optional: when it ended, for something that lasted (a war, a reign).
   * Drawn as a bar from the event to the last event before this date.
   * The event belongs to the era of its start date.
   */
  endDate?: EventDate;
  factionIds: string[];
  /** The faction at the heart of the event (one of factionIds). Sets the node colour and, if it has one, the theme. */
  mainFactionId?: string;
  placeIds: string[];
  /** The characters in the event. */
  characterIds: string[];
  relatedIds: string[];
  /** Free labels ("battle", "treaty"), separate from factions. */
  tags: string[];
  /** Where it comes from. [^1] in the details cites the first one. */
  sources: string[];
}

export interface Timeline {
  id: string;
  schemaVersion: number;
  title: string;
  description: string;
  calendar: Calendar;
  eras: Era[];
  factions: Faction[];
  places: Place[];
  characters: Character[];
  /** How factions stand with each other. */
  relations: FactionRelation[];
  /** Family and other links between characters. */
  relationships: Relationship[];
  /** Free-form pages. */
  lore: LorePage[];
  /** Named areas on the maps. */
  regions: Region[];
  /** The 3D starmap's settings (or none). */
  map: MapConfig;
  /** Flat image maps, in the order you arranged them. */
  maps: FlatMap[];
  /** The map the viewer and map page start on: STARMAP_ID or a flat map's id. Unset = the first top-level one. */
  masterMapId?: string;
  /** The theme's id: a built-in preset or one from your library. Unset = the site's default. */
  theme?: string;
  /**
   * A full copy of the theme. Only in exported files and published
   * timelines, so they look the same anywhere; stored timelines just keep the id.
   */
  themeDef?: Theme;
  /** Copies of the factions' themes. Only in exported files and published timelines. */
  themeDefs?: Theme[];
  /** Settings for "Export website", remembered for the next export. */
  website?: WebsiteSettings;
  /** True: picking an event or filtering to one faction keeps the timeline's theme instead of switching to the faction's. */
  disableFactionThemeOverride?: boolean;
  events: TimelineEvent[];
  createdAt: number;
  updatedAt: number;
}
