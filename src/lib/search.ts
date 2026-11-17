import type { Timeline } from '../types/timeline';
import { formatSpan } from './dates';
import { linkHref, type LinkKind } from './links';

/** One thing search found. */
export interface SearchResult {
  kind: LinkKind;
  id: string;
  title: string;
  /** A second line: the date, the category, the faction… */
  detail: string;
  /** Where it opens. */
  to: string;
}

/** The editor tab for each kind, for opening results in the editor. */
export const EDITOR_TAB: Record<LinkKind, string> = { event: 'events', character: 'characters', place: 'places', faction: 'factions', lore: 'lore', region: 'regions' };

/**
 * Searches everything in a timeline: events (title, summary, details, date,
 * tags), characters, places, factions, lore pages and map regions. Every word typed must
 * appear somewhere. Matches in the name rank first, best of all at its
 * start. In the editor (`inEditor`), results open the item's form.
 */
export function searchTimeline(t: Timeline, query: string, inEditor = false, limit = 30): SearchResult[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const faction = (id?: string) => t.factions.find((f) => f.id === id)?.name ?? '';

  const candidates: (Omit<SearchResult, 'to'> & { text: string })[] = [
    ...t.events.map((e) => ({
      kind: 'event' as const,
      id: e.id,
      title: e.title,
      detail: [formatSpan(e, t.calendar), e.summary].filter(Boolean).join(' · '),
      text: [e.summary, e.body, formatSpan(e, t.calendar), ...e.tags.map((x) => `#${x}`)].join(' '),
    })),
    ...t.characters.map((c) => ({ kind: 'character' as const, id: c.id, title: c.name, detail: faction(c.factionId) || 'Independent', text: [c.description, ...c.feats.flatMap((f) => [f.name, f.description])].join(' ') })),
    ...t.places.map((p) => ({ kind: 'place' as const, id: p.id, title: p.name, detail: 'Place', text: p.description })),
    ...t.factions.map((f) => ({ kind: 'faction' as const, id: f.id, title: f.name, detail: faction(f.parentId) ? `Part of ${faction(f.parentId)}` : 'Faction', text: f.description ?? '' })),
    ...t.lore.map((p) => ({ kind: 'lore' as const, id: p.id, title: p.title, detail: p.category || 'Lore', text: p.body })),
    ...t.regions.map((r) => ({ kind: 'region' as const, id: r.id, title: r.name, detail: faction(r.factionId) ? `Region · ${faction(r.factionId)}` : 'Region', text: r.description })),
  ];

  const scored = candidates
    .map((c) => {
      const title = c.title.toLowerCase();
      const all = `${title} ${c.text.toLowerCase()}`;
      if (!words.every((w) => all.includes(w))) return null;
      const phrase = words.join(' ');
      const score = title.startsWith(phrase) ? 0 : title.includes(phrase) ? 1 : words.every((w) => title.includes(w)) ? 2 : 3;
      return { ...c, score };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .sort((a, b) => a.score - b.score || a.title.localeCompare(b.title))
    .slice(0, limit);

  return scored.map(({ kind, id, title, detail }) => ({
    kind,
    id,
    title,
    detail,
    to: inEditor ? `/t/${t.id}/edit?tab=${EDITOR_TAB[kind]}&item=${encodeURIComponent(id)}` : linkHref(t.id, { kind, id, name: title }),
  }));
}
