import { useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTimeline } from '../db/timelines';

/*
 * "New timeline title" + Create. Used on the home page and the timelines
 * page, so it lives in its own component instead of being copied.
 * Errors go to the parent through `onError`, like TimelineCard.
 */
export default function CreateTimelineForm({ onError }: { onError: (message: string) => void }) {
  const navigate = useNavigate();
  // A "controlled input": React state holds the value, onChange updates it.
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  // Set when Create is pressed with no title, cleared as soon as you type
  const [needsTitle, setNeedsTitle] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); // stop the browser's default full-page form submit
    const trimmed = title.trim();
    if (!trimmed) {
      // Say what's missing instead of silently doing nothing
      setNeedsTitle(true);
      input.current?.focus();
      return;
    }
    setBusy(true);
    try {
      const t = await createTimeline(trimmed);
      navigate(`/t/${t.id}/edit`);
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <form className="create-form" onSubmit={handleSubmit}>
      <input
        ref={input}
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
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
  );
}
