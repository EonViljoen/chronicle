import { useParams } from 'react-router-dom';
import type { Timeline } from '../types/timeline';
import TimelineGate from '../components/TimelineGate';
import RichText from '../components/RichText';
import HistoryHead from '../components/history/HistoryHead';
import HistoryMap from '../components/history/HistoryMap';
import Chronology from '../components/history/Chronology';
import LifeStrip from '../components/history/LifeStrip';
import { eventEntries, type ChronologyEntry } from '../components/history/entries';
import { CharacterChip, FactionChip, MissingItem } from '../components/history/Chips';
import { useFactionTheme } from '../components/useFactionTheme';
import { useThemeOverride } from '../components/themeOverride';
import { ageAt, eventsOf } from '../lib/characters';
import { formatDate } from '../lib/dates';

export default function CharacterPage() {
  return <TimelineGate>{(timeline) => <CharacterView timeline={timeline} />}</TimelineGate>;
}

/** A character's page: who they are, their feats, and their life on the timeline. */
function CharacterView({ timeline }: { timeline: Timeline }) {
  const { itemId } = useParams();
  const character = timeline.characters.find((c) => c.id === itemId);
  // Their faction's theme, like the viewer does for an event's main faction
  const themeOf = useFactionTheme(timeline);
  useThemeOverride(themeOf(character?.factionId));
  if (!character) return <MissingItem timeline={timeline} kind="character" />;

  const { calendar } = timeline;
  const faction = timeline.factions.find((f) => f.id === character.factionId);
  const events = eventsOf(character.id, timeline.events);

  // Their life: born, each event, died
  const entries: ChronologyEntry[] = [
    ...(character.born ? [{ key: 'born', sortKey: character.born.sortKey, date: formatDate(character.born, calendar), title: 'Born', marker: true }] : []),
    ...eventEntries(events, timeline),
    ...(character.died
      ? [{ key: 'died', sortKey: character.died.sortKey, date: formatDate(character.died, calendar), title: 'Died', marker: true, note: ageAt(character, calendar) && `Aged ${ageAt(character, calendar)}` }]
      : []),
  ];
  // People they shared events with
  const alongside = timeline.characters
    .filter((c) => c.id !== character.id && events.some((e) => e.characterIds.includes(c.id)))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="page history-page">
      <HistoryHead
        timeline={timeline}
        kind="Character"
        title={character.name}
        editSearch={`?tab=characters&item=${encodeURIComponent(character.id)}`}
        aside={
          character.imageUrl ? (
            <img className="character-portrait" src={character.imageUrl} alt="" />
          ) : (
            <div className="character-portrait is-empty" aria-hidden="true">{character.name.trim()[0]?.toUpperCase() ?? '?'}</div>
          )
        }
      >
        <div className="chips">
          {faction ? <FactionChip timeline={timeline} faction={faction} /> : <span className="chip">Independent</span>}
        </div>
        {(character.born || character.died) && (
          <p className="history-life">
            {character.born && <>Born {formatDate(character.born, calendar)}</>}
            {character.born && character.died && ' · '}
            {character.died && <>Died {formatDate(character.died, calendar)}</>}
            {ageAt(character, calendar) && <span className="muted"> · lived {ageAt(character, calendar)}</span>}
          </p>
        )}
      </HistoryHead>

      <div className="history-columns">
        <div className="history-main">
          {character.description && (
            <div className="prose history-section">
              <RichText text={character.description} timeline={timeline} />
            </div>
          )}

          <section className="history-section">
            <h2 className="history-heading">Life on the timeline</h2>
            <LifeStrip entries={entries} eras={timeline.eras} />
            <Chronology entries={entries} eras={timeline.eras} empty="They aren't in any events yet." />
          </section>
        </div>

        <aside className="history-side">
          {character.feats.length > 0 && (
            <section className="history-section">
              <h2 className="history-heading">Feats</h2>
              <ul className="feats">
                {character.feats.map((f, i) => (
                  <li key={i}>
                    <strong className="feat-name">{f.name}</strong>
                    {f.description && (
                      <div className="prose feat-text">
                        <RichText text={f.description} timeline={timeline} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {alongside.length > 0 && (
            <section className="history-section">
              <h2 className="history-heading">Alongside</h2>
              <div className="chips">
                {alongside.map((c) => <CharacterChip key={c.id} timeline={timeline} character={c} />)}
              </div>
            </section>
          )}
        </aside>
      </div>

      <HistoryMap timeline={timeline} placeIds={[...new Set(events.flatMap((e) => e.placeIds))]} />
    </div>
  );
}
