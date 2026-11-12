import { useEffect, useRef, type CSSProperties } from 'react';
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
  // With many eras the strip scrolls sideways: keep the era on show in view.
  // Only the strip scrolls (not the page), so moving through events never jumps the page.
  // The first time it jumps straight there (a smooth scroll can be cut short
  // while the page is still settling); after that it glides.
  const strip = useRef<HTMLElement>(null);
  const scrolledOnce = useRef(false);
  useEffect(() => {
    const el = strip.current;
    const piece = el?.querySelector<HTMLElement>('.era-piece.is-current');
    if (!el || !piece) return;
    const behavior = scrolledOnce.current ? 'smooth' : 'instant';
    scrolledOnce.current = true;
    const left = piece.offsetLeft;
    const right = left + piece.offsetWidth;
    if (left < el.scrollLeft) el.scrollTo({ left: left - 24, behavior });
    else if (right > el.scrollLeft + el.clientWidth) el.scrollTo({ left: right - el.clientWidth + 24, behavior });
  }, [shownSegment]);

  return (
    <nav ref={strip} className="era-strip" aria-label="Eras">
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
