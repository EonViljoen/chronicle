import type { DateKind, DatePrecision, EventDate } from '../../types/timeline';
import { freeformDate, millenniumDate, yearDate } from '../../lib/dates';
import Field from './Field';
import NumberInput from './NumberInput';

/*
 * Two date inputs:
 * - SortKeyInput edits a bare sortKey number (era start/end) in the
 *   timeline's date format.
 * - DateInput edits a full EventDate (kind, display label, precision).
 */

const splitMillennium = (sortKey: number) => {
  const millennium = Math.floor(sortKey / 1000) + 1;
  return { millennium, year: sortKey - (millennium - 1) * 1000 };
};
const joinMillennium = (millennium: number, year: number) => (millennium - 1) * 1000 + year;

// ---------- SortKeyInput ----------

interface SortKeyProps {
  label: string;
  kind: DateKind;
  value: number;
  onChange: (value: number) => void;
  error?: string;
}

export function SortKeyInput({ label, kind, value, onChange, error }: SortKeyProps) {
  const set = (v: number | undefined) => v !== undefined && onChange(v);

  if (kind !== 'millennium') {
    return (
      <Field label={label} error={error} hint={kind === 'freeform' ? 'An ordering number' : undefined}>
        <NumberInput value={value} onChange={set} />
      </Field>
    );
  }

  const beforeM1 = value < 0;
  const { millennium, year } = splitMillennium(value);
  return (
    <Field label={label} group error={error}>
      {beforeM1 ? (
        <div className="inline-inputs">
          <NumberInput className="w-lg" value={-value} min={1} onChange={(n) => n !== undefined && onChange(-n)} aria-label={`${label}: years before M1`} />
          <span className="muted">years before M1</span>
        </div>
      ) : (
        <div className="inline-inputs">
          <NumberInput className="w-sm" value={year} min={0} max={999} aria-label={`${label}: year`} onChange={(n) => n !== undefined && onChange(joinMillennium(millennium, n))} />
          <span className="muted">.M</span>
          <NumberInput className="w-sm" value={millennium} min={1} aria-label={`${label}: millennium`} onChange={(n) => n !== undefined && onChange(joinMillennium(n, year))} />
        </div>
      )}
      <label className="check">
        <input type="checkbox" checked={beforeM1} onChange={(e) => onChange(e.target.checked ? -1000 : 0)} /> Before M1
      </label>
    </Field>
  );
}

// ---------- DateInput ----------

const KIND_LABELS: Record<DateKind, string> = {
  year: 'Year (1066, -500)',
  millennium: 'Millennium (005.M31)',
  freeform: 'Free text (~60M years ago)',
};

const PRECISION_LABELS: Record<DatePrecision, string> = {
  exact: 'Exact',
  decade: 'Decade',
  century: 'Century',
  millennium: 'Millennium',
  circa: 'Approximate',
};

/** Builds a millennium date, keeping the chosen precision where it makes sense. */
function millenniumWith(millennium: number, year: number | undefined, precision: DatePrecision): EventDate {
  const date = millenniumDate(millennium, year);
  if (year === undefined) return date; // year unknown -> precision is "millennium"
  return { ...date, precision: precision === 'millennium' ? 'exact' : precision };
}

interface DateProps {
  value: EventDate;
  onChange: (date: EventDate) => void;
  error?: string;
}

export function DateInput({ value, onChange, error }: DateProps) {
  const { kind, precision, sortKey } = value;
  const { millennium, year } = splitMillennium(Math.max(0, sortKey));
  // "M31" (no year) vs "005.M31"
  const yearKnown = value.display.includes('.');

  function changeKind(next: DateKind) {
    if (next === 'year') onChange({ ...yearDate(sortKey), precision });
    else if (next === 'millennium') onChange(millenniumWith(millennium, year, precision));
    else onChange(freeformDate(value.display, sortKey, precision));
  }

  const shown = `${precision !== 'exact' ? 'c. ' : ''}${value.display || '—'}`;

  return (
    <Field
      label="Date"
      group
      error={error}
      hint={
        kind === 'freeform'
          ? 'The number only sets the order. For 40k-style timelines 005.M31 = 30005; use negative numbers for the deep past.'
          : `Shows as: ${shown}`
      }
    >
      <div className="inline-inputs wrap">
        <select value={kind} onChange={(e) => changeKind(e.target.value as DateKind)} aria-label="Date type">
          {(Object.keys(KIND_LABELS) as DateKind[]).map((k) => (
            <option key={k} value={k}>{KIND_LABELS[k]}</option>
          ))}
        </select>

        {kind === 'year' && (
          <NumberInput
            className="w-md"
            value={sortKey}
            aria-label="Year"
            onChange={(n) => n !== undefined && onChange({ ...yearDate(n), precision })}
          />
        )}

        {kind === 'millennium' && (
          // Grouped so "005 .M 31" never wraps apart on narrow screens
          <span className="inline-inputs">
            <NumberInput
              className="w-sm"
              value={yearKnown ? year : undefined}
              min={0}
              max={999}
              allowEmpty
              placeholder="???"
              aria-label="Year (leave empty if unknown)"
              onChange={(n) => onChange(millenniumWith(millennium, n, precision))}
            />
            <span className="muted">.M</span>
            <NumberInput
              className="w-sm"
              value={millennium}
              min={1}
              aria-label="Millennium"
              onChange={(n) => n !== undefined && onChange(millenniumWith(n, yearKnown ? year : undefined, precision))}
            />
          </span>
        )}

        {kind === 'freeform' && (
          <>
            <input
              value={value.display}
              placeholder="~60 million years ago"
              aria-label="Date label"
              onChange={(e) => onChange({ ...value, display: e.target.value })}
            />
            <NumberInput
              className="w-md"
              value={sortKey}
              aria-label="Order number"
              title="Order number"
              onChange={(n) => n !== undefined && onChange({ ...value, sortKey: n })}
            />
          </>
        )}

        <select
          value={precision}
          aria-label="Precision"
          disabled={kind === 'millennium' && !yearKnown}
          onChange={(e) => onChange({ ...value, precision: e.target.value as DatePrecision })}
        >
          {(Object.keys(PRECISION_LABELS) as DatePrecision[]).map((p) => (
            <option key={p} value={p}>{PRECISION_LABELS[p]}</option>
          ))}
        </select>
      </div>
    </Field>
  );
}
