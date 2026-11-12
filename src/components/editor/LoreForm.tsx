import { useId } from 'react';
import { Link } from 'react-router-dom';
import type { LorePage, Timeline } from '../../types/timeline';
import { EVENT_SIZE } from '../../lib/images';
import { loreCategories } from '../../lib/lore';
import Field from '../form/Field';
import PictureField from '../form/PictureField';
import MarkdownField from '../form/MarkdownField';
import FormActions from './FormActions';
import { useDraft } from './useDraft';
import type { FormProps } from './CollectionTab';

const clean = (p: LorePage): LorePage => ({
  ...p,
  title: p.title.trim(),
  category: p.category.trim(),
  body: p.body.trim(),
  imageUrl: p.imageUrl?.trim() || undefined,
  sources: p.sources.map((s) => s.trim()).filter(Boolean),
});

/** A lore page: anything that isn't an event, character, place or faction. */
export default function LoreForm({ original, isNew, onSave, onDelete, onDirtyChange, timeline }: FormProps<LorePage> & { timeline: Timeline }) {
  const { draft, patch, dirty, saving, submit, reset } = useDraft(original, onSave, onDirtyChange);
  const titleError = draft.title.trim() ? undefined : 'Give the page a title';
  const categoryList = useId();

  return (
    <form className="form" onSubmit={(e) => submit(e, clean)}>
      <div className="form-title-row">
        <h2 className="form-title">{isNew ? 'New lore page' : original.title}</h2>
        {!isNew && <Link className="btn" to={`/t/${timeline.id}/lore/${encodeURIComponent(original.id)}`}>View page</Link>}
      </div>

      <Field label="Title" error={dirty ? titleError : undefined} hint="e.g. a religion, a language, an artefact, a custom">
        <input value={draft.title} onChange={(e) => patch({ title: e.target.value })} autoFocus={isNew} />
      </Field>

      <Field label="Category" hint="Pages are listed under their category. Pick one already used, or type a new one.">
        <input list={categoryList} value={draft.category} placeholder="Religions" onChange={(e) => patch({ category: e.target.value })} />
        <datalist id={categoryList}>
          {loreCategories(timeline.lore).map((c) => <option key={c} value={c} />)}
        </datalist>
      </Field>

      <PictureField value={draft.imageUrl} onChange={(imageUrl) => patch({ imageUrl })} maxSide={EVENT_SIZE} wide hint="Optional. Shown at the top of the page. Upload one, or paste a web address." />

      <MarkdownField
        label="Text"
        rows={14}
        value={draft.body}
        onChange={(body) => patch({ body })}
        timeline={timeline}
        sourceCount={draft.sources.map((s) => s.trim()).filter(Boolean).length}
      />

      <Field label="Sources" hint="One per line. Write [^1] in the text to cite the first, [^2] the second…">
        <textarea rows={3} value={draft.sources.join('\n')} onChange={(e) => patch({ sources: e.target.value.split('\n') })} />
      </Field>

      <FormActions isNew={isNew} dirty={dirty} valid={!titleError} saving={saving} onRevert={reset} onDelete={onDelete} />
    </form>
  );
}
