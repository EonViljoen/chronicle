/**
 * A theme: everything about how a timeline looks, as plain data. Themes live
 * in a library (built-in presets plus your own); a timeline points at one by
 * id, so switching is a one-field change. Exported timelines carry a copy.
 *
 * src/themes/apply.ts turns this into CSS variables and attributes on <html>,
 * and index.css does the rest.
 */
export interface Theme {
  id: string;
  name: string;
  colors: {
    /** Page background */
    bg: string;
    /** Panels and cards */
    surface: string;
    /** Buttons, chips, raised bits */
    surface2: string;
    border: string;
    text: string;
    muted: string;
    /** Links, selected dates, primary buttons */
    accent: string;
    /** Text on accent-coloured buttons */
    accentInk: string;
    /** A second colour for ornaments, e.g. a red cross on the info box */
    highlight: string;
    danger: string;
  };
  fonts: {
    /** Page titles and the site name */
    heading: string;
    /** Section titles, dates, labels */
    display: string;
    /** Everything else */
    body: string;
    /** Body text size in percent, e.g. 100 */
    size: number;
  };
  shape: {
    /** Corner rounding in pixels */
    radius: number;
    node: NodeShape;
  };
  ornaments: {
    background: 'plain' | 'vignette' | 'texture';
    headerRule: 'line' | 'double';
    /** Engraved: an inset hairline frame on panels, gilded track line */
    frame: 'none' | 'engraved';
    /** Small caps on buttons and tabs, in the display font */
    buttons: 'plain' | 'engraved';
    /** A symbol sitting on the info box's top edge, e.g. "✠". Empty for none. */
    glyph: string;
    /** A large decorated first letter in event details */
    dropCap: boolean;
  };
  /** The radial wash of colour behind the timeline page (see .era-glow in index.css) */
  glow: ThemeGlow;
}

export interface ThemeGlow {
  /** Where the colour comes from: the era on show, or one of the theme's own colours */
  color: 'era' | 'accent' | 'highlight';
  /** Strength at the centre, in percent. 0 turns the glow off. */
  strength: number;
  /** How far it reaches sideways from the centre, in percent of the window width */
  width: number;
  /** How far it reaches up and down from the centre, in pixels */
  height: number;
  /** Centre, across the page in percent (50 = middle) */
  x: number;
  /** Centre, down from the top of the page in pixels */
  y: number;
  /** How far out the colour holds before fading, in percent: low = a tight core, high = a broad wash */
  spread: number;
}

export type NodeShape = 'circle' | 'diamond' | 'square';
