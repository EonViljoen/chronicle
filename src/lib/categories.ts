import type { Category } from '../types/timeline';

/*
 * Categories form a tree, but they're stored as a flat list where each one
 * may point at its parent (`parentId`). These helpers build the tree view
 * when it's needed. Storing a flat list keeps saving, moving and deleting
 * simple: changing a parent is changing one field.
 *
 * Bad data (a parent that doesn't exist, or a loop from a hand-edited file)
 * is treated as top level, so nothing disappears and nothing loops forever.
 */

const byName = (a: Category, b: Category) => a.name.localeCompare(b.name);

/** A category's parent, if it exists. */
function parentOf(category: Category, byId: Map<string, Category>): Category | undefined {
  return category.parentId ? byId.get(category.parentId) : undefined;
}

/** The chain from the top level down to this category: [Imperium, Space Marines]. */
export function ancestry(id: string, categories: Category[]): Category[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const chain: Category[] = [];
  const seen = new Set<string>(); // guards against loops
  for (let c = byId.get(id); c && !seen.has(c.id); c = parentOf(c, byId)) {
    seen.add(c.id);
    chain.unshift(c);
  }
  return chain;
}

/** "Imperium › Space Marines" */
export const categoryPath = (id: string, categories: Category[]) =>
  ancestry(id, categories)
    .map((c) => c.name)
    .join(' › ');

/** Is `id` a real top-level root? (No parent, or a parent that's missing or loops back.) */
function isRoot(category: Category, byId: Map<string, Category>): boolean {
  const seen = new Set<string>([category.id]);
  for (let p = parentOf(category, byId); p; p = parentOf(p, byId)) {
    if (seen.has(p.id)) return true; // a loop: show it at the top level
    seen.add(p.id);
  }
  return !category.parentId || !byId.has(category.parentId);
}

export interface TreeRow {
  category: Category;
  /** 0 for top level, 1 for its children, … */
  depth: number;
}

/**
 * The whole tree as a list, in display order: each category followed by its
 * children (alphabetical at every level), with how deep each one sits.
 */
export function categoryTree(categories: Category[]): TreeRow[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const children = new Map<string, Category[]>();
  for (const c of categories) {
    if (c.parentId && byId.has(c.parentId) && !isRoot(c, byId)) {
      children.set(c.parentId, [...(children.get(c.parentId) ?? []), c]);
    }
  }

  const rows: TreeRow[] = [];
  const visit = (c: Category, depth: number) => {
    rows.push({ category: c, depth });
    // Recursion: each child brings its own children along
    for (const child of (children.get(c.id) ?? []).sort(byName)) visit(child, depth + 1);
  };
  categories.filter((c) => isRoot(c, byId)).sort(byName).forEach((c) => visit(c, 0));
  return rows;
}

/** A category and everything under it, at any depth. */
export function withDescendants(id: string, categories: Category[]): Set<string> {
  const result = new Set([id]);
  // Keep sweeping until a pass adds nothing new; safe even with loops
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of categories) {
      if (c.parentId && result.has(c.parentId) && !result.has(c.id)) {
        result.add(c.id);
        grew = true;
      }
    }
  }
  return result;
}

/** Every id in `ids` plus everything under them: what a category filter should match. */
export function expandCategories(ids: string[], categories: Category[]): string[] {
  const all = new Set<string>();
  for (const id of ids) for (const x of withDescendants(id, categories)) all.add(x);
  return [...all];
}

/** Indents a name for a <select> option, since options can't be styled. */
export const indentLabel = (row: TreeRow) => `${'   '.repeat(row.depth)}${row.depth ? '└ ' : ''}${row.category.name}`;
