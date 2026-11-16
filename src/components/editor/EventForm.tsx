import { Link } from 'react-router-dom';
import type { Timeline } from '../../types/timeline';
import type { EventDraft } from '../../lib/mutations';
import { containersOf, isPeriod, periodMoments, previewPeriodDates } from '../../lib/periods';
import { compareEvents, formatDate, formatSpan } from '../../lib/dates';
import { eraFor } from '../../lib/eras';
import { outsideLife } from '../../lib/characters';
import { factionPath, factionTree, mainFactionOf } from '../../lib/factions';
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
const clean = (e: EventDraft): EventDraft => ({
  ...e,
  title: e.title.trim(),
  summary: e.summary.trim(),
  body: e.body.trim(),
  imageUrl: e.imageUrl?.trim() || undefined,
  date: e.date.label === undefined ? e.date : { ...e.date, label: e.date.label.trim() },
  endDate: e.endDate && (e.endDate.label === undefined ? e.endDate : { ...e.endDate, label: e.endDate.label.trim() }),
  sources: e.sources.map((s) => s.trim()).filter(Boolean),
  tags: [...new Set(e.tags)],
  // An only faction is the main one; else keep a main faction that's still one of the event's factions
  mainFactionId: mainFactionOf(e),
});

export default function EventForm({ original, isNew, onSave, onDelete, onDirtyChange, timeline }: FormProps<EventDraft> & { timeline: Timeline }) {
  const { draft, patch, dirty, saving, submit, reset } = useDraft(original, onSave, onDirtyChange);
  const period = isPeriod(draft);
  // A period with events takes its dates from them (unless it keeps its own)
  const others = timeline.events.filter((e) => e.id !== original.id);
  const autoDates = period && (draft.includedIds?.length ?? 0) > 0 && !draft.ownDates ? previewPeriodDates(draft, timeline.events) : undefined;

  const dateErrors = {
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
  // Dates worked out from a period's events aren't typed in, so there's nothing to check
  const errors = autoDates ? { ...dateErrors, date: undefined, endDate: undefined } : dateErrors;
  const valid = !errors.title && !errors.date && !errors.endDate;

  // What a period can include: anything but itself and the periods holding it (that would be a loop)
  const holding = containersOf(original.id, timeline.events);
  const sorted = [...others].sort(compareEvents);
  const optionLabel = (e: (typeof others)[number]) => `${isPeriod(e) ? '▬ ' : ''}${formatSpan(e, timeline.calendar)} · ${e.title}`;
  const includable = sorted.filter((e) => !holding.has(e.id) && !draft.partOfIds.includes(e.id)).map((e) => ({ id: e.id, label: optionLabel(e) }));
  // What it can be part of: periods, except ones inside it (that would be a loop too)
  const inside = new Set(period ? [...periodMoments(draft, timeline.events).map((e) => e.id), ...insidePeriods(draft.includedIds ?? [], timeline)] : []);
  const periodOptions = sorted.filter((e) => isPeriod(e) && !inside.has(e.id)).map((e) => ({ id: e.id, label: optionLabel(e) }));
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

      <Field label="Kind" group hint={period ? 'A stretch of time that holds other events, like a war and its battles. It has no node: it shows as a bar under its events.' : 'Something that happened: a node on the timeline.'}>
        <div className="segmented" role="group" aria-label="Kind">
          <button type="button" aria-pressed={!period} onClick={() => patch({ kind: undefined })}>Moment</button>
          <button type="button" aria-pressed={period} onClick={() => patch({ kind: 'period', includedIds: draft.includedIds ?? [] })}>Period</button>
        </div>
      </Field>

      <Field label="Title" error={dirty ? errors.title : undefined}>
        <input value={draft.title} onChange={(e) => patch({ title: e.target.value })} autoFocus={isNew} />
      </Field>

      {period && (
        <Field label="Includes" group hint={others.length === 0 ? 'Add some events first.' : 'The events in it, which its bar spans. Periods can hold periods. With none picked, it covers the events between its dates.'}>
          <MultiPicker label="Add an event to the period" placeholder="Add an event…" options={includable} value={draft.includedIds ?? []} onChange={(includedIds) => patch({ includedIds })} />
        </Field>
      )}

      {period && (draft.includedIds?.length ?? 0) > 0 && (
        <label className="check">
          <input type="checkbox" checked={!!draft.ownDates} onChange={(e) => patch({ ownDates: e.target.checked || undefined })} />
          Set its own dates (e.g. it began before its first event)
        </label>
      )}

      {autoDates ? (
        <p className="field-note">
          Runs <strong>{formatSpan(autoDates, timeline.calendar)}</strong>, from its first event to its last.
        </p>
      ) : (
        <>
          <DateInput label={period ? 'Began' : 'Date'} value={draft.date} calendar={timeline.calendar} onChange={(date) => patch({ date })} error={dirty ? errors.date : undefined} />
          <p className="field-note">{era ? <>Falls in <strong>{era.name}</strong></> : 'Not inside any era'}</p>
        </>
      )}

      {/* An end date makes it a span (a reign), drawn as a bar; a period always is one */}
      {!autoDates && (
      <label className="check">
        <input
          type="checkbox"
          checked={!!draft.endDate}
          onChange={(e) => patch({ endDate: e.target.checked ? { ...draft.date, precision: draft.date.precision === 'period' ? 'exact' : draft.date.precision } : undefined })}
        />
        {period ? 'Has an end date' : 'Lasted a while (has an end date)'}
      </label>
      )}
      {!autoDates && draft.endDate && (
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
          primaryId={mainFactionOf(draft)}
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

      {periodOptions.length > 0 && (
        <Field label="Part of" group hint="Periods this belongs to, e.g. the war a battle was fought in. Its bar then reaches this event.">
          <MultiPicker label="Add to a period" placeholder="Add to a period…" options={periodOptions} value={draft.partOfIds} onChange={(partOfIds) => patch({ partOfIds })} />
        </Field>
      )}

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

/** Periods inside these ids, however deep. */
function insidePeriods(ids: string[], timeline: Timeline): string[] {
  const found = new Set<string>();
  const queue = [...ids];
  while (queue.length) {
    const e = timeline.events.find((x) => x.id === queue.shift());
    if (!e || !isPeriod(e) || found.has(e.id)) continue;
    found.add(e.id);
    queue.push(...(e.includedIds ?? []));
  }
  return [...found];
}
