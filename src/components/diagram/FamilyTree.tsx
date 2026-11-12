import { Link } from 'react-router-dom';
import type { Timeline } from '../../types/timeline';
import { familyOf, familyTree } from '../../lib/relations';
import { formatDate } from '../../lib/dates';

const W = 156; // a person's box
const H = 58;
const GAP_X = 28;
const GAP_Y = 54;

/**
 * A character's family tree, from parent and spouse links: each generation
 * a row, couples side by side joined by a line, and lines down to their
 * children. The character it's drawn for is highlighted. Nothing shows for
 * someone with no family links.
 */
export default function FamilyTree({ timeline, characterId }: { timeline: Timeline; characterId: string }) {
  const ids = familyOf(characterId, timeline.relationships);
  if (ids.size < 2) return null;
  const { at, columns, rows, descents, couples } = familyTree(ids, timeline.relationships, timeline.characters);

  const x = (id: string) => at.get(id)![0] * (W + GAP_X);
  const y = (id: string) => at.get(id)![1] * (H + GAP_Y);
  const width = columns * (W + GAP_X) - GAP_X;
  const height = rows * (H + GAP_Y) - GAP_Y;
  const isCouple = (a: string, b: string) => couples.some(([p, q]) => (p === a && q === b) || (p === b && q === a));

  return (
    <div className="family-tree" role="group" aria-label="Family tree">
      <div className="family-tree-canvas" style={{ width, height }}>
        <svg className="family-lines" width={width} height={height} aria-hidden="true">
          {couples.map(([a, b]) => {
            const [l, r] = x(a) < x(b) ? [a, b] : [b, a];
            const midY = y(l) + H / 2;
            return <line key={`${a}-${b}`} className="family-couple" x1={x(l) + W} y1={midY} x2={x(r)} y2={midY} />;
          })}
          {descents.map(({ parents, childId }) => {
            // From the middle of a couple's line, or from under a single parent
            const couple = parents.length === 2 && isCouple(parents[0], parents[1]) && y(parents[0]) === y(parents[1]);
            const fromX = couple ? (x(parents[0]) + x(parents[1])) / 2 + W / 2 : x(parents[0]) + W / 2;
            const fromY = couple ? y(parents[0]) + H / 2 : y(parents[0]) + H;
            const toX = x(childId) + W / 2;
            const toY = y(childId);
            const midY = toY - GAP_Y / 2;
            return <path key={childId} className="family-descent" d={`M${fromX},${fromY} V${midY} H${toX} V${toY}`} />;
          })}
        </svg>
        {[...ids].map((id) => {
          const c = timeline.characters.find((ch) => ch.id === id);
          if (!c) return null;
          const color = timeline.factions.find((f) => f.id === c.factionId)?.color;
          const life = [c.born && formatDate(c.born, timeline.calendar), c.died && formatDate(c.died, timeline.calendar)];
          return (
            <Link
              key={id}
              className={`family-person${id === characterId ? ' is-current' : ''}`}
              to={`/t/${timeline.id}/characters/${encodeURIComponent(id)}`}
              style={{ left: x(id), top: y(id), width: W, height: H, borderColor: color }}
              aria-current={id === characterId ? 'page' : undefined}
            >
              {c.imageUrl ? (
                <img className="chip-portrait" src={c.imageUrl} alt="" />
              ) : (
                <span className="chip-portrait is-empty" aria-hidden="true">{c.name.trim()[0]?.toUpperCase()}</span>
              )}
              <span className="family-person-text">
                <strong>{c.name}</strong>
                {(life[0] || life[1]) && <span className="muted">{life[0] || '?'} – {life[1] || ''}</span>}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
