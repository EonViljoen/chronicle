import type { Timeline } from '../types/timeline';
import { citedSources } from '../lib/citations';
import RichText from './RichText';

interface Props {
  timeline: Timeline;
  sources: string[];
  /** The text that cites them, to mark sources nothing cites. */
  text: string;
  /** Each source gets the id `${prefix}-1`, `${prefix}-2`…, which citations jump to. */
  prefix: string;
  /** "Sources" heading level and class come from where it's used. */
  className?: string;
}

/**
 * An event's or lore page's sources, numbered so [^1] in the text can point
 * at them. Each source is Markdown, so [a title](https://…) is a link.
 */
export default function SourceList({ timeline, sources, text, prefix, className = 'event-panel-section' }: Props) {
  if (sources.length === 0) return null;
  const cited = citedSources(text);
  return (
    <section className={className}>
      <h3>Sources</h3>
      <ol className="sources">
        {sources.map((s, i) => (
          <li key={i} id={`${prefix}-${i + 1}`} className={cited.has(i + 1) ? 'is-cited' : undefined}>
            <RichText text={s} timeline={timeline} />
          </li>
        ))}
      </ol>
    </section>
  );
}
