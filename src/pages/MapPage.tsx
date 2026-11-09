import { Link, useSearchParams } from 'react-router-dom';
import type { Timeline } from '../types/timeline';
import TimelineGate from '../components/TimelineGate';
import { EditOnly } from '../components/EditOnly';
import TimelineMap from '../components/map/TimelineMap';
import { isOnMap, useMapKind } from '../components/map/mapKinds';
import { compareEvents, formatDate } from '../lib/dates';

export default function MapPage() {
  return <TimelineGate>{(timeline) => <StarMap timeline={timeline} />}</TimelineGate>;
}

function StarMap({ timeline }: { timeline: Timeline }) {
  const [params, setParams] = useSearchParams();
  const placeId = params.get('place');
  const select = (id: string | null) => setParams(id ? { place: id } : {}, { replace: true });

  const { kind, kinds, setKind } = useMapKind(timeline);
  // The places on the map being shown
  const placed = timeline.places.filter((p) => kind && isOnMap(p, kind)).sort((a, b) => a.name.localeCompare(b.name));
  const selected = placed.find((p) => p.id === placeId);
  const events = selected
    ? timeline.events.filter((e) => e.placeIds.includes(selected.id)).sort(compareEvents)
    : [];

  return (
    <div className="page map-page">
      <div className="page-head">
        <h1>{timeline.title}</h1>
        <div className="page-head-actions">
          <Link className="btn" to={`/t/${timeline.id}`}>Timeline</Link>
          <EditOnly>
            <Link className="btn" to={`/t/${timeline.id}/edit?tab=places`}>Edit places</Link>
          </EditOnly>
        </div>
      </div>

      {!kind ? (
        <div className="empty">
          <p>This timeline doesn't have a map.</p>
          <EditOnly>
            <Link className="btn" to={`/t/${timeline.id}/edit?tab=settings`}>Turn one on in Settings</Link>
          </EditOnly>
        </div>
      ) : (
        <div className="map-stage">
          <TimelineMap timeline={timeline} kind={kind} kinds={kinds} onKindChange={setKind} selectedPlaceId={selected?.id ?? null} onSelectPlace={select} />

          <aside className="map-panel" aria-live="polite">
            {selected ? (
              <>
                <button className="link-btn muted" onClick={() => select(null)}>← All places</button>
                <h2 className="map-panel-title">{selected.name}</h2>
                {selected.description && <p className="map-panel-desc">{selected.description}</p>}
                <h3 className="map-panel-sub">Events here</h3>
                {events.length === 0 ? (
                  <p className="muted">No events linked to this place yet.</p>
                ) : (
                  <ul className="map-events">
                    {events.map((e) => (
                      <li key={e.id}>
                        <Link to={`/t/${timeline.id}?event=${e.id}`}>
                          <span className="map-event-date">{formatDate(e.date, timeline.calendar)}</span> {e.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <>
                <h2 className="map-panel-title">Places</h2>
                {placed.length === 0 ? (
                  <p className="muted">
                    Nothing on this map yet. Add places in the editor and click the map to position them.
                  </p>
                ) : (
                  <ul className="rows">
                    {placed.map((p) => (
                      <li key={p.id}>
                        <button className="row" onClick={() => select(p.id)}>
                          <span className="row-main">{p.name}</span>
                          <span className="row-meta">{timeline.events.filter((e) => e.placeIds.includes(p.id)).length}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="map-help muted">Drag to rotate · scroll or pinch to zoom · right-drag to pan</p>
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
