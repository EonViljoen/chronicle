import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Timeline } from '../../types/timeline';
import { updateTimeline } from '../../db/timelines';
import { uniqueId } from '../../lib/ids';

/** What every item form receives. */
export interface FormProps<T> {
  original: T;
  isNew: boolean;
  onSave: (item: T) => Promise<void>;
  onDelete?: () => void;
  onDirtyChange: (dirty: boolean) => void;
}

interface Props<T extends { id: string }> {
  timeline: Timeline;
  /** Already sorted for display. */
  items: T[];
  /** Selected item id, "new", or null for none. */
  itemId: string | null;
  onSelectItem: (id: string | null) => void;
  onDirtyChange: (dirty: boolean) => void;
  noun: string;
  blank: () => T;
  nameOf: (item: T) => string;
  renderRow: (item: T) => ReactNode;
  matches?: (item: T, query: string) => boolean;
  /** Optional: a heading to list each item under. Items must already be sorted by it. */
  groupOf?: (item: T) => string;
  /**
   * Optional: a fold-away section to list each item in (events in their era). Items must
   * already be sorted by it; items with no section are listed on their own, between the sections.
   */
  sectionOf?: (item: T) => Section | undefined;
  save: (timeline: Timeline, item: T) => Timeline;
  remove: (timeline: Timeline, id: string) => Timeline;
  deleteWarning?: (item: T) => string | undefined;
  renderForm: (props: FormProps<T>) => ReactNode;
}

export interface Section {
  id: string;
  name: string;
  color?: string;
}

/** A run of consecutive items: in one section, or in none. */
interface Run<T> {
  section: Section | undefined;
  items: T[];
}

function runsOf<T>(items: T[], sectionOf: (item: T) => Section | undefined): Run<T>[] {
  const runs: Run<T>[] = [];
  for (const item of items) {
    const section = sectionOf(item);
    const last = runs[runs.length - 1];
    if (last && last.section?.id === section?.id) last.items.push(item);
    else runs.push({ section, items: [item] });
  }
  return runs;
}

/**
 * A list on the left and a form on the right. Eras, factions, places and
 * events all use this, so it's a *generic* component: `T` is whichever item
 * type it's showing, and TypeScript checks the callbacks match it.
 */
export default function CollectionTab<T extends { id: string }>({
  timeline,
  items,
  itemId,
  onSelectItem,
  onDirtyChange,
  noun,
  blank,
  nameOf,
  renderRow,
  matches,
  groupOf,
  sectionOf,
  save,
  remove,
  deleteWarning,
  renderForm,
}: Props<T>) {
  // "faction" -> "factions", "event" -> "events"
  const plural = noun.endsWith('y') ? `${noun.slice(0, -1)}ies` : `${noun}s`;
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Lazy initial state: blank() runs once, not on every render
  const [blankItem] = useState(blank);

  const isNew = itemId === 'new';
  const selected = isNew ? blankItem : items.find((i) => i.id === itemId);
  const q = query.trim().toLowerCase();
  const visible = q && matches ? items.filter((i) => matches(i, q)) : items;

  // Which sections are unfolded. The selected item's section unfolds when it's picked
  // ("adjusting state while rendering", as in NumberInput), and every section shows while searching.
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  const selectedSection = sectionOf && selected && !isNew ? sectionOf(selected) : undefined;
  if (itemId !== openedFor) {
    setOpenedFor(itemId);
    if (selectedSection && !openIds.has(selectedSection.id)) setOpenIds(new Set(openIds).add(selectedSection.id));
  }
  const runs = sectionOf ? runsOf(visible, sectionOf) : null;
  const sectionIds = runs ? runs.flatMap((r) => (r.section ? [r.section.id] : [])) : [];
  const allOpen = sectionIds.every((id) => openIds.has(id));
  function toggleSection(id: string, open: boolean) {
    if (q) return; // searching shows every section; folding then would be undone when the search clears
    const next = new Set(openIds);
    if (open) next.add(id);
    else next.delete(id);
    setOpenIds(next);
  }

  // Bring the picked item into view in the list (it may be deep inside a long era)
  const listRef = useRef<HTMLElement>(null);
  useEffect(() => {
    listRef.current?.querySelector('.row.is-selected')?.scrollIntoView({ block: 'nearest' });
  }, [itemId]);

  const rowOf = (item: T) => (
    <li key={item.id}>
      <button className={`row${item.id === itemId ? ' is-selected' : ''}`} onClick={() => onSelectItem(item.id)}>
        {renderRow(item)}
      </button>
    </li>
  );

  async function handleSave(item: T) {
    setError(null);
    try {
      const id = isNew ? uniqueId(nameOf(item), items.map((i) => i.id)) : item.id;
      await updateTimeline(timeline.id, (t) => save(t, { ...item, id }));
      onDirtyChange(false); // saved, so it's safe to navigate
      if (isNew) onSelectItem(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleDelete(item: T) {
    const warning = deleteWarning?.(item);
    if (!window.confirm(`Delete "${nameOf(item)}"?${warning ? `\n\n${warning}` : ''}`)) return;
    try {
      await updateTimeline(timeline.id, (t) => remove(t, item.id));
      onDirtyChange(false);
      onSelectItem(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className={`collection${itemId ? ' has-selection' : ''}`}>
      <aside className="collection-list" ref={listRef}>
        <div className="collection-list-head">
          <button className="btn btn-primary" onClick={() => onSelectItem('new')}>+ New {noun}</button>
          {matches && items.length > 5 && (
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${plural}`} aria-label={`Search ${plural}`} />
          )}
          {sectionIds.length > 1 && !q && (
            <button className="link-btn sections-toggle" onClick={() => setOpenIds(allOpen ? new Set() : new Set(sectionIds))}>
              {allOpen ? 'Collapse all' : 'Expand all'}
            </button>
          )}
        </div>
        {items.length === 0 ? (
          <p className="muted collection-empty">No {plural} yet.</p>
        ) : runs ? (
          <ul className="rows">
            {runs.map((run) =>
              run.section ? (
                <li key={`${run.section.id}-${run.items[0].id}`} className="rows-section">
                  {/* Controlled <details>: `open` comes from state, and onToggle reports the reader's clicks */}
                  <details open={Boolean(q) || openIds.has(run.section.id)} onToggle={(e) => toggleSection(run.section!.id, e.currentTarget.open)}>
                    <summary className="rows-section-head">
                      <span className="swatch" style={{ background: run.section.color ?? 'transparent' }} />
                      <span className="row-main">{run.section.name}</span>
                      <span className="row-meta">{run.items.length}</span>
                    </summary>
                    <ul className="rows">{run.items.map(rowOf)}</ul>
                  </details>
                </li>
              ) : (
                run.items.map(rowOf)
              ),
            )}
            {visible.length === 0 && <li className="muted collection-empty">No matches.</li>}
          </ul>
        ) : (
          <ul className="rows">
            {visible.map((item, i) => {
              // A heading wherever the group changes
              const group = groupOf?.(item);
              const heading = group !== undefined && (i === 0 || groupOf?.(visible[i - 1]) !== group);
              return (
                <Fragment key={item.id}>
                  {heading && <li className="rows-group" aria-hidden="true">{group}</li>}
                  <li>
                    <button className={`row${item.id === itemId ? ' is-selected' : ''}`} onClick={() => onSelectItem(item.id)}>
                      {renderRow(item)}
                    </button>
                  </li>
                </Fragment>
              );
            })}
            {visible.length === 0 && <li className="muted collection-empty">No matches.</li>}
          </ul>
        )}
      </aside>

      <section className="collection-form">
        {error && <p className="error" role="alert">{error}</p>}
        {itemId && (
          <button className="link-btn back-link" onClick={() => onSelectItem(null)}>← All {plural}</button>
        )}
        {selected ? (
          // The key makes React build a fresh form (fresh draft state) per item
          <Fragment key={itemId}>
            {renderForm({
              original: selected,
              isNew,
              onSave: handleSave,
              onDelete: isNew ? undefined : () => handleDelete(selected),
              onDirtyChange,
            })}
          </Fragment>
        ) : (
          !itemId && <p className="muted collection-placeholder">Pick a {noun} from the list, or create a new one.</p>
        )}
      </section>
    </div>
  );
}
