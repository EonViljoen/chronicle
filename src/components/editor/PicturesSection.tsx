import { useState } from 'react';
import type { Timeline } from '../../types/timeline';
import { db } from '../../db/db';
import { saveTimeline } from '../../db/timelines';
import { formatBytes, pictureBytes, shrinkPictures } from '../../lib/images';

/**
 * How much room the timeline's uploaded pictures take, with a button to
 * shrink them. Uploads are shrunk already; this is for pictures added
 * before that, which can be several megabytes each.
 */
export default function PicturesSection({ timeline }: { timeline: Timeline }) {
  const [state, setState] = useState<{ busy: boolean; message?: string; error?: boolean }>({ busy: false });
  const bytes = pictureBytes(timeline);
  if (bytes === 0) return null;

  async function run() {
    setState({ busy: true });
    try {
      // Shrink the latest saved copy, so nothing edited meanwhile is lost
      const current = await db.timelines.get(timeline.id);
      if (!current) return;
      const { timeline: next, saved } = await shrinkPictures(current);
      if (saved > 0) await saveTimeline(next);
      setState({ busy: false, message: saved > 0 ? `Saved ${formatBytes(saved)}.` : 'They were already as small as they can be.' });
    } catch (e) {
      setState({ busy: false, message: e instanceof Error ? e.message : String(e), error: true });
    }
  }

  return (
    <section className="form settings-form pictures-section">
      <h2 className="form-title">Pictures</h2>
      <p>
        This timeline's uploaded pictures take <strong>{formatBytes(bytes)}</strong>. They're stored inside it, so they're in every export, backup and website.
      </p>
      <p className="muted">
        New uploads are shrunk automatically. Shrinking resizes older ones (maps to 4096 pixels across, portraits and crests to 640) and re-saves them as WebP. Pins stay where they are.
      </p>
      <div>
        <button type="button" className="btn" disabled={state.busy} onClick={() => void run()}>
          {state.busy ? 'Shrinking…' : 'Shrink pictures'}
        </button>
      </div>
      {state.message && <p className={state.error ? 'error' : 'field-hint'} role={state.error ? 'alert' : 'status'}>{state.message}</p>}
    </section>
  );
}
