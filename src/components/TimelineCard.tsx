import { Link } from 'react-router-dom';
import type { Timeline } from '../types/timeline';
import { copyToBrowser, deleteTimeline, duplicateTimeline, exportTimeline } from '../db/timelines';
import { brand } from '../brand';

/*
 * Props are the inputs to a component. This one gets a whole timeline and
 * an `onError` callback so the parent page decides how errors are shown.
 */
interface Props {
  timeline: Timeline;
  onError: (message: string) => void;
  /** Published by the site: view, export or copy, but not edit. */
  published?: boolean;
}

export default function TimelineCard({ timeline, onError, published = false }: Props) {
  const handleDuplicate = () => duplicateTimeline(timeline.id).catch((e: Error) => onError(e.message));
  const handleCopy = () => copyToBrowser(timeline).catch((e: Error) => onError(e.message));

  const handleDelete = () => {
    if (window.confirm(`Delete "${timeline.title}"? Export it first if you want a backup.`)) {
      deleteTimeline(timeline.id).catch((e: Error) => onError(e.message));
    }
  };

  return (
    <article className="card">
      {/* Era colours as a strip, a quick visual fingerprint of the timeline */}
      <div className="card-eras" aria-hidden="true">
        {timeline.eras.map((era) => (
          <span key={era.id} style={{ background: era.color }} />
        ))}
      </div>

      <h2 className="card-title">
        <Link to={`/t/${timeline.id}`}>{timeline.title}</Link>
      </h2>
      {timeline.description && <p className="card-desc">{timeline.description}</p>}

      <p className="card-meta">
        {timeline.events.length} events · {timeline.eras.length} eras
        {/* Hand-made files may have no real date (0 = 1 January 1970) */}
        {timeline.updatedAt > 0 && ` · ${published ? 'updated' : 'edited'} ${new Date(timeline.updatedAt).toLocaleDateString()}`}
      </p>

      <div className="card-actions">
        <Link className="btn btn-primary" to={`/t/${timeline.id}`}>View</Link>
        {published ? (
          <>
            <button className="btn" onClick={() => exportTimeline(timeline)}>Export</button>
            {/* An editable copy only makes sense where people can edit */}
            {!brand.readOnly && <button className="btn" onClick={handleCopy}>Make an editable copy</button>}
          </>
        ) : (
          <>
            <Link className="btn" to={`/t/${timeline.id}/edit`}>Edit</Link>
            <button className="btn" onClick={() => exportTimeline(timeline)}>Export</button>
            <button className="btn" onClick={handleDuplicate}>Duplicate</button>
            <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
          </>
        )}
      </div>
    </article>
  );
}
