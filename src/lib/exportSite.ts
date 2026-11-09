import { strToU8, zipSync } from 'fflate';
import type { SiteConfig } from '../brand';
import type { Timeline, WebsiteSettings } from '../types/timeline';
import { siteTheme } from '../themes';
import { withThemeCopies } from '../db/timelines';
import { slugify } from './ids';

/*
 * "Export website": packages one timeline as a static website.
 *
 * The site is Chronicle's own built app, copied file by file from wherever
 * this copy of Chronicle is served, plus three files:
 *   - timeline.json  the timeline, with its theme
 *   - site.json      read-only, published timeline, header and footer text
 *   - index.html     marked with <meta name="chronicle-site"> so the app knows
 *                    it's a site and reads site.json (see brand.ts)
 * Any static host can serve the result: paths are relative and links use #/.
 */

const NOT_BUILT =
  'Exporting a website copies the built app, and this is the development server. ' +
  'Run "npm run serve:built" and export from http://localhost:5182 (or from a hosted copy of Chronicle).';

/** One entry in Vite's build manifest (vite.config.ts writes it as chronicle-manifest.json). */
interface ManifestChunk {
  file: string;
  css?: string[];
  assets?: string[];
}

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const HOSTING_NOTES = `This folder is a complete website. To put it online, upload everything in it
(not the folder itself) to any static host, for example:

- Netlify Drop: drag the folder onto https://app.netlify.com/drop
- GitHub Pages: push the files to a repository, then turn on Pages in its settings
- Cloudflare Pages, Vercel, or any web server

To look at it on your computer first, run a local server in this folder
(opening index.html directly won't work), e.g.:  python3 -m http.server

To update the site, export it again from Chronicle and replace the files.
`;

/** Builds every file of the website. Separate from the download, so it's easy to test. */
export async function buildSiteFiles(timeline: Timeline, settings: WebsiteSettings): Promise<Record<string, Uint8Array>> {
  if (import.meta.env.DEV) throw new Error(NOT_BUILT);

  // The app's root folder: index.html's <base href="/"> makes this the site root
  const root = new URL('./', document.baseURI);
  const get = async (path: string) => {
    const res = await fetch(new URL(path, root), { cache: 'no-cache' });
    if (!res.ok) throw new Error(`Couldn't copy ${path} (HTTP ${res.status})`);
    return res;
  };

  let manifest: Record<string, ManifestChunk>;
  try {
    manifest = (await (await get('chronicle-manifest.json')).json()) as Record<string, ManifestChunk>;
  } catch {
    throw new Error(NOT_BUILT);
  }

  // Every built file: scripts, stylesheets and assets of every chunk
  const paths = new Set<string>();
  for (const chunk of Object.values(manifest)) {
    paths.add(chunk.file);
    chunk.css?.forEach((p) => paths.add(p));
    chunk.assets?.forEach((p) => paths.add(p));
  }

  const files: Record<string, Uint8Array> = {};
  await Promise.all(
    [...paths].map(async (path) => {
      files[path] = new Uint8Array(await (await get(path)).arrayBuffer());
    }),
  );

  const name = settings.name.trim() || timeline.title;
  const html = (await (await get('index.html')).text())
    .replace(/<base href="\/"\s*\/?>\s*/i, '') // the site lives wherever it's uploaded
    .replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(name)}</title>`)
    .replace(/<head>/i, '<head>\n    <meta name="chronicle-site" content="site.json" />');
  files['index.html'] = strToU8(html);

  // The theme goes in both files: the timeline carries it (and its factions' themes),
  // and the site uses it from the first paint
  const full = await withThemeCopies(timeline);
  const theme = full.themeDef ?? siteTheme();
  files['timeline.json'] = strToU8(JSON.stringify({ ...full, themeDef: theme }, null, 2));

  const site: SiteConfig = {
    name,
    tagline: settings.tagline,
    mark: settings.mark,
    footer: settings.footer,
    published: ['timeline.json'],
    readOnly: true,
    theme,
  };
  files['site.json'] = strToU8(JSON.stringify(site, null, 2));
  files['README.txt'] = strToU8(HOSTING_NOTES);
  return files;
}

/** Builds the website and downloads it as a zip. Returns the file name and size. */
export async function exportSite(timeline: Timeline, settings: WebsiteSettings): Promise<{ fileName: string; bytes: number }> {
  const files = await buildSiteFiles(timeline, settings);
  const zip = zipSync(files, { level: 6 });
  const fileName = `${slugify(settings.name || timeline.title) || 'timeline'}-website.zip`;

  const url = URL.createObjectURL(new Blob([zip], { type: 'application/zip' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  // Give the browser a moment to start the download before freeing the data
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return { fileName, bytes: zip.byteLength };
}
