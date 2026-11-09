import { useId, useState } from 'react';
import Markdown from 'react-markdown';

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

/** A textarea with a Write / Preview toggle. */
export default function MarkdownField({ label, value, onChange }: Props) {
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const labelId = useId(); // a unique id, safe even if this field appears twice

  return (
    <div className="field">
      <div className="md-head">
        <span className="field-label" id={labelId}>{label}</span>
        <div className="segmented" role="group" aria-label="Editor mode">
          {(['write', 'preview'] as const).map((m) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>
              {m === 'write' ? 'Write' : 'Preview'}
            </button>
          ))}
        </div>
      </div>
      {mode === 'write' ? (
        <textarea rows={10} value={value} onChange={(e) => onChange(e.target.value)} aria-labelledby={labelId} />
      ) : (
        <div className="prose md-preview">
          {value.trim() ? <Markdown>{value}</Markdown> : <p className="muted">Nothing to preview.</p>}
        </div>
      )}
      <span className="field-hint">Markdown: **bold**, *italic*, - lists, [links](https://…), blank line for a new paragraph</span>
    </div>
  );
}
