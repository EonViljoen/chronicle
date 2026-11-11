/*
 * Pictures (maps, portraits, crests) are stored inside the timeline as
 * data: URLs, so every byte ends up in exports, backups and websites.
 * Uploads are shrunk on the way in: scaled down to a sensible size and
 * re-saved as WebP. Whichever is smaller (the shrunk copy or the original)
 * is kept, so a picture never gets bigger.
 */

/** Longest side, in pixels. Maps stay large enough to zoom into. */
export const MAP_SIZE = 4096;
/** Portraits and crests are shown small. */
export const PORTRAIT_SIZE = 640;

/** Pictures still over this size after shrinking get a gentle warning. */
export const BIG_IMAGE = 5 * 1024 * 1024;

/** What reading a picture gives back. */
export interface PictureResult {
  /** A data: URL. */
  image: string;
  /** Its size in pixels, after any shrinking. */
  width: number;
  height: number;
  /** "Shrunk from 8.2 MB to 640 KB", a warning for a still-big picture, or null. */
  note: string | null;
}

/** Roughly how many bytes a data: URL holds (base64 is 4 characters per 3 bytes). */
export const dataUrlBytes = (url: string) => (url.startsWith('data:') ? Math.round(((url.length - url.indexOf(',') - 1) * 3) / 4) : 0);

/** 1536 -> "2 KB", 8_600_000 -> "8.2 MB" */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const readAsDataUrl = (blob: Blob, name: string) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Couldn't read "${name}"`));
    reader.readAsDataURL(blob);
  });

const loadImage = (src: string, name: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`"${name}" isn't a picture this browser can show`));
    img.src = src;
  });

/**
 * Draws the picture at most `maxSide` pixels on its longest side and
 * encodes it as WebP (or, where the browser can't write WebP, JPEG for
 * photos and PNG otherwise). Returns null when the shrunk copy isn't smaller.
 */
async function shrink(img: HTMLImageElement, source: string, maxSide: number): Promise<{ url: string; width: number; height: number } | null> {
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);

  const encode = (type: string, quality?: number) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  let blob = await encode('image/webp', 0.85);
  // Browsers that can't write WebP hand back a PNG instead
  if (!blob || blob.type !== 'image/webp') {
    const photo = source.startsWith('data:image/jpeg');
    blob = await encode(photo ? 'image/jpeg' : 'image/png', photo ? 0.85 : undefined);
  }
  if (!blob) return null;
  const url = await readAsDataUrl(blob, 'picture');
  return dataUrlBytes(url) < dataUrlBytes(source) ? { url, width, height } : null;
}

/** Vector and animated pictures would lose what makes them special, so they're kept as they are. */
const keepAsIs = (url: string) => /^data:image\/(svg\+xml|gif)/.test(url);

/**
 * Shrinks a picture that's already a data: URL (e.g. one stored before
 * pictures were shrunk on upload). Web addresses and SVG/GIF come back
 * unchanged, with `saved` 0.
 */
export async function shrinkDataUrl(url: string, maxSide: number): Promise<{ image: string; width: number; height: number; saved: number }> {
  const img = url.startsWith('data:') && !keepAsIs(url) ? await loadImage(url, 'picture') : null;
  const small = img ? await shrink(img, url, maxSide) : null;
  if (!small) return { image: url, width: img?.naturalWidth ?? 0, height: img?.naturalHeight ?? 0, saved: 0 };
  return { image: small.url, width: small.width, height: small.height, saved: dataUrlBytes(url) - dataUrlBytes(small.url) };
}

/** Reads a picked picture as a data: URL, shrinking it to at most `maxSide` pixels across. */
export async function readImage(file: File, maxSide = MAP_SIZE): Promise<PictureResult> {
  const original = await readAsDataUrl(file, file.name);
  // Load it once to learn its size (and that it really is a picture)
  const img = await loadImage(original, file.name);
  const small = keepAsIs(original) ? null : await shrink(img, original, maxSide);
  const image = small?.url ?? original;
  const bytes = dataUrlBytes(image);
  const note = small
    ? `Shrunk from ${formatBytes(file.size)} to ${formatBytes(bytes)} (${small.width} × ${small.height}).`
    : bytes > BIG_IMAGE
      ? `That's a big picture (${formatBytes(bytes)}). It's saved inside the timeline, so exports and websites get bigger too.`
      : null;
  return { image, width: small?.width ?? img.naturalWidth, height: small?.height ?? img.naturalHeight, note };
}

// ---------- A whole timeline's pictures ----------

/** Event pictures are shown in the info box: bigger than a portrait, smaller than a map. */
export const EVENT_SIZE = 1600;

type WithPictures = {
  maps: { image: string; width: number; height: number }[];
  characters: { imageUrl?: string }[];
  factions: { imageUrl?: string }[];
  events: { imageUrl?: string }[];
};

/** Every uploaded picture in a timeline, as data: URLs. */
function picturesIn(t: WithPictures): string[] {
  return [
    ...t.maps.map((m) => m.image),
    ...[...t.characters, ...t.factions, ...t.events].map((x) => x.imageUrl ?? ''),
  ].filter((url) => url.startsWith('data:'));
}

/** How many bytes a timeline's uploaded pictures take. */
export const pictureBytes = (t: WithPictures) => picturesIn(t).reduce((sum, url) => sum + dataUrlBytes(url), 0);

/**
 * Shrinks every uploaded picture in a timeline, like uploads are shrunk now,
 * and returns the new timeline and how many bytes that saved. For pictures
 * stored before uploads were shrunk.
 */
export async function shrinkPictures<T extends WithPictures>(t: T): Promise<{ timeline: T; saved: number }> {
  let saved = 0;
  const small = async (url: string | undefined, maxSide: number) => {
    if (!url?.startsWith('data:')) return url;
    const result = await shrinkDataUrl(url, maxSide);
    saved += result.saved;
    return result.image;
  };
  const maps = [];
  for (const m of t.maps) {
    const r = await shrinkDataUrl(m.image, MAP_SIZE);
    saved += r.saved;
    // Pins are fractions of the picture, so a smaller picture keeps them in place
    maps.push(r.saved ? { ...m, image: r.image, width: r.width, height: r.height } : m);
  }
  const characters = [];
  for (const c of t.characters) characters.push({ ...c, imageUrl: await small(c.imageUrl, PORTRAIT_SIZE) });
  const factions = [];
  for (const f of t.factions) factions.push({ ...f, imageUrl: await small(f.imageUrl, PORTRAIT_SIZE) });
  const events = [];
  for (const e of t.events) events.push({ ...e, imageUrl: await small(e.imageUrl, EVENT_SIZE) });
  return { timeline: { ...t, maps, characters, factions, events }, saved };
}
