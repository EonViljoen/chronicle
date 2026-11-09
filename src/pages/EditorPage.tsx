import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Link, useBlocker, useSearchParams, type BlockerFunction } from 'react-router-dom';
import type { Faction, Era, Place, Timeline, TimelineEvent } from '../types/timeline';
import TimelineGate from '../components/TimelineGate';
import { EditOnly } from '../components/EditOnly';
import { mapKinds } from '../components/map/mapKinds';
import CollectionTab from '../components/editor/CollectionTab';
import SettingsForm from '../components/editor/SettingsForm';
import ThemeTab from '../components/editor/ThemeTab';
import WebsiteTab from '../components/editor/WebsiteTab';
import EraForm from '../components/editor/EraForm';
import FactionForm from '../components/editor/FactionForm';
import PlaceForm from '../components/editor/PlaceForm';
import EventForm from '../components/editor/EventForm';
import { compareEvents, defaultSortKey, formatDate, formatKey } from '../lib/dates';
import { eraFor } from '../lib/eras';
import { factionTree } from '../lib/factions';
import {
  countUsage,
  removeFaction,
  removeEra,
  removeEvent,
  removePlace,
  saveFaction,
  saveEra,
  saveEvent,
  savePlace,
} from '../lib/mutations';

const TABS = ['events', 'eras', 'factions', 'places', 'theme', 'website', 'settings'] as const;
type Tab = (typeof TABS)[number];

export default function EditorPage() {
  return (
    <TimelineGate>
      {(timeline) => (
        <EditOnly fallback={<ReadOnlyNotice id={timeline.id} />}>
          <Editor timeline={timeline} />
        </EditOnly>
      )}
    </TimelineGate>
  );
}

function ReadOnlyNotice({ id }: { id: string }) {
  return (
    <div className="empty">
      <p>This timeline is published by the site and can't be edited here.</p>
      <Link className="btn" to={`/t/${id}`}>View it</Link>
    </div>
  );
}

function Editor({ timeline }: { timeline: Timeline }) {
  // The open tab and item live in the URL: ?tab=events&item=siege-of-terra
  const [params, setParams] = useSearchParams();
  const tab: Tab = TABS.find((t) => t === params.get('tab')) ?? 'events';
  const itemId = params.get('item');

  // ----- Unsaved changes guard -----
  // A ref, not state: forms update it often and nothing needs to re-render.
  // The blocker reads it at the moment you try to navigate.
  const dirtyRef = useRef(false);
  const setDirty = useCallback((dirty: boolean) => {
    dirtyRef.current = dirty;
  }, []);

  const blocker = useBlocker(
    useCallback<BlockerFunction>(
      ({ currentLocation, nextLocation }) =>
        dirtyRef.current &&
        (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search),
      [],
    ),
  );
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (window.confirm('You have unsaved changes. Discard them?')) {
      dirtyRef.current = false;
      blocker.proceed();
    } else {
      blocker.reset();
    }
  }, [blocker]);

  // Closing or reloading the browser tab
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  const go = (nextTab: Tab, item: string | null = null) => {
    const next = new URLSearchParams({ tab: nextTab });
    if (item) next.set('item', item);
    setParams(next);
  };
  const selectItem = (item: string | null) => go(tab, item);

  // ----- Sorted lists -----
  const events = useMemo(() => [...timeline.events].sort(compareEvents), [timeline.events]);
  const eras = useMemo(() => [...timeline.eras].sort((a, b) => a.start - b.start), [timeline.eras]);
  // Factions in tree order: each one followed by its sub-factions
  const factionRows = useMemo(() => factionTree(timeline.factions), [timeline.factions]);
  const factions = useMemo(() => factionRows.map((r) => r.faction), [factionRows]);
  const depthOf = (id: string) => factionRows.find((r) => r.faction.id === id)?.depth ?? 0;
  const places = useMemo(() => [...timeline.places].sort((a, b) => a.name.localeCompare(b.name)), [timeline.places]);

  const counts: Record<Tab, number | null> = {
    events: events.length,
    eras: eras.length,
    factions: factions.length,
    places: places.length,
    theme: null,
    website: null,
    settings: null,
  };

  const shared = { timeline, itemId, onSelectItem: selectItem, onDirtyChange: setDirty };
  const fmt = (key: number) => formatKey(key, timeline.calendar);
  const dateOf = (e: TimelineEvent) => formatDate(e.date, timeline.calendar);

  return (
    <div className="page editor">
      <div className="page-head">
        <h1>{timeline.title}</h1>
        <div className="page-head-actions">
          {mapKinds(timeline).length > 0 && <Link className="btn" to={`/t/${timeline.id}/map`}>Map</Link>}
          <Link className="btn" to={`/t/${timeline.id}`}>View timeline</Link>
        </div>
      </div>

      <nav className="tabs" aria-label="Editor sections">
        {TABS.map((t) => (
          <button key={t} className={`tab${t === tab ? ' is-active' : ''}`} aria-current={t === tab ? 'page' : undefined} onClick={() => go(t)}>
            {t[0].toUpperCase() + t.slice(1)}
            {counts[t] !== null && <span className="tab-count">{counts[t]}</span>}
          </button>
        ))}
      </nav>

      {tab === 'settings' && <SettingsForm timeline={timeline} onDirtyChange={setDirty} />}
      {tab === 'theme' && <ThemeTab timeline={timeline} onDirtyChange={setDirty} />}
      {tab === 'website' && <WebsiteTab timeline={timeline} onDirtyChange={setDirty} />}

      {tab === 'events' && (
        <CollectionTab<TimelineEvent>
          {...shared}
          items={events}
          noun="event"
          blank={() => blankEvent(timeline, events)}
          nameOf={(e) => e.title}
          matches={(e, q) => e.title.toLowerCase().includes(q) || dateOf(e).toLowerCase().includes(q)}
          renderRow={(e) => {
            const era = eraFor(e.date.sortKey, timeline.eras);
            return (
              <>
                <span className="swatch" style={{ background: era?.color ?? 'transparent' }} />
                <span className="row-main">{e.title}</span>
                <span className="row-meta">{dateOf(e)}</span>
              </>
            );
          }}
          save={saveEvent}
          remove={removeEvent}
          renderForm={(p) => <EventForm {...p} timeline={timeline} />}
        />
      )}

      {tab === 'eras' && (
        <CollectionTab<Era>
          {...shared}
          items={eras}
          noun="era"
          blank={() => {
            const start = eras.length ? eras[eras.length - 1].end + 1 : 0;
            return { id: '', name: '', color: '#8a6d2e', start, end: start };
          }}
          nameOf={(e) => e.name}
          renderRow={(e) => (
            <>
              <span className="swatch" style={{ background: e.color }} />
              <span className="row-main">{e.name}</span>
              <span className="row-meta">{fmt(e.start)}</span>
            </>
          )}
          save={saveEra}
          remove={removeEra}
          renderForm={(p) => <EraForm {...p} calendar={timeline.calendar} />}
        />
      )}

      {tab === 'factions' && (
        <CollectionTab<Faction>
          {...shared}
          items={factions}
          noun="faction"
          blank={() => ({ id: '', name: '', color: '#c9a227' })}
          nameOf={(c) => c.name}
          matches={(c, q) => c.name.toLowerCase().includes(q)}
          renderRow={(c) => (
            <>
              {/* Sub-factions are indented under their parent */}
              <span className="swatch" style={{ background: c.color, marginLeft: depthOf(c.id) * 16 }} />
              <span className="row-main">{c.name}</span>
              <span className="row-meta">{countUsage(timeline, 'factionIds', c.id)}</span>
            </>
          )}
          save={saveFaction}
          remove={removeFaction}
          deleteWarning={(c) => factionDeleteWarning(timeline, c)}
          renderForm={(p) => <FactionForm {...p} factions={timeline.factions} />}
        />
      )}

      {tab === 'places' && (
        <CollectionTab<Place>
          {...shared}
          items={places}
          noun="place"
          blank={() => ({ id: '', name: '', description: '', position: null })}
          nameOf={(p) => p.name}
          matches={(p, q) => p.name.toLowerCase().includes(q)}
          renderRow={(p) => (
            <>
              <span className="row-main">{p.name}</span>
              <span className="row-meta">{p.position ? '⌖' : ''}</span>
            </>
          )}
          save={savePlace}
          remove={removePlace}
          deleteWarning={(p) => usageWarning(countUsage(timeline, 'placeIds', p.id))}
          renderForm={(p) => <PlaceForm {...p} timeline={timeline} />}
        />
      )}
    </div>
  );
}

/** What deleting a faction affects: events lose the tag; sub-factions move up a level. */
function factionDeleteWarning(timeline: Timeline, faction: Faction): string | undefined {
  const children = timeline.factions.filter((c) => c.parentId === faction.id).length;
  const parent = timeline.factions.find((c) => c.id === faction.parentId);
  const lines = [
    usageWarning(countUsage(timeline, 'factionIds', faction.id)),
    children > 0 &&
      `Its ${children} sub-faction${children === 1 ? ' moves' : 's move'} ${parent ? `up to ${parent.name}` : 'to the top level'}.`,
  ].filter(Boolean);
  return lines.length ? lines.join('\n') : undefined;
}

const usageWarning = (n: number) => (n > 0 ? `It's used by ${n} event${n === 1 ? '' : 's'} and will be removed from them.` : undefined);

/** A new event starts at the latest event's date, since timelines are often filled in order. */
function blankEvent(timeline: Timeline, sortedEvents: TimelineEvent[]): TimelineEvent {
  const last = sortedEvents[sortedEvents.length - 1];
  const date: TimelineEvent['date'] = {
    sortKey: last ? last.date.sortKey : defaultSortKey(timeline.calendar),
    precision: 'exact',
    // In a free-text calendar every date is a label
    ...(timeline.calendar.type === 'freeform' && { label: '' }),
  };
  return { id: '', title: '', summary: '', body: '', date, factionIds: [], placeIds: [], relatedIds: [], sources: [] };
}
