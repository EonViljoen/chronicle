import type { Category, Place } from '../../types/timeline';
import { hasFilters, NO_FILTERS, type Filters } from '../../lib/filters';
import { categoryPath, categoryTree, expandCategories, indentLabel } from '../../lib/categories';

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
  categories: Category[];
  places: Place[];
  visibleCount: number;
  totalCount: number;
  /** Enter in the search box: jump to the next match. */
  onSearchEnter: () => void;
  /** null when the timeline has no map. */
  showMap: boolean | null;
  onToggleMap: () => void;
}

/**
 * Search, category filter, place filter and the map toggle.
 * Categories are picked from a dropdown (the whole tree, indented); each
 * picked one shows as a chip with × to remove it.
 */
export default function ViewerToolbar({ filters, onChange, categories, places, visibleCount, totalCount, onSearchEnter, showMap, onToggleMap }: Props) {
  const place = places.find((p) => p.id === filters.placeId);
  const set = (changes: Partial<Filters>) => onChange({ ...filters, ...changes });

  const picked = filters.categoryIds
    .map((id) => categories.find((c) => c.id === id))
    .filter((c): c is Category => c !== undefined);
  // Hide what's already picked, and what's already covered by a picked parent
  const covered = new Set(expandCategories(filters.categoryIds, categories));
  const pickable = categoryTree(categories).filter((row) => !covered.has(row.category.id));
  const addCategory = (id: string) => id && set({ categoryIds: [...filters.categoryIds, id] });
  const removeCategory = (id: string) => set({ categoryIds: filters.categoryIds.filter((c) => c !== id) });

  return (
    <div className="viewer-toolbar">
      <div className="toolbar-row">
        <input
          type="search"
          className="viewer-search"
          value={filters.query}
          placeholder="Search events…"
          aria-label="Search events"
          onChange={(e) => set({ query: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSearchEnter();
          }}
        />
        {hasFilters(filters) && (
          <span className="filter-count" aria-live="polite">
            {visibleCount} of {totalCount} events
          </span>
        )}
        {categories.length > 0 && pickable.length > 0 && (
          // value="" keeps the dropdown on its prompt after each pick
          <select className="category-filter" value="" aria-label="Filter by category" onChange={(e) => addCategory(e.target.value)}>
            <option value="">Filter by category…</option>
            {pickable.map((row) => (
              <option key={row.category.id} value={row.category.id}>{indentLabel(row)}</option>
            ))}
          </select>
        )}
        {showMap !== null && (
          <button className="btn map-toggle" aria-pressed={showMap} onClick={onToggleMap}>
            {showMap ? 'Hide map' : 'Show map'}
          </button>
        )}
      </div>

      {(picked.length > 0 || place) && (
        <div className="filter-bar" role="group" aria-label="Filters">
          {place && (
            <span className="chip chip-place-filter">
              ⌖ At {place.name}
              <button className="chip-remove" aria-label={`Stop filtering by ${place.name}`} onClick={() => set({ placeId: null })}>×</button>
            </span>
          )}
          {picked.map((c) => (
            <span key={c.id} className="chip" style={{ borderColor: c.color }} title={categoryPath(c.id, categories)}>
              <span className="swatch" style={{ background: c.color }} /> {c.name}
              <button className="chip-remove" aria-label={`Stop filtering by ${c.name}`} onClick={() => removeCategory(c.id)}>×</button>
            </span>
          ))}
          {hasFilters(filters) && (
            <button className="link-btn muted" onClick={() => onChange(NO_FILTERS)}>Clear all</button>
          )}
        </div>
      )}
    </div>
  );
}
