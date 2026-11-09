import { useCallback, useState } from 'react';

/*
 * Small per-browser preferences (like "show the map beside the timeline")
 * in localStorage. Storage can be unavailable (private windows, blocked
 * site data), so every read and write is wrapped and falls back quietly.
 */

const PREFIX = 'chronicle:';

export function readPref<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writePref<T>(key: string, value: T) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage unavailable: the preference just won't be remembered
  }
}

/** Like useState, but remembered in this browser between visits. */
export function usePref<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => readPref(key, fallback));
  const set = useCallback(
    (next: T) => {
      setValue(next);
      writePref(key, next);
    },
    [key],
  );
  return [value, set] as const;
}
