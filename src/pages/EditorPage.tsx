import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Link, useBlocker, useSearchParams, type BlockerFunction } from 'react-router-dom';
import type { Category, Era, Place, Timeline, TimelineEvent } from '../types/timeline';
import TimelineGate from '../components/TimelineGate';
import CollectionTab from '../components/editor/CollectionTab';
import SettingsForm from '../components/editor/SettingsForm';
import EraForm from '../components/editor/EraForm';
import CategoryForm from '../components/editor/CategoryForm';
import PlaceForm from '../components/editor/PlaceForm';
import EventForm from '../components/editor/EventForm';
import { compareEvents, formatSortKey, freeformDate, millenniumDate, yearDate } from '../lib/dates';
import { eraFor } from '../lib/eras';
import {
  countUsage,
  removeCategory,
  removeEra,
  removeEvent,
  removePlace,
  saveCategory,
  saveEra,
  saveEvent,
  savePlace,
} from '../lib/mutations';

const TABS = ['events', 'eras', 'categories', 'places', 'settings'] as const;
type Tab = (typeof TABS)[number];

export default function EditorPage() {
  return <TimelineGate>{(timeline) => <Editor timeline={timeline} />}</TimelineGate>;
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
  const categories = useMemo(() => [...timeline.categories].sort((a, b) => a.name.localeCompare(b.name)), [timeline.categories]);
  const places = useMemo(() => [...timeline.places].sort((a, b) => a.name.localeCompare(b.name)), [timeline.places]);

  const counts: Record<Tab, number | null> = {
    events: events.length,
    eras: eras.length,
    categories: categories.length,
    places: places.length,
    settings: null,
  };

  const shared = { timeline, itemId, onSelectItem: selectItem, onDirtyChange: setDirty };
  const fmt = (key: number) => formatSortKey(key, timeline.dateFormat);

  return (
    <div className="page editor">
      <div className="page-head">
        <h1>{timeline.title}</h1>
        <Link className="btn" to={`/t/${timeline.id}`}>View timeline</Link>
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

      {tab === 'events' && (
        <CollectionTab<TimelineEvent>
          {...shared}
          items={events}
          noun="event"
          blank={() => blankEvent(timeline)}
          nameOf={(e) => e.title}
          matches={(e, q) => e.title.toLowerCase().includes(q) || e.date.display.toLowerCase().includes(q)}
          renderRow={(e) => {
            const era = eraFor(e.date.sortKey, timeline.eras);
            return (
              <>
                <span className="swatch" style={{ background: era?.color ?? 'transparent' }} />
                <span className="row-main">{e.title}</span>
                <span className="row-meta">{e.date.display}</span>
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
          renderForm={(p) => <EraForm {...p} dateFormat={timeline.dateFormat} />}
        />
      )}

      {tab === 'categories' && (
        <CollectionTab<Category>
          {...shared}
          items={categories}
          noun="category"
          blank={() => ({ id: '', name: '', color: '#c9a227' })}
          nameOf={(c) => c.name}
          renderRow={(c) => (
            <>
              <span className="swatch" style={{ background: c.color }} />
              <span className="row-main">{c.name}</span>
              <span className="row-meta">{countUsage(timeline, 'categoryIds', c.id)}</span>
            </>
          )}
          save={saveCategory}
          remove={removeCategory}
          deleteWarning={(c) => usageWarning(countUsage(timeline, 'categoryIds', c.id))}
          renderForm={(p) => <CategoryForm {...p} />}
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
          renderForm={(p) => <PlaceForm {...p} />}
        />
      )}
    </div>
  );
}

const usageWarning = (n: number) => (n > 0 ? `It's used by ${n} event${n === 1 ? '' : 's'} and will be removed from them.` : undefined);

function blankEvent(timeline: Timeline): TimelineEvent {
  const date =
    timeline.dateFormat === 'millennium'
      ? millenniumDate(41)
      : timeline.dateFormat === 'year'
        ? yearDate(new Date().getFullYear())
        : freeformDate('', 0);
  return { id: '', title: '', summary: '', body: '', date, categoryIds: [], placeIds: [], relatedIds: [], sources: [] };
}
