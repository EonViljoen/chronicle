import { Link } from 'react-router-dom';
import TimelineGate from '../components/TimelineGate';
import { formatSortKey } from '../lib/dates';

/** Phase 3 turns this into the full editor. For now it shows what's stored. */
export default function EditorPage() {
  return (
    <TimelineGate>
      {(timeline) => (
        <div className="page">
          <div className="page-head">
            <h1>Edit: {timeline.title}</h1>
            <Link className="btn" to={`/t/${timeline.id}`}>View</Link>
          </div>
          <p className="muted">The editor arrives in phase 3. Current contents:</p>
          <h2>Eras</h2>
          <ul className="plain-list">
            {timeline.eras.map((era) => (
              <li key={era.id}>
                <span className="swatch" style={{ background: era.color }} /> {era.name}{' '}
                <span className="muted">
                  {formatSortKey(era.start, timeline.dateFormat)} – {formatSortKey(era.end, timeline.dateFormat)}
                </span>
              </li>
            ))}
          </ul>
          <h2>Categories</h2>
          <ul className="plain-list">
            {timeline.categories.map((c) => (
              <li key={c.id}>
                <span className="swatch" style={{ background: c.color }} /> {c.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </TimelineGate>
  );
}
