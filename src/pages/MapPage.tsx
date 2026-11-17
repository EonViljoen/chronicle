import { Link, useSearchParams } from 'react-router-dom';
import type { Timeline } from '../types/timeline';
import TimelineGate from '../components/TimelineGate';
import { EditOnly } from '../components/EditOnly';
import TimelineMap from '../components/map/TimelineMap';
import RichText from '../components/RichText';
import { allMaps, childMapAt, isPlacedOn, mapTree, masterMapId } from '../lib/maps';
import { compareEvents, formatSpan } from '../lib/dates';
import { placesIn, regionColor, regionsOn } from '../lib/regions';

export default function MapPage() {
  return <TimelineGate>{(timeline) => <MapView timeline={timeline} />}</TimelineGate>;
}

/**
 * One map at a time, full size, with a panel listing its places and
 * regions. The map and selected place or region live in the URL
 * (?map=…&place=… or &region=…), so links can open a place on the right map
 * and the back button steps back through maps.
 */
function MapView({ timeline }: { timeline: Timeline }) {
  const [params, setParams] = useSearchParams();
  const maps = allMaps(timeline);
  const placeId = params.get('place');
  const linkedPlace = timeline.places.find((p) => p.id === placeId);
  const linkedRegion = timeline.regions.find((r) => r.id === params.get('region'));

  // The map: the one in the URL; else, for a linked place, a map it's on
  // (the master map first); else the master map
  const fromUrl = maps.find((m) => m.id === (params.get('map') ?? linkedRegion?.mapId))?.id;
  const order = [masterMapId(timeline), ...mapTree(maps).map((r) => r.map.id)];
  const forPlace = linkedPlace && order.find((id) => id && isPlacedOn(linkedPlace, id));
  const mapId = fromUrl ?? forPlace ?? masterMapId(timeline);

  const go = (map: string | undefined, place: string | null, region: string | null = null) => {
    const next = new URLSearchParams();
    if (map) next.set('map', map);
    if (place) next.set('place', place);
    if (region) next.set('region', region);
    setParams(next);
  };
  const select = (id: string | null) => go(mapId, id);
  const selectRegion = (id: string | null) => go(mapId, null, id);

  // The places on the map being shown
  const placed = timeline.places.filter((p) => mapId && isPlacedOn(p, mapId)).sort((a, b) => a.name.localeCompare(b.name));
  const selected = placed.find((p) => p.id === placeId);
  const regions = mapId ? regionsOn(mapId, timeline.regions).sort((a, b) => a.name.localeCompare(b.name)) : [];
  const region = !selected ? regions.find((r) => r.id === linkedRegion?.id) : undefined;
  const regionPlaces = region ? placesIn(region, timeline.places) : [];
  const events = selected
    ? timeline.events.filter((e) => e.placeIds.includes(selected.id)).sort(compareEvents)
    : region
      ? timeline.events.filter((e) => e.placeIds.some((id) => regionPlaces.some((p) => p.id === id))).sort(compareEvents)
      : [];
  const regionFaction = timeline.factions.find((f) => f.id === region?.factionId);
  const shown = maps.find((m) => m.id === mapId);
  const help = shown?.flat?.kind === 'planet'
    ? 'Drag to turn the planet · scroll or pinch to zoom'
    : shown?.kind === '3d'
      ? 'Drag to rotate · scroll or pinch to zoom · right-drag to pan'
      : 'Drag to move · scroll to zoom';

  return (
    <div className="page map-page">
      <div className="page-head">
        <h1>{timeline.title}</h1>
        <div className="page-head-actions">
          <Link className="btn" to={`/t/${timeline.id}`}>Timeline</Link>
          <EditOnly>
            <Link className="btn" to={`/t/${timeline.id}/edit?tab=maps`}>Edit maps</Link>
          </EditOnly>
        </div>
      </div>

      {!mapId ? (
        <div className="empty">
          <p>This timeline doesn't have a map.</p>
          <EditOnly>
            <Link className="btn" to={`/t/${timeline.id}/edit?tab=maps`}>Add one in the Maps tab</Link>
          </EditOnly>
        </div>
      ) : (
        <div className="map-stage">
          <TimelineMap
            timeline={timeline}
            mapId={mapId}
            onMapChange={(id) => go(id, null)}
            selectedPlaceId={selected?.id ?? null}
            onSelectPlace={select}
            selectedRegionId={region?.id ?? null}
            onSelectRegion={selectRegion}
          />

          <aside className="map-panel" aria-live="polite">
            {selected ? (
              <>
                <button className="link-btn muted" onClick={() => select(null)}>← All places</button>
                <h2 className="map-panel-title">{selected.name}</h2>
                {selected.description && (
                  <div className="map-panel-desc prose">
                    <RichText text={selected.description} timeline={timeline} />
                  </div>
                )}
                <Link className="map-panel-more" to={`/t/${timeline.id}/places/${encodeURIComponent(selected.id)}`}>Its history and people →</Link>
                <h3 className="map-panel-sub">Events here</h3>
                {events.length === 0 ? (
                  <p className="muted">No events linked to this place yet.</p>
                ) : (
                  <ul className="map-events">
                    {events.map((e) => (
                      <li key={e.id}>
                        <Link to={`/t/${timeline.id}?event=${e.id}`}>
                          <span className="map-event-date">{formatSpan(e, timeline.calendar)}</span> {e.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : region ? (
              <>
                <button className="link-btn muted" onClick={() => selectRegion(null)}>← All places</button>
                <h2 className="map-panel-title">
                  <span className="swatch" style={{ background: regionColor(region, timeline.factions, 'var(--accent)') }} /> {region.name}
                </h2>
                {regionFaction && (
                  <p className="muted">
                    Held by <Link to={`/t/${timeline.id}/factions/${encodeURIComponent(regionFaction.id)}`}>{regionFaction.name}</Link>
                  </p>
                )}
                {region.description && (
                  <div className="map-panel-desc prose">
                    <RichText text={region.description} timeline={timeline} />
                  </div>
                )}
                <Link className="map-panel-more" to={`/t/${timeline.id}/regions/${encodeURIComponent(region.id)}`}>Its history →</Link>
                <h3 className="map-panel-sub">Places inside</h3>
                {regionPlaces.length === 0 ? (
                  <p className="muted">No places are pinned inside it.</p>
                ) : (
                  <ul className="rows">
                    {regionPlaces.map((p) => (
                      <li key={p.id}>
                        <button className="row" onClick={() => select(p.id)}>
                          <span className="row-main">{p.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <h3 className="map-panel-sub">Events there</h3>
                {events.length === 0 ? (
                  <p className="muted">No events at its places yet.</p>
                ) : (
                  <ul className="map-events">
                    {events.map((e) => (
                      <li key={e.id}>
                        <Link to={`/t/${timeline.id}?event=${e.id}`}>
                          <span className="map-event-date">{formatSpan(e, timeline.calendar)}</span> {e.title}
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
                    {placed.map((p) => {
                      // A place that opens another map goes into it, like clicking its pin
                      const child = childMapAt(mapId, p.id, maps);
                      return (
                        <li key={p.id}>
                          <button className="row" onClick={() => (child ? go(child.id, null) : select(p.id))}>
                            <span className="row-main">{p.name}</span>
                            <span className="row-meta">
                              {child ? `↘ ${child.name}` : timeline.events.filter((e) => e.placeIds.includes(p.id)).length}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {regions.length > 0 && (
                  <>
                    <h3 className="map-panel-sub">Regions</h3>
                    <ul className="rows">
                      {regions.map((r) => (
                        <li key={r.id}>
                          <button className="row" onClick={() => selectRegion(r.id)}>
                            <span className="swatch" style={{ background: regionColor(r, timeline.factions, 'var(--accent)') }} />
                            <span className="row-main">{r.name}</span>
                            <span className="row-meta">{placesIn(r, timeline.places).length}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <p className="map-help muted">{help}</p>
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
