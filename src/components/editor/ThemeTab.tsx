import { useEffect, useRef, useState } from 'react';
import type { Timeline } from '../../types/timeline';
import { useThemes, copyTheme, deleteTheme, exportTheme, importThemeFile } from '../../db/themes';
import { updateTimeline } from '../../db/timelines';
import { isPreset, resolveTheme } from '../../themes';
import { loadFonts } from '../../themes/apply';
import ThemeCard from './ThemeCard';
import ThemeEditor from './ThemeEditor';

interface Props {
  timeline: Timeline;
  onDirtyChange: (dirty: boolean) => void;
}

/**
 * The editor's Theme tab: every theme as a card (click to switch, saved
 * straight away), then the chosen theme's settings. Built-in themes can't be
 * edited; "Customise" makes your own copy.
 */
export default function ThemeTab({ timeline, onDirtyChange }: Props) {
  const themes = useThemes();
  const current = resolveTheme(timeline, themes);
  const builtIn = isPreset(current.id);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Track unsaved edits here too, to warn before switching away from them
  const dirtyRef = useRef(false);
  const handleDirty = (dirty: boolean) => {
    dirtyRef.current = dirty;
    onDirtyChange(dirty);
  };

  // Load every theme's fonts, so the cards preview them
  const fontKey = themes.map((t) => `${t.fonts.heading}|${t.fonts.body}`).join(',');
  useEffect(() => {
    for (const pair of fontKey.split(',')) loadFonts(pair.split('|'));
  }, [fontKey]);

  async function act(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const use = (id: string) => updateTimeline(timeline.id, (t) => ({ ...t, theme: id }));

  function switchTo(id: string) {
    if (id === current.id) return;
    if (dirtyRef.current && !window.confirm('Discard your unsaved theme changes?')) return;
    void act(() => use(id));
  }

  const customise = () =>
    act(async () => {
      const copy = await copyTheme(current, `${current.name} (custom)`);
      await use(copy.id);
    });

  const remove = () => {
    if (!window.confirm(`Delete the theme "${current.name}"? Timelines using it go back to the default theme.`)) return;
    void act(() => deleteTheme(current.id));
  };

  return (
    <section className="theme-tab">
      <div className="theme-tab-head">
        <div>
          <h2 className="form-title">Theme</h2>
          <p className="muted">Click a theme to use it for this timeline.</p>
        </div>
        <div className="toolbar-actions">
          <button type="button" className="btn" onClick={() => fileInput.current?.click()}>Import theme…</button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void act(async () => use(await importThemeFile(file)));
            }}
          />
        </div>
      </div>

      {error && <p className="error" role="alert">{error}</p>}

      <div className="theme-grid">
        {themes.map((t) => (
          <ThemeCard key={t.id} theme={t} builtIn={isPreset(t.id)} selected={t.id === current.id} onSelect={() => switchTo(t.id)} />
        ))}
      </div>

      <div className="theme-current">
        <h3>{current.name}</h3>
        <div className="toolbar-actions">
          <button type="button" className="btn" onClick={customise}>{builtIn ? 'Customise' : 'Duplicate'}</button>
          <button type="button" className="btn" onClick={() => exportTheme(current)}>Export theme</button>
        </div>
      </div>

      {builtIn ? (
        <p className="muted">Built-in themes can't be changed. Press <strong>Customise</strong> to make your own copy and edit that.</p>
      ) : (
        // key: a different theme gets a fresh form instead of the old draft
        <ThemeEditor key={current.id} theme={current} onDirtyChange={handleDirty} onDelete={remove} />
      )}
    </section>
  );
}
