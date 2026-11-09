import type { Category } from '../../types/timeline';
import Field from '../form/Field';
import FormActions from './FormActions';
import { useDraft } from './useDraft';
import type { FormProps } from './CollectionTab';

export default function CategoryForm({ original, isNew, onSave, onDelete, onDirtyChange }: FormProps<Category>) {
  const { draft, patch, dirty, saving, submit, reset } = useDraft(original, onSave, onDirtyChange);
  const nameError = draft.name.trim() ? undefined : 'Give the category a name';

  return (
    <form className="form" onSubmit={(e) => submit(e, (d) => ({ ...d, name: d.name.trim() }))}>
      <h2 className="form-title">{isNew ? 'New category' : original.name}</h2>

      <Field label="Name" error={dirty ? nameError : undefined} hint="e.g. a faction, a country, a character">
        <input value={draft.name} onChange={(e) => patch({ name: e.target.value })} autoFocus={isNew} />
      </Field>

      <Field label="Colour" hint="Colours the event's node and its filter chip">
        <input type="color" value={draft.color} onChange={(e) => patch({ color: e.target.value })} />
      </Field>

      <FormActions isNew={isNew} dirty={dirty} valid={!nameError} saving={saving} onRevert={reset} onDelete={onDelete} />
    </form>
  );
}
