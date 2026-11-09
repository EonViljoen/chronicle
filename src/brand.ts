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
};
