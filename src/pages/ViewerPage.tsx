import { Link } from 'react-router-dom';
import TimelineGate from '../components/TimelineGate';
import { compareEvents } from '../lib/dates';

/** Phase 2 replaces this list with the horizontal timeline. */
export default function ViewerPage() {
  return (
    <TimelineGate>
      {(timeline) => (
        <div className="page">
          <div className="page-head">
            <h1>{timeline.title}</h1>
            <Link className="btn" to={`/t/${timeline.id}/edit`}>Edit</Link>
          </div>
          <p className="muted">The interactive timeline arrives in phase 2. For now, the events in order:</p>
          <ol className="plain-list">
            {[...timeline.events].sort(compareEvents).map((e) => (
              <li key={e.id}>
                <strong>{e.date.display}</strong> {e.title}
              </li>
            ))}
          </ol>
        </div>
      )}
    </TimelineGate>
  );
}
