import { Link } from 'react-router-dom';
import type { Timeline, TimelineEvent } from '../../types/timeline';
import { compareEvents, formatDate } from '../../lib/dates';
import { eraFor } from '../../lib/eras';
import { factionPath, factionTree } from '../../lib/factions';
import Field from '../form/Field';
import MultiPicker from '../form/MultiPicker';
import MarkdownField from '../form/MarkdownField';
import { DateInput } from '../form/DateInputs';
import FormActions from './FormActions';
import { useDraft } from './useDraft';
import type { FormProps } from './CollectionTab';

/** Trim text fields and drop empty source lines before saving. */
const clean = (e: TimelineEvent): TimelineEvent => ({
  ...e,
  title: e.title.trim(),
  summary: e.summary.trim(),
  body: e.body.trim(),
  imageUrl: e.imageUrl?.trim() || undefined,
  date: e.date.label === undefined ? e.date : { ...e.date, label: e.date.label.trim() },
  sources: e.sources.map((s) => s.trim()).filter(Boolean),
});

export default function EventForm({ original, isNew, onSave, onDelete, onDirtyChange, timeline }: FormProps<TimelineEvent> & { timeline: Timeline }) {
  const { draft, patch, dirty, saving, submit, reset } = useDraft(original, onSave, onDirtyChange);

  const errors = {
    title: draft.title.trim() ? undefined : 'Give the event a title',
    // Free-text dates (and every date in a free-text calendar) need a label
    date:
      (draft.date.label !== undefined || timeline.calendar.type === 'freeform') && !draft.date.label?.trim()
        ? 'Give the date a label'
        : undefined,
  };
  const valid = !errors.title && !errors.date;
  const era = eraFor(draft.date.sortKey, timeline.eras);

  const otherEvents = [...timeline.events]
    .filter((e) => e.id !== original.id)
    .sort(compareEvents)
    .map((e) => ({ id: e.id, label: `${formatDate(e.date, timeline.calendar)} · ${e.title}` }));

  return (
    <form className="form" onSubmit={(e) => submit(e, clean)}>
      <div className="form-title-row">
        <h2 className="form-title">{isNew ? 'New event' : original.title}</h2>
        {!isNew && <Link className="btn" to={`/t/${timeline.id}?event=${original.id}`}>View on timeline</Link>}
      </div>

      <Field label="Title" error={dirty ? errors.title : undefined}>
        <input value={draft.title} onChange={(e) => patch({ title: e.target.value })} autoFocus={isNew} />
      </Field>

      <DateInput value={draft.date} calendar={timeline.calendar} onChange={(date) => patch({ date })} error={dirty ? errors.date : undefined} />
      <p className="field-note">{era ? <>Falls in <strong>{era.name}</strong></> : 'Not inside any era'}</p>

      <Field label="Summary" hint="One line, shown when hovering the node">
        <input value={draft.summary} maxLength={160} onChange={(e) => patch({ summary: e.target.value })} />
      </Field>

      <Field
        label="Factions"
        group
        hint={
          timeline.factions.length === 0
            ? 'Add factions in the Factions tab'
            : 'Pick the most specific one: it also counts under its parents. The first one sets the node colour.'
        }
      >
        <MultiPicker
          label="Add a faction"
          placeholder="Add a faction…"
          // Full paths, so two "Veterans" under different parents can be told apart
          options={factionTree(timeline.factions).map(({ faction }) => ({
            id: faction.id,
            label: factionPath(faction.id, timeline.factions),
          }))}
          value={draft.factionIds}
          onChange={(factionIds) => patch({ factionIds })}
        />
      </Field>

      <MarkdownField label="Details" value={draft.body} onChange={(body) => patch({ body })} />

      <Field label="Places" group hint={timeline.places.length === 0 ? 'Add places in the Places tab' : undefined}>
        <MultiPicker
          label="Add a place"
          placeholder="Add a place…"
          options={timeline.places.map((p) => ({ id: p.id, label: p.name }))}
          value={draft.placeIds}
          onChange={(placeIds) => patch({ placeIds })}
        />
      </Field>

      <Field label="Related events" group hint="Links are two-way: the other event will link back here">
        <MultiPicker
          label="Add a related event"
          placeholder="Add a related event…"
          options={otherEvents}
          value={draft.relatedIds}
          onChange={(relatedIds) => patch({ relatedIds })}
        />
      </Field>

      <Field label="Sources" hint="One per line, e.g. a book title">
        <textarea rows={3} value={draft.sources.join('\n')} onChange={(e) => patch({ sources: e.target.value.split('\n') })} />
      </Field>

      <Field label="Image URL" hint="Optional. Shown in the info box">
        <input type="url" value={draft.imageUrl ?? ''} placeholder="https://…" onChange={(e) => patch({ imageUrl: e.target.value })} />
      </Field>

      <FormActions isNew={isNew} dirty={dirty} valid={valid} saving={saving} onRevert={reset} onDelete={onDelete} />
    </form>
  );
}
