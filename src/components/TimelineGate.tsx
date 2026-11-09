import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTimeline } from '../db/timelines';
import type { Timeline } from '../types/timeline';
import { resolveTheme, useTheme } from '../themes';
import { useThemes } from '../db/themes';
import type { Theme } from '../types/theme';
import { ThemeOverrideContext } from './themeOverride';
import { brand } from '../brand';
import { CanEditContext } from './canEdit';

/*
 * Loads the timeline named in the URL and handles the loading / not-found
 * states, so pages only deal with a timeline that exists.
 * `children` is a function ("render prop") that receives the loaded timeline.
 * It also applies the timeline's theme while any of its pages are open (or
 * the theme editor's unsaved preview), and tells everything inside whether
 * the timeline can be edited (see canEdit.ts).
 */
export default function TimelineGate({ children }: { children: (timeline: Timeline) => ReactNode }) {
  const { id } = useParams();
  const entry = useTimeline(id);
  const library = useThemes();
  // A theme shown instead of the saved one (see themeOverride.ts)
  const [override, setOverride] = useState<Theme | null>(null);
  // Hooks must run on every render, so these sit above the early returns
  useTheme(override ?? (entry ? resolveTheme(entry.timeline, library) : undefined));

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
  return (
    <CanEditContext value={canEdit}>
      <ThemeOverrideContext value={setOverride}>{children(entry.timeline)}</ThemeOverrideContext>
    </CanEditContext>
  );
}
