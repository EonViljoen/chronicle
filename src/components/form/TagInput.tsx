import { useId, useState } from 'react';
import { normalizeTag } from '../../lib/tags';

interface Props {
  label: string;
  value: string[];
  onChange: (tags: string[]) => void;
  /** Tags already used elsewhere, offered as you type. */
  suggestions: string[];
}


/**
 * Free labels as removable chips. Type a tag and press Enter (or a comma)
 * to add it; tags used elsewhere in the timeline are suggested.
 */
export default function TagInput({ label, value, onChange, suggestions }: Props) {
  const [text, setText] = useState('');
  const listId = useId();
  const offered = suggestions.filter((s) => !value.includes(s));

  function add(raw: string) {
    const tags = raw.split(',').map(normalizeTag).filter((t) => t && !value.includes(t));
    if (tags.length) onChange([...value, ...new Set(tags)]);
    setText('');
  }

  return (
    <div className="multi-picker">
      {value.length > 0 && (
        <div className="chips">
          {value.map((tag) => (
            <span key={tag} className="chip chip-tag">
              # {tag}
              <button type="button" className="chip-remove" aria-label={`Remove tag ${tag}`} onClick={() => onChange(value.filter((t) => t !== tag))}>×</button>
            </span>
          ))}
        </div>
      )}
      <div className="inline-inputs">
        <input
          aria-label={label}
          list={listId}
          value={text}
          placeholder="Add a tag…"
          onChange={(e) => {
            // Picking a suggestion, or typing a comma, adds it straight away
            const next = e.target.value;
            if (next.includes(',') || offered.includes(normalizeTag(next))) add(next);
            else setText(next);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault(); // don't submit the form
              add(text);
            } else if (e.key === 'Backspace' && !text && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => text.trim() && add(text)}
        />
        <datalist id={listId}>
          {offered.map((s) => <option key={s} value={s} />)}
        </datalist>
      </div>
    </div>
  );
}
