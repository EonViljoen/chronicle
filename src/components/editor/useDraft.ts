import { useEffect, useState, type FormEvent } from 'react';

/**
 * A custom hook for editing a copy ("draft") of something before saving.
 * Custom hooks are just functions that call other hooks; they let several
 * forms share the same state logic.
 *
 * - `draft` is the working copy; `patch({ name })` changes some fields
 * - `dirty` is true when the draft differs from the saved original
 * - `submit` runs `onSave` with a cleaned-up draft
 *
 * The form reports `dirty` upward so the editor can warn before you leave
 * with unsaved changes.
 */
export function useDraft<T>(
  original: T,
  onSave: (value: T) => Promise<void>,
  onDirtyChange: (dirty: boolean) => void,
) {
  const [draft, setDraft] = useState(original);
  const [saving, setSaving] = useState(false);

  // Comparing JSON is a simple deep-equality check, fine for small objects
  const dirty = JSON.stringify(draft) !== JSON.stringify(original);

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  // When the form goes away, it no longer has unsaved changes
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  const patch = (changes: Partial<T>) => setDraft((d) => ({ ...d, ...changes }));

  async function submit(e: FormEvent, clean: (value: T) => T = (v) => v) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(clean(draft));
    } finally {
      setSaving(false);
    }
  }

  return { draft, patch, dirty, saving, submit, reset: () => setDraft(original) };
}
