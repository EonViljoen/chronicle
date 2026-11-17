import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { FlatMap as FlatMapConfig, Place } from '../../types/timeline';
import { regionAt, type RegionView } from '../../lib/regions';

type Pin = [x: number, y: number];

/** Drawing a region's outline in the editor. */
export interface DrawMode {
  points: Pin[];
  onChange: (points: Pin[]) => void;
  color: string;
}

interface Props {
  map: FlatMapConfig;
  places: Place[];
  selectedPlaceId?: string | null;
  highlightIds?: string[];
  /** Places whose pin opens another map: they get a marker. */
  openIds?: string[];
  onSelectPlace?: (id: string) => void;
  /** Placement mode for the editor: click the map to set a position. */
  pick?: { pin: Pin | null; onPick: (pin: Pin) => void };
  /** Regions to draw under the pins. */
  regions?: RegionView[];
  selectedRegionId?: string | null;
  onSelectRegion?: (id: string) => void;
  /** Drawing mode for the editor: click to add corners, drag them to move, double-click one to remove it. */
  draw?: DrawMode;
}

/** How the image is shown: its scale and where its top-left corner sits, in pixels. */
interface View {
  scale: number;
  x: number;
  y: number;
}

const MAX_ZOOM = 8; // times the "whole map fits" scale

/**
 * Your own map image with places pinned on it. Scroll to zoom (towards the
 * pointer), drag to pan, click a pin to select its place.
 *
 * Pins are stored as fractions of the image (0–1), so they stay put whatever
 * size the map is shown at. The image and pins move together inside one
 * transformed layer; pins scale back down so they stay the same size.
 */
export default function FlatMap({ map, places, selectedPlaceId, highlightIds = [], openIds = [], onSelectPlace, pick, regions = [], selectedRegionId, onSelectRegion, draw }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View | null>(null);
  const [fit, setFit] = useState(1);
  const drag = useRef<{ startX: number; startY: number; viewX: number; viewY: number; moved: boolean } | null>(null);
  // The corner being dragged in drawing mode
  const corner = useRef<number | null>(null);

  // Fit the whole image in the box, and again whenever the box changes size.
  // ResizeObserver tells us about size changes the window "resize" event misses.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fitToBox = () => {
      const { width, height } = el.getBoundingClientRect();
      const scale = Math.min(width / map.width, height / map.height);
      setFit(scale);
      setView({ scale, x: (width - map.width * scale) / 2, y: (height - map.height * scale) / 2 });
    };
    fitToBox();
    const observer = new ResizeObserver(fitToBox);
    observer.observe(el);
    return () => observer.disconnect();
  }, [map.width, map.height, map.image]);

  /** Zoom by `factor`, keeping the point (px, py) inside the box still. */
  function zoomAt(factor: number, px: number, py: number) {
    setView((v) => {
      if (!v) return v;
      const scale = Math.min(fit * MAX_ZOOM, Math.max(fit, v.scale * factor));
      const k = scale / v.scale;
      return { scale, x: px - (px - v.x) * k, y: py - (py - v.y) * k };
    });
  }

  // React's onWheel is passive, so preventDefault (stop the page scrolling)
  // needs a listener added by hand
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - rect.left, e.clientY - rect.top);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  });

  /** A pointer position as fractions of the picture. */
  function toFraction(clientX: number, clientY: number): Pin | null {
    if (!view || !box.current) return null;
    const rect = box.current.getBoundingClientRect();
    return [(clientX - rect.left - view.x) / (map.width * view.scale), (clientY - rect.top - view.y) / (map.height * view.scale)];
  }

  function onPointerDown(e: ReactPointerEvent) {
    if (!view || (e.target as HTMLElement).closest('button')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, startY: e.clientY, viewX: view.x, viewY: view.y, moved: false };
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (corner.current !== null && draw) {
      const f = toFraction(e.clientX, e.clientY);
      if (f) draw.onChange(draw.points.map((p, i) => (i === corner.current ? [round(clamp(f[0])), round(clamp(f[1]))] : p)));
      return;
    }
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true; // a small wobble still counts as a click
    if (d.moved) setView((v) => (v ? { ...v, x: d.viewX + dx, y: d.viewY + dy } : v));
  }

  function onPointerUp(e: ReactPointerEvent) {
    if (corner.current !== null) {
      corner.current = null;
      return;
    }
    const d = drag.current;
    drag.current = null;
    if (!d || d.moved) return;
    // A click (not a drag): turn the pointer position into image fractions.
    // The map holds on to the pointer while it's pressed (for dragging), so
    // the click lands here rather than on the region's shape.
    const f = toFraction(e.clientX, e.clientY);
    if (!f || f[0] < 0 || f[0] > 1 || f[1] < 0 || f[1] > 1) return;
    const point: Pin = [round(f[0]), round(f[1])];
    if (pick) pick.onPick(point);
    else if (draw) draw.onChange([...draw.points, point]);
    else if (onSelectRegion) {
      const hit = regionAt(point, regions);
      if (hit) onSelectRegion(hit.id);
    }
  }

  const center = () => {
    const rect = box.current?.getBoundingClientRect();
    return rect ? [rect.width / 2, rect.height / 2] : [0, 0];
  };

  // Each place's pin on this map (a place can be on several maps)
  const pinned = places.flatMap((p) => {
    const pin = p.pins?.[map.id];
    return pin ? [{ ...p, pin }] : [];
  });

  return (
    <div
      ref={box}
      className={`flat-map${pick || draw ? ' is-picking' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (drag.current = null)}
    >
      {view && (
        <div
          className="flat-map-layer"
          style={{ width: map.width, height: map.height, transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
        >
          <img src={map.image} alt="" draggable={false} />
          {/* Regions: one SVG over the whole picture, in fractions (0–1); the
              stroke keeps its width however far you zoom */}
          {(regions.length > 0 || draw) && (
            <svg className="region-layer" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden={!onSelectRegion}>
              {regions.map((r) =>
                r.shape.type === 'polygon' && r.shape.points.length >= 3 ? (
                  <polygon
                    key={r.id}
                    className={`region-shape${r.id === selectedRegionId ? ' is-selected' : ''}${onSelectRegion && !pick && !draw ? ' is-clickable' : ''}`}
                    points={r.shape.points.map((p) => p.join(',')).join(' ')}
                    style={{ fill: r.color, fillOpacity: r.fill, stroke: r.color }}
                  >
                    <title>{r.name}</title>
                  </polygon>
                ) : null,
              )}
              {draw && draw.points.length > 0 && (
                <polygon className="region-shape is-drawing" points={draw.points.map((p) => p.join(',')).join(' ')} style={{ fill: draw.color, stroke: draw.color }} />
              )}
            </svg>
          )}
          {regions.map((r) =>
            r.shape.type === 'polygon' && r.shape.points.length >= 3 ? (
              <span key={r.id} className="flat-anchor" style={{ left: `${r.label[0] * 100}%`, top: `${r.label[1] * 100}%`, transform: `scale(${1 / view.scale})` }}>
                <span className="region-label" style={{ color: r.color }}>{r.name}</span>
              </span>
            ) : null,
          )}
          {/* Each pin is a zero-size anchor at its spot, scaled back to normal size;
              the label inside sits centred above it */}
          {pinned.map((p) => (
            <span key={p.id} className="flat-anchor" style={{ left: `${p.pin[0] * 100}%`, top: `${p.pin[1] * 100}%`, transform: `scale(${1 / view.scale})` }}>
              <button
                type="button"
                className={[
                  'map-label',
                  'flat-pin',
                  p.id === selectedPlaceId && 'is-selected',
                  highlightIds.includes(p.id) && 'is-highlighted',
                  openIds.includes(p.id) && 'opens-map',
                  pick && 'is-dimmed',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => !pick && onSelectPlace?.(p.id)}
                disabled={!!pick}
              >
                {p.name}
              </button>
            </span>
          ))}
          {draw?.points.map((p, i) => (
            <span key={i} className="flat-anchor" style={{ left: `${p[0] * 100}%`, top: `${p[1] * 100}%`, transform: `scale(${1 / view.scale})` }}>
              <button
                type="button"
                className="region-corner"
                style={{ borderColor: draw.color }}
                aria-label={`Corner ${i + 1}: drag to move, double-click to remove`}
                title="Drag to move · double-click to remove"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  box.current?.setPointerCapture(e.pointerId);
                  corner.current = i;
                }}
                onDoubleClick={() => draw.onChange(draw.points.filter((_, j) => j !== i))}
              />
            </span>
          ))}
          {pick?.pin && (
            <span className="flat-anchor" style={{ left: `${pick.pin[0] * 100}%`, top: `${pick.pin[1] * 100}%`, transform: `scale(${1 / view.scale})` }}>
              <span className="flat-pick-marker" aria-hidden="true" />
            </span>
          )}
        </div>
      )}

      <div className="flat-map-controls">
        <button type="button" className="btn" aria-label="Zoom in" onClick={() => zoomAt(1.4, ...(center() as [number, number]))}>+</button>
        <button type="button" className="btn" aria-label="Zoom out" onClick={() => zoomAt(1 / 1.4, ...(center() as [number, number]))}>−</button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            const rect = box.current?.getBoundingClientRect();
            if (rect) setView({ scale: fit, x: (rect.width - map.width * fit) / 2, y: (rect.height - map.height * fit) / 2 });
          }}
        >
          Fit
        </button>
      </div>
    </div>
  );
}

const round = (n: number) => Math.round(n * 10000) / 10000;
const clamp = (n: number) => Math.min(1, Math.max(0, n));
