import type { Theme } from './types/theme';

/**
 * Branding: the app's name and the few things a site built on Chronicle
 * might want to change.
 *
 * The defaults are Chronicle's. A site built from this code (for example a
 * fan timeline) overrides them with a `.env` file instead of editing this
 * file, so pulling in Chronicle updates never conflicts:
 *
 *   VITE_BRAND_NAME=My Timeline
 *   VITE_BRAND_TAGLINE=a fan chronicle
 *   VITE_BRAND_MARK=✦
 *   VITE_BRAND_FOOTER=Unofficial fan project.
 *   VITE_DEFAULT_THEME=parchment
 *   VITE_SEED_URL=/seed/my-timeline.json
 *   VITE_PUBLISHED=/published/my-timeline.json
 *   VITE_READ_ONLY=true
 *   VITE_DEMO_URL=
 *
 * Vite exposes variables that start with VITE_ on `import.meta.env`, and bakes
 * them in at build time. An empty value counts as "not set".
 */
const env = import.meta.env;

/** Reads a VITE_ variable, treating empty as unset. */
function read(name: string): string | undefined {
  const value = env[name] as string | undefined;
  return value?.trim() ? value.trim() : undefined;
}

/**
 * What an exported website's site.json can set (see lib/exportSite.ts).
 * Loaded at start-up, before anything renders, and laid over `brand`.
 */
export interface SiteConfig {
  name?: string;
  tagline?: string;
  mark?: string;
  footer?: string;
  published?: string[];
  readOnly?: boolean;
  /** The whole site's theme, so pages outside the timeline match it */
  theme?: Theme;
}

export const brand = {
  /** Shown in the header and the browser tab. */
  name: read('VITE_BRAND_NAME') ?? 'Chronicle',
  tagline: read('VITE_BRAND_TAGLINE') ?? 'timeline builder',
  /** The small symbol before the name. */
  mark: read('VITE_BRAND_MARK') ?? '◆',
  /** Optional small print at the bottom of every page, e.g. a fan-work disclaimer. */
  footer: read('VITE_BRAND_FOOTER'),
  /** The theme used outside a timeline (home page) and for timelines without one. */
  defaultTheme: read('VITE_DEFAULT_THEME') ?? 'default',
  /**
   * A timeline JSON file loaded on a visitor's first visit, so a site can open
   * with content already in it. Unset for Chronicle itself.
   */
  seedUrl: read('VITE_SEED_URL'),
  /**
   * Timeline files the site publishes: shown read-only to every visitor and
   * fetched fresh on each visit, so replacing a file updates the site.
   * Comma-separated URLs. A file's name becomes its address:
   * /published/my-timeline.json is shown at /t/my-timeline.
   */
  published: (read('VITE_PUBLISHED') ?? '')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean),
  /** Hide everything for creating and editing: the site only shows its published timelines. */
  readOnly: read('VITE_READ_ONLY') === 'true',
  /**
   * Where the "View demo" button goes: a live site showing Chronicle in use.
   * Until the demo is deployed, development builds point at the demo's local
   * dev server and production builds hide the button. Setting the variable
   * to nothing (`VITE_DEMO_URL=`) hides it everywhere.
   */
  demoUrl: 'VITE_DEMO_URL' in env ? read('VITE_DEMO_URL') : env.DEV ? 'http://localhost:5181' : undefined,
  /** An exported website: links use #/ so any static host can serve them. */
  isSite: false,
  /** A site's own theme (from site.json), used instead of defaultTheme. */
  siteTheme: undefined as Theme | undefined,
};

/**
 * An exported website marks its index.html with
 * <meta name="chronicle-site" content="site.json">. If that's there, read the
 * config and apply it. Chronicle itself has no marker, so it skips the request.
 */
export async function loadSiteConfig(): Promise<void> {
  const marker = document.querySelector<HTMLMetaElement>('meta[name="chronicle-site"]');
  if (!marker) return;
  brand.isSite = true;
  brand.demoUrl = undefined;
  try {
    const res = await fetch(marker.content, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const config = (await res.json()) as SiteConfig;
    const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
    brand.name = text(config.name) ?? brand.name;
    brand.tagline = text(config.tagline) ?? '';
    brand.mark = text(config.mark) ?? brand.mark;
    brand.footer = text(config.footer);
    if (Array.isArray(config.published)) brand.published = config.published.filter((p) => typeof p === 'string');
    brand.readOnly = config.readOnly !== false;
    if (config.theme) brand.siteTheme = config.theme;
  } catch (e) {
    console.error("Couldn't read the site's settings", e);
  }
}
