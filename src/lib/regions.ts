import { STARMAP_ID, type Faction, type Place, type Region, type RegionShape, type Timeline } from '../types/timeline';

/*
 * Map regions: named areas on a map (see Region in types/timeline.ts).
 * Pure geometry, so the maps, pages and editor agree on what's inside what.
 *
 * Starmap angles: 0° points towards +X and they count anticlockwise seen
 * from above, so 90° points towards −Z (away from the starting camera).
 */

type Point = [number, number];

/** The colour a region is drawn in: its own, else its faction's, else `fallback` (the theme's accent). */
export function regionColor(region: Pick<Region, 'color' | 'factionId'>, factions: Faction[], fallback: string): string {
  return region.color || factions.find((f) => f.id === region.factionId)?.color || fallback;
}

/** Is the point inside the polygon? (Even-odd rule: count how many edges a line to the right crosses.) */
export function pointInPolygon([x, y]: Point, points: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** A starmap position's angle round the centre, in degrees 0–360 (see the note at the top). */
export const angleOf = (x: number, z: number) => ((Math.atan2(-z, x) * 180) / Math.PI + 360) % 360;

/** How far anticlockwise `to` is from `from`, 0–360. A slice from 300° to 30° spans 90°. */
export const sweep = (from: number, to: number) => {
  const s = (((to - from) % 360) + 360) % 360;
  return s === 0 && from !== to ? 360 : s;
};

/** Is the angle within the slice, going anticlockwise from `from` to `to`? */
export const withinAngles = (angle: number, from: number, to: number) => sweep(from, angle) <= sweep(from, to);

/** Is the place inside the region, going by its pin (or starmap position) on the region's map? */
export function contains(region: Region, place: Place): boolean {
  const shape = region.shape;
  if (shape.type === 'polygon') {
    const pin = place.pins?.[region.mapId];
    return !!pin && shape.points.length >= 3 && pointInPolygon(pin, shape.points);
  }
  const p = place.position;
  if (region.mapId !== STARMAP_ID || !p) return false;
  if (shape.type === 'slice') {
    const distance = Math.hypot(p[0], p[2]);
    return distance >= shape.inner && distance <= shape.outer && withinAngles(angleOf(p[0], p[2]), shape.from, shape.to);
  }
  return Math.hypot(p[0] - shape.center[0], p[1] - shape.center[1], p[2] - shape.center[2]) <= shape.radius;
}

/** The places inside a region, by name. */
export const placesIn = (region: Region, places: Place[]) =>
  places.filter((p) => contains(region, p)).sort((a, b) => a.name.localeCompare(b.name));

/** The regions a place is inside, on any map. */
export const regionsWith = (place: Place, regions: Region[]) => regions.filter((r) => contains(r, place));

/** The regions drawn on one map. */
export const regionsOn = (mapId: string, regions: Region[] = []) => regions.filter((r) => r.mapId === mapId);

/**
 * The middle of a polygon, for its label: the centre of its area, which
 * sits better than the average of its corners when corners bunch up.
 */
export function centroid(points: Point[]): Point {
  if (points.length === 0) return [0.5, 0.5];
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const cross = points[j][0] * points[i][1] - points[i][0] * points[j][1];
    area += cross;
    cx += (points[j][0] + points[i][0]) * cross;
    cy += (points[j][1] + points[i][1]) * cross;
  }
  if (Math.abs(area) < 1e-9) {
    // A line or a point: the average will do
    return [points.reduce((s, p) => s + p[0], 0) / points.length, points.reduce((s, p) => s + p[1], 0) / points.length];
  }
  return [cx / (3 * area), cy / (3 * area)];
}

/** Where a polygon region's name sits. */
export const labelPoint = (region: Region): Point =>
  region.labelAt ?? (region.shape.type === 'polygon' ? centroid(region.shape.points) : [0.5, 0.5]);

/** Where a starmap region's name floats: the middle of the slice, or above the cloud. */
export function starmapLabel(shape: RegionShape): [number, number, number] {
  if (shape.type === 'cloud') return [shape.center[0], shape.center[1] + shape.radius * 0.6, shape.center[2]];
  if (shape.type === 'slice') {
    const mid = ((shape.from + sweep(shape.from, shape.to) / 2) * Math.PI) / 180;
    const r = (shape.inner + shape.outer) / 2;
    return [Math.cos(mid) * r, 2, -Math.sin(mid) * r];
  }
  return [0, 0, 0];
}

/** A shape that can be drawn on a map of that kind, for a new region. */
export function blankShape(mapId: string, galaxyRadius = 100): RegionShape {
  return mapId === STARMAP_ID
    ? { type: 'slice', from: 0, to: 90, inner: Math.round(galaxyRadius * 0.3), outer: Math.round(galaxyRadius * 0.9) }
    : { type: 'polygon', points: [] };
}

/** Is the shape complete enough to draw? (A polygon needs three corners.) */
export const isDrawable = (shape: RegionShape) => shape.type !== 'polygon' || shape.points.length >= 3;

/** A one-line description of the shape, for lists. */
export function describeShape(shape: RegionShape): string {
  if (shape.type === 'polygon') return `${shape.points.length} corners`;
  if (shape.type === 'cloud') return `Cloud, radius ${shape.radius}`;
  return `Slice ${Math.round(shape.from)}°–${Math.round(shape.to)}°`;
}

/** How many regions each map has, for delete warnings. */
export const regionCount = (t: Pick<Timeline, 'regions'>, mapId: string) => regionsOn(mapId, t.regions).length;

/** A region ready to draw on a map: its colour worked out, its label placed. */
export interface RegionView {
  id: string;
  name: string;
  color: string;
  fill: number;
  shape: RegionShape;
  /** Polygons: where the name sits, as fractions. */
  label: Point;
}

/** The regions on a map, ready to draw. `accent` is the colour for ones with no colour or faction. */
export function regionViews(mapId: string, t: Pick<Timeline, 'regions' | 'factions'>, accent: string): RegionView[] {
  return regionsOn(mapId, t.regions).map((r) => ({
    id: r.id,
    name: r.name,
    color: regionColor(r, t.factions, accent),
    fill: r.fill,
    shape: r.shape,
    label: labelPoint(r),
  }));
}

/** The topmost polygon region under a point (fractions), for clicks on a globe. */
export function regionAt(point: Point, regions: RegionView[]): RegionView | undefined {
  return [...regions].reverse().find((r) => r.shape.type === 'polygon' && r.shape.points.length >= 3 && pointInPolygon(point, r.shape.points));
}
