import { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { KindStyle } from '../../lib/relations';

export interface DiagramNode {
  id: string;
  label: string;
  color: string;
  imageUrl?: string;
  /** Where clicking the node goes. */
  to?: string;
}

export interface DiagramEdge {
  id: string;
  from: string;
  to: string;
  style: KindStyle;
  /** Shown on hover, e.g. "The Concord at war with the Hollow Crown, C.A. 120 – 260". */
  title: string;
}

interface Props {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  /** The kinds to explain under the diagram. */
  legend: KindStyle[];
  /** A name for screen readers, e.g. "Faction relations". */
  label: string;
}

const NODE_R = 26;

/** "The Hollow Crown" -> "H": the first letter, skipping a leading "The". */
const initial = (label: string) => label.trim().replace(/^the\s+/i, '')[0]?.toUpperCase() ?? '?';

/**
 * Things in a circle with coloured lines between them: faction relations,
 * character relationships. Hovering (or focusing) one fades everything not
 * linked to it; clicking opens its page. Several lines between the same two
 * bend apart so each stays visible.
 */
/**
 * Seats linked nodes next to each other round the circle: walks the links
 * outwards from the first node (breadth first), then from the next node not
 * reached yet, so each connected group sits together and fewer lines cross.
 */
function seatingOrder(nodes: DiagramNode[], edges: DiagramEdge[]): DiagramNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const seen = new Set<string>();
  const order: DiagramNode[] = [];
  for (const first of nodes) {
    if (seen.has(first.id)) continue;
    seen.add(first.id);
    const queue = [first.id];
    while (queue.length) {
      const id = queue.shift()!;
      order.push(byId.get(id)!);
      for (const e of edges) {
        const other = e.from === id ? e.to : e.to === id ? e.from : null;
        if (other && byId.has(other) && !seen.has(other)) {
          seen.add(other);
          queue.push(other);
        }
      }
    }
  }
  return order;
}

export default function NetworkDiagram({ nodes: given, edges, legend, label }: Props) {
  const nodes = seatingOrder(given, edges);
  const navigate = useNavigate();
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, '');
  const [focus, setFocus] = useState<string | null>(null);

  // Round the circle; bigger circles for more nodes, so labels don't collide
  const radius = nodes.length <= 1 ? 0 : Math.max(150, (nodes.length * (NODE_R * 2 + 80)) / (2 * Math.PI));
  // Room for labels beside the circle
  const pad = NODE_R + 130;
  const size = radius * 2 + pad * 2;
  const centre = size / 2;
  const at = new Map(
    nodes.map((n, i) => {
      const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
      return [n.id, { x: centre + Math.cos(angle) * radius, y: centre + Math.sin(angle) * radius, angle }] as const;
    }),
  );

  // How many lines join each pair, and which of them each edge is, to bend them apart
  const pairKey = (e: DiagramEdge) => [e.from, e.to].sort().join('|');
  const perPair = new Map<string, DiagramEdge[]>();
  for (const e of edges) perPair.set(pairKey(e), [...(perPair.get(pairKey(e)) ?? []), e]);

  const linked = (id: string) => focus === null || focus === id || edges.some((e) => (e.from === focus && e.to === id) || (e.to === focus && e.from === id));
  const markerId = (color: string) => `${uid}-arrow-${color.replace('#', '')}`;
  const colors = [...new Set(edges.filter((e) => e.style.directed).map((e) => e.style.color))];

  if (nodes.length === 0) return null;

  return (
    <figure className="network">
      <svg className="network-svg" viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} style={{ maxWidth: size }}>
        <defs>
          {colors.map((c) => (
            <marker key={c} id={markerId(c)} viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill={c} />
            </marker>
          ))}
          {nodes.map((n) => (
            <clipPath key={n.id} id={`${uid}-clip-${nodes.indexOf(n)}`}>
              <circle r={NODE_R - 3} />
            </clipPath>
          ))}
        </defs>

        <g className="network-edges">
          {edges.map((e) => {
            const a = at.get(e.from);
            const b = at.get(e.to);
            if (!a || !b) return null;
            const group = perPair.get(pairKey(e))!;
            const i = group.indexOf(e);
            // Bend: 0 for a lone line, then alternating sides
            const bend = group.length === 1 ? 0 : (i - (group.length - 1) / 2) * 34;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const len = Math.hypot(dx, dy) || 1;
            // Keep the same side whichever way round the pair was written
            const flip = e.from < e.to ? 1 : -1;
            const cx = (a.x + b.x) / 2 + (-dy / len) * bend * flip;
            const cy = (a.y + b.y) / 2 + (dx / len) * bend * flip;
            // Stop at the circles' edges, so arrows are visible
            const trim = (p: { x: number; y: number }, q: { x: number; y: number }) => {
              const l = Math.hypot(q.x - p.x, q.y - p.y) || 1;
              return { x: p.x + ((q.x - p.x) / l) * (NODE_R + 3), y: p.y + ((q.y - p.y) / l) * (NODE_R + 3) };
            };
            const s = trim(a, { x: cx, y: cy });
            const t = trim(b, { x: cx, y: cy });
            const faded = focus !== null && e.from !== focus && e.to !== focus;
            return (
              <path
                key={e.id}
                className={`network-edge${faded ? ' is-faded' : ''}`}
                d={`M${s.x},${s.y} Q${cx},${cy} ${t.x},${t.y}`}
                stroke={e.style.color}
                strokeDasharray={e.style.dashed ? '6 5' : undefined}
                markerEnd={e.style.directed ? `url(#${markerId(e.style.color)})` : undefined}
              >
                <title>{e.title}</title>
              </path>
            );
          })}
        </g>

        <g className="network-nodes">
          {nodes.map((n, i) => {
            const p = at.get(n.id)!;
            // Labels sit outside the circle, on the side away from the centre:
            // beside the node on the left and right, above or below at the top and bottom
            const cos = nodes.length === 1 ? 0 : Math.cos(p.angle);
            const sin = nodes.length === 1 ? 1 : Math.sin(p.angle);
            const side = Math.abs(cos) > 0.35;
            const labelX = side ? Math.sign(cos) * (NODE_R + 8) : 0;
            const labelY = side ? sin * 10 : sin > 0 ? NODE_R + 16 : -NODE_R - 8;
            const anchor = side ? (cos > 0 ? 'start' : 'end') : 'middle';
            return (
              <g
                key={n.id}
                className={`network-node${linked(n.id) ? '' : ' is-faded'}${n.to ? ' is-link' : ''}`}
                transform={`translate(${p.x},${p.y})`}
                tabIndex={n.to ? 0 : undefined}
                role={n.to ? 'link' : undefined}
                aria-label={n.label}
                onMouseEnter={() => setFocus(n.id)}
                onMouseLeave={() => setFocus(null)}
                onFocus={() => setFocus(n.id)}
                onBlur={() => setFocus(null)}
                onClick={() => n.to && navigate(n.to)}
                onKeyDown={(ev) => {
                  if (n.to && (ev.key === 'Enter' || ev.key === ' ')) {
                    ev.preventDefault();
                    navigate(n.to);
                  }
                }}
              >
                <circle r={NODE_R} fill={n.color} className="network-dot" />
                {n.imageUrl ? (
                  <image href={n.imageUrl} x={-(NODE_R - 3)} y={-(NODE_R - 3)} width={(NODE_R - 3) * 2} height={(NODE_R - 3) * 2} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${uid}-clip-${i})`} />
                ) : (
                  <text className="network-initial" textAnchor="middle" dy="0.35em">{initial(n.label)}</text>
                )}
                <text className="network-label" textAnchor={anchor} x={labelX} y={labelY} dy={side ? '0.35em' : undefined}>{n.label}</text>
              </g>
            );
          })}
        </g>
      </svg>

      {legend.length > 0 && (
        <figcaption className="network-legend">
          {legend.map((k) => (
            <span key={k.label} className="network-key">
              <svg width="28" height="10" aria-hidden="true">
                <line x1="1" y1="5" x2={k.directed ? 21 : 27} y2="5" stroke={k.color} strokeWidth="3" strokeDasharray={k.dashed ? '5 4' : undefined} />
                {k.directed && <path d="M20,0 L28,5 L20,10 z" fill={k.color} />}
              </svg>
              {k.label}
              {k.directed && <span className="muted"> (one way)</span>}
            </span>
          ))}
        </figcaption>
      )}
    </figure>
  );
}
