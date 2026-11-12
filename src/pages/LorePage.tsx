import { Link, useParams } from 'react-router-dom';
import type { Timeline } from '../types/timeline';
import TimelineGate from '../components/TimelineGate';
import RichText from '../components/RichText';
import SourceList from '../components/SourceList';
import HistoryHead from '../components/history/HistoryHead';
import Chronology from '../components/history/Chronology';
import MentionedIn from '../components/history/MentionedIn';
import { eventEntries } from '../components/history/entries';
import { MissingItem } from '../components/history/Chips';
import { backlinks } from '../lib/links';

export default function LorePage() {
  return <TimelineGate>{(timeline) => <LoreView timeline={timeline} />}</TimelineGate>;
}

/** A lore page: its text and sources, the events that mention it, and everything else that links here. */
function LoreView({ timeline }: { timeline: Timeline }) {
  const { itemId } = useParams();
  const page = timeline.lore.find((p) => p.id === itemId);
  if (!page) return <MissingItem timeline={timeline} kind="lore page" />;

  // Events that link here, in date order
  const eventIds = new Set(backlinks(timeline, 'lore', page.id).filter((b) => b.kind === 'event').map((b) => b.id));
  const events = timeline.events.filter((e) => eventIds.has(e.id));
  const prefix = `source-lore-${page.id}`;

  return (
    <div className="page history-page">
      <HistoryHead timeline={timeline} kind={page.category || 'Lore'} title={page.title} editSearch={`?tab=lore&item=${encodeURIComponent(page.id)}`}>
        <p className="history-life">
          <Link to={`/t/${timeline.id}/lore`}>All lore</Link>
        </p>
      </HistoryHead>

      <div className="history-columns">
        <div className="history-main">
          {page.imageUrl && <img className="lore-image" src={page.imageUrl} alt="" />}
          <div className="prose history-section">
            {page.body ? <RichText text={page.body} timeline={timeline} citations={{ prefix, count: page.sources.length }} /> : <p className="muted">Nothing written yet.</p>}
          </div>
          <SourceList timeline={timeline} sources={page.sources} text={page.body} prefix={prefix} className="history-section lore-sources" />
          {events.length > 0 && (
            <section className="history-section">
              <h2 className="history-heading">On the timeline</h2>
              <Chronology entries={eventEntries(events, timeline)} eras={timeline.eras} empty="" />
            </section>
          )}
        </div>
        <aside className="history-side">
          <MentionedIn timeline={timeline} kind="lore" id={page.id} skip={['event']} />
        </aside>
      </div>
    </div>
  );
}
