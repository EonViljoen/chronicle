import { useRef, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { createTimeline, importTimelineFile, useTimelines } from '../db/timelines';
import { brand } from '../brand';
import { usePublished } from '../db/published';
import TimelineCard from '../components/TimelineCard';

export default function HomePage() {
  const timelines = useTimelines();
  const published = usePublished();
  const navigate = useNavigate();

  // useState: values that, when changed, re-render the component.
  const [newTitle, setNewTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Set when Create is pressed with no title, cleared as soon as you type
  const [needsTitle, setNeedsTitle] = useState(false);

  // useRef: a handle to a DOM element. Here, the hidden file input and the title box.
  const fileInput = useRef<HTMLInputElement>(null);
  const titleInput = useRef<HTMLInputElement>(null);

  /** Run an async action with a busy flag and error banner. */
  async function run(action: () => Promise<void>) {
    setError(null);
    setBusy(true);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function handleCreate(e: FormEvent) {
    e.preventDefault(); // stop the browser's default full-page form submit
    const title = newTitle.trim();
    if (!title) {
      // Say what's missing instead of silently doing nothing
      setNeedsTitle(true);
      titleInput.current?.focus();
      return;
    }
    run(async () => {
      const t = await createTimeline(title);
      setNewTitle('');
      navigate(`/t/${t.id}/edit`);
    });
  }

  function handleImport(file: File | undefined) {
    if (!file) return;
    run(async () => {
      await importTimelineFile(file);
    });
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
        <p>Build a timeline of events, eras and places. Everything is saved in this browser; export a file to back it up or share it.</p>
      </section>

      <section className="home-toolbar">
        {/* A "controlled input": React state holds the value, onChange updates it. */}
        <form className="create-form" onSubmit={handleCreate}>
          <input
            ref={titleInput}
            value={newTitle}
            onChange={(e) => {
              setNewTitle(e.target.value);
              setNeedsTitle(false);
            }}
            placeholder="New timeline title"
            aria-label="New timeline title"
            aria-invalid={needsTitle || undefined}
            aria-describedby={needsTitle ? 'create-hint' : undefined}
          />
          <button className="btn btn-primary" disabled={busy}>Create</button>
          {needsTitle && (
            <span id="create-hint" className="create-hint" role="alert">Type a title first</span>
          )}
        </form>

        <div className="toolbar-actions">
          <button className="btn" disabled={busy} onClick={() => fileInput.current?.click()}>Import file…</button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => handleImport(e.target.files?.[0])}
          />
          {/* A plain link: the demo is a separate site showing the app in use */}
          {brand.demoUrl && (
            <a className="btn" href={brand.demoUrl} target="_blank" rel="noreferrer">
              View demo ↗
            </a>
          )}
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
