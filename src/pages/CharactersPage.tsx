import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { Timeline } from '../types/timeline';
import TimelineGate from '../components/TimelineGate';
import { EditOnly } from '../components/EditOnly';
import { characterGroups } from '../lib/characters';
import { formatDate } from '../lib/dates';

export default function CharactersPage() {
  return <TimelineGate>{(timeline) => <CharactersView timeline={timeline} />}</TimelineGate>;
}

/** Everyone in the timeline, grouped by faction (independent last). */
function CharactersView({ timeline }: { timeline: Timeline }) {
  const groups = characterGroups(timeline);
  const { calendar } = timeline;

  return (
    <div className="page history-page">
      <div className="page-head">
        <h1>Characters</h1>
        <div className="page-head-actions">
          <Link className="btn" to={`/t/${timeline.id}`}>Timeline</Link>
          <EditOnly>
            <Link className="btn" to={`/t/${timeline.id}/edit?tab=characters&item=new`}>+ Add character</Link>
          </EditOnly>
        </div>
      </div>

      {groups.length === 0 && <p className="muted">No characters yet.</p>}
      {groups.map((g) => (
        <section key={g.factionId ?? 'independent'} className="character-group" style={{ '--group-color': g.color ?? 'var(--border)' } as CSSProperties}>
          <h2 className="character-group-title">
            {g.factionId ? <Link to={`/t/${timeline.id}/factions/${encodeURIComponent(g.factionId)}`}>{g.name}</Link> : g.name}
          </h2>
          <ul className="character-grid">
            {g.characters.map((c) => {
              const count = timeline.events.filter((e) => e.characterIds.includes(c.id)).length;
              const life = [c.born && formatDate(c.born, calendar), c.died && formatDate(c.died, calendar)];
              return (
                <li key={c.id}>
                  <Link className="character-card" to={`/t/${timeline.id}/characters/${encodeURIComponent(c.id)}`}>
                    {c.imageUrl ? (
                      <img className="character-portrait is-small" src={c.imageUrl} alt="" />
                    ) : (
                      <span className="character-portrait is-small is-empty" aria-hidden="true">{c.name.trim()[0]?.toUpperCase() ?? '?'}</span>
                    )}
                    <span className="character-card-text">
                      <strong>{c.name}</strong>
                      <span className="muted">
                        {life[0] || life[1] ? `${life[0] || '?'} – ${life[1] || ''}` : ''}
                        {(life[0] || life[1]) && ' · '}
                        {count} event{count === 1 ? '' : 's'}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
