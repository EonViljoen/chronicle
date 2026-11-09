import type { Place } from '../../types/timeline';
import Field from '../form/Field';
import FormActions from './FormActions';
import { useDraft } from './useDraft';
import type { FormProps } from './CollectionTab';

export default function PlaceForm({ original, isNew, onSave, onDelete, onDirtyChange }: FormProps<Place>) {
  const { draft, patch, dirty, saving, submit, reset } = useDraft(original, onSave, onDirtyChange);
  const nameError = draft.name.trim() ? undefined : 'Give the place a name';

  return (
    <form className="form" onSubmit={(e) => submit(e, (d) => ({ ...d, name: d.name.trim(), description: d.description.trim() }))}>
      <h2 className="form-title">{isNew ? 'New place' : original.name}</h2>

      <Field label="Name" error={dirty ? nameError : undefined}>
        <input value={draft.name} onChange={(e) => patch({ name: e.target.value })} autoFocus={isNew} />
      </Field>

      <Field label="Description">
        <textarea rows={4} value={draft.description} onChange={(e) => patch({ description: e.target.value })} />
      </Field>

      <Field label="Map position" group>
        {draft.position ? (
          <div className="inline-inputs">
            <span className="muted">
              x {draft.position[0].toFixed(1)}, y {draft.position[1].toFixed(1)}, z {draft.position[2].toFixed(1)}
            </span>
            <button type="button" className="btn" onClick={() => patch({ position: null })}>Clear</button>
          </div>
        ) : (
          <span className="muted">Not placed yet. You'll be able to click it onto the starmap once the map is built.</span>
        )}
      </Field>

      <FormActions isNew={isNew} dirty={dirty} valid={!nameError} saving={saving} onRevert={reset} onDelete={onDelete} />
    </form>
  );
}
