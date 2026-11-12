import { useId, useState } from 'react';
import Markdown from 'react-markdown';
import type { Timeline } from '../../types/timeline';
import { brokenLinks } from '../../lib/links';
import { brokenCitations } from '../../lib/citations';
import RichText from '../RichText';

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Turns on [[links]]: the preview follows them and broken ones are listed. */
  timeline?: Timeline;
  rows?: number;
  /** Turns on [^1] citations: how many sources there are to cite. */
  sourceCount?: number;
}

/** A textarea with a Write / Preview toggle. */
export default function MarkdownField({ label, value, onChange, timeline, rows = 10, sourceCount }: Props) {
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const labelId = useId(); // a unique id, safe even if this field appears twice
  const broken = timeline ? brokenLinks(value, timeline) : [];
  const badCites = sourceCount === undefined ? [] : brokenCitations(value, sourceCount);

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
        <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} aria-labelledby={labelId} />
      ) : (
        <div className="prose md-preview">
          {!value.trim() ? (
            <p className="muted">Nothing to preview.</p>
          ) : timeline ? (
            <RichText text={value} timeline={timeline} citations={sourceCount === undefined ? undefined : { prefix: 'preview-source', count: sourceCount }} />
          ) : (
            <Markdown>{value}</Markdown>
          )}
        </div>
      )}
      {broken.length > 0 && (
        <span className="field-error">
          Nothing is called {broken.map((b) => `"${b}"`).join(', ')}, so {broken.length === 1 ? 'that link goes' : 'those links go'} nowhere yet.
        </span>
      )}
      {badCites.length > 0 && (
        <span className="field-error">
          {badCites.map((n) => `[^${n}]`).join(', ')} {badCites.length === 1 ? 'cites a source' : 'cite sources'} that {badCites.length === 1 ? "isn't" : "aren't"} listed: there {sourceCount === 1 ? 'is' : 'are'} {sourceCount} source{sourceCount === 1 ? '' : 's'}.
        </span>
      )}
      <span className="field-hint">
        Markdown: **bold**, *italic*, - lists, [links](https://…), blank line for a new paragraph.
        {timeline && <> [[Name]] links to an event, character, place, faction or lore page; [[Name|other text]] shows other text; [[place:Name]] picks the kind.</>}
        {sourceCount !== undefined && <> [^1] cites the first source.</>}
      </span>
    </div>
  );
}
