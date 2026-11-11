import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { Era } from '../../types/timeline';
import type { ChronologyEntry } from './entries';

interface Props {
  /** Born, died and their events. Markers (born, died) mark the ends. */
  entries: ChronologyEntry[];
  eras: Era[];
}

/**
 * A character's life drawn to scale: a bar from their first date to their
 * last, coloured by the eras it crosses, with a dot for each event. Unlike
 * the main timeline, distances here are real: a gap of 30 years looks like
 * one. Needs at least two different dates to draw.
 */
export default function LifeStrip({ entries, eras }: Props) {
  const keys = entries.map((e) => e.sortKey);
  const lo = Math.min(...keys);
  const hi = Math.max(...keys);
  if (entries.length < 2 || hi === lo) return null;
  const at = (key: number) => `${((key - lo) / (hi - lo)) * 100}%`;

  // The parts of each era that fall within the life
  const bands = eras
    .filter((e) => e.end >= lo && e.start <= hi)
    .map((e) => ({ era: e, from: Math.max(e.start, lo), to: Math.min(e.end, hi) }));
  const first = entries.find((e) => e.sortKey === lo)!;
  const last = entries.find((e) => e.sortKey === hi)!;

  return (
    <figure className="life-strip" aria-label="Their life to scale">
      <div className="life-bar">
        {bands.map((b) => (
          <span
            key={b.era.id}
            className="life-band"
            title={b.era.name}
            style={{ left: at(b.from), width: `calc(${at(b.to)} - ${at(b.from)})`, '--era-color': b.era.color } as CSSProperties}
          />
        ))}
        {entries.map((e) =>
          e.to ? (
            <Link key={e.key} className={`life-dot${e.marker ? ' is-marker' : ''}`} style={{ left: at(e.sortKey) }} to={e.to} title={`${e.date} · ${typeof e.title === 'string' ? e.title : ''}`}>
              <span className="sr-only">{e.date} · {e.title}</span>
            </Link>
          ) : (
            <span key={e.key} className={`life-dot${e.marker ? ' is-marker' : ''}`} style={{ left: at(e.sortKey) }} title={`${e.date} · ${typeof e.title === 'string' ? e.title : ''}`} />
          ),
        )}
      </div>
      <figcaption className="life-ends">
        <span>{first.date}</span>
        <span>{last.date}</span>
      </figcaption>
    </figure>
  );
}
