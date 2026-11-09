export function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * A readable id made from a name ("Horus Heresy" -> "horus-heresy"),
 * with -2, -3... added if it's already taken. Ids never change after
 * creation, so renaming an item doesn't break links to it.
 */
export function uniqueId(name: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const base = slugify(name) || 'item';
  let id = base;
  for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
  return id;
}
