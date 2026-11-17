import { Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import { STARMAP_ID, type Region, type RegionShape, type Timeline } from '../../types/timeline';
import { allMaps, indentMapLabel, mapTree } from '../../lib/maps';
import { blankShape, isDrawable, labelPoint, placesIn, regionColor, regionViews, type RegionView } from '../../lib/regions';
import { factionTree } from '../../lib/factions';
import { useThemePalette } from '../../themes/palette';
import { GalaxyMap } from '../map/LazyGalaxyMap';
import FlatMap from '../map/FlatMap';
import Field from '../form/Field';
import MarkdownField from '../form/MarkdownField';
import NumberInput from '../form/NumberInput';
import FormActions from './FormActions';
import { useDraft } from './useDraft';
import type { FormProps } from './CollectionTab';

const clean = (r: Region): Region => ({ ...r, name: r.name.trim(), description: r.description.trim(), color: r.color || undefined });

/**
 * A region: its name, map, who holds it, its look, and its shape. On a flat
 * map or a planet the shape is drawn by clicking corners (a planet is drawn
 * on its flat surface picture, which wraps round the globe); on the starmap
 * it's a slice of the galaxy or a cloud round a point, set with numbers and
 * shown live on the map.
 */
export default function RegionForm({ original, isNew, onSave, onDelete, onDirtyChange, timeline }: FormProps<Region> & { timeline: Timeline }) {
  const { draft, patch, dirty, saving, submit, reset } = useDraft(original, onSave, onDirtyChange);
  const palette = useThemePalette();
  const maps = allMaps(timeline);
  const map = maps.find((m) => m.id === draft.mapId);
  const galaxy = timeline.map.type === 'galaxy3d' ? timeline.map : null;
  const nameError = draft.name.trim() ? undefined : 'Give the region a name';
  const shapeError = isDrawable(draft.shape) ? undefined : 'Click the map to add at least three corners';
  const color = regionColor(draft, timeline.factions, palette.accent);
  const inside = placesIn(draft, timeline.places);
  // The other regions on this map, for reference while drawing
  const others = regionViews(draft.mapId, timeline, palette.accent).filter((r) => r.id !== draft.id);
  const self: RegionView = { id: draft.id || 'draft', name: draft.name || 'New region', color, fill: draft.fill, shape: draft.shape, label: labelPoint(draft) };

  function changeMap(mapId: string) {
    // A starmap shape doesn't fit a flat map, and the other way round
    const sameKind = (mapId === STARMAP_ID) === (draft.mapId === STARMAP_ID);
    patch({ mapId, ...(!sameKind && { shape: blankShape(mapId, galaxy?.radius), labelAt: undefined }) });
  }

  return (
    <form className="form" onSubmit={(e) => submit(e, clean)}>
      <div className="form-title-row">
        <h2 className="form-title">{isNew ? 'New region' : original.name}</h2>
        {!isNew && <Link className="btn" to={`/t/${timeline.id}/regions/${encodeURIComponent(original.id)}`}>View page</Link>}
      </div>

      <Field label="Name" error={dirty ? nameError : undefined} hint="e.g. a province, a sector of the galaxy, a storm">
        <input value={draft.name} onChange={(e) => patch({ name: e.target.value })} autoFocus={isNew} />
      </Field>

      <Field label="Map">
        <select value={draft.mapId} onChange={(e) => changeMap(e.target.value)}>
          {mapTree(maps).map((row) => (
            <option key={row.map.id} value={row.map.id}>
              {indentMapLabel(row)}
              {row.map.flat?.kind === 'planet' ? ' (planet)' : ''}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Held by" hint="Optional. The region takes the faction's colour, and is listed on its page.">
        <select value={draft.factionId ?? ''} onChange={(e) => patch({ factionId: e.target.value || undefined })}>
          <option value="">No one</option>
          {factionTree(timeline.factions).map(({ faction, depth }) => (
            <option key={faction.id} value={faction.id}>{`${'   '.repeat(depth)}${depth ? '└ ' : ''}${faction.name}`}</option>
          ))}
        </select>
      </Field>

      <Field label="Look" group>
        <div className="inline-inputs wrap">
          <label className="check">
            <input
              type="checkbox"
              checked={!!draft.color}
              onChange={(e) => patch({ color: e.target.checked ? color : undefined })}
            />{' '}
            Its own colour
          </label>
          {draft.color ? (
            <input type="color" value={draft.color} onChange={(e) => patch({ color: e.target.value })} aria-label="Region colour" />
          ) : (
            <span className="muted">
              <span className="swatch" style={{ background: color }} /> {draft.factionId ? "The faction's colour" : "The theme's colour"}
            </span>
          )}
          <label className="coord">
            <span className="muted">Fill</span>
            <input type="range" min={0} max={100} value={Math.round(draft.fill * 100)} onChange={(e) => patch({ fill: Number(e.target.value) / 100 })} aria-label="Fill strength" />
            <span className="muted">{Math.round(draft.fill * 100)}%</span>
          </label>
        </div>
      </Field>

      {!map ? (
        <p className="error">Its map is no longer shown. Pick another map above.</p>
      ) : map.id === STARMAP_ID && galaxy ? (
        <StarmapShape shape={draft.shape} onChange={(shape) => patch({ shape })} radius={galaxy.radius}>
          <Suspense fallback={<p className="map-loading">Loading map…</p>}>
            <GalaxyMap config={galaxy} places={timeline.places} regions={[...others, self]} selectedRegionId={self.id} />
          </Suspense>
        </StarmapShape>
      ) : map.flat ? (
        <PolygonShape
          key={map.id}
          draft={draft}
          patch={patch}
          color={color}
          error={dirty ? shapeError : undefined}
          planet={map.flat.kind === 'planet'}
        >
          {(mode) => (
            <FlatMap
              map={map.flat!}
              places={timeline.places}
              regions={mode === 'label' ? [...others, self] : others}
              {...(mode === 'label'
                ? { pick: { pin: labelPoint(draft), onPick: (labelAt: [number, number]) => patch({ labelAt }) } }
                : { draw: { points: draft.shape.type === 'polygon' ? draft.shape.points : [], onChange: (points: [number, number][]) => patch({ shape: { type: 'polygon', points } }), color } })}
            />
          )}
        </PolygonShape>
      ) : null}

      <div className="place-opens">
        <span className="field-label">Places inside</span>
        <p className="field-hint">
          {inside.length === 0 ? 'None yet: places count as inside when their pin is.' : inside.map((p) => p.name).join(', ')}
        </p>
      </div>

      <MarkdownField label="Description" rows={5} value={draft.description} onChange={(description) => patch({ description })} timeline={timeline} />

      <FormActions isNew={isNew} dirty={dirty} valid={!nameError && !shapeError} saving={saving} onRevert={reset} onDelete={onDelete} />
    </form>
  );
}

/** Drawing an outline on a flat map or a planet's surface, plus placing its name. */
function PolygonShape({
  draft,
  patch,
  color,
  error,
  planet,
  children,
}: {
  draft: Region;
  patch: (part: Partial<Region>) => void;
  color: string;
  error?: string;
  planet: boolean;
  children: (mode: 'draw' | 'label') => React.ReactNode;
}) {
  const [mode, setMode] = useState<'draw' | 'label'>('draw');
  const points = draft.shape.type === 'polygon' ? draft.shape.points : [];
  const setPoints = (next: [number, number][]) => patch({ shape: { type: 'polygon', points: next } });

  return (
    <Field
      label="Shape"
      group
      error={error}
      hint={
        mode === 'label'
          ? 'Click where the name should sit.'
          : `Click to add corners, drag a corner to move it, double-click one to remove it.${planet ? ' A planet is drawn on its flat surface picture, which wraps round the globe.' : ''}`
      }
    >
      <div className="chips" role="group" aria-label="What clicking the map does">
        <button type="button" className={`chip chip-toggle${mode === 'draw' ? ' is-on' : ''}`} aria-pressed={mode === 'draw'} onClick={() => setMode('draw')}>
          Draw the outline
        </button>
        <button
          type="button"
          className={`chip chip-toggle${mode === 'label' ? ' is-on' : ''}`}
          aria-pressed={mode === 'label'}
          disabled={points.length < 3}
          onClick={() => setMode('label')}
        >
          Place the name
        </button>
      </div>
      <div className="map-picker">{children(mode)}</div>
      <div className="inline-inputs wrap">
        <span className="muted">
          <span className="swatch" style={{ background: color }} /> {points.length} corner{points.length === 1 ? '' : 's'}
        </span>
        <button type="button" className="btn" disabled={points.length === 0} onClick={() => setPoints(points.slice(0, -1))}>Undo last corner</button>
        <button type="button" className="btn" disabled={points.length === 0} onClick={() => window.confirm('Remove every corner?') && setPoints([])}>Clear</button>
        {draft.labelAt && <button type="button" className="btn" onClick={() => patch({ labelAt: undefined })}>Name in the middle</button>}
      </div>
    </Field>
  );
}

/** A starmap region's shape: a slice of the galaxy or a cloud, set with numbers, with the live map as `children`. */
function StarmapShape({ shape, onChange, radius, children }: { shape: RegionShape; onChange: (shape: RegionShape) => void; radius: number; children: React.ReactNode }) {
  const num = (label: string, value: number, set: (v: number) => void, props: { min?: number; max?: number } = {}) => (
    <label className="coord">
      <span className="muted">{label}</span>
      <NumberInput className="w-md" integer={false} value={value} onChange={(v) => v !== undefined && set(v)} aria-label={label} {...props} />
    </label>
  );
  return (
    <Field
      label="Shape"
      group
      hint={
        shape.type === 'slice'
          ? `A slice of the disc. Angles in degrees: 0° points right from the starting view, going anticlockwise seen from above. Distances from the centre; the galaxy's radius is ${radius}.`
          : 'A glowing cloud round a point, for a single feature like a storm or a nebula. The centre is 0, 0, 0; Y is height above the disc.'
      }
    >
      <div className="inline-inputs wrap">
        <select
          aria-label="Kind of shape"
          value={shape.type}
          onChange={(e) =>
            onChange(
              e.target.value === 'cloud'
                ? { type: 'cloud', center: [Math.round(radius * 0.5), 0, 0], radius: Math.round(radius * 0.12) }
                : { type: 'slice', from: 0, to: 90, inner: Math.round(radius * 0.3), outer: Math.round(radius * 0.9) },
            )
          }
        >
          <option value="slice">A slice of the galaxy</option>
          <option value="cloud">A cloud round a point</option>
        </select>
      </div>
      {shape.type === 'slice' && (
        <div className="inline-inputs wrap coords">
          {num('From °', shape.from, (from) => onChange({ ...shape, from }), { min: 0, max: 360 })}
          {num('To °', shape.to, (to) => onChange({ ...shape, to }), { min: 0, max: 360 })}
          {num('Inner', shape.inner, (inner) => onChange({ ...shape, inner }), { min: 0 })}
          {num('Outer', shape.outer, (outer) => onChange({ ...shape, outer }), { min: 0 })}
        </div>
      )}
      {shape.type === 'cloud' && (
        <div className="inline-inputs wrap coords">
          {(['X', 'Y', 'Z'] as const).map((axis, i) =>
            num(axis, shape.center[i], (v) => {
              const center: [number, number, number] = [...shape.center];
              center[i] = v;
              onChange({ ...shape, center });
            }),
          )}
          {num('Radius', shape.radius, (r) => onChange({ ...shape, radius: r }), { min: 0.5 })}
        </div>
      )}
      <div className="map-picker">{children}</div>
    </Field>
  );
}
