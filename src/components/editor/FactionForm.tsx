import type { Faction } from '../../types/timeline';
import { factionThemeId, factionTree, indentLabel, withDescendants } from '../../lib/factions';
import { useThemes } from '../../db/themes';
import { isPreset } from '../../themes';
import Field from '../form/Field';
import FormActions from './FormActions';
import { useDraft } from './useDraft';
import type { FormProps } from './CollectionTab';

export default function FactionForm({ original, isNew, onSave, onDelete, onDirtyChange, factions }: FormProps<Faction> & { factions: Faction[] }) {
  const { draft, patch, dirty, saving, submit, reset } = useDraft(original, onSave, onDirtyChange);
  const nameError = draft.name.trim() ? undefined : 'Give the faction a name';

  // A faction can't sit under itself or anything under it (that would be a loop)
  const blocked = isNew ? new Set<string>() : withDescendants(original.id, factions);
  const parentOptions = factionTree(factions).filter((row) => !blocked.has(row.faction.id));

  // What "no theme" means for this faction: its nearest parent's theme, else the timeline's
  const themes = useThemes();
  const inheritedId = draft.parentId ? factionThemeId(draft.parentId, factions) : undefined;
  const inherited = themes.find((t) => t.id === inheritedId);

  function changeParent(parentId: string) {
    const parent = factions.find((c) => c.id === parentId);
    patch({
      parentId: parent?.id,
      // A new sub-faction starts with its parent's colour
      ...(isNew && parent && { color: parent.color }),
    });
  }

  return (
    <form className="form" onSubmit={(e) => submit(e, (d) => ({ ...d, name: d.name.trim() }))}>
      <h2 className="form-title">{isNew ? 'New faction' : original.name}</h2>

      <Field label="Name" error={dirty ? nameError : undefined} hint="e.g. an army, a nation, a noble house, a guild">
        <input value={draft.name} onChange={(e) => patch({ name: e.target.value })} autoFocus={isNew} />
      </Field>

      <Field label="Parent" hint="Put it under another faction. Filtering by the parent includes it.">
        <select value={draft.parentId ?? ''} onChange={(e) => changeParent(e.target.value)}>
          <option value="">None (top level)</option>
          {parentOptions.map((row) => (
            <option key={row.faction.id} value={row.faction.id}>{indentLabel(row)}</option>
          ))}
        </select>
      </Field>

      <Field label="Colour" hint="Colours the event's node and its filter chip">
        <input type="color" value={draft.color} onChange={(e) => patch({ color: e.target.value })} />
      </Field>

      <Field
        label="Theme"
        hint="The page switches to this theme when the faction is in focus: it's the selected event's main faction, or the only faction you're filtering on."
      >
        <select value={draft.themeId ?? ''} onChange={(e) => patch({ themeId: e.target.value || undefined })}>
          <option value="">{inherited ? `None: use the parent's (${inherited.name})` : "None: keep the timeline's theme"}</option>
          {themes.map((t) => (
            <option key={t.id} value={t.id}>{t.name}{isPreset(t.id) ? ' (built in)' : ''}</option>
          ))}
        </select>
      </Field>

      <FormActions isNew={isNew} dirty={dirty} valid={!nameError} saving={saving} onRevert={reset} onDelete={onDelete} />
    </form>
  );
}
