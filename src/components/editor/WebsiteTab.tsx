import { useState } from 'react';
import type { Timeline, WebsiteSettings } from '../../types/timeline';
import { updateTimeline } from '../../db/timelines';
import { exportSite } from '../../lib/exportSite';
import Field from '../form/Field';
import FormActions from './FormActions';
import { useDraft } from './useDraft';

interface Props {
  timeline: Timeline;
  onDirtyChange: (dirty: boolean) => void;
}

const kb = (bytes: number) => `${Math.round(bytes / 1024).toLocaleString()} KB`;

/**
 * The editor's Website tab: header and footer text for an exported site, and
 * the Export button. The text is saved on the timeline for next time.
 */
export default function WebsiteTab({ timeline, onDirtyChange }: Props) {
  const original: WebsiteSettings = timeline.website ?? { name: timeline.title, tagline: '', mark: '◆', footer: '' };
  const save = (website: WebsiteSettings) => updateTimeline(timeline.id, (t) => ({ ...t, website }));
  const { draft, patch, dirty, saving, submit, reset } = useDraft(original, save, onDirtyChange);

  const [status, setStatus] = useState<{ kind: 'busy' | 'done' | 'error'; message: string } | null>(null);

  async function handleExport() {
    setStatus({ kind: 'busy', message: 'Building the website…' });
    try {
      if (dirty) await save(draft); // export what's on screen, and remember it
      const { fileName, bytes } = await exportSite(timeline, draft);
      setStatus({ kind: 'done', message: `Downloaded ${fileName} (${kb(bytes)}).` });
    } catch (e) {
      setStatus({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  }

  return (
    <div className="website-tab">
      <form className="form" onSubmit={(e) => submit(e)}>
        <div>
          <h2 className="form-title">Website</h2>
          <p className="muted">
            Export this timeline as a website anyone can visit. It's read-only, opens straight on the timeline and uses its
            theme. Export again whenever you change something, and replace the files.
          </p>
        </div>

        <Field label="Site name" hint="In the header and the browser tab">
          <input value={draft.name} onChange={(e) => patch({ name: e.target.value })} />
        </Field>
        <div className="field-row">
          <Field label="Tagline" hint="Small text beside the name">
            <input value={draft.tagline} onChange={(e) => patch({ tagline: e.target.value })} />
          </Field>
          <Field label="Symbol" hint="Before the name, e.g. ✠ ◆ ✦">
            <input className="glyph-input" value={draft.mark} maxLength={4} onChange={(e) => patch({ mark: e.target.value })} />
          </Field>
        </div>
        <Field label="Footer" hint="Small print on every page, e.g. a disclaimer for fan work">
          <textarea rows={3} value={draft.footer} onChange={(e) => patch({ footer: e.target.value })} />
        </Field>

        <FormActions isNew={false} dirty={dirty} valid saving={saving} onRevert={reset} />
      </form>

      <section className="website-export">
        <button type="button" className="btn btn-primary" disabled={status?.kind === 'busy'} onClick={handleExport}>
          {status?.kind === 'busy' ? 'Exporting…' : 'Export website (.zip)'}
        </button>
        {status && status.kind !== 'busy' && (
          <p className={status.kind === 'error' ? 'error' : 'muted'} role={status.kind === 'error' ? 'alert' : 'status'}>
            {status.message}
          </p>
        )}

        <h3>Putting it online</h3>
        <ol className="plain-list">
          <li>Unzip the download.</li>
          <li>
            Upload everything inside it to a static host: drag the folder onto <strong>Netlify Drop</strong>{' '}
            (app.netlify.com/drop), or push it to a GitHub repository and turn on <strong>GitHub Pages</strong>.
          </li>
          <li>To preview it on your computer, run <code>python3 -m http.server</code> in the folder (opening index.html directly won't work).</li>
        </ol>
      </section>
    </div>
  );
}
