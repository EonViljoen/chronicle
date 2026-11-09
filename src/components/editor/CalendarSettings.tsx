import type { Age, Calendar, CalendarType } from '../../types/timeline';
import { CALENDAR_PRESETS, calendarError, formatKey } from '../../lib/dates';
import Field from '../form/Field';
import NumberInput from '../form/NumberInput';

const TYPE_NAMES: Record<CalendarType, string> = {
  years: 'years',
  ages: 'named ages',
  cycles: 'numbered cycles',
  freeform: 'free text',
};

interface Props {
  value: Calendar;
  onChange: (calendar: Calendar) => void;
  /** Dates to preview the calendar with, e.g. a few of the timeline's events. */
  sampleKeys: number[];
}

/** The calendar part of the Settings form: a preset picker, then the chosen type's own fields. */
export default function CalendarSettings({ value, onChange, sampleKeys }: Props) {
  // Comparing as JSON is a simple way to spot "exactly a preset"
  const presetIndex = CALENDAR_PRESETS.findIndex((p) => JSON.stringify(p.calendar) === JSON.stringify(value));
  const error = calendarError(value);
  const samples = [...new Set(sampleKeys.map((k) => formatKey(k, value)))];

  return (
    <fieldset className="calendar-settings">
      <legend>Calendar</legend>

      <Field label="Start from" hint="Changing the calendar relabels every date. The order of events never changes.">
        <select
          value={presetIndex}
          // structuredClone: a deep copy, so editing the timeline's calendar never changes the preset itself
          onChange={(e) => onChange(structuredClone(CALENDAR_PRESETS[Number(e.target.value)].calendar))}
        >
          {presetIndex === -1 && <option value={-1}>Custom {TYPE_NAMES[value.type]}</option>}
          {CALENDAR_PRESETS.map((p, i) => (
            <option key={p.name} value={i}>{p.name}</option>
          ))}
        </select>
      </Field>

      {value.type === 'years' && (
        <div className="field-row">
          <Field label="Before year 0" hint="{n} is the number of years">
            <input value={value.before} onChange={(e) => onChange({ ...value, before: e.target.value })} />
          </Field>
          <Field label="Year 0 and after">
            <input value={value.after} onChange={(e) => onChange({ ...value, after: e.target.value })} />
          </Field>
        </div>
      )}

      {value.type === 'cycles' && (
        <>
          <div className="field-row">
            <Field label="Years per cycle">
              <NumberInput value={value.length} min={2} onChange={(length) => length !== undefined && onChange({ ...value, length })} />
            </Field>
            <Field label="Date format" hint="{year} and {cycle}">
              <input value={value.format} onChange={(e) => onChange({ ...value, format: e.target.value })} />
            </Field>
          </div>
          <div className="field-row">
            <Field label="Only the cycle known" hint="{cycle}">
              <input value={value.cycleFormat} onChange={(e) => onChange({ ...value, cycleFormat: e.target.value })} />
            </Field>
            <Field label="Before cycle 1" hint="{n} is the number of years">
              <input value={value.before} onChange={(e) => onChange({ ...value, before: e.target.value })} />
            </Field>
          </div>
        </>
      )}

      {value.type === 'ages' && <AgesFields value={value} onChange={onChange} />}

      {value.type === 'freeform' && <p className="muted">Each event gets its own date label and an order number.</p>}

      {error ? (
        <p className="field-error" role="alert">{error}</p>
      ) : (
        value.type !== 'freeform' && samples.length > 0 && <p className="field-note calendar-samples">Examples: {samples.join(' · ')}</p>
      )}
    </fieldset>
  );
}

type AgesCalendar = Extract<Calendar, { type: 'ages' }>;

function AgesFields({ value, onChange }: { value: AgesCalendar; onChange: (c: Calendar) => void }) {
  const setAges = (ages: Age[]) => onChange({ ...value, ages });
  const patchAge = (i: number, changes: Partial<Age>) => setAges(value.ages.map((a, j) => (j === i ? { ...a, ...changes } : a)));

  return (
    <>
      <Field label="Date format" hint="{age} is the short label, {name} the full name, {year} the year in that age">
        <input value={value.format} onChange={(e) => onChange({ ...value, format: e.target.value })} />
      </Field>

      <div className="ages" role="group" aria-label="Ages, in order">
        <div className="age-row age-head" aria-hidden="true">
          <span>Age</span>
          <span>Short</span>
          <span>Years</span>
          <span />
        </div>
        {value.ages.map((age, i) => {
          const last = i === value.ages.length - 1;
          return (
            // Index keys are fine here: rows are only added at the end or removed
            <div className="age-row" key={i}>
              <input value={age.name} aria-label={`Age ${i + 1}: name`} onChange={(e) => patchAge(i, { name: e.target.value })} />
              <input value={age.short} aria-label={`Age ${i + 1}: short label`} onChange={(e) => patchAge(i, { short: e.target.value })} />
              {last ? (
                <span className="muted age-open" title="The last age has no end">open-ended</span>
              ) : (
                <NumberInput value={age.length} min={1} aria-label={`Age ${i + 1}: length in years`} onChange={(length) => length !== undefined && patchAge(i, { length })} />
              )}
              <button
                type="button"
                className="btn"
                aria-label={`Remove ${age.name || `age ${i + 1}`}`}
                disabled={value.ages.length === 1}
                onClick={() => setAges(value.ages.filter((_, j) => j !== i))}
              >
                ×
              </button>
            </div>
          );
        })}
        <button type="button" className="btn add-age" onClick={() => setAges([...value.ages, { name: '', short: '', length: 1000 }])}>
          + Add age
        </button>
        <p className="field-hint">Years in each age start at 1. Changing a length relabels dates in the ages after it.</p>
      </div>
    </>
  );
}
