import type { Faction, Place } from '../../types/timeline';
import { hasFilters, NO_FILTERS, type Filters } from '../../lib/filters';
import { factionPath, factionTree, expandFactions, indentLabel } from '../../lib/factions';

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
  factions: Faction[];
  places: Place[];
  /** Every tag in the timeline, most used first. */
  tags: string[];
  visibleCount: number;
  totalCount: number;
  /** Enter in the search box: jump to the next match. */
  onSearchEnter: () => void;
  /** null when the timeline has no map. */
  showMap: boolean | null;
  onToggleMap: () => void;
  /** Lanes per faction on or off; null hides the button (no factions). */
  lanes: boolean | null;
  onToggleLanes: () => void;
}

/**
 * Search, faction filter, place filter and the map toggle.
 * Factions are picked from a dropdown (the whole tree, indented); each
 * picked one shows as a chip with × to remove it.
 */
export default function ViewerToolbar({ filters, onChange, factions, places, tags, visibleCount, totalCount, onSearchEnter, showMap, onToggleMap, lanes, onToggleLanes }: Props) {
  const place = places.find((p) => p.id === filters.placeId);
  const set = (changes: Partial<Filters>) => onChange({ ...filters, ...changes });

  const picked = filters.factionIds
    .map((id) => factions.find((c) => c.id === id))
    .filter((c): c is Faction => c !== undefined);
  // Hide what's already picked, and what's already covered by a picked parent
  const covered = new Set(expandFactions(filters.factionIds, factions));
  const pickable = factionTree(factions).filter((row) => !covered.has(row.faction.id));
  const addFaction = (id: string) => id && set({ factionIds: [...filters.factionIds, id] });
  const removeFaction = (id: string) => set({ factionIds: filters.factionIds.filter((c) => c !== id) });
  const pickableTags = tags.filter((t) => !filters.tags.includes(t));

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
        {factions.length > 0 && pickable.length > 0 && (
          // value="" keeps the dropdown on its prompt after each pick
          <select className="faction-filter" value="" aria-label="Filter by faction" onChange={(e) => addFaction(e.target.value)}>
            <option value="">Filter by faction…</option>
            {pickable.map((row) => (
              <option key={row.faction.id} value={row.faction.id}>{indentLabel(row)}</option>
            ))}
          </select>
        )}
        {pickableTags.length > 0 && (
          <select className="faction-filter" value="" aria-label="Filter by tag" onChange={(e) => e.target.value && set({ tags: [...filters.tags, e.target.value] })}>
            <option value="">Filter by tag…</option>
            {pickableTags.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}
        {lanes !== null && (
          <button className="btn view-toggle" aria-pressed={lanes} onClick={onToggleLanes} title="One row per top-level faction">
            {lanes ? 'Single line' : 'Lanes by faction'}
          </button>
        )}
        {showMap !== null && (
          <button className="btn map-toggle" aria-pressed={showMap} onClick={onToggleMap}>
            {showMap ? 'Hide map' : 'Show map'}
          </button>
        )}
      </div>

      {(picked.length > 0 || place || filters.tags.length > 0) && (
        <div className="filter-bar" role="group" aria-label="Filters">
          {place && (
            <span className="chip chip-place-filter">
              ⌖ At {place.name}
              <button className="chip-remove" aria-label={`Stop filtering by ${place.name}`} onClick={() => set({ placeId: null })}>×</button>
            </span>
          )}
          {picked.map((c) => (
            <span key={c.id} className="chip" style={{ borderColor: c.color }} title={factionPath(c.id, factions)}>
              <span className="swatch" style={{ background: c.color }} /> {c.name}
              <button className="chip-remove" aria-label={`Stop filtering by ${c.name}`} onClick={() => removeFaction(c.id)}>×</button>
            </span>
          ))}
          {filters.tags.map((t) => (
            <span key={t} className="chip chip-tag">
              # {t}
              <button className="chip-remove" aria-label={`Stop filtering by tag ${t}`} onClick={() => set({ tags: filters.tags.filter((x) => x !== t) })}>×</button>
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
