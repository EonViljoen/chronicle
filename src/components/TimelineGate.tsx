import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTimeline } from '../db/timelines';
import type { Timeline } from '../types/timeline';
import { useTheme } from '../themes';
import { brand } from '../brand';
import { CanEditContext } from './canEdit';

/*
 * Loads the timeline named in the URL and handles the loading / not-found
 * states, so pages only deal with a timeline that exists.
 * `children` is a function ("render prop") that receives the loaded timeline.
 * It also applies the timeline's theme while any of its pages are open, and
 * tells everything inside whether the timeline can be edited (see canEdit.tsx).
 */
export default function TimelineGate({ children }: { children: (timeline: Timeline) => ReactNode }) {
  const { id } = useParams();
  const entry = useTimeline(id);
  // Hooks must run on every render, so this sits above the early returns
  useTheme(entry?.timeline.theme);

  if (entry === undefined) return <p className="muted">Loading…</p>;
  if (entry === null) {
    return (
      <div className="empty">
        <p>That timeline doesn't exist in this browser.</p>
        <Link className="btn" to="/">Back to the timelines</Link>
      </div>
    );
  }
  const canEdit = !entry.published && !brand.readOnly;
  // React 19: a context object renders as its own provider
  return <CanEditContext value={canEdit}>{children(entry.timeline)}</CanEditContext>;
}
