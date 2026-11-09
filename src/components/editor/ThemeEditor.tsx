import type { Theme } from '../../types/theme';
import { FONTS } from '../../themes/fonts';
import { saveTheme } from '../../db/themes';
import { usePreviewTheme } from '../themePreview';
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

interface Props {
  theme: Theme;
  onDirtyChange: (dirty: boolean) => void;
  onDelete: () => void;
}

/**
 * Edits one of your themes. Changes show on the whole page as you make them
 * (usePreviewTheme), and are saved to the library with Save, which updates
 * every timeline that uses the theme.
 */
export default function ThemeEditor({ theme, onDirtyChange, onDelete }: Props) {
  const { draft, patch, dirty, saving, submit, reset } = useDraft(theme, saveTheme, onDirtyChange);
  usePreviewTheme(dirty ? draft : null);

  // Small helpers to change one field inside a group
  const setColor = (key: keyof Theme['colors'], value: string) => patch({ colors: { ...draft.colors, [key]: value } });
  const setFonts = (changes: Partial<Theme['fonts']>) => patch({ fonts: { ...draft.fonts, ...changes } });
  const setShape = (changes: Partial<Theme['shape']>) => patch({ shape: { ...draft.shape, ...changes } });
  const setOrnaments = (changes: Partial<Theme['ornaments']>) => patch({ ornaments: { ...draft.ornaments, ...changes } });
  const nameError = draft.name.trim() ? undefined : 'Give the theme a name';

  return (
    <form className="form theme-editor" onSubmit={(e) => submit(e, (t) => ({ ...t, name: t.name.trim() }))}>
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

      <FormActions isNew={false} dirty={dirty} valid={!nameError} saving={saving} onRevert={reset} onDelete={onDelete} />
    </form>
  );
}
