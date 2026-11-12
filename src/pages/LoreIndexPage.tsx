import { Link } from 'react-router-dom';
import type { Timeline } from '../types/timeline';
import TimelineGate from '../components/TimelineGate';
import { EditOnly } from '../components/EditOnly';
import { loreGroups } from '../lib/lore';

export default function LoreIndexPage() {
  return <TimelineGate>{(timeline) => <LoreIndex timeline={timeline} />}</TimelineGate>;
}

/** Every lore page, under its category. */
function LoreIndex({ timeline }: { timeline: Timeline }) {
  const groups = loreGroups(timeline.lore);
  return (
    <div className="page history-page">
      <div className="page-head">
        <h1>Lore</h1>
        <div className="page-head-actions">
          <Link className="btn" to={`/t/${timeline.id}`}>Timeline</Link>
          <EditOnly>
            <Link className="btn" to={`/t/${timeline.id}/edit?tab=lore&item=new`}>+ Add page</Link>
          </EditOnly>
        </div>
      </div>
      {groups.length === 0 && <p className="muted">No lore pages yet.</p>}
      {groups.map((g) => (
        <section key={g.category} className="lore-group">
          <h2 className="character-group-title">{g.category}</h2>
          <ul className="lore-list">
            {g.pages.map((p) => (
              <li key={p.id}>
                <Link className="lore-card" to={`/t/${timeline.id}/lore/${encodeURIComponent(p.id)}`}>
                  {p.imageUrl && <img src={p.imageUrl} alt="" />}
                  <strong>{p.title}</strong>
                  {/* The first line of text, without Markdown */}
                  <span className="muted">{excerpt(p.body)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** A plain first line: [[Name|text]] -> text, and **, #, [^1] dropped. */
function excerpt(body: string): string {
  const line = body.split('\n').find((l) => l.trim()) ?? '';
  const plain = line
    .replace(/\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g, (_, target: string, label?: string) => label ?? target.replace(/^\w+:/, ''))
    .replace(/\[\^\d+\]/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#*_`>]/g, '')
    .trim();
  return plain.length > 140 ? `${plain.slice(0, 139)}…` : plain;
}
