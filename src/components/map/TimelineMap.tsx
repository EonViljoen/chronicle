import { Suspense } from 'react';
import type { Timeline } from '../../types/timeline';
import type { MapKind } from './mapKinds';
import { GalaxyMap } from './LazyGalaxyMap';
import FlatMap from './FlatMap';

/*
 * A timeline can have two maps: the 3D starmap and a flat image map. This
 * shows whichever one is chosen, with a switch when both exist. The choice
 * is remembered in this browser (usePref).
 */

interface Props {
  timeline: Timeline;
  kind: MapKind;
  kinds: MapKind[];
  onKindChange: (kind: MapKind) => void;
  selectedPlaceId?: string | null;
  highlightIds?: string[];
  onSelectPlace?: (id: string) => void;
}

const LABELS: Record<MapKind, string> = { '3d': 'Starmap', flat: 'Map' };

export default function TimelineMap({ timeline, kind, kinds, onKindChange, selectedPlaceId, highlightIds, onSelectPlace }: Props) {
  const map = timeline.map;
  return (
    <>
      {kind === '3d' && map.type === 'galaxy3d' && (
        <Suspense fallback={<p className="map-loading">Loading the map…</p>}>
          <GalaxyMap config={map} places={timeline.places} selectedPlaceId={selectedPlaceId} highlightIds={highlightIds} onSelectPlace={onSelectPlace} />
        </Suspense>
      )}
      {kind === 'flat' && timeline.flatMap && (
        <FlatMap map={timeline.flatMap} places={timeline.places} selectedPlaceId={selectedPlaceId} highlightIds={highlightIds} onSelectPlace={onSelectPlace} />
      )}
      {kinds.length > 1 && (
        <div className="map-kind map-switch" role="group" aria-label="Which map">
          {kinds.map((k) => (
            <button key={k} type="button" aria-pressed={k === kind} onClick={() => onKindChange(k)}>
              {LABELS[k]}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
