import { Link } from 'react-router-dom';
import type { Timeline } from '../../types/timeline';
import { backlinks, linkHref, type LinkKind } from '../../lib/links';

const ICONS: Record<LinkKind, string> = { event: '◆', character: '☺', place: '⌖', faction: '⚑', lore: '❡' };

/**
 * "Mentioned in": everything whose text [[links]] to this page, as chips.
 * Nothing shows when nothing links here.
 */
export default function MentionedIn({ timeline, kind, id, skip = [] }: { timeline: Timeline; kind: LinkKind; id: string; skip?: LinkKind[] }) {
  const links = backlinks(timeline, kind, id).filter((b) => !skip.includes(b.kind));
  if (links.length === 0) return null;
  return (
    <section className="history-section">
      <h2 className="history-heading">Mentioned in</h2>
      <div className="chips">
        {links.map((b) => (
          <Link key={`${b.kind}:${b.id}`} className="chip chip-link" to={linkHref(timeline.id, b)} title={b.kind[0].toUpperCase() + b.kind.slice(1)}>
            <span aria-hidden="true">{ICONS[b.kind]}</span> {b.name}
          </Link>
        ))}
      </div>
    </section>
  );
}
