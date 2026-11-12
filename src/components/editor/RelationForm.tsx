import type { EventDate, FactionRelation, RelationKind, Timeline } from '../../types/timeline';
import { defaultSortKey } from '../../lib/dates';
import { factionTree, indentLabel } from '../../lib/factions';
import { RELATION_KINDS } from '../../lib/relations';
import Field from '../form/Field';
import MarkdownField from '../form/MarkdownField';
import { DateInput } from '../form/DateInputs';
import FormActions from './FormActions';
import { useDraft } from './useDraft';
import type { FormProps } from './CollectionTab';

const cleanDate = (d?: EventDate) => d && (d.label === undefined ? d : { ...d, label: d.label.trim() });

/** How two factions stand with each other, and when. */
export default function RelationForm({ original, isNew, onSave, onDelete, onDirtyChange, timeline }: FormProps<FactionRelation> & { timeline: Timeline }) {
  const { draft, patch, dirty, saving, submit, reset } = useDraft(original, onSave, onDirtyChange);
  const { calendar } = timeline;
  const options = factionTree(timeline.factions);
  const needsLabel = (d?: EventDate) => d && (d.label !== undefined || calendar.type === 'freeform') && !d.label?.trim();
  const errors = {
    factions: !draft.fromId || !draft.toId ? 'Pick both factions' : draft.fromId === draft.toId ? 'Pick two different factions' : undefined,
    start: needsLabel(draft.start) ? 'Give the date a label' : undefined,
    end: needsLabel(draft.end) ? 'Give the date a label' : draft.start && draft.end && draft.end.sortKey < draft.start.sortKey ? 'This is before it began' : undefined,
  };
  const valid = !errors.factions && !errors.start && !errors.end;
  const oneWay = RELATION_KINDS[draft.kind].directed;
  const nameOf = (id: string) => timeline.factions.find((f) => f.id === id)?.name ?? '?';
  const newDate = (): EventDate => ({ sortKey: draft.start?.sortKey ?? defaultSortKey(calendar), precision: 'exact', ...(calendar.type === 'freeform' && { label: '' }) });

  const picker = (label: string, value: string, onChange: (id: string) => void) => (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Pick a faction…</option>
        {options.map((row) => <option key={row.faction.id} value={row.faction.id}>{indentLabel(row)}</option>)}
      </select>
    </Field>
  );

  return (
    <form className="form" onSubmit={(e) => submit(e, (r) => ({ ...r, note: r.note.trim(), start: cleanDate(r.start), end: cleanDate(r.end) }))}>
      <h2 className="form-title">{isNew ? 'New relation' : `${nameOf(original.fromId)} – ${nameOf(original.toId)}`}</h2>

      {timeline.factions.length < 2 && <p className="field-warning">Add at least two factions first, in the Factions tab.</p>}

      {picker(oneWay ? 'Faction (who serves)' : 'Faction', draft.fromId, (fromId) => patch({ fromId }))}

      <Field label="Relation" hint={oneWay ? 'One way: the first faction serves the second (a vassal, a client state, a sworn order).' : 'Two way: it reads the same from either side.'}>
        <select value={draft.kind} onChange={(e) => patch({ kind: e.target.value as RelationKind })}>
          {Object.entries(RELATION_KINDS).map(([k, s]) => <option key={k} value={k}>{s.label} ({s.verb})</option>)}
        </select>
      </Field>

      {picker(oneWay ? 'Serves' : 'With', draft.toId, (toId) => patch({ toId }))}
      {dirty && errors.factions && <p className="field-error" role="alert">{errors.factions}</p>}

      {(['start', 'end'] as const).map((which) => (
        <div key={which} className="life-date">
          <label className="check">
            <input type="checkbox" checked={!!draft[which]} onChange={(e) => patch({ [which]: e.target.checked ? newDate() : undefined })} />
            {which === 'start' ? 'Has a start date' : 'Has ended'}
          </label>
          {draft[which] && (
            <DateInput label={which === 'start' ? 'Began' : 'Ended'} value={draft[which]} calendar={calendar} onChange={(d) => patch({ [which]: d })} error={errors[which]} />
          )}
        </div>
      ))}
      <p className="field-note">Without dates it counts for all time. The relations page can show one era at a time.</p>

      <MarkdownField label="Note" rows={4} value={draft.note} onChange={(note) => patch({ note })} timeline={timeline} />

      <FormActions isNew={isNew} dirty={dirty} valid={valid} saving={saving} onRevert={reset} onDelete={onDelete} />
    </form>
  );
}
