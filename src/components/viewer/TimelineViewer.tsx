import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Timeline, TimelineEvent } from '../../types/timeline';
import { compareEvents } from '../../lib/dates';
import { eraFor } from '../../lib/eras';
import TimelineTrack from './TimelineTrack';
import EventPanel from './EventPanel';

/**
 * Owns the viewer's state and passes it down:
 * - the selected event is React state, mirrored into the URL (?event=<id>)
 *   so links are shareable and a refresh keeps your place
 * - the category filter lives in component state
 */
export default function TimelineViewer({ timeline }: { timeline: Timeline }) {
  const [params, setParams] = useSearchParams();
  // Lazy initial value: read from the URL once, on first render
  const [selectedId, setSelectedId] = useState<string | null>(() => params.get('event'));
  const [activeCategories, setActiveCategories] = useState<string[]>([]);

  // useMemo: only re-sort when the events actually change
  const events = useMemo(() => [...timeline.events].sort(compareEvents), [timeline.events]);
  const selected = events.find((e) => e.id === selectedId) ?? null;

  const isVisible = useCallback(
    (e: TimelineEvent) => activeCategories.length === 0 || e.categoryIds.some((id) => activeCategories.includes(id)),
    [activeCategories],
  );

  const select = setSelectedId;

  // Mirror the selection into the URL. The guard stops a loop: setParams
  // changes `params`, which re-runs this effect.
  useEffect(() => {
    if (params.get('event') === selectedId) return;
    const next = new URLSearchParams(params);
    if (selectedId) next.set('event', selectedId);
    else next.delete('event');
    setParams(next, { replace: true }); // no browser history entry per click
  }, [selectedId, params, setParams]);

  /** The nearest visible event before/after `id` (or the first/last if none). */
  const neighbourOf = useCallback(
    (id: string | null, direction: 1 | -1): TimelineEvent | undefined => {
      const found = id ? events.findIndex((e) => e.id === id) : -1;
      const index = found !== -1 ? found : direction === 1 ? -1 : events.length;
      const candidates = direction === 1 ? events.slice(index + 1) : events.slice(0, index).reverse();
      return candidates.find(isVisible);
    },
    [events, isVisible],
  );

  // useCallback keeps the same function between renders, so the keyboard
  // effect below doesn't re-subscribe needlessly. The functional form
  // setSelectedId(prev => ...) always sees the latest selection, so fast
  // repeated key presses chain correctly instead of reading a stale value.
  const step = useCallback(
    (direction: 1 | -1) => setSelectedId((prev) => neighbourOf(prev, direction)?.id ?? prev),
    [neighbourOf],
  );

  // Keyboard: ← → to move, Esc to close. The cleanup function removes the
  // listener when the component unmounts or `step`/`select` change.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Don't hijack arrow keys while typing in a field
      if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable]')) return;
      if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'Escape') select(null);
      else return;
      e.preventDefault();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, select]);

  function toggleCategory(id: string) {
    setActiveCategories((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  function jumpToEra(eraId: string) {
    const era = timeline.eras.find((e) => e.id === eraId);
    const first = events.find((e) => isVisible(e) && eraFor(e.date.sortKey, era ? [era] : []));
    if (first) select(first.id);
  }

  // Eras with no visible events can't be jumped to
  const erasWithEvents = new Set(
    events.filter(isVisible).map((e) => eraFor(e.date.sortKey, timeline.eras)?.id),
  );
  const currentEra = selected ? eraFor(selected.date.sortKey, timeline.eras) : undefined;

  if (events.length === 0) {
    return (
      <div className="empty">
        <p>This timeline has no events yet.</p>
        <p className="muted">Add some in the editor and they'll appear here.</p>
      </div>
    );
  }

  return (
    <div className="viewer">
      {timeline.eras.length > 0 && (
        <nav className="era-bar" aria-label="Jump to era">
          {timeline.eras.map((era) => (
            <button
              key={era.id}
              className={`era-chip${currentEra?.id === era.id ? ' is-current' : ''}`}
              style={{ '--era-color': era.color } as CSSProperties}
              disabled={!erasWithEvents.has(era.id)}
              onClick={() => jumpToEra(era.id)}
            >
              {era.name}
            </button>
          ))}
        </nav>
      )}

      {timeline.categories.length > 0 && (
        <div className="filter-bar" role="group" aria-label="Filter by category">
          {timeline.categories.map((c) => (
            <button
              key={c.id}
              className={`chip chip-toggle${activeCategories.includes(c.id) ? ' is-on' : ''}`}
              style={{ borderColor: c.color }}
              aria-pressed={activeCategories.includes(c.id)}
              onClick={() => toggleCategory(c.id)}
            >
              <span className="swatch" style={{ background: c.color }} /> {c.name}
            </button>
          ))}
          {activeCategories.length > 0 && (
            <button className="link-btn muted" onClick={() => setActiveCategories([])}>Clear</button>
          )}
        </div>
      )}

      <TimelineTrack
        events={events}
        eras={timeline.eras}
        categories={timeline.categories}
        selectedId={selected?.id ?? null}
        isVisible={isVisible}
        onSelect={select}
        onStep={step}
        canStep={{ prev: neighbourOf(selectedId, -1) !== undefined, next: neighbourOf(selectedId, 1) !== undefined }}
      />

      {selected ? (
        <EventPanel key={selected.id} timeline={timeline} event={selected} onSelect={select} onClose={() => select(null)} />
      ) : (
        <p className="viewer-hint muted">Select an event on the timeline, or use the arrows (← → on a keyboard).</p>
      )}
    </div>
  );
}
