import type { Timeline } from '../types/timeline';

/*
 * [[Links]] in text. Writing [[Siege of Brightvale]] in an event's details
 * (or a character's or place's description) links to the thing with that
 * name: an event first, then a character, a place, a faction.
 *
 * - [[Siege of Brightvale|the siege]] shows "the siege" but links the same way
 * - [[place:Brightvale]] picks the kind when two things share a name
 *   (kinds: event, character, place, faction)
 *
 * Names match without caring about upper and lower case. A link that matches
 * nothing still shows its text, marked as a broken link.
 */

export type LinkKind = 'event' | 'character' | 'place' | 'faction';
const KINDS: LinkKind[] = ['event', 'character', 'place', 'faction'];

/** What a [[link]] points at. */
export interface LinkTarget {
  kind: LinkKind;
  id: string;
  name: string;
}

/** [[target]] or [[target|label]]. No brackets or line breaks inside. */
const LINK = /\[\[([^[\]|\n]+?)(?:\|([^[\]\n]+?))?\]\]/g;

/** Splits "place:Brightvale" into its kind and name (no kind = any). */
function splitTarget(target: string): { kind?: LinkKind; name: string } {
  const m = /^(event|character|place|faction):(.+)$/i.exec(target.trim());
  return m ? { kind: m[1].toLowerCase() as LinkKind, name: m[2].trim() } : { name: target.trim() };
}

type Linkable = Pick<Timeline, 'events' | 'characters' | 'places' | 'factions'>;

/** Every linkable thing of a kind, as [id, name] pairs. */
function namesOf(t: Linkable, kind: LinkKind): [string, string][] {
  switch (kind) {
    case 'event':
      return t.events.map((e) => [e.id, e.title]);
    case 'character':
      return t.characters.map((c) => [c.id, c.name]);
    case 'place':
      return t.places.map((p) => [p.id, p.name]);
    case 'faction':
      return t.factions.map((f) => [f.id, f.name]);
  }
}

/** What [[target]] links to, or undefined if nothing has that name. */
export function resolveLink(target: string, t: Linkable): LinkTarget | undefined {
  const { kind, name } = splitTarget(target);
  const wanted = name.toLowerCase();
  for (const k of kind ? [kind] : KINDS) {
    const hit = namesOf(t, k).find(([, n]) => n.trim().toLowerCase() === wanted);
    if (hit) return { kind: k, id: hit[0], name: hit[1] };
  }
  return undefined;
}

/** The page a link opens. Events open on the timeline itself. */
export function linkHref(timelineId: string, target: LinkTarget): string {
  const base = `/t/${timelineId}`;
  if (target.kind === 'event') return `${base}?event=${encodeURIComponent(target.id)}`;
  return `${base}/${target.kind}s/${encodeURIComponent(target.id)}`;
}

/** Characters Markdown treats specially, escaped so a label shows as typed. */
const escapeLabel = (text: string) => text.replace(/[\\[\]*_`]/g, (c) => `\\${c}`);

/**
 * Turns [[links]] into ordinary Markdown links with a `link:` address
 * (`link:place:brightvale`, or `link:missing:` for a broken one), which
 * RichText's link renderer turns into in-app links.
 */
export function linkify(text: string, t: Linkable): string {
  return text.replace(LINK, (_, target: string, label?: string) => {
    const hit = resolveLink(target, t);
    const shown = escapeLabel((label ?? splitTarget(target).name).trim());
    const href = hit ? `link:${hit.kind}:${encodeURIComponent(hit.id)}` : `link:missing:${encodeURIComponent(target.trim())}`;
    return `[${shown}](${href})`;
  });
}

/** Reads a `link:` address back. `missing` carries the name that didn't match. */
export function parseLinkHref(href: string): { kind: LinkKind | 'missing'; id: string } | null {
  const m = /^link:(event|character|place|faction|missing):(.*)$/.exec(href);
  return m ? { kind: m[1] as LinkKind | 'missing', id: decodeURIComponent(m[2]) } : null;
}

/** The [[links]] in a text that match nothing (for a warning under the field). */
export function brokenLinks(text: string, t: Linkable): string[] {
  const broken = new Set<string>();
  for (const m of text.matchAll(LINK)) if (!resolveLink(m[1], t)) broken.add(m[1].trim());
  return [...broken];
}

/**
 * Renames [[links]] in one text from `from` to `to`, keeping any label and
 * kind prefix: [[Old]] -> [[New]], [[place:Old|there]] -> [[place:New|there]].
 * Only links that would reach the thing being renamed are touched.
 */
function renameIn(text: string, kind: LinkKind, from: string, to: string, before: Linkable): string {
  const wanted = from.trim().toLowerCase();
  return text.replace(LINK, (whole, target: string, label?: string) => {
    const parts = splitTarget(target);
    if (parts.name.toLowerCase() !== wanted) return whole;
    // Without a kind prefix the link might reach something else with that name first
    if (!parts.kind && resolveLink(target, before)?.kind !== kind) return whole;
    const prefix = parts.kind ? `${target.trim().slice(0, target.trim().indexOf(':') + 1)}` : '';
    return `[[${prefix}${to.trim()}${label !== undefined ? `|${label}` : ''}]]`;
  });
}

/**
 * After something is renamed, rewrites every [[link]] to its old name so
 * links keep working. `before` is the timeline as it was before the rename.
 */
export function renameLinks<T extends Timeline>(after: T, before: Linkable, kind: LinkKind, from: string, to: string): T {
  if (!from.trim() || from.trim() === to.trim()) return after;
  const fix = (text: string) => (text.includes('[[') ? renameIn(text, kind, from, to, before) : text);
  return {
    ...after,
    events: after.events.map((e) => {
      const body = fix(e.body);
      return body === e.body ? e : { ...e, body };
    }),
    characters: after.characters.map((c) => {
      const description = fix(c.description);
      const feats = c.feats.map((f) => ({ ...f, description: fix(f.description) }));
      return description === c.description && feats.every((f, i) => f.description === c.feats[i].description) ? c : { ...c, description, feats };
    }),
    places: after.places.map((p) => {
      const description = fix(p.description);
      return description === p.description ? p : { ...p, description };
    }),
    factions: after.factions.map((f) => {
      if (!f.description) return f;
      const description = fix(f.description);
      return description === f.description ? f : { ...f, description };
    }),
  };
}
