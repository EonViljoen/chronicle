import type { Character, EventDate, FactionRelation, RelationKind, Relationship, RelationshipKind, Timeline } from '../types/timeline';
import type { RelationshipDraft } from './mutations';
import { fromSide } from './mutations';
import { formatDate } from './dates';

/*
 * How factions stand with each other, and how characters are linked.
 * The kinds' names and colours live here, so the editor, pages and
 * diagrams all agree.
 */

/** How a kind is drawn: its colour, whether the line is dashed, and whether it has an arrow (one-way). */
export interface KindStyle {
  label: string;
  color: string;
  dashed?: boolean;
  directed?: boolean;
}

export const RELATION_KINDS: Record<RelationKind, KindStyle & { verb: string }> = {
  ally: { label: 'Allies', verb: 'allied with', color: '#3fa66b' },
  war: { label: 'At war', verb: 'at war with', color: '#d0453b' },
  rival: { label: 'Rivals', verb: 'rivals of', color: '#d98a2b', dashed: true },
  trade: { label: 'Trade', verb: 'trading with', color: '#3d8fd1', dashed: true },
  truce: { label: 'Truce', verb: 'at truce with', color: '#9a8fbf', dashed: true },
  vassal: { label: 'Serves', verb: 'serving', color: '#b08a3e', directed: true },
};

export const RELATIONSHIP_KINDS: Record<RelationshipKind, KindStyle> = {
  parent: { label: 'Parent', color: '#b08a3e', directed: true },
  spouse: { label: 'Spouse', color: '#c75b8c' },
  sibling: { label: 'Sibling', color: '#8a7a5a' },
  mentor: { label: 'Mentor', color: '#3d8fd1', directed: true },
  friend: { label: 'Friend', color: '#3fa66b', dashed: true },
  rival: { label: 'Rival', color: '#d98a2b', dashed: true },
  enemy: { label: 'Enemy', color: '#d0453b' },
};

/** A relationship from one character's side, as the form lists it: "Parent of", "Child of"… */
export const SIDE_LABELS: Record<RelationshipDraft['kind'], string> = {
  parent: 'Parent of',
  child: 'Child of',
  spouse: 'Spouse of',
  sibling: 'Sibling of',
  mentor: 'Mentor of',
  student: 'Student of',
  friend: 'Friend of',
  rival: 'Rival of',
  enemy: 'Enemy of',
};

/** The same, as a heading for a list of people: "Parents", "Children"… */
export const SIDE_HEADINGS: Record<RelationshipDraft['kind'], string> = {
  parent: 'Children',
  child: 'Parents',
  spouse: 'Spouses',
  sibling: 'Siblings',
  mentor: 'Students',
  student: 'Mentors',
  friend: 'Friends',
  rival: 'Rivals',
  enemy: 'Enemies',
};

// ---------- Factions ----------

/** The sortKey range a relation covers. Open ends go on for ever. */
const rangeOf = (r: { start?: EventDate; end?: EventDate }): [number, number] => [r.start?.sortKey ?? -Infinity, r.end?.sortKey ?? Infinity];

/** Relations going on at some point between `from` and `to` (sortKeys, inclusive). */
export function relationsDuring(relations: FactionRelation[], from: number, to: number): FactionRelation[] {
  return relations.filter((r) => {
    const [start, end] = rangeOf(r);
    return start <= to && end >= from;
  });
}

/** A faction's relations, each with the faction on the other end. */
export function relationsOf(factionId: string, t: Pick<Timeline, 'relations'>) {
  return t.relations
    .filter((r) => r.fromId === factionId || r.toId === factionId)
    .map((r) => ({ relation: r, otherId: r.fromId === factionId ? r.toId : r.fromId, isFrom: r.fromId === factionId }));
}

/** "Serves" from the serving side, "Served by" from the other; two-way kinds read the same both ways. */
export function relationLabel(r: FactionRelation, isFrom: boolean): string {
  if (r.kind === 'vassal') return isFrom ? 'Serves' : 'Served by';
  return RELATION_KINDS[r.kind].label;
}

/** "C.A. 120 – C.A. 260", "Since C.A. 120", "Until …", or "" when it has no dates. */
export function relationDates(r: FactionRelation, timeline: Pick<Timeline, 'calendar'>): string {
  const start = r.start && formatDate(r.start, timeline.calendar);
  const end = r.end && formatDate(r.end, timeline.calendar);
  if (start && end) return `${start} – ${end}`;
  if (start) return `Since ${start}`;
  if (end) return `Until ${end}`;
  return '';
}

/** One sentence: "The Concord at war with The Hollow Crown, C.A. 120 – 260". */
export function relationSentence(r: FactionRelation, timeline: Pick<Timeline, 'calendar' | 'factions'>): string {
  const name = (id: string) => timeline.factions.find((f) => f.id === id)?.name ?? '?';
  const dates = relationDates(r, timeline);
  return `${name(r.fromId)} ${RELATION_KINDS[r.kind].verb} ${name(r.toId)}${dates ? `, ${dates}` : ''}`;
}

// ---------- Characters ----------

/** A character's relationships from their side ("Child of Aldric"), with the other character. */
export function relationshipsOf(characterId: string, t: Pick<Timeline, 'relationships' | 'characters'>): { side: RelationshipDraft; other: Character }[] {
  return t.relationships
    .filter((r) => r.fromId === characterId || r.toId === characterId)
    .map((r) => ({ side: fromSide(r, characterId), other: t.characters.find((c) => c.id === (r.fromId === characterId ? r.toId : r.fromId)) }))
    .filter((x): x is { side: RelationshipDraft; other: Character } => x.other !== undefined);
}

/** Everyone linked by parent and spouse links to this character (themselves included). */
export function familyOf(characterId: string, relationships: Relationship[]): Set<string> {
  const family = new Set([characterId]);
  const queue = [characterId];
  while (queue.length) {
    const id = queue.shift()!;
    for (const r of relationships) {
      if (r.kind !== 'parent' && r.kind !== 'spouse') continue;
      const other = r.fromId === id ? r.toId : r.toId === id ? r.fromId : null;
      if (other && !family.has(other)) {
        family.add(other);
        queue.push(other);
      }
    }
  }
  return family;
}

/** Where a family tree puts each person: row (generation, 0 = oldest) and column. */
export interface TreeLayout {
  /** id -> [column, row]. Columns can be fractions, so a child can sit under the middle of a couple. */
  at: Map<string, [col: number, row: number]>;
  columns: number;
  rows: number;
  /** Parent -> child lines; `parents` is one or two ids (two when they're a couple). */
  descents: { parents: string[]; childId: string }[];
  couples: [string, string][];
}

/**
 * Lays out a family tree: each generation is a row (parents above children,
 * spouses side by side), and each row is ordered so children sit under
 * their parents as far as possible. Good for families of a few dozen;
 * tangled ones (cousins marrying) still draw, with some crossing lines.
 */
export function familyTree(ids: Set<string>, relationships: Relationship[], characters: Character[]): TreeLayout {
  const inFamily = relationships.filter((r) => (r.kind === 'parent' || r.kind === 'spouse') && ids.has(r.fromId) && ids.has(r.toId));
  const parentsOf = (id: string) => inFamily.filter((r) => r.kind === 'parent' && r.toId === id).map((r) => r.fromId);
  const spousesOf = (id: string) => inFamily.filter((r) => r.kind === 'spouse' && (r.fromId === id || r.toId === id)).map((r) => (r.fromId === id ? r.toId : r.fromId));
  const born = (id: string) => characters.find((c) => c.id === id)?.born?.sortKey ?? Infinity;
  const name = (id: string) => characters.find((c) => c.id === id)?.name ?? '';

  // Generations: walk out from the oldest-born, a child one row below its parent, a spouse on the same row
  const row = new Map<string, number>();
  const start = [...ids].sort((a, b) => born(a) - born(b) || name(a).localeCompare(name(b)));
  for (const first of start) {
    if (row.has(first)) continue;
    row.set(first, 0);
    const queue = [first];
    while (queue.length) {
      const id = queue.shift()!;
      const r = row.get(id)!;
      const next: [string, number][] = [
        ...inFamily.filter((x) => x.kind === 'parent' && x.fromId === id).map((x) => [x.toId, r + 1] as [string, number]),
        ...parentsOf(id).map((p) => [p, r - 1] as [string, number]),
        ...spousesOf(id).map((s) => [s, r] as [string, number]),
      ];
      for (const [other, rr] of next) {
        if (row.has(other)) continue;
        row.set(other, rr);
        queue.push(other);
      }
    }
  }
  const lowest = Math.min(...row.values());
  for (const [id, r] of row) row.set(id, r - lowest);
  const rows = Math.max(...row.values()) + 1;

  // Order each row: the first by birth, later ones by where their parents sit, couples together.
  // Then place each person under their parents' midpoint, pushed right where they'd overlap.
  const col = new Map<string, number>();
  const byRow: string[][] = Array.from({ length: rows }, () => []);
  for (const id of start) byRow[row.get(id)!].push(id);
  const parentX = (id: string) => {
    const xs = parentsOf(id).map((p) => col.get(p)).filter((x): x is number => x !== undefined);
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined;
  };
  for (let r = 0; r < rows; r++) {
    const sortX = (id: string) => Math.min(parentX(id) ?? Infinity, ...spousesOf(id).map((s) => parentX(s) ?? Infinity));
    const order = [...byRow[r]].sort((a, b) => sortX(a) - sortX(b) || born(a) - born(b) || name(a).localeCompare(name(b)));
    const placed: string[] = [];
    for (const id of order) {
      if (placed.includes(id)) continue;
      placed.push(id);
      for (const s of spousesOf(id)) if (row.get(s) === r && !placed.includes(s)) placed.push(s);
    }
    // A couple's children sit under the middle of the couple, so the first of a couple steps half left
    let prev = -Infinity;
    placed.forEach((id, i) => {
      const next = placed[i + 1];
      const coupleFirst = next !== undefined && spousesOf(id).includes(next) && parentX(next) === undefined;
      const wanted = parentX(id);
      const x = Math.max(wanted === undefined ? Math.max(prev + 1, 0) : coupleFirst ? wanted - 0.5 : wanted, prev + 1);
      col.set(id, x);
      prev = x;
    });
    byRow[r] = placed;
  }
  const left = Math.min(...col.values());
  const at = new Map<string, [number, number]>();
  for (const [id, x] of col) at.set(id, [x - left, row.get(id)!]);
  const columns = Math.max(...[...at.values()].map(([x]) => x)) + 1;

  const couples: [string, string][] = [];
  for (const r of inFamily) if (r.kind === 'spouse' && row.get(r.fromId) === row.get(r.toId)) couples.push([r.fromId, r.toId]);
  const descents = [...ids]
    .map((childId) => ({ childId, parents: parentsOf(childId).slice(0, 2) }))
    .filter((d) => d.parents.length > 0);
  return { at, columns, rows, descents, couples };
}
