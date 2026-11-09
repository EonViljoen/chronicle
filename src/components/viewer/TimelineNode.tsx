import type { CSSProperties, Ref } from 'react';
import type { TimelineEvent } from '../../types/timeline';

interface Props {
  event: TimelineEvent;
  index: number;
  color: string;
  selected: boolean;
  dimmed: boolean;
  onSelect: (id: string) => void;
  ref: Ref<HTMLButtonElement>;
}

/**
 * One circle on the line, with the date above and the title below.
 * In React 19 `ref` is a normal prop, so the parent can grab this button
 * to scroll it into view.
 */
export default function TimelineNode({ event, index, color, selected, dimmed, onSelect, ref }: Props) {
  const approximate = event.date.precision !== 'exact';
  const classes = ['node', selected && 'is-selected', dimmed && 'is-dimmed', approximate && 'is-approx']
    .filter(Boolean)
    .join(' ');

  return (
    <button
      ref={ref}
      className={classes}
      // CSS custom properties: the stylesheet positions the node with --i
      style={{ '--i': index, '--node-color': color } as CSSProperties}
      onClick={() => onSelect(event.id)}
      aria-pressed={selected}
      title={event.summary || event.title}
    >
      <span className="node-date">{approximate ? `c. ${event.date.display}` : event.date.display}</span>
      <span className="node-dot" aria-hidden="true" />
      <span className="node-title">{event.title}</span>
    </button>
  );
}
