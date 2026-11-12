import { Link } from 'react-router-dom';
import type { Character, EventDate, Feat, Timeline } from '../../types/timeline';
import { compareEvents, defaultSortKey, formatDate } from '../../lib/dates';
import { factionTree, indentLabel } from '../../lib/factions';
import { outsideLife } from '../../lib/characters';
import type { RelationshipDraft } from '../../lib/mutations';
import { SIDE_LABELS } from '../../lib/relations';
import Field from '../form/Field';
import PictureField from '../form/PictureField';
import MultiPicker from '../form/MultiPicker';
import MarkdownField from '../form/MarkdownField';
import { DateInput } from '../form/DateInputs';
import FormActions from './FormActions';
import { useDraft } from './useDraft';
import type { FormProps } from './CollectionTab';

/**
 * A character as the form edits it: the character plus the events they're
 * in and their relationships. Events store who's in them (`characterIds`)
 * and the timeline stores relationships, so saving writes both back (see
 * saveCharacterFull).
 */
export type CharacterDraft = Character & { eventIds: string[]; relationships: RelationshipDraft[] };

/** Trim text, and drop feats left without a name. */
const clean = (c: CharacterDraft): CharacterDraft => ({
  ...c,
  name: c.name.trim(),
  description: c.description.trim(),
  imageUrl: c.imageUrl?.trim() || undefined,
  born: c.born && cleanDate(c.born),
  died: c.died && cleanDate(c.died),
  feats: c.feats.map((f) => ({ name: f.name.trim(), description: f.description.trim() })).filter((f) => f.name),
  relationships: c.relationships.filter((r) => r.otherId),
});
const cleanDate = (d: EventDate): EventDate => (d.label === undefined ? d : { ...d, label: d.label.trim() });

export default function CharacterForm({ original, isNew, onSave, onDelete, onDirtyChange, timeline }: FormProps<CharacterDraft> & { timeline: Timeline }) {
  const { draft, patch, dirty, saving, submit, reset } = useDraft(original, onSave, onDirtyChange);
  const calendar = timeline.calendar;

  const events = [...timeline.events].sort(compareEvents);
  const linked = events.filter((e) => draft.eventIds.includes(e.id));
  const needsLabel = (d?: EventDate) => d && (d.label !== undefined || calendar.type === 'freeform') && !d.label?.trim();
  const errors = {
    name: draft.name.trim() ? undefined : 'Give the character a name',
    born: needsLabel(draft.born) ? 'Give the date a label' : undefined,
    died: needsLabel(draft.died)
      ? 'Give the date a label'
      : draft.born && draft.died && draft.died.sortKey < draft.born.sortKey
        ? 'This is before they were born'
        : undefined,
  };
  const valid = !errors.name && !errors.born && !errors.died;
  // Linked events outside their life: allowed, but worth a second look
  const outside = linked
    .map((e) => ({ e, when: outsideLife(draft, e.date.sortKey) }))
    .filter((x) => x.when);

  /** A first guess for a new birth or death date: their first or last event, else the calendar's start. */
  function startDate(which: 'born' | 'died'): EventDate {
    const near = which === 'born' ? linked[0] : linked[linked.length - 1];
    const sortKey = near?.date.sortKey ?? draft.born?.sortKey ?? defaultSortKey(calendar);
    return { sortKey, precision: 'exact', ...(calendar.type === 'freeform' && { label: '' }) };
  }

  const setLink = (i: number, changes: Partial<RelationshipDraft>) =>
    patch({ relationships: draft.relationships.map((r, j) => (j === i ? { ...r, ...changes } : r)) });
  const others = timeline.characters.filter((c) => c.id !== original.id).sort((a, b) => a.name.localeCompare(b.name));

  const setFeat = (i: number, changes: Partial<Feat>) => patch({ feats: draft.feats.map((f, j) => (j === i ? { ...f, ...changes } : f)) });

  return (
    <form className="form" onSubmit={(e) => submit(e, clean)}>
      <div className="form-title-row">
        <h2 className="form-title">{isNew ? 'New character' : original.name}</h2>
        {!isNew && <Link className="btn" to={`/t/${timeline.id}/characters/${original.id}`}>View page</Link>}
      </div>

      <Field label="Name" error={dirty ? errors.name : undefined}>
        <input value={draft.name} onChange={(e) => patch({ name: e.target.value })} autoFocus={isNew} />
      </Field>

      <Field label="Faction" hint="Characters are listed under their faction. Without one, they're independent.">
        <select value={draft.factionId ?? ''} onChange={(e) => patch({ factionId: e.target.value || undefined })}>
          <option value="">Independent</option>
          {factionTree(timeline.factions).map((row) => (
            <option key={row.faction.id} value={row.faction.id}>{indentLabel(row)}</option>
          ))}
        </select>
      </Field>

      <PictureField value={draft.imageUrl} onChange={(imageUrl) => patch({ imageUrl })} />

      {/* Birth and death are optional: tick to give a date */}
      {(['born', 'died'] as const).map((which) => {
        const date = draft[which];
        const label = which === 'born' ? 'Born' : 'Died';
        return (
          <div key={which} className="life-date">
            <label className="check">
              <input type="checkbox" checked={!!date} onChange={(e) => patch({ [which]: e.target.checked ? startDate(which) : undefined })} />
              {which === 'born' ? 'Birth date known' : 'Has died'}
            </label>
            {date && <DateInput label={label} value={date} calendar={calendar} onChange={(d) => patch({ [which]: d })} error={errors[which]} />}
          </div>
        );
      })}

      <MarkdownField label="Description" rows={6} value={draft.description} onChange={(description) => patch({ description })} timeline={timeline} />

      <fieldset className="field feats-edit">
        <legend className="field-label">Feats</legend>
        {draft.feats.length === 0 && <p className="muted">Deeds, skills or titles they're known for.</p>}
        {draft.feats.map((feat, i) => (
          <div key={i} className="feat-edit">
            <div className="inline-inputs">
              <input aria-label={`Feat ${i + 1}: name`} placeholder="Slew the wyrm of Ashfall" value={feat.name} onChange={(e) => setFeat(i, { name: e.target.value })} />
              <button type="button" className="btn" aria-label={`Remove feat ${i + 1}`} onClick={() => patch({ feats: draft.feats.filter((_, j) => j !== i) })}>✕</button>
            </div>
            <textarea rows={2} aria-label={`Feat ${i + 1}: details`} placeholder="Details (optional)" value={feat.description} onChange={(e) => setFeat(i, { description: e.target.value })} />
          </div>
        ))}
        <div>
          <button type="button" className="btn" onClick={() => patch({ feats: [...draft.feats, { name: '', description: '' }] })}>+ Add a feat</button>
        </div>
      </fieldset>

      <fieldset className="field feats-edit">
        <legend className="field-label">Relationships</legend>
        {draft.relationships.length === 0 && (
          <p className="muted">{others.length ? 'Family, mentors, friends and foes. Parents and spouses make up their family tree.' : 'Add more characters to link them.'}</p>
        )}
        {draft.relationships.map((r, i) => (
          <div key={i} className="inline-inputs">
            <select aria-label={`Relationship ${i + 1}: kind`} value={r.kind} onChange={(e) => setLink(i, { kind: e.target.value as RelationshipDraft['kind'] })}>
              {Object.entries(SIDE_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
            <select aria-label={`Relationship ${i + 1}: who`} value={r.otherId} onChange={(e) => setLink(i, { otherId: e.target.value })}>
              <option value="">Pick a character…</option>
              {others.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button type="button" className="btn" aria-label={`Remove relationship ${i + 1}`} onClick={() => patch({ relationships: draft.relationships.filter((_, j) => j !== i) })}>✕</button>
          </div>
        ))}
        {others.length > 0 && (
          <div>
            <button type="button" className="btn" onClick={() => patch({ relationships: [...draft.relationships, { kind: 'child', otherId: '' }] })}>+ Add a relationship</button>
          </div>
        )}
        <span className="field-hint">Saved both ways: "Child of Aldric" also lists them under Children on Aldric's page.</span>
      </fieldset>

      <Field label="Events" group hint="The events they're in, which make up their life on the timeline. You can also add them from each event.">
        <MultiPicker
          label="Add an event"
          placeholder="Add an event…"
          options={events.map((e) => ({ id: e.id, label: `${formatDate(e.date, calendar)} · ${e.title}` }))}
          value={draft.eventIds}
          onChange={(eventIds) => patch({ eventIds })}
        />
        {outside.length > 0 && (
          <ul className="field-warning" role="status">
            {outside.map(({ e, when }) => (
              <li key={e.id}>
                <strong>{e.title}</strong> ({formatDate(e.date, calendar)}) is {when === 'before' ? 'before they were born' : 'after they died'}.
              </li>
            ))}
          </ul>
        )}
      </Field>

      <FormActions isNew={isNew} dirty={dirty} valid={valid} saving={saving} onRevert={reset} onDelete={onDelete} />
    </form>
  );
}
