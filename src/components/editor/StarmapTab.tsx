import { Suspense } from 'react';
import { Link } from 'react-router-dom';
import type { MapConfig, Timeline } from '../../types/timeline';
import { updateTimeline } from '../../db/timelines';
import { GalaxyMap } from '../map/LazyGalaxyMap';
import Field from '../form/Field';
import NumberInput from '../form/NumberInput';
import FormActions from './FormActions';
import { useDraft } from './useDraft';

/** A new starmap: four arms, coloured by the theme. The custom colours are only a starting point. */
const DEFAULT_GALAXY: MapConfig = { type: 'galaxy3d', arms: 4, radius: 100, colors: 'theme', coreColor: '#ffd9a0', armColor: '#7aa6ff' };

interface Props {
  timeline: Timeline;
  onDirtyChange: (dirty: boolean) => void;
}

/**
 * The editor's Starmap tab: turn the 3D galaxy on or off, its arms and its
 * colours, with a live preview. Places are positioned on it in the Places
 * tab; maps can sit inside it (Maps tab).
 */
export default function StarmapTab({ timeline, onDirtyChange }: Props) {
  const save = async (d: { map: MapConfig }) => {
    await updateTimeline(timeline.id, (t) => ({ ...t, map: d.map }));
    onDirtyChange(false);
  };
  const { draft, patch, dirty, saving, submit, reset } = useDraft({ map: timeline.map }, save, onDirtyChange);
  const map = draft.map;
  const placed = timeline.places.filter((p) => p.position).length;

  return (
    <form className="form starmap-tab" onSubmit={(e) => submit(e)}>
      <div>
        <h2 className="form-title">Starmap</h2>
        <p className="muted">A 3D spiral galaxy to place things on. Your own map pictures are in the Maps tab.</p>
      </div>

      <Field label="Starmap">
        <select value={map.type} onChange={(e) => patch({ map: e.target.value === 'galaxy3d' ? DEFAULT_GALAXY : { type: 'none' } })}>
          <option value="none">Off</option>
          <option value="galaxy3d">3D galaxy</option>
        </select>
      </Field>

      {/* Narrowing: inside this block TypeScript knows map has the galaxy fields */}
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

      {map.type === 'none' && timeline.map.type === 'galaxy3d' && (
        <p className="field-hint">
          Turning it off keeps each place's position, so turning it back on puts them where they were. Maps inside the starmap move to the top level.
        </p>
      )}

      <FormActions isNew={false} dirty={dirty} valid saving={saving} onRevert={reset} />
    </form>
  );
}
