import type { Category, Place } from '../../types/timeline';
import { hasFilters, NO_FILTERS, type Filters } from '../../lib/filters';

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

/** Search, category filter, place filter and the map toggle. */
export default function ViewerToolbar({ filters, onChange, categories, places, visibleCount, totalCount, onSearchEnter, showMap, onToggleMap }: Props) {
  const place = places.find((p) => p.id === filters.placeId);
  const set = (changes: Partial<Filters>) => onChange({ ...filters, ...changes });

  function toggleCategory(id: string) {
    const ids = filters.categoryIds;
    set({ categoryIds: ids.includes(id) ? ids.filter((c) => c !== id) : [...ids, id] });
  }

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
        {showMap !== null && (
          <button className="btn map-toggle" aria-pressed={showMap} onClick={onToggleMap}>
            {showMap ? 'Hide map' : 'Show map'}
          </button>
        )}
      </div>

      {(categories.length > 0 || place) && (
        <div className="filter-bar" role="group" aria-label="Filters">
          {place && (
            <span className="chip chip-place-filter">
              ⌖ At {place.name}
              <button className="chip-remove" aria-label={`Stop filtering by ${place.name}`} onClick={() => set({ placeId: null })}>×</button>
            </span>
          )}
          {categories.map((c) => (
            <button
              key={c.id}
              className={`chip chip-toggle${filters.categoryIds.includes(c.id) ? ' is-on' : ''}`}
              style={{ borderColor: c.color }}
              aria-pressed={filters.categoryIds.includes(c.id)}
              onClick={() => toggleCategory(c.id)}
            >
              <span className="swatch" style={{ background: c.color }} /> {c.name}
            </button>
          ))}
          {hasFilters(filters) && (
            <button className="link-btn muted" onClick={() => onChange(NO_FILTERS)}>Clear all</button>
          )}
        </div>
      )}
    </div>
  );
}
