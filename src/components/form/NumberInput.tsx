import { useState, type InputHTMLAttributes } from 'react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'min' | 'max'> & {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  min?: number;
  max?: number;
  /** Allow clearing the field (reports `undefined`). */
  allowEmpty?: boolean;
};

/**
 * A whole-number input that keeps what you type as text, so half-typed
 * values like "" or "-" don't get turned into 0 while you type. It only
 * reports valid numbers to the parent; invalid text gets a red border.
 */
export default function NumberInput({ value, onChange, min, max, allowEmpty, className, ...rest }: Props) {
  const toText = (v: number | undefined) => (v === undefined ? '' : String(v));
  const [text, setText] = useState(toText(value));
  const [synced, setSynced] = useState(value);

  // "Adjusting state when a prop changes": if the parent changes the value
  // (say, another field recalculated it), show the new value. This runs
  // during render, which React allows for this exact pattern.
  if (value !== synced) {
    setSynced(value);
    setText(toText(value));
  }

  function parse(raw: string): { ok: true; value: number | undefined } | { ok: false } {
    const t = raw.trim();
    if (t === '') return allowEmpty ? { ok: true, value: undefined } : { ok: false };
    const n = Number(t);
    if (!Number.isInteger(n)) return { ok: false };
    if ((min !== undefined && n < min) || (max !== undefined && n > max)) return { ok: false };
    return { ok: true, value: n };
  }

  const valid = parse(text).ok;

  return (
    <input
      {...rest}
      className={['num', className].filter(Boolean).join(' ')}
      type="text"
      inputMode="numeric"
      value={text}
      aria-invalid={!valid || undefined}
      onChange={(e) => {
        setText(e.target.value);
        const result = parse(e.target.value);
        if (result.ok) {
          setSynced(result.value);
          onChange(result.value);
        }
      }}
    />
  );
}
