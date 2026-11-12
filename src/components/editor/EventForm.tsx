import { Link } from 'react-router-dom';
import type { Timeline, TimelineEvent } from '../../types/timeline';
import { compareEvents, formatDate } from '../../lib/dates';
import { eraFor } from '../../lib/eras';
import { outsideLife } from '../../lib/characters';
import { factionPath, factionTree } from '../../lib/factions';
import Field from '../form/Field';
import MultiPicker from '../form/MultiPicker';
import MarkdownField from '../form/MarkdownField';
import TagInput from '../form/TagInput';
import { allTags } from '../../lib/tags';
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
  endDate: e.endDate && (e.endDate.label === undefined ? e.endDate : { ...e.endDate, label: e.endDate.label.trim() }),
  sources: e.sources.map((s) => s.trim()).filter(Boolean),
  tags: [...new Set(e.tags)],
  // Only keep a main faction that's still one of the event's factions
  mainFactionId: e.mainFactionId && e.factionIds.includes(e.mainFactionId) ? e.mainFactionId : undefined,
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
    endDate: !draft.endDate
      ? undefined
      : (draft.endDate.label !== undefined || timeline.calendar.type === 'freeform') && !draft.endDate.label?.trim()
        ? 'Give the date a label'
        : draft.endDate.sortKey < draft.date.sortKey
          ? 'This is before it started'
          : undefined,
  };
  const valid = !errors.title && !errors.date && !errors.endDate;
  const era = eraFor(draft.date.sortKey, timeline.eras);
  // Characters in the event who weren't alive at its date: allowed, but worth a second look
  const notAlive = timeline.characters
    .filter((c) => draft.characterIds.includes(c.id))
    .map((c) => ({ c, when: outsideLife(c, draft.date.sortKey) }))
    .filter((x) => x.when);

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

      {/* An end date makes it a span (a war, a reign), drawn as a bar */}
      <label className="check">
        <input
          type="checkbox"
          checked={!!draft.endDate}
          onChange={(e) => patch({ endDate: e.target.checked ? { ...draft.date, precision: draft.date.precision === 'period' ? 'exact' : draft.date.precision } : undefined })}
        />
        Lasted a while (has an end date)
      </label>
      {draft.endDate && (
        <DateInput label="Ended" value={draft.endDate} calendar={timeline.calendar} onChange={(endDate) => patch({ endDate })} error={dirty ? errors.endDate : undefined} />
      )}

      <Field label="Summary" hint="One line, shown when hovering the node">
        <input value={draft.summary} maxLength={160} onChange={(e) => patch({ summary: e.target.value })} />
      </Field>

      <Field
        label="Factions"
        group
        hint={
          timeline.factions.length === 0
            ? 'Add factions in the Factions tab'
            : 'Pick the most specific one: it also counts under its parents. Mark the main player with ☆: it sets the node colour and the theme.'
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
          primaryId={draft.mainFactionId}
          onPrimaryChange={(mainFactionId) => patch({ mainFactionId })}
          primaryLabel="main faction"
        />
      </Field>

      <Field label="Tags" group hint={'Free labels like "battle" or "treaty", separate from factions. Press Enter after each. The viewer can filter by them.'}>
        <TagInput label="Add a tag" value={draft.tags} onChange={(tags) => patch({ tags })} suggestions={allTags(timeline.events)} />
      </Field>

      <MarkdownField label="Details" value={draft.body} onChange={(body) => patch({ body })} timeline={timeline} sourceCount={draft.sources.map((s) => s.trim()).filter(Boolean).length} />

      <Field label="Places" group hint={timeline.places.length === 0 ? 'Add places in the Places tab' : undefined}>
        <MultiPicker
          label="Add a place"
          placeholder="Add a place…"
          options={timeline.places.map((p) => ({ id: p.id, label: p.name }))}
          value={draft.placeIds}
          onChange={(placeIds) => patch({ placeIds })}
        />
      </Field>

      <Field label="Characters" group hint={timeline.characters.length === 0 ? 'Add characters in the Characters tab' : 'Who took part. The event shows up in their life story.'}>
        <MultiPicker
          label="Add a character"
          placeholder="Add a character…"
          options={[...timeline.characters].sort((a, b) => a.name.localeCompare(b.name)).map((c) => ({ id: c.id, label: c.name }))}
          value={draft.characterIds}
          onChange={(characterIds) => patch({ characterIds })}
        />
        {notAlive.length > 0 && (
          <ul className="field-warning" role="status">
            {notAlive.map(({ c, when }) => (
              <li key={c.id}>
                <strong>{c.name}</strong> {when === 'before' ? `isn't born yet (born ${formatDate(c.born!, timeline.calendar)})` : `has already died (died ${formatDate(c.died!, timeline.calendar)})`}.
              </li>
            ))}
          </ul>
        )}
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

      <Field label="Sources" hint="One per line, e.g. a book title or [a title](https://…). Write [^1] in the details to cite the first, [^2] the second…">
        <textarea rows={3} value={draft.sources.join('\n')} onChange={(e) => patch({ sources: e.target.value.split('\n') })} />
      </Field>

      <Field label="Image URL" hint="Optional. Shown in the info box">
        <input type="url" value={draft.imageUrl ?? ''} placeholder="https://…" onChange={(e) => patch({ imageUrl: e.target.value })} />
      </Field>

      <FormActions isNew={isNew} dirty={dirty} valid={valid} saving={saving} onRevert={reset} onDelete={onDelete} />
    </form>
  );
}
