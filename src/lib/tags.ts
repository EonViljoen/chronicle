import type { TimelineEvent } from '../types/timeline';

/** Every tag used in a timeline's events, most used first (then A to Z). */
export function allTags(events: TimelineEvent[]): string[] {
  const count = new Map<string, number>();
  for (const e of events) for (const tag of e.tags) count.set(tag, (count.get(tag) ?? 0) + 1);
  return [...count.keys()].sort((a, b) => count.get(b)! - count.get(a)! || a.localeCompare(b));
}

/** Lowercase, single spaces: "  Big  Battle " -> "big battle". Tags match regardless of case. */
export const normalizeTag = (tag: string) => tag.trim().replace(/\s+/g, ' ').toLowerCase();
