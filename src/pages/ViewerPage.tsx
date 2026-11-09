import { Link } from 'react-router-dom';
import TimelineGate from '../components/TimelineGate';
import { EditOnly } from '../components/EditOnly';
import { mapKinds } from '../components/map/mapKinds';
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
            <div className="page-head-actions">
              {mapKinds(timeline).length > 0 && <Link className="btn" to={`/t/${timeline.id}/map`}>Map</Link>}
              <EditOnly>
                <Link className="btn" to={`/t/${timeline.id}/edit?tab=events&item=new`}>+ Add event</Link>
                <Link className="btn" to={`/t/${timeline.id}/edit`}>Edit</Link>
              </EditOnly>
            </div>
          </div>
          <TimelineViewer timeline={timeline} />
        </div>
      )}
    </TimelineGate>
  );
}
