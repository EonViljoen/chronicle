import { Link, useParams } from 'react-router-dom';
import type { Timeline } from '../types/timeline';
import TimelineGate from '../components/TimelineGate';
import RichText from '../components/RichText';
import HistoryHead from '../components/history/HistoryHead';
import HistoryMap from '../components/history/HistoryMap';
import MentionedIn from '../components/history/MentionedIn';
import Chronology from '../components/history/Chronology';
import { eventEntries } from '../components/history/entries';
import { CharacterChip, FactionChip, FactionMark, MissingItem } from '../components/history/Chips';
import { useFactionTheme } from '../components/useFactionTheme';
import { useThemeOverride } from '../components/themeOverride';
import { membersOf } from '../lib/characters';
import { ancestry, mainFactionOf, withDescendants } from '../lib/factions';
import { RELATION_KINDS, relationDates, relationLabel, relationsOf } from '../lib/relations';

export default function FactionPage() {
  return <TimelineGate>{(timeline) => <FactionView timeline={timeline} />}</TimelineGate>;
}

/**
 * A faction's history: every event it (or a sub-faction) is in, in order,
 * its people, and the places it was at on the maps. The page takes on the
 * faction's theme.
 */
function FactionView({ timeline }: { timeline: Timeline }) {
  const { itemId } = useParams();
  const faction = timeline.factions.find((f) => f.id === itemId);
  const themeOf = useFactionTheme(timeline);
  useThemeOverride(themeOf(faction?.id));
  if (!faction) return <MissingItem timeline={timeline} kind="faction" />;

  const ids = withDescendants(faction.id, timeline.factions);
  const events = timeline.events.filter((e) => e.factionIds.some((id) => ids.has(id)));
  const parents = ancestry(faction.id, timeline.factions).slice(0, -1);
  const children = timeline.factions.filter((f) => f.parentId === faction.id).sort((a, b) => a.name.localeCompare(b.name));
  const members = membersOf(faction.id, timeline);
  const nameOf = (id: string) => timeline.factions.find((f) => f.id === id)?.name;
  const relations = relationsOf(faction.id, timeline);

  return (
    <div className="page history-page">
      <HistoryHead
        timeline={timeline}
        kind="Faction"
        title={faction.name}
        editSearch={`?tab=factions&item=${encodeURIComponent(faction.id)}`}
        aside={<FactionMark faction={faction} big />}
      >
        {parents.length > 0 && (
          <p className="history-life">
            Part of{' '}
            {parents.map((p, i) => (
              <span key={p.id}>
                {i > 0 && ' › '}
                <Link to={`/t/${timeline.id}/factions/${encodeURIComponent(p.id)}`}>{p.name}</Link>
              </span>
            ))}
          </p>
        )}
      </HistoryHead>

      <div className="history-columns">
        <div className="history-main">
          {faction.description && (
            <div className="prose history-section">
              <RichText text={faction.description} timeline={timeline} />
            </div>
          )}
          <section className="history-section">
            <h2 className="history-heading">History</h2>
            <Chronology
              entries={eventEntries(events, timeline, (e) => {
                // Say when it's a sub-faction's event, or when the faction led it
                const main = mainFactionOf(e);
                const via = e.factionIds.find((id) => ids.has(id) && id !== faction.id);
                const notes = [
                  main === faction.id ? '★ Main faction' : main && ids.has(main) && `★ Led by ${nameOf(main)}`,
                  !e.factionIds.includes(faction.id) && via && !(main && ids.has(main)) && `Through ${nameOf(via)}`,
                  e.summary,
                ].filter(Boolean);
                return notes.length ? notes.join(' · ') : undefined;
              })}
              eras={timeline.eras}
              empty="No events for this faction yet."
            />
          </section>
        </div>

        <aside className="history-side">
          {children.length > 0 && (
            <section className="history-section">
              <h2 className="history-heading">Sub-factions</h2>
              <div className="chips">
                {children.map((f) => <FactionChip key={f.id} timeline={timeline} faction={f} />)}
              </div>
            </section>
          )}
          {relations.length > 0 && (
            <section className="history-section">
              <h2 className="history-heading">Relations</h2>
              <ul className="relation-list is-compact">
                {relations.map(({ relation: r, otherId, isFrom }) => {
                  const other = timeline.factions.find((f) => f.id === otherId);
                  const dates = relationDates(r, timeline);
                  return (
                    <li key={r.id} className="relation-row">
                      <span className="relation-key" style={{ background: RELATION_KINDS[r.kind].color }} aria-hidden="true" />
                      <span>{relationLabel(r, isFrom)}</span> {other && <FactionChip timeline={timeline} faction={other} />}
                      {dates && <span className="muted"> {dates}</span>}
                    </li>
                  );
                })}
              </ul>
              <Link className="link-btn" to={`/t/${timeline.id}/relations`}>All relations →</Link>
            </section>
          )}
          <section className="history-section">
            <h2 className="history-heading">People</h2>
            {members.length === 0 ? (
              <p className="muted">No characters in this faction yet.</p>
            ) : (
              <div className="chips">
                {members.map((c) => <CharacterChip key={c.id} timeline={timeline} character={c} />)}
              </div>
            )}
          </section>
          <MentionedIn timeline={timeline} kind="faction" id={faction.id} />
        </aside>
      </div>

      <HistoryMap timeline={timeline} placeIds={[...new Set(events.flatMap((e) => e.placeIds))]} />
    </div>
  );
}
