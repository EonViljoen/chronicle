import type { CSSProperties, ReactNode } from 'react';
import type { ChronologyEntry } from './entries';
import { Link } from 'react-router-dom';
import type { Era } from '../../types/timeline';
import { eraFor } from '../../lib/eras';

interface Props {
  entries: ChronologyEntry[];
  eras: Era[];
  empty: ReactNode;
}

/**
 * A vertical history: entries in date order, under a heading for each era
 * they fall in, with the era's colour on the line.
 */
export default function Chronology({ entries, eras, empty }: Props) {
  if (entries.length === 0) return <p className="muted">{empty}</p>;
  const sorted = [...entries].sort((a, b) => a.sortKey - b.sortKey);

  // Split into runs that share an era
  const runs: { era?: Era; entries: ChronologyEntry[] }[] = [];
  for (const entry of sorted) {
    const era = eraFor(entry.sortKey, eras);
    const last = runs[runs.length - 1];
    if (last && last.era?.id === era?.id) last.entries.push(entry);
    else runs.push({ era, entries: [entry] });
  }

  return (
    <div className="chronology">
      {runs.map((run, i) => (
        <section key={i} className="chrono-run" style={{ '--era-color': run.era?.color ?? 'var(--border)' } as CSSProperties}>
          <h3 className="chrono-era">{run.era?.name ?? 'Outside any era'}</h3>
          <ol className="chrono-list">
            {run.entries.map((e) => (
              <li key={e.key} className={`chrono-item${e.marker ? ' is-marker' : ''}`}>
                <span className="chrono-date">{e.date}</span>
                <span className="chrono-title">{e.to ? <Link to={e.to}>{e.title}</Link> : e.title}</span>
                {e.note && <span className="chrono-note muted">{e.note}</span>}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
