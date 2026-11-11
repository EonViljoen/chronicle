import type { Timeline } from '../../types/timeline';
import { calendarError, compareEvents } from '../../lib/dates';
import { updateTimeline } from '../../db/timelines';
import CalendarSettings from './CalendarSettings';
import FormActions from './FormActions';
import { useDraft } from './useDraft';

/** Preview dates for a timeline with no events yet. */
const SAMPLE_KEYS: Record<Timeline['calendar']['type'], number[]> = {
  years: [-500, 1066],
  ages: [-99, 1, 1500, 4000],
  cycles: [-60_000_000, 30_005, 40_999],
  freeform: [],
};

interface Props {
  timeline: Timeline;
  onDirtyChange: (dirty: boolean) => void;
}

/**
 * The editor's Calendar tab: how dates are counted and labelled. Changing it
 * relabels every date at once (dates are stored as numbers, see lib/dates.ts),
 * so it's a draft with a preview until you press Save.
 */
export default function CalendarTab({ timeline, onDirtyChange }: Props) {
  const save = async (calendar: Timeline['calendar']) => {
    await updateTimeline(timeline.id, (t) => ({ ...t, calendar }));
    onDirtyChange(false);
  };
  const { draft, patch, dirty, saving, submit, reset } = useDraft({ calendar: timeline.calendar }, (d) => save(d.calendar), onDirtyChange);

  // Preview the calendar on the first, middle and last events
  const sorted = [...timeline.events].sort(compareEvents);
  const picks = sorted.length ? [sorted[0], sorted[Math.floor(sorted.length / 2)], sorted[sorted.length - 1]] : [];
  const sampleKeys = picks.length ? picks.map((e) => e.date.sortKey) : SAMPLE_KEYS[draft.calendar.type];

  return (
    <form className="form calendar-tab" onSubmit={(e) => submit(e)}>
      <div>
        <h2 className="form-title">Calendar</h2>
        <p className="muted">How this timeline counts and shows its dates.</p>
      </div>

      <CalendarSettings value={draft.calendar} onChange={(calendar) => patch({ calendar })} sampleKeys={sampleKeys} />

      <FormActions isNew={false} dirty={dirty} valid={!calendarError(draft.calendar)} saving={saving} onRevert={reset} />
    </form>
  );
}
