import type { ReactNode } from 'react';
import { useCanEdit } from './canEdit';

/** Renders its children only when the timeline on screen can be edited, otherwise `fallback`. */
export function EditOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  return useCanEdit() ? children : fallback;
}
