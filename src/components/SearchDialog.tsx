import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Timeline } from '../types/timeline';
import { searchTimeline } from '../lib/search';
import type { LinkKind } from '../lib/links';

const KIND_LABEL: Record<LinkKind, string> = { event: 'Event', character: 'Character', place: 'Place', faction: 'Faction', lore: 'Lore' };
const KIND_ICON: Record<LinkKind, string> = { event: '◆', character: '☺', place: '⌖', faction: '⚑', lore: '❡' };

interface Props {
  timeline: Timeline;
  /** In the editor, results open the item's form instead of its page. */
  inEditor: boolean;
  onClose: () => void;
}

/**
 * The quick finder (Ctrl+K / ⌘K): type, move with ↑ ↓, open with Enter.
 * A native <dialog> opened with showModal() handles the backdrop, focus
 * and Esc for us.
 */
export default function SearchDialog({ timeline, inEditor, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const results = searchTimeline(timeline, query, inEditor);
  const current = Math.min(active, Math.max(results.length - 1, 0));

  // Open as a modal once it's on the page. No close() on cleanup: closing
  // fires the dialog's close event (which would call onClose), and removing
  // the element closes it anyway.
  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal();
    input.current?.focus();
  }, []);

  // Keep the highlighted result in view while moving with the arrows
  useEffect(() => {
    dialog.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [current]);

  function open(i: number) {
    const r = results[i];
    if (!r) return;
    onClose();
    navigate(r.to);
  }

  return (
    <dialog
      ref={dialog}
      className="search-dialog"
      aria-label="Search everything"
      onClose={onClose}
      // A click on the backdrop lands on the dialog itself
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <input
        ref={input}
        className="search-input"
        type="search"
        value={query}
        placeholder={`Search ${timeline.title}…`}
        aria-label="Search events, characters, places, factions and lore"
        role="combobox"
        aria-expanded={results.length > 0}
        aria-controls="search-results"
        aria-activedescendant={results.length ? `search-result-${current}` : undefined}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') setActive((current + 1) % Math.max(results.length, 1));
          else if (e.key === 'ArrowUp') setActive((current - 1 + results.length) % Math.max(results.length, 1));
          else if (e.key === 'Enter') open(current);
          else return;
          e.preventDefault();
        }}
      />
      {query.trim() && (
        <ul id="search-results" className="search-results" role="listbox" aria-label="Results">
          {results.length === 0 && <li className="muted search-empty">Nothing matches "{query.trim()}".</li>}
          {results.map((r, i) => (
            <li
              key={`${r.kind}:${r.id}`}
              id={`search-result-${i}`}
              role="option"
              aria-selected={i === current}
              className={`search-result${i === current ? ' is-active' : ''}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => open(i)}
            >
              <span className="search-icon" aria-hidden="true">{KIND_ICON[r.kind]}</span>
              <span className="search-text">
                <strong>{r.title}</strong>
                {r.detail && <span className="muted">{r.detail}</span>}
              </span>
              <span className="search-kind">{KIND_LABEL[r.kind]}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="search-help muted">↑ ↓ to move · Enter to open{inEditor ? ' in the editor' : ''} · Esc to close · words can match names, text, dates and #tags</p>
    </dialog>
  );
}
