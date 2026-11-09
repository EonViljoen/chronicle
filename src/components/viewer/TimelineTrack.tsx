import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import type { Calendar, Faction, Era, TimelineEvent } from '../../types/timeline';
import { formatDate } from '../../lib/dates';
import { eraSegments } from '../../lib/eras';
import TimelineNode from './TimelineNode';

interface Props {
  /** Already sorted by date. */
  events: TimelineEvent[];
  eras: Era[];
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
 * The horizontal line. Nodes are evenly spaced (index × gap) rather than to
 * scale, because some timelines have gaps of millions of years.
 * Positioning is done in CSS from --i and --n; see `.track` in index.css.
 */
export default function TimelineTrack({ events, eras, calendar, factions, selectedId, isVisible, onSelect, onStep, canStep, status }: Props) {
  // A Map of event id -> button element, filled by each node's ref callback.
  const nodeRefs = useRef(new Map<string, HTMLButtonElement>());

  const segments = useMemo(() => eraSegments(events, eras), [events, eras]);
  const colorById = useMemo(() => new Map(factions.map((c) => [c.id, c.color])), [factions]);

  // useEffect runs after render. Whenever the selection changes, slide that
  // node to the centre of the scroller.
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
    <div className="stage">
      <button className="stage-arrow stage-arrow-left" onClick={() => onStep(-1)} disabled={!canStep.prev} aria-label="Previous event">
        ‹
      </button>

      <div className="track-scroller">
        <div className="track-row">
          <div className="track-spacer" />
          <div className="track" style={{ '--n': events.length } as CSSProperties}>
            {segments.map((seg) => (
              <div
                key={seg.startIndex}
                className="era-band"
                style={
                  {
                    '--start': seg.startIndex,
                    '--count': seg.endIndex - seg.startIndex + 1,
                    '--era-color': seg.era?.color ?? 'transparent',
                  } as CSSProperties
                }
              >
                {seg.era && <span className="era-band-label">{seg.era.name}</span>}
              </div>
            ))}

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
                color={colorById.get(event.factionIds[0]) ?? FALLBACK_COLOR}
                selected={event.id === selectedId}
                dimmed={!isVisible(event)}
                onSelect={onSelect}
              />
            ))}
          </div>
          <div className="track-spacer" />
        </div>
      </div>

      {status && <span className="stage-status" aria-live="polite">{status}</span>}

      <button className="stage-arrow stage-arrow-right" onClick={() => onStep(1)} disabled={!canStep.next} aria-label="Next event">
        ›
      </button>
    </div>
  );
}
