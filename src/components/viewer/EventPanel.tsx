import { Link } from 'react-router-dom';
import type { Timeline, TimelineEvent } from '../../types/timeline';
import { eraFor } from '../../lib/eras';
import { formatDate, formatSpan } from '../../lib/dates';
import { mainFactionOf } from '../../lib/factions';
import { EditOnly } from '../EditOnly';
import RichText from '../RichText';
import SourceList from '../SourceList';
import { CharacterChip, FactionChip, PlaceChip } from '../history/Chips';
import { isPeriod, periodsOf } from '../../lib/periods';
import { compareEvents } from '../../lib/dates';

interface Props {
  timeline: Timeline;
  event: TimelineEvent;
  onSelect: (id: string) => void;
  onClose: () => void;
  /** Clicking a tag: filter the timeline by it. */
  onTag?: (tag: string) => void;
}

/** The info box for the selected event. */
export default function EventPanel({ timeline, event, onSelect, onClose, onTag }: Props) {
  const era = eraFor(event.date.sortKey, timeline.eras);
  // The main faction first, marked with a star
  const mainId = mainFactionOf(event);
  const factions = timeline.factions
    .filter((c) => event.factionIds.includes(c.id))
    .sort((a, b) => Number(b.id === mainId) - Number(a.id === mainId));
  const places = timeline.places.filter((p) => event.placeIds.includes(p.id));
  const characters = timeline.characters.filter((c) => event.characterIds.includes(c.id));
  // A period's events, in order; and the periods this event is part of
  const included = (event.includedIds ?? [])
    .map((id) => timeline.events.find((e) => e.id === id))
    .filter((e): e is TimelineEvent => e !== undefined)
    .sort(compareEvents);
  const partOf = periodsOf(event.id, timeline.events);
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
            {isPeriod(event) && <span className="period-badge">Period</span>}
            {formatSpan(event, timeline.calendar)}
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

      {partOf.length > 0 && (
        <p className="event-panel-partof">
          Part of{' '}
          {partOf.map((p, i) => (
            <span key={p.id}>
              {i > 0 && ', '}
              <button type="button" className="link-btn wiki-link" onClick={() => onSelect(p.id)}>{p.title}</button>
            </span>
          ))}
        </p>
      )}

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

      {event.tags.length > 0 && (
        <div className="chips">
          {event.tags.map((t) =>
            onTag ? (
              <button key={t} type="button" className="chip chip-link chip-tag" title={`Show only events tagged "${t}"`} onClick={() => onTag(t)}># {t}</button>
            ) : (
              <span key={t} className="chip chip-tag"># {t}</span>
            ),
          )}
        </div>
      )}

      {event.imageUrl && <img className="event-panel-image" src={event.imageUrl} alt="" />}

      <div className="prose">
        {/* [[Links]] to other events select them here, without leaving the viewer */}
        {event.body ? <RichText text={event.body} timeline={timeline} onEventLink={onSelect} citations={{ prefix: `source-${event.id}`, count: event.sources.length }} /> : <p className="muted">{event.summary || 'No details yet.'}</p>}
      </div>

      {isPeriod(event) && (
        <section className="event-panel-section">
          <h3>Includes</h3>
          {included.length === 0 ? (
            <p className="muted">No events picked: it covers the events between its dates.</p>
          ) : (
            <ol className="period-events">
              {included.map((e) => (
                <li key={e.id}>
                  <button type="button" className="link-btn" onClick={() => onSelect(e.id)}>
                    <span className="muted">{formatSpan(e, timeline.calendar)}</span> {isPeriod(e) && <span className="period-badge">Period</span>}{e.title}
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

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

      <SourceList timeline={timeline} sources={event.sources} text={event.body} prefix={`source-${event.id}`} />
    </article>
  );
}
