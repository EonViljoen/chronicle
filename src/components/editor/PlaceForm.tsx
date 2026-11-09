import { Suspense } from 'react';
import type { Place, Timeline } from '../../types/timeline';
import { GalaxyMap } from '../map/LazyGalaxyMap';
import Field from '../form/Field';
import NumberInput from '../form/NumberInput';
import FormActions from './FormActions';
import { useDraft } from './useDraft';
import type { FormProps } from './CollectionTab';

export default function PlaceForm({ original, isNew, onSave, onDelete, onDirtyChange, timeline }: FormProps<Place> & { timeline: Timeline }) {
  const { draft, patch, dirty, saving, submit, reset } = useDraft(original, onSave, onDirtyChange);
  const nameError = draft.name.trim() ? undefined : 'Give the place a name';
  const map = timeline.map;
  const position = draft.position;

  /** Change one axis (0 = x, 1 = y, 2 = z), keeping the other two. */
  function setAxis(axis: 0 | 1 | 2, value: number | undefined) {
    if (!position || value === undefined) return;
    const next: [number, number, number] = [...position];
    next[axis] = value;
    patch({ position: next });
  }

  return (
    <form className="form" onSubmit={(e) => submit(e, (d) => ({ ...d, name: d.name.trim(), description: d.description.trim() }))}>
      <h2 className="form-title">{isNew ? 'New place' : original.name}</h2>

      <Field label="Name" error={dirty ? nameError : undefined}>
        <input value={draft.name} onChange={(e) => patch({ name: e.target.value })} autoFocus={isNew} />
      </Field>

      <Field label="Description">
        <textarea rows={4} value={draft.description} onChange={(e) => patch({ description: e.target.value })} />
      </Field>

      <Field
        label="Map position"
        group
        hint={
          map.type === 'galaxy3d'
            ? `Click the galaxy to place it, or type coordinates. The centre is 0, 0, 0 and the galaxy's radius is ${map.radius}; Y is height above or below the disc.`
            : undefined
        }
      >
        {map.type === 'galaxy3d' ? (
          <div className="map-picker">
            <Suspense fallback={<p className="map-loading">Loading map…</p>}>
              <GalaxyMap
                config={map}
                places={timeline.places.filter((p) => p.id !== original.id)}
                // Clicking sets X and Z on the disc; keep any Y you typed
                pick={{ position, onPick: ([x, , z]) => patch({ position: [x, position?.[1] ?? 0, z] }) }}
              />
            </Suspense>
          </div>
        ) : (
          <span className="muted">This timeline has no map. Turn one on in the Settings tab.</span>
        )}
        {position ? (
          <div className="inline-inputs wrap coords">
            {(['X', 'Y', 'Z'] as const).map((label, axis) => (
              <label key={label} className="coord">
                <span className="muted">{label}</span>
                <NumberInput
                  className="w-md"
                  integer={false}
                  value={position[axis]}
                  onChange={(v) => setAxis(axis as 0 | 1 | 2, v)}
                  aria-label={`${label} coordinate`}
                />
              </label>
            ))}
            <button type="button" className="btn" onClick={() => patch({ position: null })}>Remove from map</button>
          </div>
        ) : (
          <div>
            <button type="button" className="btn" onClick={() => patch({ position: [0, 0, 0] })}>Enter coordinates</button>
          </div>
        )}
      </Field>

      <FormActions isNew={isNew} dirty={dirty} valid={!nameError} saving={saving} onRevert={reset} onDelete={onDelete} />
    </form>
  );
}
