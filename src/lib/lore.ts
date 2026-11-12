import type { LorePage } from '../types/timeline';

/** What a page without a category is listed under. */
export const NO_CATEGORY = 'Other';

/** The categories in use, A to Z. */
export const loreCategories = (pages: LorePage[]) =>
  [...new Set(pages.map((p) => p.category.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));

/** Pages sorted by category (uncategorised last), then title. */
export function sortLore(pages: LorePage[]): LorePage[] {
  const cat = (p: LorePage) => p.category.trim();
  return [...pages].sort((a, b) => {
    if (!cat(a) !== !cat(b)) return cat(a) ? -1 : 1;
    return cat(a).localeCompare(cat(b)) || a.title.localeCompare(b.title);
  });
}

/** Pages grouped by category, in sortLore's order. */
export function loreGroups(pages: LorePage[]): { category: string; pages: LorePage[] }[] {
  const groups: { category: string; pages: LorePage[] }[] = [];
  for (const p of sortLore(pages)) {
    const category = p.category.trim() || NO_CATEGORY;
    const last = groups[groups.length - 1];
    if (last?.category === category) last.pages.push(p);
    else groups.push({ category, pages: [p] });
  }
  return groups;
}
