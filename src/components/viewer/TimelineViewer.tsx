import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Timeline, TimelineEvent } from '../../types/timeline';
import { compareEvents } from '../../lib/dates';
import { eraSegments } from '../../lib/eras';
import { expandFactions, mainFactionOf } from '../../lib/factions';
import { useFactionTheme } from '../useFactionTheme';
import { useThemeOverride } from '../themeOverride';
import { matchesFilters, NO_FILTERS, type Filters } from '../../lib/filters';
import { usePref } from '../../lib/prefs';
import TimelineMap from '../map/TimelineMap';
import { allMaps, isPlacedOn, mapTree, masterMapId } from '../../lib/maps';
import TimelineTrack from './TimelineTrack';
import EventPanel from './EventPanel';
import ViewerToolbar from './ViewerToolbar';
import EraStrip from './EraStrip';
import { stripItems } from '../../lib/stage';
import { allTags } from '../../lib/tags';
import { isPeriod, periodMoments } from '../../lib/periods';

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
  const [lanes, setLanes] = usePref('viewer.lanes', false);

  // useMemo: only re-sort when the events actually change.
  // `events` are the moments (nodes on the stage); periods are bars under them.
  const allEvents = useMemo(() => [...timeline.events].sort(compareEvents), [timeline.events]);
  const events = useMemo(() => allEvents.filter((e) => !isPeriod(e)), [allEvents]);
  const selected = allEvents.find((e) => e.id === selectedId) ?? null;

  /**
   * Where an event sits on the stage: itself for a moment; for a period, its
   * first event (or the first one from its start date), so selecting a
   * period shows its era and the arrows carry on from there.
   */
  const anchorOf = useCallback(
    (event: TimelineEvent | undefined | null): TimelineEvent | undefined => {
      if (!event || !isPeriod(event)) return event ?? undefined;
      const moments = periodMoments(event, allEvents);
      if (moments.length) return events.find((e) => moments.includes(e));
      return events.find((e) => e.date.sortKey >= event.date.sortKey);
    },
    [allEvents, events],
  );
  const anchor = anchorOf(selected);

  // ----- Which map is shown -----
  // The starmap and flat maps; the map beside the timeline starts on the
  // master map. It's only shown once some place is positioned on a map.
  const maps = allMaps(timeline);
  const hasMap = maps.some((m) => timeline.places.some((p) => isPlacedOn(p, m.id)));
  const [chosenMapId, setMapId] = useState(() => masterMapId(timeline));
  const mapId = maps.some((m) => m.id === chosenMapId) ? chosenMapId : masterMapId(timeline);

  // Selecting an event whose places aren't on the map shown switches to a map
  // that has one (the master map first, then the others in order). This only
  // happens when the selection changes, so you can still browse other maps.
  // Remembering the previous selection in state, and adjusting during render,
  // is React's recommended pattern for "react to a change" without an effect.
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  if (selectedId !== lastSelectedId) {
    setLastSelectedId(selectedId);
    const eventPlaces = selected ? timeline.places.filter((p) => selected.placeIds.includes(p.id)) : [];
    if (mapId && eventPlaces.length > 0 && !eventPlaces.some((p) => isPlacedOn(p, mapId))) {
      const order = [masterMapId(timeline), ...mapTree(maps).map((r) => r.map.id)];
      const target = order.find((id) => id && eventPlaces.some((p) => isPlacedOn(p, id)));
      if (target) setMapId(target);
    }
  }

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
  const tags = useMemo(() => allTags(timeline.events), [timeline.events]);

  // Going to ?event=… while already here (search, a link) selects that event.
  // Like above: remember the last value seen and adjust during render.
  const paramEvent = params.get('event');
  const [lastParamEvent, setLastParamEvent] = useState(paramEvent);
  if (paramEvent !== lastParamEvent) {
    setLastParamEvent(paramEvent);
    if (paramEvent && paramEvent !== selectedId) setSelectedId(paramEvent);
  }

  /** A tag chip in the info box: filter to that tag. */
  const filterTag = (tag: string) => setFilters((f) => (f.tags.includes(tag) ? f : { ...f, tags: [...f.tags, tag] }));

  // ----- Which era is on the stage -----
  // The events split into runs that share an era (eraSegments). The stage
  // shows one run: the selected event's. With nothing selected it stays on
  // the last one shown, so closing an event doesn't jump back to the start.
  const segments = useMemo(() => eraSegments(events, timeline.eras), [events, timeline.eras]);
  const selectedIndex = anchor ? events.indexOf(anchor) : -1;
  const selectedSegment = segments.findIndex((s) => selectedIndex >= s.startIndex && selectedIndex <= s.endIndex);
  const [lastSegment, setLastSegment] = useState(0);
  // Updating state during render (not in an effect) is React's recommended way
  // to remember something from a previous render; React re-renders straight away.
  if (selectedSegment !== -1 && selectedSegment !== lastSegment) setLastSegment(selectedSegment);
  const shownSegment = selectedSegment !== -1 ? selectedSegment : Math.min(lastSegment, Math.max(segments.length - 1, 0));
  const shown = segments[shownSegment];
  const shownEvents = useMemo(() => (shown ? events.slice(shown.startIndex, shown.endIndex + 1) : []), [shown, events]);

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
      const current = allEvents.find((e) => e.id === id);
      // From a period, → goes to its first event and ← to the one before it
      const fromPeriod = current && isPeriod(current);
      const found = events.indexOf(anchorOf(current)!);
      const index = found !== -1 ? found : direction === 1 ? -1 : events.length;
      const candidates = direction === 1 ? events.slice(fromPeriod ? index : index + 1) : events.slice(0, index).reverse();
      return candidates.find(isVisible);
    },
    [allEvents, events, anchorOf, isVisible],
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

  /** Jump to the first visible event of a run (a piece of the era strip). */
  function jumpToSegment(index: number) {
    const s = segments[index];
    const first = s && events.slice(s.startIndex, s.endIndex + 1).find(isVisible);
    if (first) select(first.id);
  }
  const canJump = (index: number) => {
    const s = segments[index];
    return !!s && events.slice(s.startIndex, s.endIndex + 1).some(isVisible);
  };
  // Where the selected event sits within the run on show, for the strip's tick
  const marker = shown && selectedSegment === shownSegment ? (selectedIndex - shown.startIndex + 0.5) / (shown.endIndex - shown.startIndex + 1) : null;

  // ----- Faction themes -----
  // The selected event's main faction sets the theme; with nothing selected (or no theme
  // for it), a filter on exactly one faction does. Sub-factions without a theme use their
  // nearest parent's (factionThemeId). The timeline's settings can turn both off.
  const factionThemes = !timeline.disableFactionThemeOverride;
  const themeOf = useFactionTheme(timeline);
  const focusTheme = factionThemes
    ? (themeOf(selected ? mainFactionOf(selected) : undefined) ?? themeOf(filters.factionIds.length === 1 ? filters.factionIds[0] : undefined))
    : null;
  useThemeOverride(focusTheme);

  // "3 / 14" when the selected event is visible
  const position = selected ? visible.indexOf(selected) : -1;
  const status = position !== -1 ? `${position + 1} / ${visible.length}` : `${visible.length} events`;

  // Which place the map focuses: the place filter, else the selected event's first placed place
  const placedIds = new Set(timeline.places.filter((p) => mapId && isPlacedOn(p, mapId)).map((p) => p.id));
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
    <EventPanel key={selected.id} timeline={timeline} event={selected} onSelect={select} onClose={() => select(null)} onTag={filterTag} />
  ) : (
    <p className="viewer-hint muted">
      Select an event on the timeline, or use the arrows (← → on a keyboard; Shift+← → changes era).
      {hasMap && showMap && ' Click a place on the map to see what happened there.'}
    </p>
  );

  return (
    <div className="viewer">
      {/* The era on show, as a soft glow behind the whole page (positioned against .app-main in CSS) */}
      <div className="era-glow" aria-hidden="true" style={{ '--era-glow-color': shown?.era?.color ?? 'transparent' } as CSSProperties} />

      <EraStrip
        items={stripItems(segments, events, timeline.eras)}
        shownSegment={shownSegment}
        marker={marker}
        canJump={canJump}
        onJump={jumpToSegment}
      />

      <ViewerToolbar
        filters={filters}
        onChange={setFilters}
        factions={timeline.factions}
        places={timeline.places}
        tags={tags}
        visibleCount={visible.length}
        totalCount={events.length}
        onSearchEnter={nextMatch}
        showMap={hasMap ? showMap : null}
        onToggleMap={() => setShowMap(!showMap)}
        lanes={timeline.factions.length > 0 ? lanes : null}
        onToggleLanes={() => setLanes(!lanes)}
      />

      <TimelineTrack
        events={shownEvents}
        allEvents={allEvents}
        lanes={lanes && timeline.factions.length > 0}
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

      {hasMap && showMap && mapId ? (
        <div className="viewer-split">
          <div className="viewer-split-panel">{panel}</div>
          <div className="viewer-split-map">
            <TimelineMap
              timeline={timeline}
              mapId={mapId}
              onMapChange={setMapId}
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
