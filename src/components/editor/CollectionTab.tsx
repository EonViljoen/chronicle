import { Fragment, useState, type ReactNode } from 'react';
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
  save: (timeline: Timeline, item: T) => Timeline;
  remove: (timeline: Timeline, id: string) => Timeline;
  deleteWarning?: (item: T) => string | undefined;
  renderForm: (props: FormProps<T>) => ReactNode;
}

/**
 * A list on the left and a form on the right. Eras, categories, places and
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
  save,
  remove,
  deleteWarning,
  renderForm,
}: Props<T>) {
  // "category" -> "categories", "event" -> "events"
  const plural = noun.endsWith('y') ? `${noun.slice(0, -1)}ies` : `${noun}s`;
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Lazy initial state: blank() runs once, not on every render
  const [blankItem] = useState(blank);

  const isNew = itemId === 'new';
  const selected = isNew ? blankItem : items.find((i) => i.id === itemId);
  const q = query.trim().toLowerCase();
  const visible = q && matches ? items.filter((i) => matches(i, q)) : items;

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
      <aside className="collection-list">
        <div className="collection-list-head">
          <button className="btn btn-primary" onClick={() => onSelectItem('new')}>+ New {noun}</button>
          {matches && items.length > 5 && (
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${plural}`} aria-label={`Search ${plural}`} />
          )}
        </div>
        {items.length === 0 ? (
          <p className="muted collection-empty">No {plural} yet.</p>
        ) : (
          <ul className="rows">
            {visible.map((item) => (
              <li key={item.id}>
                <button className={`row${item.id === itemId ? ' is-selected' : ''}`} onClick={() => onSelectItem(item.id)}>
                  {renderRow(item)}
                </button>
              </li>
            ))}
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
