import { useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTimeline, importTimelineFile, loadDemo, useTimelines } from '../db/timelines';
import TimelineCard from '../components/TimelineCard';

export default function HomePage() {
  const timelines = useTimelines();
  const navigate = useNavigate();

  // useState: values that, when changed, re-render the component.
  const [newTitle, setNewTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // useRef: a handle to a DOM element. Here, the hidden file input.
  const fileInput = useRef<HTMLInputElement>(null);

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
    if (!title) return;
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
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="New timeline title"
            aria-label="New timeline title"
          />
          <button className="btn btn-primary" disabled={busy || !newTitle.trim()}>Create</button>
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
          <button className="btn" disabled={busy} onClick={() => run(async () => void (await loadDemo('wh40k')))}>
            Load Warhammer 40k demo
          </button>
        </div>
      </section>

      {error && (
        <p className="error" role="alert">
          {error} <button className="link-btn" onClick={() => setError(null)}>Dismiss</button>
        </p>
      )}

      {/* Three render states: loading, empty, list */}
      {timelines === undefined ? (
        <p className="muted">Loading…</p>
      ) : timelines.length === 0 ? (
        <div className="empty">
          <p>No timelines yet.</p>
          <p className="muted">Create one above, import a file, or load the Warhammer 40k demo to see how it works.</p>
        </div>
      ) : (
        <div className="card-grid">
          {timelines.map((t) => (
            // `key` lets React track each card between renders
            <TimelineCard key={t.id} timeline={t} onError={setError} />
          ))}
        </div>
      )}
    </div>
  );
}
