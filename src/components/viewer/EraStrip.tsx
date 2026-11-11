import type { CSSProperties } from 'react';
import type { StripItem } from '../../lib/stage';

interface Props {
  items: StripItem[];
  /** The run of events on the stage. */
  shownSegment: number;
  /** Where the selected event sits within the run on show, 0–1; null when nothing is selected. */
  marker: number | null;
  /** Runs with nothing left after filtering can't be jumped to. */
  canJump: (segment: number) => boolean;
  onJump: (segment: number) => void;
}

/**
 * The whole timeline at a glance, above the stage: a thin bar with a piece
 * per era, each as wide as its number of events. The era on show is
 * highlighted, with a tick for the selected event; click a piece to jump
 * there. Eras with no events show as thin slivers.
 */
export default function EraStrip({ items, shownSegment, marker, canJump, onJump }: Props) {
  return (
    <nav className="era-strip" aria-label="Eras">
      {items.map((item) => {
        const current = item.segment === shownSegment;
        const name = item.era?.name ?? 'Outside any era';
        const label = `${name}: ${item.count} event${item.count === 1 ? '' : 's'}`;
        return (
          <button
            key={item.key}
            className={`era-piece${current ? ' is-current' : ''}${item.count === 0 ? ' is-empty' : ''}${item.era ? '' : ' is-no-era'}`}
            style={{ '--era-color': item.era?.color ?? 'var(--muted)', flexGrow: item.count } as CSSProperties}
            disabled={item.segment === undefined || !canJump(item.segment)}
            aria-current={current ? 'true' : undefined}
            aria-label={label}
            title={label}
            onClick={() => item.segment !== undefined && onJump(item.segment)}
          >
            <span className="era-piece-name" aria-hidden="true">{name}</span>
            {current && marker !== null && <span className="era-piece-marker" style={{ left: `${marker * 100}%` }} aria-hidden="true" />}
          </button>
        );
      })}
    </nav>
  );
}
