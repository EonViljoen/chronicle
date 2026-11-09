/**
 * The data model for a timeline.
 *
 * Nothing in here is Warhammer-specific: 40k is just one timeline that uses
 * the "millennium" date kind and a 3D galaxy map. Everything a user creates
 * in the editor ends up as one of these shapes.
 */

/** Bump this when the shape changes in a way old exports can't satisfy. */
export const SCHEMA_VERSION = 1;

/**
 * How a date is entered and displayed.
 * - year:       plain numeric years (1066, -500)
 * - millennium: 40k style "999.M41"
 * - freeform:   any label ("~60 million years ago"), ordered by a manual sortKey
 */
export type DateKind = 'year' | 'millennium' | 'freeform';

export type DatePrecision = 'exact' | 'decade' | 'century' | 'millennium' | 'circa';

export interface EventDate {
  kind: DateKind;
  /** What the viewer shows above the node, e.g. "005.M31". */
  display: string;
  /** A single number used only for ordering. Higher = later. */
  sortKey: number;
  precision: DatePrecision;
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

/** A tag with a colour. In the 40k demo these are factions. */
export interface Category {
  id: string;
  name: string;
  color: string;
}

/** A location that events can happen at. In the 40k demo these are star systems. */
export interface Place {
  id: string;
  name: string;
  description: string;
  /** Position on the map, or null if not placed yet. */
  position: [x: number, y: number, z: number] | null;
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

export interface TimelineEvent {
  id: string;
  title: string;
  /** One line, shown on hover. */
  summary: string;
  /** Long form, Markdown. */
  body: string;
  imageUrl?: string;
  date: EventDate;
  categoryIds: string[];
  placeIds: string[];
  relatedIds: string[];
  sources: string[];
}

export interface Timeline {
  id: string;
  schemaVersion: number;
  title: string;
  description: string;
  /** The default date kind the editor offers for new events. */
  dateFormat: DateKind;
  eras: Era[];
  categories: Category[];
  places: Place[];
  map: MapConfig;
  events: TimelineEvent[];
  createdAt: number;
  updatedAt: number;
}
