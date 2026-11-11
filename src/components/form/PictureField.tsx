import { useRef, useState } from 'react';
import { PORTRAIT_SIZE, readImage } from '../../lib/images';
import Field from './Field';

interface Props {
  /** A data: URL (uploaded) or a web address; undefined for none. */
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  /** A swatch colour shown when there's no picture (a faction's colour). */
  fallbackColor?: string;
  hint?: string;
  /** A square preview (a crest) instead of a round one (a portrait). */
  square?: boolean;
}

/**
 * A picture for a character or faction: upload a file (stored in the
 * timeline as a data: URL) or paste a web address, with a small preview.
 */
export default function PictureField({ value, onChange, fallbackColor, hint = 'Upload one, or paste a web address.', square = false }: Props) {
  const shape = square ? ' is-square' : '';
  const [note, setNote] = useState<{ text: string; error?: boolean } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function upload(file: File | undefined) {
    if (!file) return;
    try {
      // Portraits and crests are shown small, so they're shrunk a lot
      const { image, note } = await readImage(file, PORTRAIT_SIZE);
      onChange(image);
      setNote(note ? { text: note } : null);
    } catch (e) {
      setNote({ text: e instanceof Error ? e.message : String(e), error: true });
    }
  }

  return (
    <Field label="Picture" group hint={note ? undefined : hint}>
      <div className="character-picture-edit">
        {value ? (
          <img className={`character-portrait is-small${shape}`} src={value} alt="" />
        ) : (
          <div className={`character-portrait is-small is-empty${shape}`} style={fallbackColor ? { background: fallbackColor } : undefined} aria-hidden="true">
            {fallbackColor ? '' : '?'}
          </div>
        )}
        <div className="inline-inputs wrap">
          <input
            type="url"
            aria-label="Picture address"
            placeholder="https://…"
            // A long uploaded data: URL isn't worth showing
            value={value?.startsWith('data:') ? '' : (value ?? '')}
            onChange={(e) => onChange(e.target.value)}
          />
          <button type="button" className="btn" onClick={() => fileInput.current?.click()}>Upload…</button>
          {value && <button type="button" className="btn" onClick={() => onChange(undefined)}>Remove</button>}
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            void upload(e.target.files?.[0]);
            e.target.value = ''; // so picking the same file again still works
          }}
        />
      </div>
      {note && <span className={note.error ? 'field-error' : 'field-hint'} role={note.error ? 'alert' : undefined}>{note.text}</span>}
    </Field>
  );
}
