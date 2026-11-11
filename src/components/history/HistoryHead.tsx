import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Timeline } from '../../types/timeline';
import { EditOnly } from '../EditOnly';

interface Props {
  timeline: Timeline;
  /** "Character", "Place", "Faction": shown above the name. */
  kind: string;
  title: string;
  /** The editor address for this item, e.g. "?tab=places&item=x". */
  editSearch: string;
  /** Extra lines under the title. */
  children?: ReactNode;
  /** Shown left of the title (a portrait, a swatch). */
  aside?: ReactNode;
}

/** The top of a character, place or faction page. */
export default function HistoryHead({ timeline, kind, title, editSearch, children, aside }: Props) {
  return (
    <header className="history-head">
      {aside}
      <div className="history-head-main">
        <p className="history-kind">{kind}</p>
        <h1 className="history-title">{title}</h1>
        {children}
      </div>
      <div className="page-head-actions">
        <Link className="btn" to={`/t/${timeline.id}`}>Timeline</Link>
        <EditOnly>
          <Link className="btn" to={`/t/${timeline.id}/edit${editSearch}`}>Edit</Link>
        </EditOnly>
      </div>
    </header>
  );
}
