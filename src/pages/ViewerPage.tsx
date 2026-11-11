import { Link } from 'react-router-dom';
import TimelineGate from '../components/TimelineGate';
import { EditOnly } from '../components/EditOnly';
import { allMaps } from '../lib/maps';
import TimelineViewer from '../components/viewer/TimelineViewer';

export default function ViewerPage() {
  return (
    <TimelineGate>
      {(timeline) => (
        // viewer-page: the controls get shadows to stand out over the era glow (see .era-glow)
        <div className="page viewer-page">
          <div className="page-head">
            <div className="page-head-main">
              {timeline.description && <p className="muted page-desc">{timeline.description}</p>}
            </div>
            <div className="page-head-actions">
              {allMaps(timeline).length > 0 && <Link className="btn" to={`/t/${timeline.id}/map`}>Map</Link>}
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
