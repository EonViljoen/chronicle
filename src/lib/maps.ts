import { STARMAP_ID, type FlatMap, type Place, type Timeline } from '../types/timeline';

/*
 * A timeline's maps: the optional 3D starmap plus any number of flat image
 * maps. These helpers treat them all alike as "map entries", so the viewer,
 * map page and editor don't need to care which kind a map is.
 *
 * Maps nest like factions (see lib/factions.ts): they're stored as a flat
 * list where each may point at the map it sits inside (`parentId`) and the
 * place there that opens it (`placeId`). A missing parent, or a loop from a
 * hand-edited file, counts as top level, so nothing disappears or loops.
 */

/** One map, whichever kind it is. */
export interface MapEntry {
  id: string;
  name: string;
  kind: '3d' | 'flat';
  parentId?: string;
  placeId?: string;
  /** Set for flat maps. */
  flat?: FlatMap;
}

/** Every map: the starmap first (if it's on), then the flat maps in their saved order. */
export function allMaps(t: Pick<Timeline, 'map' | 'maps'>): MapEntry[] {
  const entries: MapEntry[] = [];
  if (t.map.type === 'galaxy3d') entries.push({ id: STARMAP_ID, name: 'Starmap', kind: '3d' });
  for (const m of t.maps) entries.push({ id: m.id, name: m.name, kind: 'flat', parentId: m.parentId, placeId: m.placeId, flat: m });
  return entries;
}

/** Is the place positioned on that map? */
export function isPlacedOn(place: Place, mapId: string): boolean {
  return mapId === STARMAP_ID ? !!place.position : !!place.pins?.[mapId];
}

/** The ids of every map the place is on, in map order. */
export const mapsWithPlace = (place: Place, maps: MapEntry[]) => maps.filter((m) => isPlacedOn(place, m.id)).map((m) => m.id);

/** A map's parent entry, if it exists and isn't the map itself. */
function parentOf(map: MapEntry, byId: Map<string, MapEntry>): MapEntry | undefined {
  return map.parentId && map.parentId !== map.id ? byId.get(map.parentId) : undefined;
}

/** The chain from the top down to this map, for breadcrumbs: [Starmap, Sector, Planet]. */
export function mapAncestry(id: string, maps: MapEntry[]): MapEntry[] {
  const byId = new Map(maps.map((m) => [m.id, m]));
  const chain: MapEntry[] = [];
  const seen = new Set<string>(); // guards against loops
  for (let m = byId.get(id); m && !seen.has(m.id); m = parentOf(m, byId)) {
    seen.add(m.id);
    chain.unshift(m);
  }
  return chain;
}

/** Is the map at the top level? (No parent, or one that's missing or loops back.) */
function isRoot(map: MapEntry, byId: Map<string, MapEntry>): boolean {
  const seen = new Set<string>([map.id]);
  for (let p = parentOf(map, byId); p; p = parentOf(p, byId)) {
    if (seen.has(p.id)) return true;
    seen.add(p.id);
  }
  return !parentOf(map, byId);
}

export interface MapRow {
  map: MapEntry;
  /** 0 for top level, 1 for maps inside those, … */
  depth: number;
}

/** Every map in tree order: each one followed by the maps inside it, keeping the saved order. */
export function mapTree(maps: MapEntry[]): MapRow[] {
  const byId = new Map(maps.map((m) => [m.id, m]));
  const children = new Map<string, MapEntry[]>();
  for (const m of maps) {
    if (!isRoot(m, byId) && m.parentId) children.set(m.parentId, [...(children.get(m.parentId) ?? []), m]);
  }
  const rows: MapRow[] = [];
  const visit = (m: MapEntry, depth: number) => {
    rows.push({ map: m, depth });
    for (const child of children.get(m.id) ?? []) visit(child, depth + 1);
  };
  maps.filter((m) => isRoot(m, byId)).forEach((m) => visit(m, 0));
  return rows;
}

/** A map and every map inside it, at any depth: the ones it can't be moved into. */
export function mapWithDescendants(id: string, maps: MapEntry[]): Set<string> {
  const result = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const m of maps) {
      if (m.parentId && result.has(m.parentId) && !result.has(m.id)) {
        result.add(m.id);
        grew = true;
      }
    }
  }
  return result;
}

/**
 * The map a place opens when clicked on `mapId`, if any. A child map only
 * counts while its place is still on the parent map.
 */
export function childMapAt(mapId: string, placeId: string, maps: MapEntry[]): MapEntry | undefined {
  return maps.find((m) => m.parentId === mapId && m.placeId === placeId && m.id !== mapId);
}

/** Places on `mapId` that open another map: they get a marker on their pin. */
export function placesOpeningMaps(mapId: string, maps: MapEntry[]): string[] {
  return maps.filter((m) => m.parentId === mapId && m.placeId && m.id !== mapId).map((m) => m.placeId!);
}

/** Where the viewer and map page start: the chosen master map, else the first top-level map. */
export function masterMapId(t: Pick<Timeline, 'map' | 'maps' | 'masterMapId'>): string | undefined {
  const maps = allMaps(t);
  if (t.masterMapId && maps.some((m) => m.id === t.masterMapId)) return t.masterMapId;
  return mapTree(maps)[0]?.map.id;
}

/** "Starmap › Sector › Planet" */
export const mapPath = (id: string, maps: MapEntry[]) =>
  mapAncestry(id, maps)
    .map((m) => m.name)
    .join(' › ');

/** Indents a map's name for a <select> option, since options can't be styled. */
export const indentMapLabel = (row: MapRow) => `${'   '.repeat(row.depth)}${row.depth ? '└ ' : ''}${row.map.name}`;
