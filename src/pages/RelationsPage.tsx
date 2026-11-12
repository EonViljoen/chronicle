import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { FactionRelation, Timeline } from '../types/timeline';
import TimelineGate from '../components/TimelineGate';
import { EditOnly } from '../components/EditOnly';
import RichText from '../components/RichText';
import NetworkDiagram from '../components/diagram/NetworkDiagram';
import { FactionChip } from '../components/history/Chips';
import { RELATION_KINDS, relationDates, relationSentence, relationsDuring } from '../lib/relations';

export default function RelationsPage() {
  return <TimelineGate>{(timeline) => <RelationsView timeline={timeline} />}</TimelineGate>;
}

/** Every relation as a diagram, for all time or one era, with the list underneath. */
function RelationsView({ timeline }: { timeline: Timeline }) {
  // "all", or an era's id
  const [when, setWhen] = useState('all');
  const eras = [...timeline.eras].sort((a, b) => a.start - b.start);
  const era = eras.find((e) => e.id === when);
  const shown = era ? relationsDuring(timeline.relations, era.start, era.end) : timeline.relations;

  const involved = new Set(shown.flatMap((r) => [r.fromId, r.toId]));
  const factions = timeline.factions.filter((f) => involved.has(f.id));
  const kinds = Object.entries(RELATION_KINDS).filter(([k]) => shown.some((r) => r.kind === k));

  return (
    <div className="page history-page">
      <div className="page-head">
        <h1>Faction relations</h1>
        <div className="page-head-actions">
          <Link className="btn" to={`/t/${timeline.id}`}>Timeline</Link>
          <EditOnly>
            <Link className="btn" to={`/t/${timeline.id}/edit?tab=relations&item=new`}>+ Add relation</Link>
          </EditOnly>
        </div>
      </div>

      {timeline.relations.length === 0 ? (
        <p className="muted">No relations yet. Add them in the editor's Relations tab: allies, wars, rivalries, trade, truces, and who serves whom.</p>
      ) : (
        <>
          {eras.length > 0 && (
            <div className="segmented relations-when" role="group" aria-label="When">
              <button type="button" aria-pressed={when === 'all'} onClick={() => setWhen('all')}>All time</button>
              {eras.map((e) => (
                <button key={e.id} type="button" aria-pressed={when === e.id} onClick={() => setWhen(e.id)}>
                  <span className="swatch" style={{ background: e.color }} /> {e.name}
                </button>
              ))}
            </div>
          )}

          {shown.length === 0 ? (
            <p className="muted">No relations recorded during {era?.name}.</p>
          ) : (
            <NetworkDiagram
              label={`Faction relations${era ? ` during ${era.name}` : ''}`}
              nodes={factions.map((f) => ({ id: f.id, label: f.name, color: f.color, imageUrl: f.imageUrl, to: `/t/${timeline.id}/factions/${encodeURIComponent(f.id)}` }))}
              edges={shown.map((r) => ({ id: r.id, from: r.fromId, to: r.toId, style: RELATION_KINDS[r.kind], title: relationSentence(r, timeline) }))}
              legend={kinds.map(([, k]) => k)}
            />
          )}

          {kinds.map(([kind, style]) => (
            <section key={kind} className="history-section">
              <h2 className="history-heading">
                <span className="relation-key" style={{ background: style.color }} aria-hidden="true" /> {style.label}
              </h2>
              <ul className="relation-list">
                {shown.filter((r) => r.kind === kind).map((r) => <RelationRow key={r.id} relation={r} timeline={timeline} />)}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}

function RelationRow({ relation: r, timeline }: { relation: FactionRelation; timeline: Timeline }) {
  const from = timeline.factions.find((f) => f.id === r.fromId);
  const to = timeline.factions.find((f) => f.id === r.toId);
  const dates = relationDates(r, timeline);
  return (
    <li className="relation-row">
      <div className="chips">
        {from && <FactionChip timeline={timeline} faction={from} />}
        <span className="muted">{RELATION_KINDS[r.kind].verb}</span>
        {to && <FactionChip timeline={timeline} faction={to} />}
        {dates && <span className="muted">· {dates}</span>}
      </div>
      {r.note && (
        <div className="prose relation-note">
          <RichText text={r.note} timeline={timeline} />
        </div>
      )}
    </li>
  );
}
