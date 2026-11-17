import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Timeline } from '../types/timeline';
import TimelineGate from '../components/TimelineGate';
import RichText from '../components/RichText';
import HistoryHead from '../components/history/HistoryHead';
import MentionedIn from '../components/history/MentionedIn';
import Chronology from '../components/history/Chronology';
import { eventEntries } from '../components/history/entries';
import { CharacterChip, FactionChip, MissingItem, PlaceChip } from '../components/history/Chips';
import TimelineMap from '../components/map/TimelineMap';
import { charactersIn } from '../lib/characters';
import { compareEvents } from '../lib/dates';
import { allMaps, mapPath } from '../lib/maps';
import { placesIn, regionColor } from '../lib/regions';

export default function RegionPage() {
  return <TimelineGate>{(timeline) => <RegionView timeline={timeline} />}</TimelineGate>;
}

/**
 * A map region's page: who holds it, its description, the places inside it
 * (worked out from their pins), and the history of those places.
 */
function RegionView({ timeline }: { timeline: Timeline }) {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const region = timeline.regions.find((r) => r.id === itemId);
  const [mapId, setMapId] = useState<string>();
  if (!region) return <MissingItem timeline={timeline} kind="region" />;

  const maps = allMaps(timeline);
  const onMap = maps.find((m) => m.id === region.mapId);
  const places = placesIn(region, timeline.places);
  const placeIds = new Set(places.map((p) => p.id));
  const events = timeline.events.filter((e) => e.placeIds.some((id) => placeIds.has(id))).sort(compareEvents);
  const people = charactersIn(events, timeline.characters);
  const faction = timeline.factions.find((f) => f.id === region.factionId);
  const shownMap = mapId && maps.some((m) => m.id === mapId) ? mapId : onMap?.id;

  return (
    <div className="page history-page">
      <HistoryHead timeline={timeline} kind="Region" title={region.name} editSearch={`?tab=regions&item=${encodeURIComponent(region.id)}`}>
        <p className="history-life">
          <span className="swatch" style={{ background: regionColor(region, timeline.factions, 'var(--accent)') }} aria-hidden="true" />{' '}
          {onMap ? (
            <>
              On <Link to={`/t/${timeline.id}/map?map=${encodeURIComponent(onMap.id)}&region=${encodeURIComponent(region.id)}`}>{mapPath(onMap.id, maps)}</Link>
            </>
          ) : (
            'Its map is no longer shown'
          )}
        </p>
      </HistoryHead>

      <div className="history-columns">
        <div className="history-main">
          {region.description && (
            <div className="prose history-section">
              <RichText text={region.description} timeline={timeline} />
            </div>
          )}
          <section className="history-section">
            <h2 className="history-heading">History</h2>
            <Chronology entries={eventEntries(events, timeline)} eras={timeline.eras} empty="No events at its places yet." />
          </section>
        </div>

        <aside className="history-side">
          {faction && (
            <section className="history-section">
              <h2 className="history-heading">Held by</h2>
              <div className="chips">
                <FactionChip timeline={timeline} faction={faction} />
              </div>
            </section>
          )}
          <section className="history-section">
            <h2 className="history-heading">Places inside</h2>
            {places.length === 0 ? (
              <p className="muted">No places are pinned inside it.</p>
            ) : (
              <div className="chips">
                {places.map((p) => <PlaceChip key={p.id} timeline={timeline} place={p} />)}
              </div>
            )}
          </section>
          {people.length > 0 && (
            <section className="history-section">
              <h2 className="history-heading">People here</h2>
              <div className="chips">
                {people.map((c) => <CharacterChip key={c.id} timeline={timeline} character={c} />)}
              </div>
            </section>
          )}
          <MentionedIn timeline={timeline} kind="region" id={region.id} />
        </aside>
      </div>

      {shownMap && (
        <section className="history-section">
          <h2 className="history-heading">On the map</h2>
          <div className="history-map">
            <TimelineMap
              timeline={timeline}
              mapId={shownMap}
              onMapChange={setMapId}
              highlightIds={[...placeIds]}
              selectedRegionId={region.id}
              onSelectPlace={(id) => navigate(`/t/${timeline.id}/places/${encodeURIComponent(id)}`)}
            />
          </div>
        </section>
      )}
    </div>
  );
}
