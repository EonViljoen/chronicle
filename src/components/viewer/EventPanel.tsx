import { Link } from 'react-router-dom';
import type { Timeline, TimelineEvent } from '../../types/timeline';
import { eraFor } from '../../lib/eras';
import { formatDate } from '../../lib/dates';
import { mainFactionOf } from '../../lib/factions';
import { EditOnly } from '../EditOnly';
import RichText from '../RichText';
import { CharacterChip, FactionChip, PlaceChip } from '../history/Chips';

interface Props {
  timeline: Timeline;
  event: TimelineEvent;
  onSelect: (id: string) => void;
  onClose: () => void;
}

/** The info box for the selected event. */
export default function EventPanel({ timeline, event, onSelect, onClose }: Props) {
  const era = eraFor(event.date.sortKey, timeline.eras);
  // The main faction first, marked with a star
  const mainId = mainFactionOf(event);
  const factions = timeline.factions
    .filter((c) => event.factionIds.includes(c.id))
    .sort((a, b) => Number(b.id === mainId) - Number(a.id === mainId));
  const places = timeline.places.filter((p) => event.placeIds.includes(p.id));
  const characters = timeline.characters.filter((c) => event.characterIds.includes(c.id));
  // Skip related ids that point at deleted events
  const related = event.relatedIds
    .map((id) => timeline.events.find((e) => e.id === id))
    .filter((e): e is TimelineEvent => e !== undefined);

  return (
    // `key` on the panel (set by the parent) resets the fade-in for each event
    <article className="event-panel" aria-live="polite" style={era ? { borderTopColor: era.color } : undefined}>
      <header className="event-panel-head">
        <div>
          <p className="event-panel-date">
            {formatDate(event.date, timeline.calendar)}
            {era && <span className="muted"> · {era.name}</span>}
          </p>
          <h2 className="event-panel-title">{event.title}</h2>
        </div>
        <div className="event-panel-actions">
          <EditOnly>
            <Link className="btn" to={`/t/${timeline.id}/edit?tab=events&item=${event.id}`}>Edit</Link>
          </EditOnly>
          <button className="btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
      </header>

      {/* Each chip opens that faction's, place's or character's page */}
      {(factions.length > 0 || places.length > 0) && (
        <div className="chips">
          {factions.map((c) => <FactionChip key={c.id} timeline={timeline} faction={c} main={c.id === mainId} />)}
          {places.map((p) => <PlaceChip key={p.id} timeline={timeline} place={p} />)}
        </div>
      )}
      {characters.length > 0 && (
        <div className="chips">
          {characters.map((c) => <CharacterChip key={c.id} timeline={timeline} character={c} />)}
        </div>
      )}

      {event.imageUrl && <img className="event-panel-image" src={event.imageUrl} alt="" />}

      <div className="prose">
        {/* [[Links]] to other events select them here, without leaving the viewer */}
        {event.body ? <RichText text={event.body} timeline={timeline} onEventLink={onSelect} /> : <p className="muted">{event.summary || 'No details yet.'}</p>}
      </div>

      {related.length > 0 && (
        <section className="event-panel-section">
          <h3>Related</h3>
          <div className="chips">
            {related.map((r) => (
              <button key={r.id} className="chip chip-link" onClick={() => onSelect(r.id)}>
                {formatDate(r.date, timeline.calendar)} · {r.title}
              </button>
            ))}
          </div>
        </section>
      )}

      {event.sources.length > 0 && (
        <section className="event-panel-section">
          <h3>Sources</h3>
          <ul className="sources">
            {event.sources.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
