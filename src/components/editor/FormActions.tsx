interface Props {
  isNew: boolean;
  dirty: boolean;
  valid: boolean;
  saving: boolean;
  onRevert: () => void;
  onDelete?: () => void;
}

/** Save / Revert / Delete row at the bottom of every editor form. */
export default function FormActions({ isNew, dirty, valid, saving, onRevert, onDelete }: Props) {
  return (
    <div className="form-actions">
      <button type="submit" className="btn btn-primary" disabled={!dirty || !valid || saving}>
        {saving ? 'Saving…' : isNew ? 'Create' : 'Save'}
      </button>
      {dirty && !isNew && (
        <button type="button" className="btn" onClick={onRevert}>Revert</button>
      )}
      {dirty && <span className="unsaved">Unsaved changes</span>}
      {onDelete && (
        <button type="button" className="btn btn-danger form-actions-delete" onClick={onDelete}>Delete</button>
      )}
    </div>
  );
}
