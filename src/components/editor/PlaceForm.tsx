import { Suspense, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Place, Timeline } from '../../types/timeline';
import { mapPath, mapTree, allMaps } from '../../lib/maps';
import { GalaxyMap } from '../map/LazyGalaxyMap';
import FlatMap from '../map/FlatMap';
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

  // Flat maps, in tree order; the place is pinned on one at a time here
  const entries = allMaps(timeline);
  const flatMaps = mapTree(entries).flatMap((r) => (r.map.flat ? [r.map.flat] : []));
  // Which map to pin on: the one you click below; else the one named in the
  // URL (?map=…, from "Pin places" in the Maps tab); else the first map the
  // place is already on; else the first map
  const [params] = useSearchParams();
  const [chosenMapId, setPickMapId] = useState<string>();
  const pickMap =
    flatMaps.find((m) => m.id === chosenMapId) ??
    flatMaps.find((m) => m.id === params.get('map')) ??
    flatMaps.find((m) => original.pins?.[m.id]) ??
    flatMaps[0];
  const pins = draft.pins ?? {};

  // The maps this place opens: each one sits inside a map the place is on.
  // They're linked in the Maps tab, so here they're just listed, with a link there.
  const opens = timeline.maps.filter((m) => m.placeId === original.id && !isNew);

  /** Set (or with null, remove) the place's pin on one flat map. */
  function setPin(mapId: string, pin: [number, number] | null) {
    const next = { ...pins };
    if (pin) next[mapId] = pin;
    else delete next[mapId];
    patch({ pins: next });
  }

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

      {opens.length > 0 && (
        <div className="place-opens">
          <span className="field-label">Opens</span>
          <ul>
            {opens.map((m) => (
              <li key={m.id}>
                Clicking it on <strong>{entries.find((e) => e.id === m.parentId)?.name ?? 'its map'}</strong> opens{' '}
                <Link to={`?tab=maps&item=${encodeURIComponent(m.id)}`}>{m.name} →</Link>
              </li>
            ))}
          </ul>
          <span className="field-hint">Change this in the Maps tab.</span>
        </div>
      )}

      {map.type !== 'galaxy3d' && flatMaps.length === 0 && (
        <p className="muted">
          This timeline has no map yet. Add a map picture in the <Link to="?tab=maps">Maps tab</Link>, or turn on the 3D starmap in the Settings tab.
        </p>
      )}

      {map.type === 'galaxy3d' && (
        <Field
          label="Starmap position"
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
          ) : null}
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
      )}

      {pickMap && (
        <Field
          label="On your maps"
          group
          hint="Pick a map, then click it to pin the place there. A place can be on any number of maps. Scroll to zoom, drag to move around."
        >
          {/* One button per map; ✓ marks the maps the place is pinned on */}
          {flatMaps.length > 1 && (
            <div className="chips" role="group" aria-label="Map to pin on">
              {flatMaps.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`chip chip-toggle${m.id === pickMap.id ? ' is-on' : ''}`}
                  aria-pressed={m.id === pickMap.id}
                  title={mapPath(m.id, entries)}
                  onClick={() => setPickMapId(m.id)}
                >
                  {pins[m.id] ? '✓ ' : ''}{m.name}
                </button>
              ))}
            </div>
          )}
          <div className="map-picker">
            <FlatMap
              key={pickMap.id}
              map={pickMap}
              places={timeline.places.filter((p) => p.id !== original.id)}
              pick={{ pin: pins[pickMap.id] ?? null, onPick: (pin) => setPin(pickMap.id, pin) }}
            />
          </div>
          {pins[pickMap.id] && (
            <div>
              <button type="button" className="btn" onClick={() => setPin(pickMap.id, null)}>Remove from {pickMap.name}</button>
            </div>
          )}
        </Field>
      )}

      <FormActions isNew={isNew} dirty={dirty} valid={!nameError} saving={saving} onRevert={reset} onDelete={onDelete} />
    </form>
  );
}
