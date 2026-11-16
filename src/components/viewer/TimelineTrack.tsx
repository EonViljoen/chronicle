import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import type { Calendar, Faction, Era, TimelineEvent } from '../../types/timeline';
import { formatDate, formatSpan } from '../../lib/dates';
import TimelineNode from './TimelineNode';
import { mainFactionOf } from '../../lib/factions';
import { laneOf, lanesFor, otherLanes, spanBars, type SpanBar } from '../../lib/stage';

interface Props {
  /** The events of the era on show, already sorted by date. */
  events: TimelineEvent[];
  /** Every event, sorted, periods included: spans and periods that began in an earlier era still show here. */
  allEvents: TimelineEvent[];
  /** One row per faction (child factions get their own) instead of a single line. */
  lanes: boolean;
  /** The era on show; undefined for events outside every era. */
  era: Era | undefined;
  /** Changes whenever a different era is shown, to replay the fade-in. */
  eraKey: number;
  calendar: Calendar;
  factions: Faction[];
  selectedId: string | null;
  isVisible: (event: TimelineEvent) => boolean;
  onSelect: (id: string) => void;
  onStep: (direction: 1 | -1) => void;
  canStep: { prev: boolean; next: boolean };
  /** Small text under the line, e.g. "3 / 14". */
  status?: string;
}

const FALLBACK_COLOR = '#c9a227';

// Sizes in px; they match the CSS for .track, .node and .span-bar
/** Single line: where the first row of span bars starts (under the titles), and each row's height. */
const BARS_TOP = 176;
const BAR_ROW = 22;
const TRACK_HEIGHT = 210;
/** Lanes: each lane's height, and where its line and nodes sit within it. */
const LANE_HEIGHT = 112;
const LANE_LINE = 44;
const LANE_NODE = 20;
/** Room above the first lane for the era's name. */
const LANES_TOP = 30;

/**
 * Where a bar starts and how wide it is, as CSS lengths. A span that ends
 * before the next event still gets half a column, so it reads as a bar
 * (and stops short of the next event) rather than a dot.
 */
function barBox(bar: SpanBar, n: number) {
  // A period brackets its events: from a little before the first node to a little after the last
  const lead = bar.period ? 0.18 : 0.5;
  const tail = bar.period ? 0.82 : 0.5;
  const start = bar.from === -1 ? '0%' : `${((bar.from + lead) * 100) / n}%`;
  const end = bar.to === n ? '100%' : `${((bar.to + tail) * 100) / n}%`;
  return { left: start, width: `max(calc(${end} - ${start}), ${50 / n}%)` };
}

/**
 * The stage: one era at a time, across the full width of the page.
 * Nodes are spaced evenly (index ÷ count) rather than to scale, because the
 * real gaps between events can be anything from days to millions of years.
 * An era with more events than fit scrolls sideways (each slot keeps at
 * least --gap). Positioning is done in CSS from --i and --n; see `.track`.
 */
export default function TimelineTrack({ events, allEvents, lanes, era, eraKey, calendar, factions, selectedId, isVisible, onSelect, onStep, canStep, status }: Props) {
  // A Map of event id -> button element, filled by each node's ref callback.
  const nodeRefs = useRef(new Map<string, HTMLButtonElement>());

  const colorById = useMemo(() => new Map(factions.map((c) => [c.id, c.color])), [factions]);
  // The main faction's colour, else the first faction's
  const colorOf = (event: TimelineEvent) => colorById.get(mainFactionOf(event) ?? event.factionIds[0]) ?? FALLBACK_COLOR;

  const bars = useMemo(() => spanBars(events, allEvents), [events, allEvents]);
  // Lanes for this era's events, and for spans reaching in from an earlier era
  const laneList = useMemo(() => (lanes ? lanesFor([...events, ...bars.map((b) => b.event)], factions) : []), [lanes, events, bars, factions]);
  const laneIndex = (id: string | undefined) => laneList.findIndex((l) => l.id === id);
  const n = events.length;
  const barRows = bars.reduce((rows, b) => Math.max(rows, b.row + 1), 0);
  const height = lanes ? LANES_TOP + laneList.length * LANE_HEIGHT : barRows ? BARS_TOP + barRows * BAR_ROW + 30 : TRACK_HEIGHT; // +30 keeps the "3 / 14" counter clear of the bars

  // useEffect runs after render. Whenever the selection changes, bring that
  // node into view (only matters when the era is too long to fit).
  const barRefs = useRef(new Map<string, HTMLButtonElement>());
  // The first scroll (opening a link to an event) jumps straight there: a smooth
  // scroll started while the page is still settling can be cut short
  const scrolledOnce = useRef(false);
  useEffect(() => {
    if (!selectedId) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const smooth = scrolledOnce.current && !reduceMotion;
    scrolledOnce.current = true;
    // A period has no node: bring its bar into view instead
    const node = nodeRefs.current.get(selectedId);
    (node ?? barRefs.current.get(selectedId))?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
      inline: node ? 'center' : 'nearest',
      block: 'nearest',
    });
  }, [selectedId]);

  return (
    <div className="stage" style={{ '--era-color': era?.color ?? 'transparent' } as CSSProperties}>
      <button className="stage-arrow stage-arrow-left" onClick={() => onStep(-1)} disabled={!canStep.prev} aria-label="Previous event">
        ‹
      </button>

      {/* `key` makes React build this part afresh for each era, which replays its fade-in */}
      <div className="stage-era" key={eraKey}>
        <div className="era-band" aria-hidden="true">
          {era && <span className="era-band-label">{era.name}</span>}
        </div>

        <div className="track-scroller">
          <div className={`track${lanes ? ' is-lanes' : ''}`} style={{ '--n': n, height } as CSSProperties}>
            {lanes ? (
              // One line per faction, with its name (and its parents, for a child faction)
              laneList.map((lane, k) => (
                <div key={lane.id ?? 'none'} className="lane" style={{ top: LANES_TOP + k * LANE_HEIGHT, '--lane-color': lane.color ?? 'var(--muted)' } as CSSProperties}>
                  <span className="lane-label">
                    {lane.imageUrl && <img className="faction-mark" src={lane.imageUrl} alt="" />}
                    {lane.parents && <span className="lane-parents">{lane.parents} ›</span>}
                    {lane.name}
                  </span>
                  <div className="track-line lane-line" style={{ top: LANE_LINE }} aria-hidden="true" />
                </div>
              ))
            ) : (
              <div className="track-line" aria-hidden="true" />
            )}

            {/* Bars for events with an end date (a reign), and for periods (a war and its battles) */}
            {bars.map((bar) => {
              const lane = lanes ? Math.max(laneIndex(laneOf(bar.event, factions)), 0) : 0;
              const top = lanes ? LANES_TOP + lane * LANE_HEIGHT + LANE_LINE - 2 + bar.row * 6 /* a 4px bar centred on the line */ : BARS_TOP + bar.row * BAR_ROW;
              const classes = [
                'span-bar',
                bar.period && 'is-period',
                lanes && 'is-thin',
                bar.from === -1 && 'is-from-before',
                bar.to === n && 'goes-on',
                bar.event.id === selectedId && 'is-selected',
                !isVisible(bar.event) && 'is-dimmed',
              ].filter(Boolean).join(' ');
              return (
                <button
                  key={bar.event.id}
                  ref={(el) => {
                    if (el) barRefs.current.set(bar.event.id, el);
                    else barRefs.current.delete(bar.event.id);
                  }}
                  className={classes}
                  style={{ ...barBox(bar, n), top, '--node-color': colorOf(bar.event) } as CSSProperties}
                  title={`${bar.event.title}: ${formatSpan(bar.event, calendar)}`}
                  aria-label={`${bar.event.title}, ${formatSpan(bar.event, calendar)}`}
                  onClick={() => onSelect(bar.event.id)}
                >
                  {!lanes && <span className="span-bar-label">{bar.event.title}</span>}
                </button>
              );
            })}

            {/* In lanes, an event with several factions shows in each of their lanes too,
                in that faction's colour. Clicking any copy picks the event, so all of them light up. */}
            {lanes &&
              events.flatMap((event, i) =>
                otherLanes(event, factions).map((laneId) => (
                  <TimelineNode
                    key={`${event.id}-${laneId}`}
                    copy
                    event={event}
                    dateLabel={formatDate(event.date, calendar)}
                    index={i}
                    top={LANES_TOP + laneIndex(laneId) * LANE_HEIGHT + LANE_NODE}
                    color={colorById.get(laneId) ?? colorOf(event)}
                    selected={event.id === selectedId}
                    dimmed={!isVisible(event)}
                    onSelect={onSelect}
                  />
                )),
              )}

            {events.map((event, i) => (
              <TimelineNode
                key={event.id}
                ref={(el) => {
                  if (el) nodeRefs.current.set(event.id, el);
                  else nodeRefs.current.delete(event.id);
                }}
                event={event}
                dateLabel={formatDate(event.date, calendar)}
                index={i}
                top={lanes ? LANES_TOP + Math.max(laneIndex(laneOf(event, factions)), 0) * LANE_HEIGHT + LANE_NODE : undefined}
                color={colorOf(event)}
                selected={event.id === selectedId}
                dimmed={!isVisible(event)}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      </div>

      {status && <span className="stage-status" aria-live="polite">{status}</span>}

      <button className="stage-arrow stage-arrow-right" onClick={() => onStep(1)} disabled={!canStep.next} aria-label="Next event">
        ›
      </button>
    </div>
  );
}
