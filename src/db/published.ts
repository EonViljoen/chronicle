import { useEffect, useState } from 'react';
import type { Timeline } from '../types/timeline';
import { parseTimeline } from '../lib/validate';
import { brand } from '../brand';

/*
 * Published timelines: JSON files the site serves (brand.published), shown
 * read-only. Unlike everything else they're never stored in the browser;
 * they're fetched on every visit, so the site owner updates them by
 * replacing the file.
 */

export interface Published {
  timelines: Timeline[];
  /** Files that couldn't be loaded, as readable messages. */
  errors: string[];
}

const NONE: Published = { timelines: [], errors: [] };

// Module-level cache: fetched at most once per page load, shared by every component
let request: Promise<Published> | undefined;
let result: Published | undefined = brand.published.length === 0 ? NONE : undefined;

/** "/published/my-timeline.json" -> "my-timeline": a stable address whatever id the file holds. */
const idFromUrl = (url: string) =>
  decodeURIComponent(url.split(/[?#]/)[0].split('/').pop() ?? url).replace(/\.json$/i, '') || url;

async function fetchOne(url: string): Promise<Timeline> {
  // no-cache: the browser may reuse its copy, but must check with the server first
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return { ...parseTimeline(await res.json()), id: idFromUrl(url) };
}

export function loadPublished(): Promise<Published> {
  // ??= assigns only if `request` is still undefined, so this runs once
  request ??= Promise.allSettled(brand.published.map(fetchOne)).then((settled) => {
    const loaded: Published = { timelines: [], errors: [] };
    settled.forEach((s, i) => {
      if (s.status === 'fulfilled') loaded.timelines.push(s.value);
      else loaded.errors.push(`Couldn't load ${brand.published[i]}: ${s.reason instanceof Error ? s.reason.message : String(s.reason)}`);
    });
    result = loaded;
    return loaded;
  });
  return request;
}

/** The published timelines. `undefined` while they're still loading. */
export function usePublished(): Published | undefined {
  // Starts from the cache, so pages opened after the first load don't wait
  const [published, setPublished] = useState(result);

  useEffect(() => {
    if (published) return;
    let cancelled = false; // don't set state after the component has gone
    loadPublished().then((p) => !cancelled && setPublished(p));
    return () => {
      cancelled = true;
    };
  }, [published]);

  return published;
}
