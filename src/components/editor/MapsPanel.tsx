import { Suspense, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { STARMAP_ID, type FlatMap, type PlanetLook, type SurfaceSettings, type Timeline } from '../../types/timeline';
import { updateTimeline } from '../../db/timelines';
import { allMaps, indentMapLabel, isPlacedOn, mapPath, mapTree, mapWithDescendants, masterMapId } from '../../lib/maps';
import { canMoveMap, moveMap, removeMap, saveMap } from '../../lib/mutations';
import { readImage } from '../../lib/images';
import { DEFAULT_SURFACE, defaultLook, generateSurface, randomSeed } from '../../lib/planets';
import { regionCount } from '../../lib/regions';
import NumberInput from '../form/NumberInput';
import { PlanetMap } from '../map/LazyGalaxyMap';
import Field from '../form/Field';
import FormActions from './FormActions';
import { useDraft } from './useDraft';

interface Props {
  timeline: Timeline;
  /** The map being edited (?item=…), or null */
  itemId: string | null;
  onSelectItem: (id: string | null) => void;
  onDirtyChange: (dirty: boolean) => void;
}

/** "Pin places here": the Places tab, with the place form's pin picker set to this map. */
const pinLink = (mapId: string) => `?tab=places&map=${encodeURIComponent(mapId)}`;

/**
 * The editor's Maps tab: every map in tree order (the 3D starmap, set up in
 * the Starmap tab, and your own map pictures), the one to start on, and a form to
 * add or change a map. A map can sit inside another map, opened by clicking
 * one of its places (see lib/maps.ts). Pinning places on a map happens in
 * the Places tab; each map links there.
 *
 * Reordering, removing and the start map save straight away; adding or
 * editing a map is a draft until Save, like the other forms. The map being
 * edited is in the URL (?item=…), so the place form can link straight to it.
 */
export default function MapsPanel({ timeline, itemId, onSelectItem, onDirtyChange }: Props) {
  const maps = allMaps(timeline);
  const rows = mapTree(maps);
  // A new map only exists here until it's created (its picture can't go in the URL)
  const [newMap, setNewMap] = useState<FlatMap | null>(null);
  const existing = itemId ? timeline.maps.find((m) => m.id === itemId) : undefined;
  const editing = newMap ? { map: newMap, isNew: true } : existing ? { map: existing, isNew: false } : null;
  const [note, setNote] = useState<{ error: boolean; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const change = (recipe: (t: Timeline) => Timeline) => updateTimeline(timeline.id, recipe);

  async function addFromFile(file: File | undefined) {
    if (!file) return;
    setNote(null);
    try {
      const { note, ...picture } = await readImage(file);
      const name = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
      setNewMap({ id: crypto.randomUUID(), name, ...picture });
      if (note) setNote({ error: false, text: note });
    } catch (e) {
      setNote({ error: true, text: e instanceof Error ? e.message : String(e) });
    }
  }

  /** A new planet starts with a generated surface; a picture of your own can replace it. */
  function addPlanet() {
    setNote(null);
    const generated: SurfaceSettings = { ...DEFAULT_SURFACE, seed: randomSeed() };
    setNewMap({ id: crypto.randomUUID(), name: 'New planet', kind: 'planet', planet: defaultLook(generated), ...generateSurface(generated) });
  }

  function remove(map: FlatMap) {
    const inside = timeline.maps.filter((m) => m.parentId === map.id).length;
    const pinned = timeline.places.filter((p) => p.pins?.[map.id]).length;
    const regions = regionCount(timeline, map.id);
    const lines = [
      `Delete the map "${map.name}"?`,
      regions > 0 && `Its ${regions} region${regions === 1 ? '' : 's'} will be deleted too.`,
      pinned > 0 && `${pinned} place${pinned === 1 ? '' : 's'} will lose ${pinned === 1 ? 'its' : 'their'} pin on it (the places themselves stay).`,
      inside > 0 && `${inside} map${inside === 1 ? '' : 's'} inside it will move up a level.`,
    ];
    if (!window.confirm(lines.filter(Boolean).join('\n\n'))) return;
    if (itemId === map.id) {
      onDirtyChange(false); // its unsaved edits go with it
      onSelectItem(null);
    }
    void change((t) => removeMap(t, map.id));
  }

  /** Close the form: after saving, cancelling, or a new map being created. */
  function close() {
    onDirtyChange(false);
    setNote(null);
    if (newMap) setNewMap(null);
    else onSelectItem(null);
  }

  return (
    <section className="maps-panel" aria-labelledby="maps-title">
      <div className="maps-panel-head">
        <div>
          <h2 id="maps-title" className="form-title">Maps</h2>
          <p className="muted">
            Your own map pictures, planets (a globe, from a picture or generated), plus the 3D starmap if it's on (Starmap tab). A map can sit
            inside another, opened by clicking one of its places. Pin places on a map in the Places tab; draw areas in the Regions tab.
          </p>
        </div>
        <div className="toolbar-actions">
          {/* One form at a time: finish or close the open one first */}
          <button type="button" className="btn btn-primary" onClick={() => fileInput.current?.click()} disabled={editing !== null}>
            + Add a map…
          </button>
          <button type="button" className="btn" onClick={addPlanet} disabled={editing !== null}>
            + Add a planet
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              void addFromFile(e.target.files?.[0]);
              e.target.value = ''; // so picking the same file again still works
            }}
          />
        </div>
      </div>

      {note && <p className={note.error ? 'error' : 'field-hint'} role={note.error ? 'alert' : undefined}>{note.text}</p>}

      {rows.length > 0 && (
        <>
          <ul className="map-rows">
            {rows.map(({ map, depth }) => {
              const flat = map.flat;
              const opener = map.placeId ? timeline.places.find((p) => p.id === map.placeId) : undefined;
              return (
                <li key={map.id} className={`map-row${editing?.map.id === map.id ? ' is-selected' : ''}`} style={{ paddingLeft: 10 + depth * 22 }}>
                  {flat ? (
                    <img className={`map-thumb${flat.kind === 'planet' ? ' is-planet' : ''}`} src={flat.image} alt="" />
                  ) : (
                    <span className="map-thumb map-thumb-3d" aria-hidden="true">✦</span>
                  )}
                  <span className="map-row-main">
                    <strong>{map.name}</strong>
                    <span className="muted">
                      {!flat ? '3D starmap · set up in the Starmap tab' : flat.kind === 'planet' ? `Planet · ${flat.planet?.generated ? 'generated surface' : 'your picture'}` : `${flat.width} × ${flat.height} px`}
                      {opener && ` · opens from ${opener.name}`}
                      {map.id === masterMapId(timeline) && ' · start map'}
                    </span>
                  </span>
                  <span className="map-row-actions">
                    <Link className="btn" to={flat ? pinLink(map.id) : '?tab=places'}>Pin places</Link>
                    {!flat && <Link className="btn" to="?tab=starmap">Edit</Link>}
                    {flat && (
                      <>
                        {/* Greyed out when it's already first or last among the maps beside it */}
                        <button
                          type="button"
                          className="btn"
                          aria-label={`Move ${map.name} up`}
                          title="Earlier among the maps beside it"
                          disabled={!canMoveMap(timeline, map.id, -1)}
                          onClick={() => void change((t) => moveMap(t, map.id, -1))}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="btn"
                          aria-label={`Move ${map.name} down`}
                          title="Later among the maps beside it"
                          disabled={!canMoveMap(timeline, map.id, 1)}
                          onClick={() => void change((t) => moveMap(t, map.id, 1))}
                        >
                          ↓
                        </button>
                        <button type="button" className="btn" disabled={newMap !== null} onClick={() => onSelectItem(map.id)}>Edit</button>
                        <button type="button" className="btn btn-danger" onClick={() => remove(flat)}>Delete</button>
                      </>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>

          {rows.length > 1 && (
            <Field label="Start on" hint="The map the timeline page and the map page open on.">
              <select
                value={masterMapId(timeline)}
                onChange={(e) => void change((t) => ({ ...t, masterMapId: e.target.value }))}
              >
                {rows.map((row) => <option key={row.map.id} value={row.map.id}>{indentMapLabel(row)}</option>)}
              </select>
            </Field>
          )}
        </>
      )}

      {editing && (
        <MapForm
          // key: a different map gets a fresh draft
          key={editing.map.id}
          timeline={timeline}
          original={editing.map}
          isNew={editing.isNew}
          onDirtyChange={onDirtyChange}
          onSave={async (map) => {
            await change((t) => saveMap(t, map));
            close();
          }}
          onCancel={close}
        />
      )}
    </section>
  );
}

interface FormProps {
  timeline: Timeline;
  original: FlatMap;
  isNew: boolean;
  onSave: (map: FlatMap) => Promise<void>;
  onCancel: () => void;
  onDirtyChange: (dirty: boolean) => void;
}

/** Name, where the map sits (inside which map, opened from which place), and its picture. */
function MapForm({ timeline, original, isNew, onSave, onCancel, onDirtyChange }: FormProps) {
  const { draft, patch, dirty, saving, submit, reset } = useDraft(original, onSave, onDirtyChange, isNew);
  const [replaceError, setReplaceError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const nameError = draft.name.trim() ? undefined : 'Give the map a name';

  // It can sit inside any map except itself and the maps inside it (that would loop)
  const maps = allMaps(timeline);
  const blocked = mapWithDescendants(draft.id, maps);
  const parents = mapTree(maps).filter((r) => !blocked.has(r.map.id));
  // The place that opens it must be on the parent map
  const openers = draft.parentId
    ? timeline.places.filter((p) => isPlacedOn(p, draft.parentId!)).sort((a, b) => a.name.localeCompare(b.name))
    : [];

  async function replace(file: File | undefined) {
    if (!file) return;
    setReplaceError(null);
    try {
      const { image, width, height } = await readImage(file);
      // Your own picture replaces a generated surface
      patch({ image, width, height, ...(draft.planet && { planet: { ...draft.planet, generated: undefined } }) });
    } catch (e) {
      setReplaceError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <form className="form map-form" onSubmit={(e) => submit(e, (m) => ({ ...m, name: m.name.trim() }))}>
      <div className="map-form-head">
        <h3>{isNew ? 'New map' : `Edit ${original.name}`}</h3>
        <button
          type="button"
          className="btn"
          onClick={() => {
            // Ask before throwing away work (a new map is always unsaved)
            const question = isNew ? 'Discard the new map? It hasn\'t been created yet.' : 'Close this map? Your unsaved changes will be lost.';
            if (dirty && !window.confirm(question)) return;
            onCancel();
          }}
        >
          {isNew ? 'Cancel' : 'Close'}
        </button>
      </div>

      <div className="map-form-body">
        {draft.kind === 'planet' ? (
          // A live preview: the look settings show as you change them
          <div className="map-form-globe">
            <Suspense fallback={<p className="map-loading">Loading the planet…</p>}>
              <PlanetMap map={draft} places={timeline.places} />
            </Suspense>
          </div>
        ) : (
          <img className="map-form-picture" src={draft.image} alt="" />
        )}
        <div className="map-form-fields">
          <Field label="Name" error={nameError}>
            <input value={draft.name} onChange={(e) => patch({ name: e.target.value })} autoFocus={isNew} />
          </Field>

          <Field label="Inside" hint="Put it inside another map, e.g. a city map inside a world map.">
            <select
              value={draft.parentId ?? ''}
              onChange={(e) => {
                const parentId = e.target.value || undefined;
                // A place on the old parent can't open it any more
                const keep = parentId && draft.placeId && timeline.places.some((p) => p.id === draft.placeId && isPlacedOn(p, parentId));
                patch({ parentId, placeId: keep ? draft.placeId : undefined });
              }}
            >
              <option value="">Nothing (a top-level map)</option>
              {parents.map((row) => <option key={row.map.id} value={row.map.id}>{indentMapLabel(row)}</option>)}
            </select>
          </Field>

          {draft.parentId && (
            <Field
              label="Opened from"
              hint={
                openers.length === 0 ? (
                  <>
                    No places are on {mapPath(draft.parentId, maps) || 'that map'} yet.{' '}
                    {/* Leaving asks first if this form has unsaved changes */}
                    <Link to={draft.parentId === STARMAP_ID ? '?tab=places' : pinLink(draft.parentId)}>Pin a place there</Link> first.
                  </>
                ) : (
                  'Clicking this place on the outer map opens this map.'
                )
              }
            >
              <select value={draft.placeId ?? ''} onChange={(e) => patch({ placeId: e.target.value || undefined })} disabled={openers.length === 0}>
                <option value="">No place (only from the map list)</option>
                {openers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
          )}

          <Field label="Shown as" hint={draft.kind === 'planet' ? 'The picture wraps round a globe: use one twice as wide as it is tall, like a world map.' : undefined}>
            <select
              value={draft.kind ?? 'flat'}
              onChange={(e) =>
                e.target.value === 'planet'
                  ? patch({ kind: 'planet', planet: draft.planet ?? defaultLook() })
                  : patch({ kind: undefined, planet: undefined })
              }
            >
              <option value="flat">A flat map</option>
              <option value="planet">A planet (a 3D globe)</option>
            </select>
          </Field>

          <Field label={draft.kind === 'planet' ? 'Surface picture' : 'Picture'} group>
            <div className="inline-inputs wrap">
              <span className="muted">
                {draft.width} × {draft.height} px{draft.planet?.generated ? ' · generated' : ''}
              </span>
              <button type="button" className="btn" onClick={() => fileInput.current?.click()}>
                {draft.kind === 'planet' ? 'Use your own picture…' : 'Replace…'}
              </button>
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                void replace(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            {replaceError && <p className="field-error" role="alert">{replaceError}</p>}
          </Field>

          {draft.kind === 'planet' && draft.planet && (
            <PlanetFields
              look={draft.planet}
              onLook={(planet) => patch({ planet })}
              onSurface={(generated, picture) => patch({ ...picture, planet: { ...draft.planet!, generated } })}
            />
          )}
        </div>
      </div>

      {/* A new map counts as unsaved from the start, so Create works straight away */}
      <FormActions isNew={isNew} dirty={dirty} valid={!nameError} saving={saving} onRevert={reset} />
    </form>
  );
}

/** A planet's look: its generated surface (if it has one), atmosphere, clouds and rings. */
function PlanetFields({
  look,
  onLook,
  onSurface,
}: {
  look: PlanetLook;
  onLook: (look: PlanetLook) => void;
  onSurface: (settings: SurfaceSettings, picture: { image: string; width: number; height: number }) => void;
}) {
  // Surface settings being changed, before they're drawn
  const [surface, setSurface] = useState<SurfaceSettings>(look.generated ?? DEFAULT_SURFACE);
  const [drawing, setDrawing] = useState(false);
  const changed = JSON.stringify(surface) !== JSON.stringify(look.generated);
  const setLook = (part: Partial<PlanetLook>) => onLook({ ...look, ...part });

  function draw(settings: SurfaceSettings) {
    setSurface(settings);
    setDrawing(true);
    // Let "Drawing…" show before the (blocking) drawing starts
    setTimeout(() => {
      onSurface(settings, generateSurface(settings));
      setDrawing(false);
    }, 30);
  }

  const atmosphereKind = look.atmosphere === 'none' || look.atmosphere === 'theme' ? look.atmosphere : 'custom';

  return (
    <>
      <Field
        label="Generated surface"
        group
        hint={look.generated ? 'Continents drawn from the seed. The same seed always gives the same planet.' : 'This planet uses your own picture. Draw a surface to replace it.'}
      >
        <div className="inline-inputs wrap planet-surface">
          <label className="coord">
            <span className="muted">Seed</span>
            <NumberInput className="w-md" min={1} value={surface.seed} onChange={(v) => v !== undefined && setSurface({ ...surface, seed: v })} aria-label="Seed" />
          </label>
          <label className="coord">
            <span className="muted">Sea %</span>
            <NumberInput className="w-sm" min={0} max={100} value={surface.water} onChange={(v) => v !== undefined && setSurface({ ...surface, water: v })} aria-label="How much is sea, percent" />
          </label>
          <label className="coord">
            <span className="muted">Sea</span>
            <input type="color" value={surface.sea} onChange={(e) => setSurface({ ...surface, sea: e.target.value })} aria-label="Sea colour" />
          </label>
          <label className="coord">
            <span className="muted">Land</span>
            <input type="color" value={surface.land} onChange={(e) => setSurface({ ...surface, land: e.target.value })} aria-label="Land colour" />
          </label>
          <label className="coord">
            <span className="muted">Heights</span>
            <input type="color" value={surface.high} onChange={(e) => setSurface({ ...surface, high: e.target.value })} aria-label="Mountain colour" />
          </label>
          <label className="check">
            <input type="checkbox" checked={surface.ice} onChange={(e) => setSurface({ ...surface, ice: e.target.checked })} /> Ice caps
          </label>
        </div>
        <div className="inline-inputs wrap">
          <button type="button" className="btn btn-primary" disabled={drawing || (!changed && !!look.generated)} onClick={() => draw(surface)}>
            {drawing ? 'Drawing…' : look.generated ? 'Draw it' : 'Draw a surface'}
          </button>
          <button type="button" className="btn" disabled={drawing} onClick={() => draw({ ...surface, seed: randomSeed() })}>
            Another one
          </button>
        </div>
      </Field>

      <Field label="Atmosphere" group>
        <div className="inline-inputs wrap">
          <select
            aria-label="Atmosphere"
            value={atmosphereKind}
            onChange={(e) => setLook({ atmosphere: e.target.value === 'custom' ? '#7fb2ff' : e.target.value })}
          >
            <option value="theme">Glow in the theme's colour</option>
            <option value="custom">Glow in a colour of your own</option>
            <option value="none">None</option>
          </select>
          {atmosphereKind === 'custom' && (
            <input type="color" value={look.atmosphere} onChange={(e) => setLook({ atmosphere: e.target.value })} aria-label="Atmosphere colour" />
          )}
        </div>
      </Field>

      <Field label="Sky" group>
        <div className="inline-inputs wrap">
          <label className="check">
            <input type="checkbox" checked={look.clouds} onChange={(e) => setLook({ clouds: e.target.checked })} /> Clouds
          </label>
          <label className="check">
            <input type="checkbox" checked={look.rings} onChange={(e) => setLook({ rings: e.target.checked })} /> Rings
          </label>
          {look.rings && <input type="color" value={look.ringColor} onChange={(e) => setLook({ ringColor: e.target.value })} aria-label="Ring colour" />}
        </div>
      </Field>
    </>
  );
}
