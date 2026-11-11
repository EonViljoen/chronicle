import type { Calendar, DatePrecision, EventDate } from '../../types/timeline';
import { fill, formatDate, formatKey, joinKey, periodStart, splitKey, supportsPeriod, type DateParts } from '../../lib/dates';
import Field from './Field';
import NumberInput from './NumberInput';

/*
 * Date inputs that speak the timeline's calendar:
 * - CalendarFields: the calendar's own boxes for one date (year + BCE/CE,
 *   age + year, year + cycle…). Used by both inputs below.
 * - SortKeyInput: a bare date (era start/end).
 * - DateInput: an event's full date: calendar date or free text, plus precision.
 */

// ---------- CalendarFields ----------

interface CalendarFieldsProps {
  calendar: Calendar;
  value: number;
  /** Used in each box's accessible name, e.g. "Starts: year". */
  label: string;
  /** Lets the year be left empty when only the age or cycle is known (events only). */
  periodAllowed?: boolean;
  isPeriod?: boolean;
  onChange: (value: number, isPeriod: boolean) => void;
}

/** "{n} BCE" -> "BCE". Falls back to words when the template has no letters ("-{n}"). */
function sideName(template: string, fallback: string) {
  const name = fill(template, { n: '' }).trim();
  return /\p{L}/u.test(name) ? name : fallback;
}

/** Splits "{year}.M{cycle}" into its order and the text between the two numbers. */
function cycleLayout(format: string) {
  const y = format.indexOf('{year}');
  const c = format.indexOf('{cycle}');
  if (y === -1 || c === -1) return { yearFirst: true, between: 'of cycle' };
  const between = y < c ? format.slice(y + 6, c) : format.slice(c + 7, y);
  return { yearFirst: y < c, between: between.trim() || ' ' };
}

function CalendarFields({ calendar, value, label, periodAllowed = false, isPeriod = false, onChange }: CalendarFieldsProps) {
  const parts = splitKey(value, calendar);
  const emit = (next: DateParts, period = false) => onChange(joinKey(next, calendar), period);
  // The year box reports undefined when emptied; that means "only the period is known"
  const emitYear = (year: number | undefined, base: DateParts) =>
    year === undefined ? onChange(periodStart(value, calendar), true) : emit({ ...base, year } as DateParts);

  if (parts.type === 'years' && calendar.type === 'years') {
    return (
      <span className="inline-inputs">
        <NumberInput className="w-md" value={parts.n} min={0} aria-label={`${label}: year`} onChange={(n) => n !== undefined && emit({ ...parts, n })} />
        <select
          value={parts.before ? 'before' : 'after'}
          aria-label={`${label}: before or after year 0`}
          onChange={(e) => emit({ ...parts, before: e.target.value === 'before' })}
        >
          <option value="after">{sideName(calendar.after, 'year 0 or later')}</option>
          <option value="before">{sideName(calendar.before, 'before year 0')}</option>
        </select>
      </span>
    );
  }

  if (parts.type === 'ages' && calendar.type === 'ages') {
    const { ages } = calendar;
    const before = parts.age < 0;
    const isLast = parts.age === ages.length - 1;
    // Clamp the year when moving to a shorter age
    const changeAge = (age: number) => {
      if (age < 0) return emit({ ...parts, age, year: 1 });
      const max = age === ages.length - 1 ? Infinity : ages[age].length;
      if (isPeriod) return onChange(joinKey({ type: 'ages', age, year: 1 }, calendar), true);
      emit({ ...parts, age, year: Math.min(before ? 1 : parts.year, max) });
    };
    return (
      <span className="inline-inputs">
        <select value={parts.age} aria-label={`${label}: age`} onChange={(e) => changeAge(Number(e.target.value))}>
          {ages[0] && <option value={-1}>Before the {ages[0].name}</option>}
          {ages.map((age, i) => (
            <option key={i} value={i}>{age.name}</option>
          ))}
        </select>
        <NumberInput
          className="w-md"
          value={isPeriod ? undefined : parts.year}
          min={1}
          max={before || isLast ? undefined : ages[parts.age].length}
          allowEmpty={periodAllowed && !before}
          placeholder={periodAllowed ? 'year?' : undefined}
          aria-label={before ? `${label}: years before` : `${label}: year${periodAllowed ? ' (leave empty if unknown)' : ''}`}
          onChange={(year) => emitYear(year, parts)}
        />
        {before && <span className="muted">years before</span>}
      </span>
    );
  }

  if (parts.type === 'cycles' && calendar.type === 'cycles') {
    const before = parts.cycle === 0;
    const firstCycle = fill(calendar.cycleFormat, { cycle: 1 });
    const width = String(calendar.length - 1).length;
    const { yearFirst, between } = cycleLayout(calendar.format);

    const yearBox = (
      <NumberInput
        key="year"
        className="w-sm"
        value={isPeriod ? undefined : parts.year}
        min={0}
        max={calendar.length - 1}
        allowEmpty={periodAllowed}
        placeholder={periodAllowed ? '?'.repeat(width) : undefined}
        aria-label={`${label}: year${periodAllowed ? ' (leave empty if unknown)' : ''}`}
        onChange={(year) => emitYear(year, parts)}
      />
    );
    const cycleBox = (
      <NumberInput
        key="cycle"
        className="w-sm"
        value={parts.cycle}
        min={1}
        aria-label={`${label}: cycle`}
        onChange={(cycle) => {
          if (cycle === undefined) return;
          if (isPeriod) onChange(joinKey({ ...parts, cycle, year: 0 }, calendar), true);
          else emit({ ...parts, cycle });
        }}
      />
    );

    return (
      <span className="inline-inputs wrap">
        {before ? (
          // Grouped so the boxes never wrap apart on narrow screens
          <span className="inline-inputs">
            <NumberInput className="w-lg" value={parts.year} min={1} aria-label={`${label}: years before ${firstCycle}`} onChange={(year) => year !== undefined && emit({ ...parts, year })} />
            <span className="muted">years before {firstCycle}</span>
          </span>
        ) : (
          <span className="inline-inputs">
            {yearFirst ? yearBox : cycleBox}
            <span className="muted">{between}</span>
            {yearFirst ? cycleBox : yearBox}
          </span>
        )}
        <label className="check">
          <input
            type="checkbox"
            checked={before}
            onChange={(e) => emit(e.target.checked ? { ...parts, cycle: 0, year: calendar.length } : { ...parts, cycle: 1, year: 0 })}
          />{' '}
          Before {firstCycle}
        </label>
      </span>
    );
  }

  // Free-text calendar: the number only sets the order
  return <NumberInput className="w-md" value={value} aria-label={`${label}: order number`} onChange={(n) => n !== undefined && onChange(n, false)} />;
}

// ---------- SortKeyInput ----------

interface SortKeyProps {
  label: string;
  calendar: Calendar;
  value: number;
  onChange: (value: number) => void;
  error?: string;
}

export function SortKeyInput({ label, calendar, value, onChange, error }: SortKeyProps) {
  return (
    <Field
      label={label}
      group
      error={error}
      hint={calendar.type === 'freeform' ? 'An ordering number' : `Shows as: ${formatKey(value, calendar)}`}
    >
      <CalendarFields calendar={calendar} value={value} label={label} onChange={(v) => onChange(v)} />
    </Field>
  );
}

// ---------- DateInput ----------

const PRECISION_LABELS: Record<Exclude<DatePrecision, 'period'>, string> = {
  exact: 'Exact',
  circa: 'Approximate',
  decade: 'Within a decade',
  century: 'Within a century',
  millennium: 'Within a millennium',
};

interface DateProps {
  value: EventDate;
  calendar: Calendar;
  onChange: (date: EventDate) => void;
  error?: string;
  /** The field's label. Default "Date". */
  label?: string;
}

export function DateInput({ value, calendar, onChange, error, label = 'Date' }: DateProps) {
  const { sortKey, precision } = value;
  const freeformCalendar = calendar.type === 'freeform';
  const textMode = freeformCalendar || value.label !== undefined;
  const isPeriod = precision === 'period';

  function changeMode(mode: 'calendar' | 'text') {
    if (mode === 'text') {
      // Start the label from what the calendar showed
      onChange({ sortKey, precision: isPeriod ? 'exact' : precision, label: formatDate(value, calendar) });
    } else {
      onChange({ sortKey, precision }); // no label: the calendar labels it
    }
  }

  const hint = !textMode
    ? `Shows as: ${formatDate(value, calendar)}`
    : freeformCalendar
      ? 'The number only sets the order.'
      : `The number only sets the order. It's where ${formatKey(sortKey, calendar)} would be.`;

  return (
    <Field label={label} group error={error} hint={hint}>
      <div className="inline-inputs wrap">
        {!freeformCalendar && (
          <select value={textMode ? 'text' : 'calendar'} aria-label={`${label}: type`} onChange={(e) => changeMode(e.target.value as 'calendar' | 'text')}>
            <option value="calendar">Calendar date</option>
            <option value="text">Free text</option>
          </select>
        )}

        {textMode ? (
          <>
            <input
              value={value.label ?? ''}
              placeholder="Time immemorial"
              aria-label={`${label}: text`}
              onChange={(e) => onChange({ ...value, label: e.target.value })}
            />
            <NumberInput
              className="w-md"
              value={sortKey}
              aria-label={`${label}: order number`}
              title="Order number"
              onChange={(n) => n !== undefined && onChange({ ...value, sortKey: n })}
            />
          </>
        ) : (
          <>
            <CalendarFields
              calendar={calendar}
              value={sortKey}
              label={label}
              periodAllowed={supportsPeriod(calendar)}
              isPeriod={isPeriod}
              onChange={(key, period) => onChange({ sortKey: key, precision: period ? 'period' : isPeriod ? 'exact' : precision })}
            />
          </>
        )}

        {/* Approximate dates get "c." (calendar dates only) and a hollow node */}
        <select
          value={isPeriod ? 'exact' : precision}
          aria-label={label === 'Date' ? 'Precision' : `${label}: precision`}
          disabled={isPeriod && !textMode}
          title={isPeriod && !textMode ? 'Only the period is known' : undefined}
          onChange={(e) => onChange({ ...value, precision: e.target.value as DatePrecision })}
        >
          {(Object.keys(PRECISION_LABELS) as (keyof typeof PRECISION_LABELS)[]).map((p) => (
            <option key={p} value={p}>{PRECISION_LABELS[p]}</option>
          ))}
        </select>
      </div>
    </Field>
  );
}
