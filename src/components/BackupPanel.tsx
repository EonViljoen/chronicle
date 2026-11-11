import { useRef, useState } from 'react';
import { downloadBackup, lastBackupAt, readBackup, restoreBackup, type ClashMode, type ReadBackup } from '../db/backup';

interface Props {
  /** A backup picked through "Import file…", to review here. */
  pending: ReadBackup | null;
  onPendingChange: (backup: ReadBackup | null) => void;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** "today", "yesterday", "5 days ago", or a date */
function ago(ms: number): string {
  const days = Math.floor((Date.now() - ms) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  return `on ${new Date(ms).toLocaleDateString()}`;
}

/**
 * Backing up and restoring everything (see db/backup.ts): a reminder of
 * when you last backed up, the two buttons, and a review step before a
 * restore that says what's in the file and asks what to do with clashes.
 */
export default function BackupPanel({ pending, onPendingChange }: Props) {
  const [last, setLast] = useState(lastBackupAt);
  const [mode, setMode] = useState<ClashMode>('keep-both');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function backUp() {
    setMessage(null);
    try {
      const { timelines, themes } = await downloadBackup();
      setLast(lastBackupAt());
      setMessage({ text: `Backed up ${plural(timelines, 'timeline')} and ${plural(themes, 'theme')}. Keep the file somewhere safe.` });
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : String(e), error: true });
    }
  }

  async function pick(file: File | undefined) {
    if (!file) return;
    setMessage(null);
    try {
      let data: unknown;
      try {
        data = JSON.parse(await file.text());
      } catch {
        throw new Error(`"${file.name}" is not valid JSON`);
      }
      onPendingChange(await readBackup(data));
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : String(e), error: true });
    }
  }

  async function restore() {
    if (!pending) return;
    setBusy(true);
    try {
      const { timelines, themes } = await restoreBackup(pending, mode);
      onPendingChange(null);
      setMessage({ text: `Restored ${plural(timelines, 'timeline')} and ${plural(themes, 'theme')}.` });
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : String(e), error: true });
    } finally {
      setBusy(false);
    }
  }

  const clashes = pending ? pending.clashes.timelines + pending.clashes.themes : 0;

  return (
    <section className="backup-panel" aria-label="Backup">
      <div className="backup-row">
        <p className="backup-status">
          <strong>Backup:</strong>{' '}
          {last ? `last backed up ${ago(last)}.` : 'never backed up from this browser.'}{' '}
          <span className="muted">Everything lives in this browser; a backup file keeps it safe and moves it to another computer.</span>
        </p>
        <div className="toolbar-actions">
          <button className="btn" onClick={() => void backUp()}>Back up everything</button>
          <button className="btn" onClick={() => fileInput.current?.click()}>Restore backup…</button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              void pick(e.target.files?.[0]);
              e.target.value = ''; // so picking the same file again still works
            }}
          />
        </div>
      </div>

      {message && <p className={message.error ? 'error' : 'backup-message'} role={message.error ? 'alert' : 'status'}>{message.text}</p>}

      {pending && (
        <div className="backup-review">
          <h2 className="backup-review-title">Restore this backup?</h2>
          <p>
            {pending.createdAt ? <>Made {new Date(pending.createdAt).toLocaleString()}. </> : null}
            It has {plural(pending.timelines.length, 'timeline')} and {plural(pending.themes.length, 'theme')}.
          </p>
          {pending.skipped.length > 0 && (
            <div className="field-warning" role="status">
              {plural(pending.skipped.length, 'item')} couldn't be read and will be left out:
              <ul>{pending.skipped.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
          )}
          {clashes > 0 ? (
            <fieldset className="backup-modes">
              <legend>
                {[pending.clashes.timelines && plural(pending.clashes.timelines, 'timeline'), pending.clashes.themes && plural(pending.clashes.themes, 'theme')]
                  .filter(Boolean)
                  .join(' and ')}{' '}
                {clashes === 1 ? 'is' : 'are'} already in this browser. What should happen to {clashes === 1 ? 'it' : 'them'}?
              </legend>
              <label className="check">
                <input type="radio" name="backup-mode" checked={mode === 'keep-both'} onChange={() => setMode('keep-both')} />
                Keep both: the restored copies get "(restored)" added to their names
              </label>
              <label className="check">
                <input type="radio" name="backup-mode" checked={mode === 'replace'} onChange={() => setMode('replace')} />
                Replace them with the backup's versions (changes made here since the backup are lost)
              </label>
            </fieldset>
          ) : (
            <p className="muted">None of it is in this browser yet, so nothing will be replaced.</p>
          )}
          <div className="toolbar-actions">
            <button className="btn btn-primary" disabled={busy || pending.timelines.length + pending.themes.length === 0} onClick={() => void restore()}>
              {busy ? 'Restoring…' : 'Restore'}
            </button>
            <button className="btn" disabled={busy} onClick={() => onPendingChange(null)}>Cancel</button>
          </div>
        </div>
      )}
    </section>
  );
}
