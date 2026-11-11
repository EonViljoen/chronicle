import { useEffect, useRef, useState } from 'react';
import type { Timeline } from '../../types/timeline';
import type { Theme } from '../../types/theme';
import { useThemes, deleteTheme, exportTheme, importThemeFile, saveTheme } from '../../db/themes';
import { updateTimeline } from '../../db/timelines';
import { isPreset, resolveTheme } from '../../themes';
import { BLANK_THEME } from '../../themes/presets';
import { loadFonts } from '../../themes/apply';
import ThemeCard from './ThemeCard';
import ThemeEditor from './ThemeEditor';

interface Props {
  timeline: Timeline;
  onDirtyChange: (dirty: boolean) => void;
}

/** A theme being created: its new id, and which theme it starts from ('none' for blank). */
interface NewTheme {
  id: string;
  baseId: string;
}

/**
 * The editor's Theme tab: the built-in and custom themes as cards (click to
 * switch, saved straight away), then the chosen theme's settings. Built-in
 * themes can't be edited. "Create custom theme" opens a form for a new one,
 * based on any theme or none; it's only a draft until you press Create.
 */
export default function ThemeTab({ timeline, onDirtyChange }: Props) {
  const themes = useThemes();
  const builtInThemes = themes.filter((t) => isPreset(t.id));
  const customThemes = themes.filter((t) => !isPreset(t.id));
  const current = resolveTheme(timeline, themes);
  const builtIn = isPreset(current.id);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState<NewTheme | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Track unsaved edits here too, to warn before switching away from them.
  // A theme being created counts as unsaved until it's created.
  const dirtyRef = useRef(false);
  const handleDirty = (dirty: boolean) => {
    dirtyRef.current = dirty;
    onDirtyChange(dirty || creating !== null);
  };
  useEffect(() => {
    onDirtyChange(dirtyRef.current || creating !== null);
  }, [creating, onDirtyChange]);

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

  /** Ask before throwing away unsaved work; true when it's fine to go on. */
  function canLeave() {
    if (creating) return window.confirm('Discard the new theme? It hasn\'t been created yet.');
    if (dirtyRef.current) return window.confirm('Discard your unsaved theme changes?');
    return true;
  }

  function switchTo(id: string) {
    if (id === current.id && !creating) return;
    if (!canLeave()) return;
    setCreating(null);
    if (id !== current.id) void act(() => use(id));
  }

  function startCreating() {
    if (creating || !canLeave()) return;
    // Starts from the theme in use; "Start from" in the form changes it
    setCreating({ id: crypto.randomUUID(), baseId: current.id });
  }

  // The new theme's starting point: a copy of its base, with its own id and name
  let newTheme: Theme | null = null;
  if (creating) {
    const base = themes.find((t) => t.id === creating.baseId);
    newTheme = base
      ? { ...structuredClone(base), id: creating.id, name: `${base.name} (custom)` }
      : { ...structuredClone(BLANK_THEME), id: creating.id };
  }

  const create = (theme: Theme) =>
    act(async () => {
      await saveTheme(theme);
      await use(theme.id);
      setCreating(null);
    });

  const remove = () => {
    if (!window.confirm(`Delete the theme "${current.name}"? Timelines using it go back to the default theme.`)) return;
    void act(() => deleteTheme(current.id));
  };

  const cards = (list: Theme[]) => (
    <div className="theme-grid">
      {list.map((t) => (
        <ThemeCard key={t.id} theme={t} builtIn={isPreset(t.id)} selected={!creating && t.id === current.id} onSelect={() => switchTo(t.id)} />
      ))}
    </div>
  );

  return (
    <section className="theme-tab">
      <div className="theme-tab-head">
        <div>
          <h2 className="form-title">Theme</h2>
          <p className="muted">Click a theme to use it for this timeline.</p>
        </div>
        <div className="toolbar-actions">
          <button type="button" className="btn btn-primary" onClick={startCreating} disabled={creating !== null}>
            Create custom theme
          </button>
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

      <h3 className="theme-group-title">Built-in themes</h3>
      {cards(builtInThemes)}

      <h3 className="theme-group-title">Custom themes</h3>
      {customThemes.length > 0 ? (
        cards(customThemes)
      ) : (
        <p className="muted theme-empty">None yet. Press <strong>Create custom theme</strong> to make one.</p>
      )}

      {creating && newTheme ? (
        <>
          <div className="theme-current">
            <h3>New custom theme</h3>
            <div className="toolbar-actions">
              <button type="button" className="btn" onClick={() => canLeave() && setCreating(null)}>Cancel</button>
            </div>
          </div>
          {/* key: a new base gives a fresh draft */}
          <ThemeEditor
            key={`${creating.id}-${creating.baseId}`}
            theme={newTheme}
            onDirtyChange={handleDirty}
            creating={{
              builtIn: builtInThemes,
              custom: customThemes,
              baseId: themes.some((t) => t.id === creating.baseId) ? creating.baseId : 'none',
              onBaseChange: (baseId) => setCreating({ ...creating, baseId }),
              onCreate: create,
            }}
          />
        </>
      ) : (
        <>
          <div className="theme-current">
            <h3>{current.name}</h3>
            <div className="toolbar-actions">
              <button type="button" className="btn" onClick={() => exportTheme(current)}>Export theme</button>
            </div>
          </div>
          {builtIn ? (
            <p className="muted">
              Built-in themes can't be changed. Press <strong>Create custom theme</strong> to start your own from this one.
            </p>
          ) : (
            // key: a different theme gets a fresh form instead of the old draft
            <ThemeEditor key={current.id} theme={current} onDirtyChange={handleDirty} onDelete={remove} />
          )}
        </>
      )}
    </section>
  );
}
