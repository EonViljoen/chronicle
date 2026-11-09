import type { Faction } from '../types/timeline';

/*
 * Factions form a tree, but they're stored as a flat list where each one
 * may point at its parent (`parentId`). These helpers build the tree view
 * when it's needed. Storing a flat list keeps saving, moving and deleting
 * simple: changing a parent is changing one field.
 *
 * Bad data (a parent that doesn't exist, or a loop from a hand-edited file)
 * is treated as top level, so nothing disappears and nothing loops forever.
 */

const byName = (a: Faction, b: Faction) => a.name.localeCompare(b.name);

/** A faction's parent, if it exists. */
function parentOf(faction: Faction, byId: Map<string, Faction>): Faction | undefined {
  return faction.parentId ? byId.get(faction.parentId) : undefined;
}

/** The chain from the top level down to this faction: [Imperium, Space Marines]. */
export function ancestry(id: string, factions: Faction[]): Faction[] {
  const byId = new Map(factions.map((c) => [c.id, c]));
  const chain: Faction[] = [];
  const seen = new Set<string>(); // guards against loops
  for (let c = byId.get(id); c && !seen.has(c.id); c = parentOf(c, byId)) {
    seen.add(c.id);
    chain.unshift(c);
  }
  return chain;
}

/** "Imperium › Space Marines" */
export const factionPath = (id: string, factions: Faction[]) =>
  ancestry(id, factions)
    .map((c) => c.name)
    .join(' › ');

/** Is `id` a real top-level root? (No parent, or a parent that's missing or loops back.) */
function isRoot(faction: Faction, byId: Map<string, Faction>): boolean {
  const seen = new Set<string>([faction.id]);
  for (let p = parentOf(faction, byId); p; p = parentOf(p, byId)) {
    if (seen.has(p.id)) return true; // a loop: show it at the top level
    seen.add(p.id);
  }
  return !faction.parentId || !byId.has(faction.parentId);
}

export interface TreeRow {
  faction: Faction;
  /** 0 for top level, 1 for its children, … */
  depth: number;
}

/**
 * The whole tree as a list, in display order: each faction followed by its
 * children (alphabetical at every level), with how deep each one sits.
 */
export function factionTree(factions: Faction[]): TreeRow[] {
  const byId = new Map(factions.map((c) => [c.id, c]));
  const children = new Map<string, Faction[]>();
  for (const c of factions) {
    if (c.parentId && byId.has(c.parentId) && !isRoot(c, byId)) {
      children.set(c.parentId, [...(children.get(c.parentId) ?? []), c]);
    }
  }

  const rows: TreeRow[] = [];
  const visit = (c: Faction, depth: number) => {
    rows.push({ faction: c, depth });
    // Recursion: each child brings its own children along
    for (const child of (children.get(c.id) ?? []).sort(byName)) visit(child, depth + 1);
  };
  factions.filter((c) => isRoot(c, byId)).sort(byName).forEach((c) => visit(c, 0));
  return rows;
}

/** A faction and everything under it, at any depth. */
export function withDescendants(id: string, factions: Faction[]): Set<string> {
  const result = new Set([id]);
  // Keep sweeping until a pass adds nothing new; safe even with loops
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of factions) {
      if (c.parentId && result.has(c.parentId) && !result.has(c.id)) {
        result.add(c.id);
        grew = true;
      }
    }
  }
  return result;
}

/** Every id in `ids` plus everything under them: what a faction filter should match. */
export function expandFactions(ids: string[], factions: Faction[]): string[] {
  const all = new Set<string>();
  for (const id of ids) for (const x of withDescendants(id, factions)) all.add(x);
  return [...all];
}

/** Indents a name for a <select> option, since options can't be styled. */
export const indentLabel = (row: TreeRow) => `${'   '.repeat(row.depth)}${row.depth ? '└ ' : ''}${row.faction.name}`;
