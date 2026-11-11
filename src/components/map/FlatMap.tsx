import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { FlatMap as FlatMapConfig, Place } from '../../types/timeline';

type Pin = [x: number, y: number];

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
export default function FlatMap({ map, places, selectedPlaceId, highlightIds = [], openIds = [], onSelectPlace, pick }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View | null>(null);
  const [fit, setFit] = useState(1);
  const drag = useRef<{ startX: number; startY: number; viewX: number; viewY: number; moved: boolean } | null>(null);

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

  function onPointerDown(e: ReactPointerEvent) {
    if (!view || (e.target as HTMLElement).closest('button')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, startY: e.clientY, viewX: view.x, viewY: view.y, moved: false };
  }

  function onPointerMove(e: ReactPointerEvent) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true; // a small wobble still counts as a click
    if (d.moved) setView((v) => (v ? { ...v, x: d.viewX + dx, y: d.viewY + dy } : v));
  }

  function onPointerUp(e: ReactPointerEvent) {
    const d = drag.current;
    drag.current = null;
    if (!d || d.moved || !pick || !view || !box.current) return;
    // A click in placement mode: turn the pointer position into image fractions
    const rect = box.current.getBoundingClientRect();
    const fx = (e.clientX - rect.left - view.x) / (map.width * view.scale);
    const fy = (e.clientY - rect.top - view.y) / (map.height * view.scale);
    if (fx >= 0 && fx <= 1 && fy >= 0 && fy <= 1) pick.onPick([round(fx), round(fy)]);
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
      className={`flat-map${pick ? ' is-picking' : ''}`}
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
