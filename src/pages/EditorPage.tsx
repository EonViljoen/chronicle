import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Link, useBlocker, useSearchParams, type BlockerFunction } from 'react-router-dom';
import type { Faction, FactionRelation, Era, LorePage, Place, Timeline, TimelineEvent } from '../types/timeline';
import RelationForm from '../components/editor/RelationForm';
import LoreForm from '../components/editor/LoreForm';
import { RELATION_KINDS } from '../lib/relations';
import { sortLore } from '../lib/lore';
import { isPeriod, periodsOf } from '../lib/periods';
import CharacterForm, { type CharacterDraft } from '../components/editor/CharacterForm';
import { characterGroups } from '../lib/characters';
import { FactionMark } from '../components/history/Chips';
import TimelineGate from '../components/TimelineGate';
import { EditOnly } from '../components/EditOnly';
import { allMaps, mapsWithPlace } from '../lib/maps';
import CollectionTab from '../components/editor/CollectionTab';
import SettingsForm from '../components/editor/SettingsForm';
import PicturesSection from '../components/editor/PicturesSection';
import CalendarTab from '../components/editor/CalendarTab';
import StarmapTab from '../components/editor/StarmapTab';
import ThemeTab from '../components/editor/ThemeTab';
import WebsiteTab from '../components/editor/WebsiteTab';
import EraForm from '../components/editor/EraForm';
import FactionForm from '../components/editor/FactionForm';
import PlaceForm from '../components/editor/PlaceForm';
import MapsPanel from '../components/editor/MapsPanel';
import EventForm from '../components/editor/EventForm';
import { compareEvents, defaultSortKey, formatKey, formatSpan } from '../lib/dates';
import { eraFor } from '../lib/eras';
import { factionTree } from '../lib/factions';
import {
  countUsage,
  removeCharacter,
  removeFaction,
  removeEra,
  removeEvent,
  removePlace,
  removeLore,
  removeRelation,
  fromSide,
  type EventDraft,
  saveCharacterFull,
  saveLore,
  saveRelation,
  saveFaction,
  saveEra,
  saveEvent,
  savePlace,
} from '../lib/mutations';

const TABS = ['events', 'eras', 'factions', 'relations', 'characters', 'places', 'lore', 'maps', 'starmap', 'calendar', 'theme', 'website', 'settings'] as const;
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
    // ?map=… (from "Pin places here" in the Maps tab) picks the map the place
    // form pins on; keep it while moving between places
    const pinMap = params.get('map');
    if (pinMap && nextTab === 'places' && tab === 'places') next.set('map', pinMap);
    setParams(next);
  };
  const selectItem = (item: string | null) => go(tab, item);
  const pinMapName = timeline.maps.find((m) => m.id === params.get('map'))?.name;

  // ----- Sorted lists -----
  // Events with the periods they're part of (periods store that link, see saveEvent)
  const events = useMemo<EventDraft[]>(
    () => [...timeline.events].sort(compareEvents).map((e) => ({ ...e, partOfIds: periodsOf(e.id, timeline.events).map((p) => p.id) })),
    [timeline.events],
  );
  const eras = useMemo(() => [...timeline.eras].sort((a, b) => a.start - b.start), [timeline.eras]);
  // Factions in tree order: each one followed by its sub-factions
  const factionRows = useMemo(() => factionTree(timeline.factions), [timeline.factions]);
  const factions = useMemo(() => factionRows.map((r) => r.faction), [factionRows]);
  const depthOf = (id: string) => factionRows.find((r) => r.faction.id === id)?.depth ?? 0;
  const places = useMemo(() => [...timeline.places].sort((a, b) => a.name.localeCompare(b.name)), [timeline.places]);
  // Characters grouped by faction (independent last), each with the events they're in
  const groups = useMemo(() => characterGroups(timeline), [timeline]);
  const characters = useMemo<CharacterDraft[]>(
    () =>
      groups.flatMap((g) =>
        g.characters.map((c) => ({
          ...c,
          eventIds: timeline.events.filter((e) => e.characterIds.includes(c.id)).map((e) => e.id),
          relationships: timeline.relationships.filter((r) => r.fromId === c.id || r.toId === c.id).map((r) => fromSide(r, c.id)),
        })),
      ),
    [groups, timeline.events, timeline.relationships],
  );
  const factionName = (id: string) => timeline.factions.find((f) => f.id === id)?.name ?? '?';
  const relations = useMemo(
    () => [...timeline.relations].sort((a, b) => (a.start?.sortKey ?? -Infinity) - (b.start?.sortKey ?? -Infinity)),
    [timeline.relations],
  );
  const lore = useMemo(() => sortLore(timeline.lore), [timeline.lore]);
  const groupOfCharacter = useMemo(() => new Map(groups.flatMap((g) => g.characters.map((c) => [c.id, g.name] as const))), [groups]);

  const counts: Record<Tab, number | null> = {
    events: events.length,
    eras: eras.length,
    factions: factions.length,
    relations: relations.length,
    lore: lore.length,
    characters: characters.length,
    places: places.length,
    maps: allMaps(timeline).length,
    starmap: null,
    calendar: null,
    theme: null,
    website: null,
    settings: null,
  };

  const shared = { timeline, itemId, onSelectItem: selectItem, onDirtyChange: setDirty };
  const fmt = (key: number) => formatKey(key, timeline.calendar);
  const dateOf = (e: TimelineEvent) => formatSpan(e, timeline.calendar);

  return (
    <div className="page editor">
      <div className="page-head">
        <h1>{timeline.title}</h1>
        <div className="page-head-actions">
          {allMaps(timeline).length > 0 && <Link className="btn" to={`/t/${timeline.id}/map`}>Map</Link>}
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

      {tab === 'settings' && (
        <>
          <SettingsForm timeline={timeline} onDirtyChange={setDirty} />
          <PicturesSection timeline={timeline} />
        </>
      )}
      {tab === 'calendar' && <CalendarTab timeline={timeline} onDirtyChange={setDirty} />}
      {tab === 'maps' && <MapsPanel {...shared} />}
      {tab === 'starmap' && <StarmapTab timeline={timeline} onDirtyChange={setDirty} />}
      {tab === 'theme' && <ThemeTab timeline={timeline} onDirtyChange={setDirty} />}
      {tab === 'website' && <WebsiteTab timeline={timeline} onDirtyChange={setDirty} />}

      {tab === 'events' && (
        <CollectionTab<EventDraft>
          {...shared}
          items={events}
          noun="event"
          blank={() => blankEvent(timeline, events)}
          nameOf={(e) => e.title}
          matches={(e, q) => e.title.toLowerCase().includes(q) || dateOf(e).toLowerCase().includes(q) || e.tags.some((t) => t.includes(q))}
          renderRow={(e) => {
            const era = eraFor(e.date.sortKey, timeline.eras);
            return (
              <>
                <span className={`swatch${isPeriod(e) ? ' is-period' : ''}`} style={{ background: era?.color ?? 'transparent' }} title={isPeriod(e) ? 'Period' : undefined} />
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
              <FactionMark faction={c} style={{ marginLeft: depthOf(c.id) * 16 }} />
              <span className="row-main">{c.name}</span>
              <span className="row-meta">{countUsage(timeline, 'factionIds', c.id)}</span>
            </>
          )}
          save={saveFaction}
          remove={removeFaction}
          deleteWarning={(c) => factionDeleteWarning(timeline, c)}
          renderForm={(p) => <FactionForm {...p} timeline={timeline} />}
        />
      )}

      {tab === 'relations' && (
        <CollectionTab<FactionRelation>
          {...shared}
          items={relations}
          noun="relation"
          blank={() => ({ id: '', kind: 'ally', fromId: factions[0]?.id ?? '', toId: factions[1]?.id ?? '', note: '' })}
          nameOf={(r) => `${factionName(r.fromId)} ${r.kind} ${factionName(r.toId)}`}
          matches={(r, q) => `${factionName(r.fromId)} ${factionName(r.toId)} ${RELATION_KINDS[r.kind].label}`.toLowerCase().includes(q)}
          renderRow={(r) => (
            <>
              <span className="swatch" style={{ background: RELATION_KINDS[r.kind].color }} />
              <span className="row-main">
                {factionName(r.fromId)} <span className="muted">{RELATION_KINDS[r.kind].directed ? '→' : '–'}</span> {factionName(r.toId)}
              </span>
              <span className="row-meta">{RELATION_KINDS[r.kind].label}</span>
            </>
          )}
          save={saveRelation}
          remove={removeRelation}
          renderForm={(p) => <RelationForm {...p} timeline={timeline} />}
        />
      )}

      {tab === 'lore' && (
        <CollectionTab<LorePage>
          {...shared}
          items={lore}
          noun="lore page"
          blank={() => ({ id: '', title: '', category: '', body: '', sources: [] })}
          nameOf={(p) => p.title}
          matches={(p, q) => `${p.title} ${p.category}`.toLowerCase().includes(q)}
          groupOf={(p) => p.category.trim() || 'Other'}
          renderRow={(p) => <span className="row-main">{p.title}</span>}
          save={saveLore}
          remove={removeLore}
          renderForm={(p) => <LoreForm {...p} timeline={timeline} />}
        />
      )}

      {tab === 'characters' && (
        <CollectionTab<CharacterDraft>
          {...shared}
          items={characters}
          noun="character"
          blank={() => ({ id: '', name: '', description: '', feats: [], eventIds: [], relationships: [] })}
          nameOf={(c) => c.name}
          matches={(c, q) => c.name.toLowerCase().includes(q)}
          groupOf={(c) => groupOfCharacter.get(c.id) ?? ''}
          renderRow={(c) => {
            const color = timeline.factions.find((f) => f.id === c.factionId)?.color;
            return (
              <>
                <span className="swatch" style={{ background: color ?? 'transparent' }} />
                <span className="row-main">{c.name}</span>
                <span className="row-meta">{c.eventIds.length}</span>
              </>
            );
          }}
          save={saveCharacterFull}
          remove={removeCharacter}
          deleteWarning={(c) => usageWarning(c.eventIds.length)}
          renderForm={(p) => <CharacterForm {...p} timeline={timeline} />}
        />
      )}

      {tab === 'places' && (
        <>
          {/* Arrived from "Pin places" in the Maps tab: say which map the pins go on */}
          {pinMapName && (
            <p className="pin-banner">
              Pinning places on <strong>{pinMapName}</strong>: pick a place, or add a new one, then click the map.{' '}
              <Link to="?tab=maps">Back to Maps</Link>
            </p>
          )}
          <CollectionTab<Place>
            {...shared}
            items={places}
            noun="place"
            blank={() => ({ id: '', name: '', description: '', position: null })}
            nameOf={(p) => p.name}
            matches={(p, q) => p.name.toLowerCase().includes(q)}
            renderRow={(p) => {
              // How many maps the place is on
              const on = mapsWithPlace(p, allMaps(timeline)).length;
              return (
                <>
                  <span className="row-main">{p.name}</span>
                  <span className="row-meta" title={on ? `On ${on} map${on === 1 ? '' : 's'}` : 'Not on a map'}>{on ? `⌖${on > 1 ? ` ${on}` : ''}` : ''}</span>
                </>
              );
            }}
            save={savePlace}
            remove={removePlace}
            deleteWarning={(p) => placeDeleteWarning(timeline, p)}
            renderForm={(p) => <PlaceForm {...p} timeline={timeline} />}
          />
        </>
      )}
    </div>
  );
}

/** What deleting a faction affects: events lose the tag; sub-factions move up a level. */
function factionDeleteWarning(timeline: Timeline, faction: Faction): string | undefined {
  const children = timeline.factions.filter((c) => c.parentId === faction.id).length;
  const parent = timeline.factions.find((c) => c.id === faction.parentId);
  const members = timeline.characters.filter((c) => c.factionId === faction.id).length;
  const lines = [
    usageWarning(countUsage(timeline, 'factionIds', faction.id)),
    members > 0 &&
      `Its ${members} character${members === 1 ? ' moves' : 's move'} ${parent ? `to ${parent.name}` : 'to independent'}.`,
    children > 0 &&
      `Its ${children} sub-faction${children === 1 ? ' moves' : 's move'} ${parent ? `up to ${parent.name}` : 'to the top level'}.`,
  ].filter(Boolean);
  return lines.length ? lines.join('\n') : undefined;
}

const usageWarning = (n: number) => (n > 0 ? `It's used by ${n} event${n === 1 ? '' : 's'} and will be removed from them.` : undefined);

/** What deleting a place affects: events lose it, and maps it opened no longer open from it. */
function placeDeleteWarning(timeline: Timeline, place: Place): string | undefined {
  const opens = timeline.maps.filter((m) => m.placeId === place.id).map((m) => m.name);
  const lines = [
    usageWarning(countUsage(timeline, 'placeIds', place.id)),
    opens.length > 0 && `It opens the map${opens.length === 1 ? '' : 's'} ${opens.join(', ')}, which will stay but no longer open from here.`,
  ].filter(Boolean);
  return lines.length ? lines.join('\n\n') : undefined;
}

/** A new event starts at the latest event's date, since timelines are often filled in order. */
function blankEvent(timeline: Timeline, sortedEvents: TimelineEvent[]): EventDraft {
  const last = sortedEvents[sortedEvents.length - 1];
  const date: TimelineEvent['date'] = {
    sortKey: last ? last.date.sortKey : defaultSortKey(timeline.calendar),
    precision: 'exact',
    // In a free-text calendar every date is a label
    ...(timeline.calendar.type === 'freeform' && { label: '' }),
  };
  return { id: '', title: '', summary: '', body: '', date, factionIds: [], placeIds: [], characterIds: [], relatedIds: [], tags: [], sources: [], partOfIds: [] };
}
