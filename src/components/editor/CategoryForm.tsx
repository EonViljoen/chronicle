import type { Category } from '../../types/timeline';
import { categoryTree, indentLabel, withDescendants } from '../../lib/categories';
import Field from '../form/Field';
import FormActions from './FormActions';
import { useDraft } from './useDraft';
import type { FormProps } from './CollectionTab';

export default function CategoryForm({ original, isNew, onSave, onDelete, onDirtyChange, categories }: FormProps<Category> & { categories: Category[] }) {
  const { draft, patch, dirty, saving, submit, reset } = useDraft(original, onSave, onDirtyChange);
  const nameError = draft.name.trim() ? undefined : 'Give the category a name';

  // A category can't sit under itself or anything under it (that would be a loop)
  const blocked = isNew ? new Set<string>() : withDescendants(original.id, categories);
  const parentOptions = categoryTree(categories).filter((row) => !blocked.has(row.category.id));

  function changeParent(parentId: string) {
    const parent = categories.find((c) => c.id === parentId);
    patch({
      parentId: parent?.id,
      // A new sub-category starts with its parent's colour
      ...(isNew && parent && { color: parent.color }),
    });
  }

  return (
    <form className="form" onSubmit={(e) => submit(e, (d) => ({ ...d, name: d.name.trim() }))}>
      <h2 className="form-title">{isNew ? 'New category' : original.name}</h2>

      <Field label="Name" error={dirty ? nameError : undefined} hint="e.g. a faction, a country, a character">
        <input value={draft.name} onChange={(e) => patch({ name: e.target.value })} autoFocus={isNew} />
      </Field>

      <Field label="Parent" hint="Put it under another category. Filtering by the parent includes it.">
        <select value={draft.parentId ?? ''} onChange={(e) => changeParent(e.target.value)}>
          <option value="">None (top level)</option>
          {parentOptions.map((row) => (
            <option key={row.category.id} value={row.category.id}>{indentLabel(row)}</option>
          ))}
        </select>
      </Field>

      <Field label="Colour" hint="Colours the event's node and its filter chip">
        <input type="color" value={draft.color} onChange={(e) => patch({ color: e.target.value })} />
      </Field>

      <FormActions isNew={isNew} dirty={dirty} valid={!nameError} saving={saving} onRevert={reset} onDelete={onDelete} />
    </form>
  );
}
