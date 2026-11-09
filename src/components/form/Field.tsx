import type { ReactNode } from 'react';

interface Props {
  label: string;
  hint?: ReactNode;
  error?: string;
  /** Use for several inputs under one label (renders a fieldset). */
  group?: boolean;
  children: ReactNode;
}

/** A labelled form field with an optional hint or error underneath. */
export default function Field({ label, hint, error, group, children }: Props) {
  const Wrapper = group ? 'fieldset' : 'label';
  const Title = group ? 'legend' : 'span';
  return (
    <Wrapper className="field">
      <Title className="field-label">{label}</Title>
      {children}
      {error ? (
        <span className="field-error" role="alert">{error}</span>
      ) : (
        hint && <span className="field-hint">{hint}</span>
      )}
    </Wrapper>
  );
}
