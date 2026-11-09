import { Link } from 'react-router-dom';
import TimelineGate from '../components/TimelineGate';
import TimelineViewer from '../components/viewer/TimelineViewer';

export default function ViewerPage() {
  return (
    <TimelineGate>
      {(timeline) => (
        <div className="page">
          <div className="page-head">
            <div>
              <h1>{timeline.title}</h1>
              {timeline.description && <p className="muted page-desc">{timeline.description}</p>}
            </div>
            <Link className="btn" to={`/t/${timeline.id}/edit`}>Edit</Link>
          </div>
          <TimelineViewer timeline={timeline} />
        </div>
      )}
    </TimelineGate>
  );
}
