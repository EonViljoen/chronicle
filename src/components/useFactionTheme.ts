import type { Theme } from '../types/theme';
import type { Timeline } from '../types/timeline';
import { factionThemeId } from '../lib/factions';
import { useThemes } from '../db/themes';
import { normalizeTheme } from '../themes';

/**
 * Returns a lookup for a faction's theme: its own, else its nearest
 * parent's (factionThemeId), else null for "keep the timeline's".
 * A published timeline brings its own copies (themeDefs); otherwise this
 * browser's library is used. Copies in files may be from an older version,
 * so missing options are filled in.
 */
export function useFactionTheme(timeline: Timeline): (factionId: string | undefined) => Theme | null {
  const library = useThemes();
  return (factionId) => {
    const id = factionId ? factionThemeId(factionId, timeline.factions) : undefined;
    const found = id ? [...(timeline.themeDefs ?? []), ...library].find((t) => t.id === id) : undefined;
    return found ? normalizeTheme(found) : null;
  };
}
