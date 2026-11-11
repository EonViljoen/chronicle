import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { Character, Faction, Place, Timeline } from '../../types/timeline';
import { factionPath } from '../../lib/factions';

/*
 * Chips that open a character's, faction's or place's page. Used on those
 * pages and in the viewer's event panel.
 */

const pageOf = (timeline: Timeline, kind: 'characters' | 'factions' | 'places', id: string) =>
  `/t/${timeline.id}/${kind}/${encodeURIComponent(id)}`;

/**
 * A faction's picture if it has one, else its colour swatch. `big` is the
 * size used at the top of its page.
 */
export function FactionMark({ faction, big = false, style }: { faction: Pick<Faction, 'color' | 'imageUrl'>; big?: boolean; style?: CSSProperties }) {
  if (faction.imageUrl) return <img className={`faction-mark${big ? ' is-big' : ''}`} src={faction.imageUrl} alt="" style={{ borderColor: faction.color, ...style }} />;
  return <span className={big ? 'history-swatch' : 'swatch'} style={{ background: faction.color, ...style }} aria-hidden="true" />;
}

export function CharacterChip({ timeline, character }: { timeline: Timeline; character: Character }) {
  const color = timeline.factions.find((f) => f.id === character.factionId)?.color;
  return (
    <Link className="chip chip-link chip-character" to={pageOf(timeline, 'characters', character.id)} style={color ? { borderColor: color } : undefined}>
      {character.imageUrl ? <img className="chip-portrait" src={character.imageUrl} alt="" /> : <span aria-hidden="true">☺</span>} {character.name}
    </Link>
  );
}

export function FactionChip({ timeline, faction, main = false }: { timeline: Timeline; faction: Faction; main?: boolean }) {
  return (
    <Link
      className={`chip chip-link${main ? ' is-primary' : ''}`}
      to={pageOf(timeline, 'factions', faction.id)}
      style={{ borderColor: faction.color }}
      title={`${factionPath(faction.id, timeline.factions)}${main ? ' (main faction)' : ''}`}
    >
      <FactionMark faction={faction} /> {main && <span aria-hidden="true">★</span>} {faction.name}
      {main && <span className="sr-only">(main faction)</span>}
    </Link>
  );
}

export function PlaceChip({ timeline, place }: { timeline: Timeline; place: Place }) {
  return (
    <Link className="chip chip-place chip-link" to={pageOf(timeline, 'places', place.id)}>⌖ {place.name}</Link>
  );
}

/** For an id that's no longer there (an old link, a deleted item). */
export function MissingItem({ timeline, kind }: { timeline: Timeline; kind: string }) {
  return (
    <div className="empty">
      <p>There's no {kind} like that in this timeline. It may have been deleted.</p>
      <Link className="btn" to={`/t/${timeline.id}`}>Back to the timeline</Link>
    </div>
  );
}
