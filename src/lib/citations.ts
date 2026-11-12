/*
 * Citations: [^1] in an event's details (or a lore page) points at the
 * first line of its sources, [^2] at the second, and so on. They show as
 * small raised numbers that jump to the source.
 */

/** [^1], [^12] */
const CITE = /\[\^(\d+)\]/g;

/**
 * Turns [^n] into an ordinary Markdown link with a `cite:` address, which
 * RichText's link renderer turns into a raised number.
 */
export const citify = (text: string) => text.replace(CITE, (_, n: string) => `[${n}](cite:${n})`);

/** Reads a `cite:` address back: the source's number (1 = the first). */
export function parseCiteHref(href: string): number | null {
  const m = /^cite:(\d+)$/.exec(href);
  return m ? Number(m[1]) : null;
}

/** The citation numbers in a text that have no source (for a warning under the field). */
export function brokenCitations(text: string, sourceCount: number): number[] {
  const broken = new Set<number>();
  for (const m of text.matchAll(CITE)) {
    const n = Number(m[1]);
    if (n < 1 || n > sourceCount) broken.add(n);
  }
  return [...broken].sort((a, b) => a - b);
}

/** Which sources a text cites, so the sources list can mark them. */
export function citedSources(text: string): Set<number> {
  return new Set([...text.matchAll(CITE)].map((m) => Number(m[1])));
}

/** Scrolls a source into view and makes it flash, so you can see which one it is. */
export function showSource(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  el.classList.remove('is-flashing');
  void el.offsetWidth; // restart the animation if it's already flashing
  el.classList.add('is-flashing');
}
