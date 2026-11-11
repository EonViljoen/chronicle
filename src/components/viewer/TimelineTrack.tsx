import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import type { Calendar, Faction, Era, TimelineEvent } from '../../types/timeline';
import { formatDate } from '../../lib/dates';
import TimelineNode from './TimelineNode';
import { mainFactionOf } from '../../lib/factions';

interface Props {
  /** The events of the era on show, already sorted by date. */
  events: TimelineEvent[];
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

/**
 * The stage: one era at a time, across the full width of the page.
 * Nodes are spaced evenly (index ÷ count) rather than to scale, because the
 * real gaps between events can be anything from days to millions of years.
 * An era with more events than fit scrolls sideways (each slot keeps at
 * least --gap). Positioning is done in CSS from --i and --n; see `.track`.
 */
export default function TimelineTrack({ events, era, eraKey, calendar, factions, selectedId, isVisible, onSelect, onStep, canStep, status }: Props) {
  // A Map of event id -> button element, filled by each node's ref callback.
  const nodeRefs = useRef(new Map<string, HTMLButtonElement>());

  const colorById = useMemo(() => new Map(factions.map((c) => [c.id, c.color])), [factions]);

  // useEffect runs after render. Whenever the selection changes, bring that
  // node into view (only matters when the era is too long to fit).
  useEffect(() => {
    if (!selectedId) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    nodeRefs.current.get(selectedId)?.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      inline: 'center',
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
          <div className="track" style={{ '--n': events.length } as CSSProperties}>
            <div className="track-line" aria-hidden="true" />

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
                // The main faction's colour, else the first faction's
                color={colorById.get(mainFactionOf(event) ?? event.factionIds[0]) ?? FALLBACK_COLOR}
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
