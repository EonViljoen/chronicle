import { Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Timeline } from '../../types/timeline';
import { allMaps, childMapAt, indentMapLabel, mapAncestry, mapTree, placesOpeningMaps } from '../../lib/maps';
import { regionViews } from '../../lib/regions';
import { useThemePalette } from '../../themes/palette';
import { GalaxyMap, PlanetMap } from './LazyGalaxyMap';
import FlatMap from './FlatMap';

/*
 * Shows one of the timeline's maps (the 3D starmap or a flat map), with:
 * - breadcrumbs back up through the maps it sits inside (Starmap › Sector)
 * - a picker to jump to any map
 * - a button to show or hide the map's regions (remembered per browser)
 * Clicking a place that opens a map goes into that map; clicking any other
 * place selects it. Clicking a region selects it (or, with no
 * `onSelectRegion`, opens its page). Which map is shown is the parent's state (`mapId`).
 */

const REGIONS_KEY = 'chronicle.showRegions';
const readShowRegions = () => {
  try {
    return localStorage.getItem(REGIONS_KEY) !== 'off';
  } catch {
    return true;
  }
};

interface Props {
  timeline: Timeline;
  mapId: string;
  onMapChange: (id: string) => void;
  selectedPlaceId?: string | null;
  highlightIds?: string[];
  onSelectPlace?: (id: string) => void;
  selectedRegionId?: string | null;
  onSelectRegion?: (id: string) => void;
}

export default function TimelineMap({ timeline, mapId, onMapChange, selectedPlaceId, highlightIds, onSelectPlace, selectedRegionId, onSelectRegion }: Props) {
  const navigate = useNavigate();
  const palette = useThemePalette();
  const [showRegions, setShowRegions] = useState(readShowRegions);
  const maps = allMaps(timeline);
  const current = maps.find((m) => m.id === mapId);
  if (!current) return null;

  const allRegions = regionViews(current.id, timeline, palette.accent);
  const regions = showRegions ? allRegions : [];
  const toggleRegions = () => {
    setShowRegions(!showRegions);
    try {
      localStorage.setItem(REGIONS_KEY, showRegions ? 'off' : 'on');
    } catch {
      // Storage blocked: it just isn't remembered
    }
  };
  const selectRegion = onSelectRegion ?? ((id: string) => navigate(`/t/${timeline.id}/regions/${encodeURIComponent(id)}`));

  const trail = mapAncestry(current.id, maps);
  const openIds = placesOpeningMaps(current.id, maps);
  // A place that opens a map goes into it; any other is selected
  const clickPlace = (placeId: string) => {
    const child = childMapAt(current.id, placeId, maps);
    if (child) onMapChange(child.id);
    else onSelectPlace?.(placeId);
  };
  const shared = { places: timeline.places, selectedPlaceId, highlightIds, openIds, onSelectPlace: clickPlace, regions, selectedRegionId, onSelectRegion: selectRegion };
  const planet = current.flat?.kind === 'planet' ? current.flat : undefined;

  return (
    <>
      {current.kind === '3d' && timeline.map.type === 'galaxy3d' && (
        <Suspense fallback={<p className="map-loading">Loading the map…</p>}>
          <GalaxyMap config={timeline.map} {...shared} />
        </Suspense>
      )}
      {/* key: a different map starts at its own "fit" view */}
      {current.flat && !planet && <FlatMap key={current.id} map={current.flat} {...shared} />}
      {planet && (
        <Suspense fallback={<p className="map-loading">Loading the planet…</p>}>
          <PlanetMap key={current.id} map={planet} {...shared} />
        </Suspense>
      )}

      {(trail.length > 1 || maps.length > 1 || allRegions.length > 0) && (
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
          {allRegions.length > 0 && (
            <button type="button" className={`btn map-regions-toggle${showRegions ? ' is-on' : ''}`} aria-pressed={showRegions} onClick={toggleRegions}>
              Regions
            </button>
          )}
        </div>
      )}
    </>
  );
}
