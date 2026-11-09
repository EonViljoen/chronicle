import { Link } from 'react-router-dom';
import TimelineGate from '../components/TimelineGate';
import { EditOnly } from '../components/EditOnly';
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
              {timeline.map.type === 'galaxy3d' && <Link className="btn" to={`/t/${timeline.id}/map`}>Starmap</Link>}
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
