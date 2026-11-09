import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTimeline } from '../db/timelines';
import type { Timeline } from '../types/timeline';

/*
 * Loads the timeline named in the URL and handles the loading / not-found
 * states, so pages only deal with a timeline that exists.
 * `children` is a function ("render prop") that receives the loaded timeline.
 */
export default function TimelineGate({ children }: { children: (timeline: Timeline) => ReactNode }) {
  const { id } = useParams();
  const timeline = useTimeline(id);

  if (timeline === undefined) return <p className="muted">Loading…</p>;
  if (timeline === null) {
    return (
      <div className="empty">
        <p>That timeline doesn't exist in this browser.</p>
        <Link className="btn" to="/">Back to your timelines</Link>
      </div>
    );
  }
  return <>{children(timeline)}</>;
}
