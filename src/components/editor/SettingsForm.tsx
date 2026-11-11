import type { MapConfig, Timeline } from '../../types/timeline';
import FlatMapSettings from './FlatMapSettings';
import { updateTimeline } from '../../db/timelines';
import Field from '../form/Field';
import NumberInput from '../form/NumberInput';
import FormActions from './FormActions';
import { useDraft } from './useDraft';

// The calendar has its own tab (CalendarTab.tsx)
type Settings = Pick<Timeline, 'title' | 'description' | 'map' | 'flatMap'>;

const DEFAULT_GALAXY: MapConfig = { type: 'galaxy3d', arms: 4, radius: 100, coreColor: '#ffd9a0', armColor: '#7aa6ff' };

interface Props {
  timeline: Timeline;
  onDirtyChange: (dirty: boolean) => void;
}

export default function SettingsForm({ timeline, onDirtyChange }: Props) {
  const original: Settings = {
    title: timeline.title,
    description: timeline.description,
    map: timeline.map,
    flatMap: timeline.flatMap,
  };
  const save = async (s: Settings) => {
    await updateTimeline(timeline.id, (t) => ({ ...t, ...s }));
    onDirtyChange(false);
  };
  const { draft, patch, dirty, saving, submit, reset } = useDraft(original, save, onDirtyChange);
  const titleError = draft.title.trim() ? undefined : 'Give the timeline a title';
  const valid = !titleError;
  const map = draft.map;

  return (
    <form className="form settings-form" onSubmit={(e) => submit(e, (s) => ({ ...s, title: s.title.trim(), description: s.description.trim() }))}>
      <h2 className="form-title">Timeline settings</h2>

      <Field label="Title" error={titleError}>
        <input value={draft.title} onChange={(e) => patch({ title: e.target.value })} />
      </Field>

      <Field label="Description">
        <textarea rows={3} value={draft.description} onChange={(e) => patch({ description: e.target.value })} />
      </Field>

      <Field label="3D starmap">
        <select value={map.type} onChange={(e) => patch({ map: e.target.value === 'galaxy3d' ? DEFAULT_GALAXY : { type: 'none' } })}>
          <option value="none">None</option>
          <option value="galaxy3d">3D galaxy</option>
        </select>
      </Field>

      {/* Narrowing: inside this block TypeScript knows map has galaxy fields */}
      {map.type === 'galaxy3d' && (
        <div className="field-row">
          <Field label="Spiral arms">
            <NumberInput value={map.arms} min={1} max={8} onChange={(arms) => arms !== undefined && patch({ map: { ...map, arms } })} />
          </Field>
          <Field label="Core colour">
            <input type="color" value={map.coreColor} onChange={(e) => patch({ map: { ...map, coreColor: e.target.value } })} />
          </Field>
          <Field label="Arm colour">
            <input type="color" value={map.armColor} onChange={(e) => patch({ map: { ...map, armColor: e.target.value } })} />
          </Field>
        </div>
      )}

      <FlatMapSettings value={draft.flatMap} onChange={(flatMap) => patch({ flatMap })} />

      <FormActions isNew={false} dirty={dirty} valid={valid} saving={saving} onRevert={reset} />
    </form>
  );
}
