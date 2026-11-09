import { useRef, useState } from 'react';
import type { FlatMap } from '../../types/timeline';
import Field from '../form/Field';

const BIG = 5 * 1024 * 1024;

/** Reads a picked image as a data: URL and measures it. */
async function readImage(file: File): Promise<FlatMap> {
  const image = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Couldn't read "${file.name}"`));
    reader.readAsDataURL(file);
  });
  // Load it once to learn its size (and that it really is an image)
  const { width, height } = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`"${file.name}" isn't an image this browser can show`));
    img.src = image;
  });
  return { image, width, height };
}

interface Props {
  value: FlatMap | undefined;
  onChange: (map: FlatMap | undefined) => void;
}

/** The Settings form's flat map section: upload, replace or remove the picture. */
export default function FlatMapSettings({ value, onChange }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState<{ error: boolean; text: string } | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setNote(null);
    try {
      onChange(await readImage(file));
      if (file.size > BIG) {
        setNote({ error: false, text: `That's a big picture (${Math.round(file.size / 1024 / 1024)} MB). It's saved inside the timeline, so exports and websites get bigger too. A smaller JPEG or WebP works just as well.` });
      }
    } catch (e) {
      setNote({ error: true, text: e instanceof Error ? e.message : String(e) });
    }
  }

  return (
    <Field
      label="Flat map"
      group
      hint="Your own map picture (a drawn fantasy map, a galaxy chart…). Pin places on it in the Places tab. It can sit alongside the 3D starmap."
    >
      {value ? (
        <div className="flat-map-settings">
          <img className="flat-thumb" src={value.image} alt="" />
          <span className="muted">{value.width} × {value.height} px</span>
          <button type="button" className="btn" onClick={() => input.current?.click()}>Replace…</button>
          <button type="button" className="btn btn-danger" onClick={() => onChange(undefined)}>Remove</button>
        </div>
      ) : (
        <div>
          <button type="button" className="btn" onClick={() => input.current?.click()}>Upload a map image…</button>
        </div>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = ''; // so picking the same file again still works
        }}
      />
      {note && <p className={note.error ? 'field-error' : 'field-hint'} role={note.error ? 'alert' : undefined}>{note.text}</p>}
    </Field>
  );
}
