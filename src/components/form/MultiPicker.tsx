interface Option {
  id: string;
  label: string;
}

interface Props {
  label: string;
  options: Option[];
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder: string;
}

/** Selected items as removable chips, plus a dropdown to add more. */
export default function MultiPicker({ label, options, value, onChange, placeholder }: Props) {
  const selected = value
    .map((id) => options.find((o) => o.id === id))
    .filter((o): o is Option => o !== undefined);
  const available = options.filter((o) => !value.includes(o.id));

  return (
    <div className="multi-picker">
      {selected.length > 0 && (
        <div className="chips">
          {selected.map((o) => (
            <span key={o.id} className="chip">
              {o.label}
              <button
                type="button"
                className="chip-remove"
                aria-label={`Remove ${o.label}`}
                onClick={() => onChange(value.filter((id) => id !== o.id))}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      {available.length > 0 && (
        // value="" keeps the dropdown on the placeholder after each pick
        <select aria-label={label} value="" onChange={(e) => e.target.value && onChange([...value, e.target.value])}>
          <option value="">{placeholder}</option>
          {available.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      )}
    </div>
  );
}
