import Modal from './Modal';

export default function ConfirmDialog({ open, title = 'Are you sure?', message, confirmLabel = 'Confirm', danger = true, busy, onConfirm, onCancel }) {
  return (
    <Modal
      open={open} onClose={onCancel} title={title}
      footer={<>
        <button className="btn-secondary" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm} disabled={busy}>{busy ? 'Please wait...' : confirmLabel}</button>
      </>}
    >
      <p className="text-sm text-gray-600">{message}</p>
    </Modal>
  );
}
