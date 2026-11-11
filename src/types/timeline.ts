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
 */
export const SCHEMA_VERSION = 4;

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

/** The map attached to a timeline. A discriminated union: check `type` first. */
export type MapConfig =
  | { type: 'none' }
  | {
      type: 'galaxy3d';
      arms: number;
      radius: number;
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
  /** The picture, as a data: URL (uploaded) or a web address. */
  image: string;
  /** The picture's size in pixels, for its shape before it loads. */
  width: number;
  height: number;
  /** The map this one sits inside. Unset = top level. */
  parentId?: string;
  /** The place on the parent map that opens this one. */
  placeId?: string;
}

/** The 3D galaxy variant of MapConfig. */
export type GalaxyConfig = Extract<MapConfig, { type: 'galaxy3d' }>;

export interface TimelineEvent {
  id: string;
  title: string;
  /** One line, shown on hover. */
  summary: string;
  /** Long form, Markdown. */
  body: string;
  imageUrl?: string;
  date: EventDate;
  factionIds: string[];
  /** The faction at the heart of the event (one of factionIds). Sets the node colour and, if it has one, the theme. */
  mainFactionId?: string;
  placeIds: string[];
  relatedIds: string[];
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
  events: TimelineEvent[];
  createdAt: number;
  updatedAt: number;
}
