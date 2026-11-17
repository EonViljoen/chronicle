import { Suspense } from 'react';
import { Link } from 'react-router-dom';
import type { GalaxyConfig, Timeline } from '../../types/timeline';
import { GalaxyMap } from '../map/LazyGalaxyMap';
import Field from '../form/Field';
import NumberInput from '../form/NumberInput';
import FormActions from './FormActions';
import { useDraft } from './useDraft';

/** A new starmap: four arms, coloured by the theme. The custom colours are only a starting point. */
export const DEFAULT_GALAXY: GalaxyConfig = { type: 'galaxy3d', arms: 4, radius: 100, colors: 'theme', coreColor: '#ffd9a0', armColor: '#7aa6ff' };

interface Props {
  timeline: Timeline;
  original: GalaxyConfig;
  /** Adding the starmap (it's off until saved). */
  isNew: boolean;
  onSave: (map: GalaxyConfig) => Promise<void>;
  onCancel: () => void;
  onDirtyChange: (dirty: boolean) => void;
}

/**
 * The 3D starmap's form, opened in the Maps tab: its arms and colours, with
 * a live preview. A timeline has at most one starmap; places are positioned
 * on it in the Places tab, and maps can sit inside it.
 */
export default function StarmapForm({ timeline, original, isNew, onSave, onCancel, onDirtyChange }: Props) {
  const { draft, patch, dirty, saving, submit, reset } = useDraft({ map: original }, (d) => onSave(d.map), onDirtyChange, isNew);
  const map = draft.map;
  const placed = timeline.places.filter((p) => p.position).length;

  return (
    <form className="form map-form starmap-form" onSubmit={(e) => submit(e)}>
      <div className="map-form-head">
        <h3>{isNew ? 'New starmap' : 'Edit the starmap'}</h3>
        <button
          type="button"
          className="btn"
          onClick={() => {
            const question = isNew ? "Discard the starmap? It hasn't been added yet." : 'Close the starmap? Your unsaved changes will be lost.';
            if (dirty && !window.confirm(question)) return;
            onCancel();
          }}
        >
          {isNew ? 'Cancel' : 'Close'}
        </button>
      </div>
      <p className="muted">A 3D spiral galaxy to place things on. A timeline can have one.</p>

      {/* The map is always a galaxy here; the narrowing just tells TypeScript so */}
      {map.type === 'galaxy3d' && (
        <>
          <div className="map-picker starmap-preview">
            <Suspense fallback={<p className="map-loading">Loading the preview…</p>}>
              <GalaxyMap config={map} places={timeline.places} />
            </Suspense>
          </div>

          <Field label="Spiral arms">
            <NumberInput className="w-sm" value={map.arms} min={1} max={8} onChange={(arms) => arms !== undefined && patch({ map: { ...map, arms } })} />
          </Field>

          <Field
            label="Colours"
            group
            hint="From the theme, the arms use its accent colour and the core its highlight, so the galaxy changes with the theme (including faction themes)."
          >
            <div className="inline-inputs wrap">
              <label className="check">
                <input type="radio" name="galaxy-colors" checked={map.colors !== 'custom'} onChange={() => patch({ map: { ...map, colors: 'theme' } })} />
                From the theme
              </label>
              <label className="check">
                <input type="radio" name="galaxy-colors" checked={map.colors === 'custom'} onChange={() => patch({ map: { ...map, colors: 'custom' } })} />
                My own
              </label>
            </div>
            {map.colors === 'custom' && (
              <div className="field-row">
                <label className="color-field">
                  <input type="color" value={map.coreColor} onChange={(e) => patch({ map: { ...map, coreColor: e.target.value } })} />
                  <span>Core</span>
                </label>
                <label className="color-field">
                  <input type="color" value={map.armColor} onChange={(e) => patch({ map: { ...map, armColor: e.target.value } })} />
                  <span>Arms</span>
                </label>
              </div>
            )}
          </Field>

          <p className="muted">
            {placed === 0 ? 'No places are on the starmap yet.' : `${placed} place${placed === 1 ? ' is' : 's are'} on the starmap.`}{' '}
            Position places by clicking the galaxy in their form in the <Link to="?tab=places">Places tab</Link>.
          </p>
        </>
      )}

      <FormActions isNew={isNew} dirty={dirty} valid saving={saving} onRevert={reset} />
    </form>
  );
}
