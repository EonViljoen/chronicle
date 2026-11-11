import { useState, type CSSProperties } from 'react';
import type { Theme, ThemeGlow } from '../../types/theme';
import { FONTS } from '../../themes/fonts';
import { glowVars } from '../../themes/apply';
import { DEFAULT_GLOW } from '../../themes/presets';
import { saveTheme } from '../../db/themes';
import { useThemeOverride } from '../themeOverride';
import Field from '../form/Field';
import FormActions from './FormActions';
import { useDraft } from './useDraft';

const COLOR_LABELS: [keyof Theme['colors'], string][] = [
  ['bg', 'Page background'],
  ['surface', 'Panels'],
  ['surface2', 'Buttons and chips'],
  ['border', 'Borders'],
  ['text', 'Text'],
  ['muted', 'Quiet text'],
  ['accent', 'Accent'],
  ['accentInk', 'Text on accent'],
  ['highlight', 'Highlight'],
  ['danger', 'Warnings'],
];

const GLYPHS = ['✠', '✦', '❖', '☩', '⚜', '✧', '◆', '☉'];

// Fonts grouped by kind, for <optgroup>s in the font pickers
const FONT_GROUPS: [string, typeof FONTS][] = [
  ['Sans serif', FONTS.filter((f) => f.kind === 'sans')],
  ['Serif', FONTS.filter((f) => f.kind === 'serif')],
  ['Display', FONTS.filter((f) => f.kind === 'display')],
  ['Blackletter', FONTS.filter((f) => f.kind === 'blackletter')],
];

function FontSelect({ value, onChange }: { value: string; onChange: (name: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {FONT_GROUPS.map(([group, fonts]) => (
        <optgroup key={group} label={group}>
          {fonts.map((f) => (
            <option key={f.name} value={f.name}>{f.name}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

/** Era colours to try the glow with in the preview (the real one depends on the timeline). */
const SAMPLE_ERA_COLORS = ['#8a1f1f', '#a8862d', '#4a6a8a', '#4f8a3c', '#6b2a5a'];

/** One slider: label with its value, and the range input. */
function Slider({ label, unit, min, max, step = 1, value, onChange }: {
  label: string; unit: string; min: number; max: number; step?: number; value: number; onChange: (n: number) => void;
}) {
  return (
    <Field label={`${label}: ${value}${unit}`}>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </Field>
  );
}

/**
 * The era glow settings, with a small preview. The preview gets the draft's
 * glow and colours as inline CSS variables, so it shows the theme being
 * edited even when the page around it is using another theme.
 */
function GlowSettings({ glow, colors, onChange }: { glow: ThemeGlow; colors: Theme['colors']; onChange: (changes: Partial<ThemeGlow>) => void }) {
  const [sample, setSample] = useState(SAMPLE_ERA_COLORS[0]);
  const previewVars = {
    ...glowVars(glow),
    '--accent': colors.accent,
    '--highlight': colors.highlight,
    '--bg': colors.bg,
    '--era-glow-color': sample,
  } as CSSProperties;

  return (
    <fieldset className="theme-group">
      <legend>Era glow</legend>
      <p className="muted field-hint">A soft wash of colour behind the timeline page. Set the strength to 0 to turn it off.</p>

      <div className="glow-preview" data-glow-color={glow.color} style={previewVars} aria-label="Preview of the era glow" role="img">
        <div className="era-glow" />
        <div className="glow-preview-stage">Timeline</div>
      </div>

      <div className="field-row">
        <Field label="Colour">
          <select value={glow.color} onChange={(e) => onChange({ color: e.target.value as ThemeGlow['color'] })}>
            <option value="era">The era on show</option>
            <option value="accent">The theme's accent colour</option>
            <option value="highlight">The theme's highlight colour</option>
          </select>
        </Field>
        {glow.color === 'era' && (
          <Field label="Preview with" group>
            <div className="glow-swatches">
              {SAMPLE_ERA_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`glow-swatch${c === sample ? ' is-on' : ''}`}
                  style={{ background: c }}
                  aria-label={`Preview with ${c}`}
                  aria-pressed={c === sample}
                  onClick={() => setSample(c)}
                />
              ))}
            </div>
          </Field>
        )}
      </div>

      <div className="field-row">
        <Slider label="Strength" unit="%" min={0} max={80} value={glow.strength} onChange={(strength) => onChange({ strength })} />
        <Slider label="Spread" unit="%" min={10} max={95} value={glow.spread} onChange={(spread) => onChange({ spread })} />
      </div>
      <div className="field-row">
        <Slider label="Width" unit="% of the window" min={10} max={150} value={glow.width} onChange={(width) => onChange({ width })} />
        <Slider label="Height" unit="px" min={100} max={1400} step={10} value={glow.height} onChange={(height) => onChange({ height })} />
      </div>
      <div className="field-row">
        <Slider label="Centre across" unit="%" min={0} max={100} value={glow.x} onChange={(x) => onChange({ x })} />
        <Slider label="Centre down" unit="px" min={0} max={1400} step={10} value={glow.y} onChange={(y) => onChange({ y })} />
      </div>
      <div>
        <button type="button" className="btn" onClick={() => onChange(DEFAULT_GLOW)}>Reset the glow</button>
      </div>
    </fieldset>
  );
}

/** A new, not yet saved theme: what it's based on, and how to save it. */
export interface NewThemeOptions {
  /** Themes to start from; 'none' means the plain BLANK_THEME */
  builtIn: Theme[];
  custom: Theme[];
  baseId: string;
  onBaseChange: (id: string) => void;
  onCreate: (theme: Theme) => Promise<void>;
}

interface Props {
  theme: Theme;
  onDirtyChange: (dirty: boolean) => void;
  onDelete?: () => void;
  /** Set when creating a theme: nothing is saved until Create is pressed. */
  creating?: NewThemeOptions;
}

/**
 * Edits one of your themes. Changes show on the whole page as you make them
 * (useThemeOverride), and are saved to the library with Save, which updates
 * every timeline that uses the theme.
 * With `creating`, it's the form for a new theme instead: a draft that only
 * exists in memory until Create, so leaving without it saves nothing.
 */
export default function ThemeEditor({ theme, onDirtyChange, onDelete, creating }: Props) {
  const { draft, patch, dirty, saving, submit, reset } = useDraft(theme, creating?.onCreate ?? saveTheme, onDirtyChange);
  // A new theme is previewed from the start; an existing one once it's changed
  useThemeOverride(creating || dirty ? draft : null);

  function changeBase(id: string) {
    if (dirty && !window.confirm('Start again from this theme? Your changes so far will be lost.')) return;
    creating?.onBaseChange(id);
  }

  // Small helpers to change one field inside a group
  const setColor = (key: keyof Theme['colors'], value: string) => patch({ colors: { ...draft.colors, [key]: value } });
  const setFonts = (changes: Partial<Theme['fonts']>) => patch({ fonts: { ...draft.fonts, ...changes } });
  const setShape = (changes: Partial<Theme['shape']>) => patch({ shape: { ...draft.shape, ...changes } });
  const setOrnaments = (changes: Partial<Theme['ornaments']>) => patch({ ornaments: { ...draft.ornaments, ...changes } });
  const setGlow = (changes: Partial<ThemeGlow>) => patch({ glow: { ...draft.glow, ...changes } });
  const nameError = draft.name.trim() ? undefined : 'Give the theme a name';

  return (
    <form className="form theme-editor" onSubmit={(e) => submit(e, (t) => ({ ...t, name: t.name.trim() }))}>
      {creating && (
        <Field label="Start from" hint="Its colours, fonts and ornaments are copied in; the original isn't changed.">
          <select value={creating.baseId} onChange={(e) => changeBase(e.target.value)}>
            <option value="none">None (plain)</option>
            <optgroup label="Built-in themes">
              {creating.builtIn.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </optgroup>
            {creating.custom.length > 0 && (
              <optgroup label="Custom themes">
                {creating.custom.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </optgroup>
            )}
          </select>
        </Field>
      )}

      <Field label="Theme name" error={nameError}>
        <input value={draft.name} onChange={(e) => patch({ name: e.target.value })} />
      </Field>

      <fieldset className="theme-group">
        <legend>Colours</legend>
        <div className="color-grid">
          {COLOR_LABELS.map(([key, label]) => (
            <label key={key} className="color-field">
              <input type="color" value={draft.colors[key]} onChange={(e) => setColor(key, e.target.value)} />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="theme-group">
        <legend>Fonts</legend>
        <div className="field-row">
          <Field label="Headings" hint="Page titles and the site name">
            <FontSelect value={draft.fonts.heading} onChange={(heading) => setFonts({ heading })} />
          </Field>
          <Field label="Labels" hint="Section titles, dates, buttons">
            <FontSelect value={draft.fonts.display} onChange={(display) => setFonts({ display })} />
          </Field>
          <Field label="Body">
            <FontSelect value={draft.fonts.body} onChange={(body) => setFonts({ body })} />
          </Field>
        </div>
        <Field label={`Text size: ${draft.fonts.size}%`}>
          <input type="range" min={80} max={130} step={2} value={draft.fonts.size} onChange={(e) => setFonts({ size: Number(e.target.value) })} />
        </Field>
      </fieldset>

      <fieldset className="theme-group">
        <legend>Shape</legend>
        <div className="field-row">
          <Field label={`Corner rounding: ${draft.shape.radius}px`}>
            <input type="range" min={0} max={16} value={draft.shape.radius} onChange={(e) => setShape({ radius: Number(e.target.value) })} />
          </Field>
          <Field label="Timeline nodes">
            <select value={draft.shape.node} onChange={(e) => setShape({ node: e.target.value as Theme['shape']['node'] })}>
              <option value="circle">Circles</option>
              <option value="diamond">Diamonds</option>
              <option value="square">Squares</option>
            </select>
          </Field>
        </div>
      </fieldset>

      <fieldset className="theme-group">
        <legend>Ornaments</legend>
        <div className="field-row">
          <Field label="Page background">
            <select value={draft.ornaments.background} onChange={(e) => setOrnaments({ background: e.target.value as Theme['ornaments']['background'] })}>
              <option value="plain">Plain</option>
              <option value="vignette">Darkened edges</option>
              <option value="texture">Textured, with a highlight glow</option>
            </select>
          </Field>
          <Field label="Header and footer rule">
            <select value={draft.ornaments.headerRule} onChange={(e) => setOrnaments({ headerRule: e.target.value as Theme['ornaments']['headerRule'] })}>
              <option value="line">Single line</option>
              <option value="double">Double rule</option>
            </select>
          </Field>
        </div>
        <div className="field-row">
          <Field label="Panels">
            <select value={draft.ornaments.frame} onChange={(e) => setOrnaments({ frame: e.target.value as Theme['ornaments']['frame'] })}>
              <option value="none">Plain</option>
              <option value="engraved">Engraved frame, gilded line</option>
            </select>
          </Field>
          <Field label="Buttons">
            <select value={draft.ornaments.buttons} onChange={(e) => setOrnaments({ buttons: e.target.value as Theme['ornaments']['buttons'] })}>
              <option value="plain">Plain</option>
              <option value="engraved">Engraved capitals</option>
            </select>
          </Field>
        </div>
        <Field label="Symbol on the info box" group hint="Sits on the top edge, in the highlight colour. Empty for none.">
          <div className="inline-inputs wrap">
            <input className="glyph-input" value={draft.ornaments.glyph} maxLength={4} aria-label="Symbol" onChange={(e) => setOrnaments({ glyph: e.target.value })} />
            {GLYPHS.map((g) => (
              <button key={g} type="button" className={`btn glyph-btn${draft.ornaments.glyph === g ? ' is-on' : ''}`} onClick={() => setOrnaments({ glyph: g })}>
                {g}
              </button>
            ))}
            <button type="button" className="btn" onClick={() => setOrnaments({ glyph: '' })}>None</button>
          </div>
        </Field>
        <label className="check">
          <input type="checkbox" checked={draft.ornaments.dropCap} onChange={(e) => setOrnaments({ dropCap: e.target.checked })} />
          Decorated first letter in event details
        </label>
      </fieldset>

      <GlowSettings glow={draft.glow} colors={draft.colors} onChange={setGlow} />

      {/* A new theme can be created as it is: it's unsaved even with no changes */}
      <FormActions isNew={!!creating} dirty={!!creating || dirty} valid={!nameError} saving={saving} onRevert={reset} onDelete={onDelete} />
    </form>
  );
}
