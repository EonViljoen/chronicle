/** What a theme folder's index.ts exports. */
export interface ThemeMeta {
  /** Stored on timelines and used as <html data-theme="…">. Keep it stable. */
  id: string;
  /** Shown in the editor's theme picker. */
  name: string;
  description?: string;
  /** A Google Fonts (or other) stylesheet URL, loaded only while the theme is in use. */
  fontsUrl?: string;
}
