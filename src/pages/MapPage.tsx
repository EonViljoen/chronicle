import { Suspense } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Timeline } from '../types/timeline';
import TimelineGate from '../components/TimelineGate';
import { GalaxyMap } from '../components/map/LazyGalaxyMap';
import { compareEvents } from '../lib/dates';

export default function MapPage() {
  return <TimelineGate>{(timeline) => <StarMap timeline={timeline} />}</TimelineGate>;
}

function StarMap({ timeline }: { timeline: Timeline }) {
  const [params, setParams] = useSearchParams();
  const placeId = params.get('place');
  const select = (id: string | null) => setParams(id ? { place: id } : {}, { replace: true });

  const map = timeline.map;
  const placed = timeline.places.filter((p) => p.position).sort((a, b) => a.name.localeCompare(b.name));
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
          <Link className="btn" to={`/t/${timeline.id}/edit?tab=places`}>Edit places</Link>
        </div>
      </div>

      {map.type !== 'galaxy3d' ? (
        <div className="empty">
          <p>This timeline doesn't have a map.</p>
          <Link className="btn" to={`/t/${timeline.id}/edit?tab=settings`}>Turn one on in Settings</Link>
        </div>
      ) : (
        <div className="map-stage">
          <Suspense fallback={<p className="map-loading">Loading the map…</p>}>
            <GalaxyMap config={map} places={timeline.places} selectedPlaceId={selected?.id ?? null} onSelectPlace={select} />
          </Suspense>

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
                          <span className="map-event-date">{e.date.display}</span> {e.title}
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
                    Nothing on the map yet. Add places in the editor and click the galaxy to position them.
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
