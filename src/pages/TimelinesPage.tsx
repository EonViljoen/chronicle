import { useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { importTimelineFile, useTimelines } from '../db/timelines';
import { brand } from '../brand';
import { usePublished } from '../db/published';
import TimelineCard from '../components/TimelineCard';
import CreateTimelineForm from '../components/CreateTimelineForm';
import { readRecent } from '../lib/recent';
import { allMaps } from '../lib/maps';
import type { Timeline } from '../types/timeline';

/*
 * /timelines: everything in this browser. A dashboard for returning users
 * on top (pick up where you left off, totals, recently opened), then the
 * full list, create and import. On a read-only site it's the list of what
 * the site publishes instead.
 */
export default function TimelinesPage() {
  const timelines = useTimelines();
  const published = usePublished();

  // useState: values that, when changed, re-render the component.
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Read once when the page opens: it only changes while you're on other pages
  const [recentIds] = useState(readRecent);

  // useRef: a handle to a DOM element. Here, the hidden file input.
  const fileInput = useRef<HTMLInputElement>(null);

  function handleImport(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    importTimelineFile(file)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setBusy(false));
    if (fileInput.current) fileInput.current.value = ''; // allow re-importing the same file
  }

  // ----- Published timelines (see db/published.ts) -----
  const publishedTimelines = published?.timelines ?? [];
  const errorBanner = error && (
    <p className="error" role="alert">
      {error} <button className="link-btn" onClick={() => setError(null)}>Dismiss</button>
    </p>
  );
  const publishedSection = published && (publishedTimelines.length > 0 || published.errors.length > 0) && (
    <section className="home-section">
      {!brand.readOnly && <h2 className="home-section-title">Published by this site</h2>}
      {published.errors.map((message) => (
        <p key={message} className="error" role="alert">{message}</p>
      ))}
      <div className="card-grid">
        {publishedTimelines.map((t) => (
          <TimelineCard key={t.id} timeline={t} published onError={setError} />
        ))}
      </div>
    </section>
  );

  // ----- A read-only site only shows what it publishes -----
  if (brand.readOnly) {
    // Hooks are all above: early returns must come after every hook call
    if (publishedTimelines.length === 1) return <Navigate to={`/t/${publishedTimelines[0].id}`} replace />;
    return (
      <div className="home">
        <section className="home-intro">
          <h1>{brand.name}</h1>
        </section>
        {errorBanner}
        {published === undefined ? <p className="muted">Loading…</p> : publishedSection || <div className="empty"><p>Nothing has been published yet.</p></div>}
      </div>
    );
  }

  return (
    <div className="home">
      <section className="home-intro">
        <h1>Your timelines</h1>
        <p>Everything is saved in this browser; export a file to back it up or share it.</p>
      </section>

      {timelines && timelines.length > 0 && <Dashboard timelines={timelines} recentIds={recentIds} />}

      <section className="home-toolbar">
        <CreateTimelineForm onError={setError} />
        <div className="toolbar-actions">
          <button className="btn" disabled={busy} onClick={() => fileInput.current?.click()}>Import file…</button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => handleImport(e.target.files?.[0])}
          />
        </div>
      </section>

      {errorBanner}

      {/* Three render states: loading, empty, list */}
      {timelines === undefined ? (
        <p className="muted">Loading…</p>
      ) : timelines.length === 0 ? (
        <div className="empty">
          <p>No timelines yet.</p>
          <p className="muted">
            Create one above or import a file.
            {brand.demoUrl && <> Not sure where to start? <a href={brand.demoUrl} target="_blank" rel="noreferrer">See a finished timeline</a>.</>}
          </p>
        </div>
      ) : (
        <div className="card-grid">
          {timelines.map((t) => (
            // `key` lets React track each card between renders
            <TimelineCard key={t.id} timeline={t} onError={setError} />
          ))}
        </div>
      )}

      {publishedSection}
    </div>
  );
}

/*
 * For returning users: the timeline you were last in, a few totals, and the
 * others you opened recently. Only shown once there's at least one timeline.
 * `timelines` arrives newest-edited first (see useTimelines).
 */
function Dashboard({ timelines, recentIds }: { timelines: Timeline[]; recentIds: string[] }) {
  // Look the remembered ids up; deleted timelines just drop out
  const byId = new Map(timelines.map((t) => [t.id, t]));
  const recent = recentIds.map((id) => byId.get(id)).filter((t): t is Timeline => t !== undefined);
  // Nothing opened yet in this browser: fall back to the last one edited
  const current = recent[0] ?? timelines[0];
  const others = recent.filter((t) => t.id !== current.id).slice(0, 4);

  const count = (pick: (t: Timeline) => unknown[]) => timelines.reduce((sum, t) => sum + pick(t).length, 0);
  const stats = [
    { label: 'Timelines', value: timelines.length },
    { label: 'Events', value: count((t) => t.events) },
    { label: 'Eras', value: count((t) => t.eras) },
    { label: 'Places', value: count((t) => t.places) },
  ];

  return (
    <section className="dashboard" aria-label="Dashboard">
      <div className="dash-continue">
        <p className="dash-label">{recent.length > 0 ? 'Pick up where you left off' : 'Last edited'}</p>
        <h2 className="dash-title">
          <Link to={`/t/${current.id}`}>{current.title}</Link>
        </h2>
        <p className="card-meta">
          {current.events.length} events · edited {new Date(current.updatedAt).toLocaleDateString()}
        </p>
        <div className="card-actions">
          <Link className="btn btn-primary" to={`/t/${current.id}`}>View</Link>
          <Link className="btn" to={`/t/${current.id}/edit`}>Edit</Link>
          {allMaps(current).length > 0 && <Link className="btn" to={`/t/${current.id}/map`}>Map</Link>}
        </div>
      </div>

      <div className="dash-side">
        <dl className="dash-stats">
          {stats.map((s) => (
            <div key={s.label} className="dash-stat">
              <dt>{s.label}</dt>
              <dd>{s.value}</dd>
            </div>
          ))}
        </dl>
        {others.length > 0 && (
          <div>
            <p className="dash-label">Also opened recently</p>
            <ul className="dash-recent">
              {others.map((t) => (
                <li key={t.id}>
                  <Link to={`/t/${t.id}`}>{t.title}</Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
