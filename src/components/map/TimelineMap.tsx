import { Suspense } from 'react';
import type { Timeline } from '../../types/timeline';
import { allMaps, childMapAt, indentMapLabel, mapAncestry, mapTree, placesOpeningMaps } from '../../lib/maps';
import { GalaxyMap } from './LazyGalaxyMap';
import FlatMap from './FlatMap';

/*
 * Shows one of the timeline's maps (the 3D starmap or a flat map), with:
 * - breadcrumbs back up through the maps it sits inside (Starmap › Sector)
 * - a picker to jump to any map
 * Clicking a place that opens a map goes into that map; clicking any other
 * place selects it. Which map is shown is the parent's state (`mapId`).
 */

interface Props {
  timeline: Timeline;
  mapId: string;
  onMapChange: (id: string) => void;
  selectedPlaceId?: string | null;
  highlightIds?: string[];
  onSelectPlace?: (id: string) => void;
}

export default function TimelineMap({ timeline, mapId, onMapChange, selectedPlaceId, highlightIds, onSelectPlace }: Props) {
  const maps = allMaps(timeline);
  const current = maps.find((m) => m.id === mapId);
  if (!current) return null;

  const trail = mapAncestry(current.id, maps);
  const openIds = placesOpeningMaps(current.id, maps);
  // A place that opens a map goes into it; any other is selected
  const clickPlace = (placeId: string) => {
    const child = childMapAt(current.id, placeId, maps);
    if (child) onMapChange(child.id);
    else onSelectPlace?.(placeId);
  };
  const shared = { places: timeline.places, selectedPlaceId, highlightIds, openIds, onSelectPlace: clickPlace };

  return (
    <>
      {current.kind === '3d' && timeline.map.type === 'galaxy3d' && (
        <Suspense fallback={<p className="map-loading">Loading the map…</p>}>
          <GalaxyMap config={timeline.map} {...shared} />
        </Suspense>
      )}
      {/* key: a different map starts at its own "fit" view */}
      {current.flat && <FlatMap key={current.id} map={current.flat} {...shared} />}

      {(trail.length > 1 || maps.length > 1) && (
        <div className="map-nav">
          {trail.length > 1 && (
            <nav className="map-trail" aria-label="Maps this one is inside">
              {trail.map((m, i) =>
                i < trail.length - 1 ? (
                  <span key={m.id}>
                    <button type="button" className="map-trail-link" onClick={() => onMapChange(m.id)}>{m.name}</button>
                    <span aria-hidden="true"> › </span>
                  </span>
                ) : (
                  <span key={m.id} className="map-trail-current" aria-current="page">{m.name}</span>
                ),
              )}
            </nav>
          )}
          {maps.length > 1 && (
            <select className="map-picker-select" value={current.id} aria-label="Show map" onChange={(e) => onMapChange(e.target.value)}>
              {mapTree(maps).map((row) => (
                <option key={row.map.id} value={row.map.id}>{indentMapLabel(row)}</option>
              ))}
            </select>
          )}
        </div>
      )}
    </>
  );
}
