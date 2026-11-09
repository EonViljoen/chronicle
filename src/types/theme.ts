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
}

export type NodeShape = 'circle' | 'diamond' | 'square';
