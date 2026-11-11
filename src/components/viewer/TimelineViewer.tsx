import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Timeline, TimelineEvent } from '../../types/timeline';
import { compareEvents } from '../../lib/dates';
import { eraFor, eraSegments } from '../../lib/eras';
import { expandFactions, factionThemeId, mainFactionOf } from '../../lib/factions';
import { useThemes } from '../../db/themes';
import { useThemeOverride } from '../themeOverride';
import { matchesFilters, NO_FILTERS, type Filters } from '../../lib/filters';
import { usePref } from '../../lib/prefs';
import TimelineMap from '../map/TimelineMap';
import { isOnMap, useMapKind } from '../map/mapKinds';
import TimelineTrack from './TimelineTrack';
import EventPanel from './EventPanel';
import ViewerToolbar from './ViewerToolbar';

/**
 * Owns the viewer's state and passes it down:
 * - the selected event is React state, mirrored into the URL (?event=<id>)
 *   so links are shareable and a refresh keeps your place
 * - filters (search, factions, place) live in component state
 * - "show the map" is remembered per browser (usePref)
 *
 * The timeline and the map are linked through this shared state: selecting
 * an event highlights its places on the map, and clicking a place on the
 * map filters the timeline to events there.
 */
export default function TimelineViewer({ timeline }: { timeline: Timeline }) {
  const [params, setParams] = useSearchParams();
  // Lazy initial value: read from the URL once, on first render
  const [selectedId, setSelectedId] = useState<string | null>(() => params.get('event'));
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [showMap, setShowMap] = usePref('viewer.showMap', true);

  // The 3D starmap and/or the flat map; shown when places are positioned on it
  const { kind: mapKind, kinds: mapKinds, setKind: setMapKind } = useMapKind(timeline);
  const hasMap = mapKinds.some((k) => timeline.places.some((p) => isOnMap(p, k)));

  // useMemo: only re-sort when the events actually change
  const events = useMemo(() => [...timeline.events].sort(compareEvents), [timeline.events]);
  const selected = events.find((e) => e.id === selectedId) ?? null;

  const calendar = timeline.calendar;
  // Picking a faction also matches everything under it, so expand the
  // picked ids before filtering (the filter itself stays a simple "any of")
  const matchFilters = useMemo(
    () => ({ ...filters, factionIds: expandFactions(filters.factionIds, timeline.factions) }),
    [filters, timeline.factions],
  );
  const isVisible = useCallback((e: TimelineEvent) => matchesFilters(e, matchFilters, calendar), [matchFilters, calendar]);
  const visible = useMemo(() => events.filter(isVisible), [events, isVisible]);

  const select = setSelectedId;

  // ----- Which era is on the stage -----
  // The events split into runs that share an era (eraSegments). The stage
  // shows one run: the selected event's. With nothing selected it stays on
  // the last one shown, so closing an event doesn't jump back to the start.
  const segments = useMemo(() => eraSegments(events, timeline.eras), [events, timeline.eras]);
  const selectedIndex = selected ? events.indexOf(selected) : -1;
  const selectedSegment = segments.findIndex((s) => selectedIndex >= s.startIndex && selectedIndex <= s.endIndex);
  const [lastSegment, setLastSegment] = useState(0);
  // Updating state during render (not in an effect) is React's recommended way
  // to remember something from a previous render; React re-renders straight away.
  if (selectedSegment !== -1 && selectedSegment !== lastSegment) setLastSegment(selectedSegment);
  const shownSegment = selectedSegment !== -1 ? selectedSegment : Math.min(lastSegment, Math.max(segments.length - 1, 0));
  const shown = segments[shownSegment];

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

  /** Jump to the first visible event of the next/previous era (skipping eras where everything is filtered out). */
  const stepEra = useCallback(
    (direction: 1 | -1) => {
      for (let s = shownSegment + direction; s >= 0 && s < segments.length; s += direction) {
        const first = events.slice(segments[s].startIndex, segments[s].endIndex + 1).find(isVisible);
        if (first) return select(first.id);
      }
    },
    [shownSegment, segments, events, isVisible, select],
  );

  // Keyboard: ← → to move, Shift+← → to change era, Home/End for first/last, Esc to close.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Don't hijack keys while typing in a field
      if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable]')) return;
      if (e.key === 'ArrowRight' && e.shiftKey) stepEra(1);
      else if (e.key === 'ArrowLeft' && e.shiftKey) stepEra(-1);
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'Home' && visible.length) select(visible[0].id);
      else if (e.key === 'End' && visible.length) select(visible[visible.length - 1].id);
      else if (e.key === 'Escape') select(null);
      else return;
      e.preventDefault();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, stepEra, select, visible]);

  /** Enter in search: next match after the current one, wrapping round. */
  function nextMatch() {
    const next = neighbourOf(selectedId, 1) ?? visible[0];
    if (next) select(next.id);
  }

  /** Clicking a place on the map: filter to it and show its first event. */
  function focusPlace(placeId: string) {
    setFilters((f) => ({ ...f, placeId }));
    const first = events.find((e) => e.placeIds.includes(placeId));
    if (first) select(first.id);
  }

  function jumpToEra(eraId: string) {
    const era = timeline.eras.find((e) => e.id === eraId);
    const first = visible.find((e) => eraFor(e.date.sortKey, era ? [era] : []));
    if (first) select(first.id);
  }

  // Eras with no visible events can't be jumped to
  const erasWithEvents = new Set(visible.map((e) => eraFor(e.date.sortKey, timeline.eras)?.id));
  // The chip for the era on the stage is highlighted
  const currentEra = shown?.era;

  // ----- Faction themes -----
  // The selected event's main faction sets the theme; with nothing selected
  // (or no theme for it), a filter on exactly one faction does. Sub-factions
  // without a theme use their nearest parent's (factionThemeId).
  const library = useThemes();
  const themeOf = (factionId: string | undefined) => {
    const id = factionId ? factionThemeId(factionId, timeline.factions) : undefined;
    // A published timeline brings its own copies (themeDefs); otherwise use this browser's library
    return id ? ([...(timeline.themeDefs ?? []), ...library].find((t) => t.id === id) ?? null) : null;
  };
  const focusTheme =
    themeOf(selected ? mainFactionOf(selected) : undefined) ??
    themeOf(filters.factionIds.length === 1 ? filters.factionIds[0] : undefined);
  useThemeOverride(focusTheme);

  // "3 / 14" when the selected event is visible
  const position = selected ? visible.indexOf(selected) : -1;
  const status = position !== -1 ? `${position + 1} / ${visible.length}` : `${visible.length} events`;

  // Which place the map focuses: the place filter, else the selected event's first placed place
  const placedIds = new Set(timeline.places.filter((p) => mapKind && isOnMap(p, mapKind)).map((p) => p.id));
  const mapFocus = filters.placeId ?? selected?.placeIds.find((id) => placedIds.has(id)) ?? null;

  if (events.length === 0) {
    return (
      <div className="empty">
        <p>This timeline has no events yet.</p>
        <p className="muted">Add some in the editor and they'll appear here.</p>
      </div>
    );
  }

  const panel = selected ? (
    <EventPanel key={selected.id} timeline={timeline} event={selected} onSelect={select} onClose={() => select(null)} />
  ) : (
    <p className="viewer-hint muted">
      Select an event on the timeline, or use the arrows (← → on a keyboard; Shift+← → changes era).
      {hasMap && showMap && ' Click a place on the map to see what happened there.'}
    </p>
  );

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

      <ViewerToolbar
        filters={filters}
        onChange={setFilters}
        factions={timeline.factions}
        places={timeline.places}
        visibleCount={visible.length}
        totalCount={events.length}
        onSearchEnter={nextMatch}
        showMap={hasMap ? showMap : null}
        onToggleMap={() => setShowMap(!showMap)}
      />

      <TimelineTrack
        events={shown ? events.slice(shown.startIndex, shown.endIndex + 1) : []}
        era={shown?.era}
        eraKey={shownSegment}
        calendar={calendar}
        factions={timeline.factions}
        selectedId={selected?.id ?? null}
        isVisible={isVisible}
        onSelect={select}
        onStep={step}
        canStep={{ prev: neighbourOf(selectedId, -1) !== undefined, next: neighbourOf(selectedId, 1) !== undefined }}
        status={status}
      />

      {hasMap && showMap && mapKind ? (
        <div className="viewer-split">
          <div className="viewer-split-panel">{panel}</div>
          <div className="viewer-split-map">
            <TimelineMap
              timeline={timeline}
              kind={mapKind}
              kinds={mapKinds}
              onKindChange={setMapKind}
              selectedPlaceId={mapFocus}
              highlightIds={selected?.placeIds ?? []}
              onSelectPlace={focusPlace}
            />
          </div>
        </div>
      ) : (
        panel
      )}
    </div>
  );
}
