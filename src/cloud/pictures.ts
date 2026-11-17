import type { SupabaseClient } from '@supabase/supabase-js';

/*
 * Pictures in the cloud. In the browser, pictures (maps, portraits, crests)
 * live inside the timeline as data: URLs. The cloud copy keeps them in
 * Supabase Storage instead: each picture is uploaded once to the person's
 * own folder, named by a hash of its contents (so the same picture is never
 * stored twice), and the timeline holds "cloud-image:<path>" in its place.
 *
 * Downloading turns those references back into data: URLs, so the copy in
 * the browser works offline exactly as before.
 */

export const BUCKET = 'pictures';
const PREFIX = 'cloud-image:';

/** Walks any JSON value, replacing strings with what `fn` returns. */
async function mapStrings(value: unknown, fn: (s: string) => Promise<string> | string): Promise<unknown> {
  if (typeof value === 'string') return fn(value);
  if (Array.isArray(value)) return Promise.all(value.map((v) => mapStrings(v, fn)));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = await mapStrings(v, fn);
    return out;
  }
  return value;
}

/** A hex SHA-256 of a string. */
async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const EXT: Record<string, string> = { 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/svg+xml': 'svg' };

/** Pictures already uploaded this session, by path, so each is sent once. */
const uploaded = new Set<string>();
/** Pictures already downloaded this session, by path. */
const downloaded = new Map<string, string>();

/** The timeline (or theme) as it's stored in the cloud: pictures uploaded, references in their place. */
export async function picturesToCloud<T>(data: T, supabase: SupabaseClient, userId: string): Promise<T> {
  return (await mapStrings(data, async (s) => {
    const m = /^data:(image\/[a-z0-9.+-]+)[;,]/i.exec(s);
    if (!m) return s;
    const type = m[1].toLowerCase();
    const path = `${userId}/${await sha256(s)}.${EXT[type] ?? 'img'}`;
    if (!uploaded.has(path)) {
      const blob = await (await fetch(s)).blob();
      const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: type, upsert: false });
      // Already there (uploaded from another device, or earlier): that's fine
      if (error && !/exists|duplicate|409/i.test(`${error.message} ${(error as { statusCode?: string }).statusCode ?? ''}`)) throw error;
      uploaded.add(path);
      downloaded.set(path, s);
    }
    return `${PREFIX}${path}`;
  })) as T;
}

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

/** The cloud copy made whole again: each picture reference downloaded back into a data: URL. */
export async function picturesFromCloud<T>(data: T, supabase: SupabaseClient): Promise<T> {
  return (await mapStrings(data, async (s) => {
    if (!s.startsWith(PREFIX)) return s;
    const path = s.slice(PREFIX.length);
    const known = downloaded.get(path);
    if (known) return known;
    const { data: blob, error } = await supabase.storage.from(BUCKET).download(path);
    if (error || !blob) throw error ?? new Error(`Couldn't download ${path}`);
    const url = await blobToDataUrl(blob);
    downloaded.set(path, url);
    uploaded.add(path);
    return url;
  })) as T;
}
