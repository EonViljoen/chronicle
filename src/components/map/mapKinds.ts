import type { Place, Timeline } from '../../types/timeline';
import { usePref } from '../../lib/prefs';

/* Helpers for timelines with two maps; see TimelineMap.tsx. */

export type MapKind = '3d' | 'flat';

/** Which maps this timeline has. */
export function mapKinds(timeline: Timeline): MapKind[] {
  const kinds: MapKind[] = [];
  if (timeline.map.type === 'galaxy3d') kinds.push('3d');
  if (timeline.flatMap) kinds.push('flat');
  return kinds;
}

/** Is the place positioned on that map? */
export const isOnMap = (place: Place, kind: MapKind) => (kind === '3d' ? !!place.position : !!place.pin);

/** The map kind to show, the kinds available, and a setter. */
export function useMapKind(timeline: Timeline) {
  const kinds = mapKinds(timeline);
  const [preferred, setKind] = usePref<MapKind>('map.kind', '3d');
  const kind: MapKind | undefined = kinds.includes(preferred) ? preferred : kinds[0];
  return { kind, kinds, setKind };
}
