import { Suspense } from 'react';
import type { Place, Timeline } from '../../types/timeline';
import { GalaxyMap } from '../map/LazyGalaxyMap';
import Field from '../form/Field';
import FormActions from './FormActions';
import { useDraft } from './useDraft';
import type { FormProps } from './CollectionTab';

export default function PlaceForm({ original, isNew, onSave, onDelete, onDirtyChange, timeline }: FormProps<Place> & { timeline: Timeline }) {
  const { draft, patch, dirty, saving, submit, reset } = useDraft(original, onSave, onDirtyChange);
  const nameError = draft.name.trim() ? undefined : 'Give the place a name';
  const map = timeline.map;

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
        hint={map.type === 'galaxy3d' ? 'Click the galaxy to place it. Drag to rotate, scroll to zoom.' : undefined}
      >
        {map.type === 'galaxy3d' ? (
          <div className="map-picker">
            <Suspense fallback={<p className="map-loading">Loading map…</p>}>
              <GalaxyMap
                config={map}
                places={timeline.places.filter((p) => p.id !== original.id)}
                pick={{ position: draft.position, onPick: (position) => patch({ position }) }}
              />
            </Suspense>
          </div>
        ) : (
          <span className="muted">This timeline has no map. Turn one on in the Settings tab.</span>
        )}
        {draft.position && (
          <div className="inline-inputs">
            <span className="muted">
              x {draft.position[0].toFixed(1)}, z {draft.position[2].toFixed(1)}
            </span>
            <button type="button" className="btn" onClick={() => patch({ position: null })}>Remove from map</button>
          </div>
        )}
      </Field>

      <FormActions isNew={isNew} dirty={dirty} valid={!nameError} saving={saving} onRevert={reset} onDelete={onDelete} />
    </form>
  );
}
