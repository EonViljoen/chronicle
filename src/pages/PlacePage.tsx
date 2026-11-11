import { Link, useParams } from 'react-router-dom';
import type { Timeline } from '../types/timeline';
import TimelineGate from '../components/TimelineGate';
import RichText from '../components/RichText';
import HistoryHead from '../components/history/HistoryHead';
import HistoryMap from '../components/history/HistoryMap';
import Chronology from '../components/history/Chronology';
import { eventEntries } from '../components/history/entries';
import { CharacterChip, FactionChip, MissingItem } from '../components/history/Chips';
import { charactersIn } from '../lib/characters';
import { compareEvents } from '../lib/dates';
import { allMaps, mapPath } from '../lib/maps';

export default function PlacePage() {
  return <TimelineGate>{(timeline) => <PlaceView timeline={timeline} />}</TimelineGate>;
}

/** A place's history: every event there in order, who was there, and its maps. */
function PlaceView({ timeline }: { timeline: Timeline }) {
  const { itemId } = useParams();
  const place = timeline.places.find((p) => p.id === itemId);
  if (!place) return <MissingItem timeline={timeline} kind="place" />;

  const events = timeline.events.filter((e) => e.placeIds.includes(place.id)).sort(compareEvents);
  const people = charactersIn(events, timeline.characters);
  const factionIds = new Set(events.flatMap((e) => e.factionIds));
  const factions = timeline.factions.filter((f) => factionIds.has(f.id)).sort((a, b) => a.name.localeCompare(b.name));
  // Maps opened by clicking this place
  const maps = allMaps(timeline);
  const opens = timeline.maps.filter((m) => m.placeId === place.id);

  return (
    <div className="page history-page">
      <HistoryHead timeline={timeline} kind="Place" title={place.name} editSearch={`?tab=places&item=${encodeURIComponent(place.id)}`}>
        {opens.length > 0 && (
          <p className="history-life">
            Opens{' '}
            {opens.map((m, i) => (
              <span key={m.id}>
                {i > 0 && ', '}
                <Link to={`/t/${timeline.id}/map?map=${encodeURIComponent(m.id)}`} title={mapPath(m.id, maps)}>{m.name} ↘</Link>
              </span>
            ))}
          </p>
        )}
      </HistoryHead>

      <div className="history-columns">
        <div className="history-main">
          {place.description && (
            <div className="prose history-section">
              <RichText text={place.description} timeline={timeline} />
            </div>
          )}
          <section className="history-section">
            <h2 className="history-heading">History</h2>
            <Chronology entries={eventEntries(events, timeline)} eras={timeline.eras} empty="No events here yet." />
          </section>
        </div>

        <aside className="history-side">
          {people.length > 0 && (
            <section className="history-section">
              <h2 className="history-heading">People here</h2>
              <div className="chips">
                {people.map((c) => <CharacterChip key={c.id} timeline={timeline} character={c} />)}
              </div>
            </section>
          )}
          {factions.length > 0 && (
            <section className="history-section">
              <h2 className="history-heading">Factions here</h2>
              <div className="chips">
                {factions.map((f) => <FactionChip key={f.id} timeline={timeline} faction={f} />)}
              </div>
            </section>
          )}
        </aside>
      </div>

      <HistoryMap timeline={timeline} placeIds={[place.id]} selectedPlaceId={place.id} />
    </div>
  );
}
