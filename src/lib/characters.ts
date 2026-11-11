import type { Calendar, Character, Faction, Timeline, TimelineEvent } from '../types/timeline';
import { compareEvents } from './dates';
import { factionPath, factionTree, withDescendants } from './factions';

/** A heading in a list of characters, and who's under it. */
export interface CharacterGroup {
  /** The faction's id, or undefined for independent characters. */
  factionId?: string;
  /** "Imperium › Space Marines", or "Independent". */
  name: string;
  color?: string;
  imageUrl?: string;
  characters: Character[];
}

const byName = (a: Character, b: Character) => a.name.localeCompare(b.name);

/**
 * Characters grouped by their faction, in the faction tree's order, with
 * everyone without a (still existing) faction last, under "Independent".
 * Empty groups are left out.
 */
export function characterGroups(t: Pick<Timeline, 'characters' | 'factions'>): CharacterGroup[] {
  const known = new Set(t.factions.map((f) => f.id));
  const groups: CharacterGroup[] = factionTree(t.factions).map(({ faction }) => ({
    factionId: faction.id,
    name: factionPath(faction.id, t.factions),
    color: faction.color,
    imageUrl: faction.imageUrl,
    characters: t.characters.filter((c) => c.factionId === faction.id).sort(byName),
  }));
  groups.push({ name: 'Independent', characters: t.characters.filter((c) => !c.factionId || !known.has(c.factionId)).sort(byName) });
  return groups.filter((g) => g.characters.length > 0);
}

/** The faction's characters, including those in its sub-factions. */
export function membersOf(factionId: string, t: Pick<Timeline, 'characters' | 'factions'>): Character[] {
  const ids = withDescendants(factionId, t.factions);
  return t.characters.filter((c) => c.factionId && ids.has(c.factionId)).sort(byName);
}

/** The events a character is in, in date order. */
export const eventsOf = (characterId: string, events: TimelineEvent[]) =>
  events.filter((e) => e.characterIds.includes(characterId)).sort(compareEvents);

/** The characters in any of these events, by name. */
export function charactersIn(events: TimelineEvent[], characters: Character[]): Character[] {
  const ids = new Set(events.flatMap((e) => e.characterIds));
  return characters.filter((c) => ids.has(c.id)).sort(byName);
}

/**
 * "about 74 years", when both dates are on the calendar (not free text) and
 * the calendar counts years evenly. Undefined when it can't be worked out.
 */
export function ageAt(character: Character, calendar: Calendar, until = character.died): string | undefined {
  const { born } = character;
  if (!born || !until || born.label !== undefined || until.label !== undefined || calendar.type === 'freeform') return undefined;
  const years = until.sortKey - born.sortKey;
  if (years < 0) return undefined;
  const exact = born.precision === 'exact' && until.precision === 'exact';
  return `${exact ? '' : 'about '}${years.toLocaleString()} year${years === 1 ? '' : 's'}`;
}

/**
 * Is a date outside the character's life? 'before' they were born or
 * 'after' they died; undefined if it's within it (or the dates aren't set).
 * Only a warning: a legend, a prophecy or a ghost may well appear anyway.
 */
export function outsideLife(c: Pick<Character, 'born' | 'died'>, sortKey: number): 'before' | 'after' | undefined {
  if (c.born && sortKey < c.born.sortKey) return 'before';
  if (c.died && sortKey > c.died.sortKey) return 'after';
  return undefined;
}

/** The colour of the character's faction, if they have one. */
export const characterColor = (c: Character, factions: Faction[]) => factions.find((f) => f.id === c.factionId)?.color;
