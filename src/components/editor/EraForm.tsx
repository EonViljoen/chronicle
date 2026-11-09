import type { DateKind, Era } from '../../types/timeline';
import Field from '../form/Field';
import { SortKeyInput } from '../form/DateInputs';
import FormActions from './FormActions';
import { useDraft } from './useDraft';
import type { FormProps } from './CollectionTab';

export default function EraForm({ original, isNew, onSave, onDelete, onDirtyChange, dateFormat }: FormProps<Era> & { dateFormat: DateKind }) {
  const { draft, patch, dirty, saving, submit, reset } = useDraft(original, onSave, onDirtyChange);

  const errors = {
    name: draft.name.trim() ? undefined : 'Give the era a name',
    end: draft.end < draft.start ? 'The end must come after the start' : undefined,
  };
  const valid = !errors.name && !errors.end;

  return (
    <form className="form" onSubmit={(e) => submit(e, (d) => ({ ...d, name: d.name.trim() }))}>
      <h2 className="form-title">{isNew ? 'New era' : original.name}</h2>

      <Field label="Name" error={dirty ? errors.name : undefined}>
        <input value={draft.name} onChange={(e) => patch({ name: e.target.value })} autoFocus={isNew} />
      </Field>

      <Field label="Colour" hint="Used for the band behind the timeline">
        <input type="color" value={draft.color} onChange={(e) => patch({ color: e.target.value })} />
      </Field>

      <div className="field-row">
        <SortKeyInput label="Starts" kind={dateFormat} value={draft.start} onChange={(start) => patch({ start })} />
        <SortKeyInput label="Ends" kind={dateFormat} value={draft.end} onChange={(end) => patch({ end })} error={errors.end} />
      </div>

      <FormActions isNew={isNew} dirty={dirty} valid={valid} saving={saving} onRevert={reset} onDelete={onDelete} />
    </form>
  );
}
