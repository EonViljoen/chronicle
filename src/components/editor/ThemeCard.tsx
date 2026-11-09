import type { CSSProperties } from 'react';
import type { Theme } from '../../types/theme';
import { fontStack } from '../../themes/fonts';

interface Props {
  theme: Theme;
  selected: boolean;
  builtIn: boolean;
  onSelect: () => void;
}

/** A small preview of a theme: its background, heading font, a node on a line and its colours. */
export default function ThemeCard({ theme, selected, builtIn, onSelect }: Props) {
  const { colors, fonts, shape } = theme;
  return (
    <button
      type="button"
      className={`theme-card${selected ? ' is-selected' : ''}`}
      aria-pressed={selected}
      aria-label={`${theme.name}${builtIn ? ' (built in)' : ''}`}
      onClick={onSelect}
    >
      <span
        className="theme-card-preview"
        aria-hidden="true"
        style={
          {
            background: colors.bg,
            color: colors.text,
            borderColor: colors.border,
            '--card-accent': colors.accent,
          } as CSSProperties
        }
      >
        <span className="theme-card-title" style={{ fontFamily: fontStack(fonts.heading) }}>Aa</span>
        <span className="theme-card-track">
          <span className={`theme-card-node is-${shape.node}`} style={{ borderColor: colors.accent, background: colors.accent }} />
        </span>
        <span className="theme-card-swatches">
          {[colors.surface, colors.accent, colors.highlight, colors.muted].map((c, i) => (
            <span key={i} style={{ background: c }} />
          ))}
        </span>
      </span>
      <span className="theme-card-name">
        {theme.name}
        {builtIn && <span className="muted"> · built in</span>}
      </span>
    </button>
  );
}
