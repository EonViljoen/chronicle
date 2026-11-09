/*
 * The fonts a theme can use. Each one is either built in to the device
 * (`google` unset) or loaded from Google Fonts when a theme picks it.
 */
export interface FontChoice {
  name: string;
  /** Google Fonts family spec, e.g. "Cinzel:wght@500;700". Unset = system font. */
  google?: string;
  /** What to fall back to while loading, or if loading fails. */
  fallback: string;
  kind: 'serif' | 'sans' | 'display' | 'blackletter';
}

export const FONTS: FontChoice[] = [
  { name: 'Inter', google: 'Inter:wght@400;500;600;700', fallback: 'system-ui, sans-serif', kind: 'sans' },
  { name: 'System UI', fallback: 'system-ui, -apple-system, sans-serif', kind: 'sans' },
  { name: 'Exo 2', google: 'Exo+2:wght@400;500;600;700', fallback: 'system-ui, sans-serif', kind: 'sans' },
  { name: 'Rajdhani', google: 'Rajdhani:wght@400;500;600;700', fallback: 'system-ui, sans-serif', kind: 'sans' },
  { name: 'Space Grotesk', google: 'Space+Grotesk:wght@400;500;700', fallback: 'system-ui, sans-serif', kind: 'sans' },
  { name: 'EB Garamond', google: 'EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400', fallback: 'Georgia, serif', kind: 'serif' },
  { name: 'Lora', google: 'Lora:ital,wght@0,400;0,600;0,700;1,400', fallback: 'Georgia, serif', kind: 'serif' },
  { name: 'Merriweather', google: 'Merriweather:ital,wght@0,400;0,700;1,400', fallback: 'Georgia, serif', kind: 'serif' },
  { name: 'Libre Baskerville', google: 'Libre+Baskerville:ital,wght@0,400;0,700;1,400', fallback: 'Georgia, serif', kind: 'serif' },
  { name: 'IM Fell English', google: 'IM+Fell+English:ital@0;1', fallback: 'Georgia, serif', kind: 'serif' },
  { name: 'Georgia', fallback: 'Georgia, serif', kind: 'serif' },
  { name: 'Cinzel', google: 'Cinzel:wght@500;700', fallback: 'Georgia, serif', kind: 'display' },
  { name: 'Cinzel Decorative', google: 'Cinzel+Decorative:wght@400;700', fallback: 'Georgia, serif', kind: 'display' },
  { name: 'IM Fell English SC', google: 'IM+Fell+English+SC', fallback: 'Georgia, serif', kind: 'display' },
  { name: 'Playfair Display', google: 'Playfair+Display:wght@500;700', fallback: 'Georgia, serif', kind: 'display' },
  { name: 'Orbitron', google: 'Orbitron:wght@500;700', fallback: 'system-ui, sans-serif', kind: 'display' },
  { name: 'Uncial Antiqua', google: 'Uncial+Antiqua', fallback: 'Georgia, serif', kind: 'display' },
  { name: 'UnifrakturMaguntia', google: 'UnifrakturMaguntia', fallback: 'Georgia, serif', kind: 'blackletter' },
  { name: 'Pirata One', google: 'Pirata+One', fallback: 'Georgia, serif', kind: 'blackletter' },
];

export const fontByName = (name: string) => FONTS.find((f) => f.name === name);

/** The CSS font-family value: the font, then its fallbacks. */
export function fontStack(name: string): string {
  const font = fontByName(name);
  return font ? `'${font.name}', ${font.fallback}` : `'${name}', system-ui, sans-serif`;
}

/** One Google Fonts stylesheet URL for all the given fonts, or null if none need loading. */
export function googleFontsUrl(names: string[]): string | null {
  const specs = [...new Set(names)].map((n) => fontByName(n)?.google).filter(Boolean);
  if (specs.length === 0) return null;
  return `https://fonts.googleapis.com/css2?${specs.map((s) => `family=${s}`).join('&')}&display=swap`;
}
