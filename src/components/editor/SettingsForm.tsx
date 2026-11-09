import type { DateKind, MapConfig, Timeline } from '../../types/timeline';
import { updateTimeline } from '../../db/timelines';
import Field from '../form/Field';
import NumberInput from '../form/NumberInput';
import FormActions from './FormActions';
import { useDraft } from './useDraft';
import { themes } from '../../themes';
import { brand } from '../../brand';

type Settings = Pick<Timeline, 'title' | 'description' | 'dateFormat' | 'map' | 'theme'>;

const DEFAULT_GALAXY: MapConfig = { type: 'galaxy3d', arms: 4, radius: 100, coreColor: '#ffd9a0', armColor: '#7aa6ff' };

interface Props {
  timeline: Timeline;
  onDirtyChange: (dirty: boolean) => void;
}

export default function SettingsForm({ timeline, onDirtyChange }: Props) {
  const original: Settings = {
    title: timeline.title,
    description: timeline.description,
    dateFormat: timeline.dateFormat,
    map: timeline.map,
    theme: timeline.theme,
  };
  const save = async (s: Settings) => {
    await updateTimeline(timeline.id, (t) => ({ ...t, ...s }));
    onDirtyChange(false);
  };
  const { draft, patch, dirty, saving, submit, reset } = useDraft(original, save, onDirtyChange);
  const titleError = draft.title.trim() ? undefined : 'Give the timeline a title';
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

      <Field label="Date format" hint="The default for new events, and how era start and end dates are entered. Each event can still pick its own.">
        <select value={draft.dateFormat} onChange={(e) => patch({ dateFormat: e.target.value as DateKind })}>
          <option value="year">Years (1066, -500)</option>
          <option value="millennium">Millennia, 40k style (005.M31)</option>
          <option value="freeform">Free text with manual ordering</option>
        </select>
      </Field>

      <Field label="Theme" hint={themes.find((t) => t.id === draft.theme)?.description ?? 'Uses the site default until you pick one.'}>
        {/* '' in the select means "no theme set": stored as undefined */}
        <select value={draft.theme ?? ''} onChange={(e) => patch({ theme: e.target.value || undefined })}>
          <option value="">Site default ({themes.find((t) => t.id === brand.defaultTheme)?.name ?? 'Chronicle'})</option>
          {themes.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </Field>

      <Field label="Map">
        <select value={map.type} onChange={(e) => patch({ map: e.target.value === 'galaxy3d' ? DEFAULT_GALAXY : { type: 'none' } })}>
          <option value="none">No map</option>
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

      <FormActions isNew={false} dirty={dirty} valid={!titleError} saving={saving} onRevert={reset} />
    </form>
  );
}
