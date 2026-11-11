import type { Timeline } from '../../types/timeline';
import { updateTimeline } from '../../db/timelines';
import Field from '../form/Field';
import FormActions from './FormActions';
import { useDraft } from './useDraft';

// The rest has its own tabs: Calendar (CalendarTab.tsx), Maps (MapsPanel.tsx), Starmap (StarmapTab.tsx)
type Settings = Pick<Timeline, 'title' | 'description'>;

interface Props {
  timeline: Timeline;
  onDirtyChange: (dirty: boolean) => void;
}

export default function SettingsForm({ timeline, onDirtyChange }: Props) {
  const original: Settings = {
    title: timeline.title,
    description: timeline.description,
  };
  const save = async (s: Settings) => {
    await updateTimeline(timeline.id, (t) => ({ ...t, ...s }));
    onDirtyChange(false);
  };
  const { draft, patch, dirty, saving, submit, reset } = useDraft(original, save, onDirtyChange);
  const titleError = draft.title.trim() ? undefined : 'Give the timeline a title';
  const valid = !titleError;

  return (
    <form className="form settings-form" onSubmit={(e) => submit(e, (s) => ({ ...s, title: s.title.trim(), description: s.description.trim() }))}>
      <h2 className="form-title">Timeline settings</h2>

      <Field label="Title" error={titleError}>
        <input value={draft.title} onChange={(e) => patch({ title: e.target.value })} />
      </Field>

      <Field label="Description">
        <textarea rows={3} value={draft.description} onChange={(e) => patch({ description: e.target.value })} />
      </Field>

      <FormActions isNew={false} dirty={dirty} valid={valid} saving={saving} onRevert={reset} />
    </form>
  );
}
