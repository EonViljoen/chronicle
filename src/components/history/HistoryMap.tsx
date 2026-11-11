import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Timeline } from '../../types/timeline';
import { allMaps, isPlacedOn, mapTree, masterMapId } from '../../lib/maps';
import TimelineMap from '../map/TimelineMap';

interface Props {
  timeline: Timeline;
  /** The places to mark. */
  placeIds: string[];
  /** One of them to show as selected (a place's own page). */
  selectedPlaceId?: string;
}

/**
 * The maps on a place, faction or character page. It starts on the map
 * showing the most of `placeIds` (the start map wins a tie) and marks them;
 * the picker and breadcrumbs still reach every map. Clicking a place opens
 * its page. Shows nothing when none of the places are on a map.
 */
export default function HistoryMap({ timeline, placeIds, selectedPlaceId }: Props) {
  const navigate = useNavigate();
  const maps = allMaps(timeline);
  const places = timeline.places.filter((p) => placeIds.includes(p.id));
  const order = [...new Set([masterMapId(timeline), ...mapTree(maps).map((r) => r.map.id)])].filter((id): id is string => !!id);
  const count = (mapId: string) => places.filter((p) => isPlacedOn(p, mapId)).length;
  // The best map: the most places on it; earlier in `order` wins ties
  const best = order.reduce<string | undefined>((top, id) => (count(id) > (top ? count(top) : 0) ? id : top), undefined);
  const [chosen, setChosen] = useState<string>();
  const mapId = maps.some((m) => m.id === chosen) ? chosen : best;
  if (!mapId) return null;

  const on = maps.filter((m) => count(m.id) > 0).map((m) => m.name);
  return (
    <section className="history-section">
      <h2 className="history-heading">On the map</h2>
      <p className="muted history-sub">On {on.join(', ')}</p>
      <div className="history-map">
        <TimelineMap
          timeline={timeline}
          mapId={mapId}
          onMapChange={setChosen}
          selectedPlaceId={selectedPlaceId ?? null}
          highlightIds={placeIds}
          onSelectPlace={(id) => navigate(`/t/${timeline.id}/places/${encodeURIComponent(id)}`)}
        />
      </div>
    </section>
  );
}
