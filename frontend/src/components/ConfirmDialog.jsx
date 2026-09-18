import React from 'react';
import Modal from './Modal';

export default function ConfirmDialog({
  isOpen = true,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger',
  loading = false,
}) {
  if (!isOpen) return null;

  return (
    <Modal title={title} onClose={onCancel} maxWidth={400}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 20 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: variant === 'danger' ? 'var(--danger-bg)' : 'rgba(99,102,241,0.15)',
            color: variant === 'danger' ? 'var(--danger-text)' : 'var(--brand)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            flexShrink: 0,
          }}
        >
          <i className={`ti ${variant === 'danger' ? 'ti-alert-triangle' : 'ti-help'}`} />
        </div>
        <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--text-primary)', paddingTop: 2 }}>
          {message}
        </div>
      </div>

      <div className="modal-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={loading}
        >
          {cancelText}
        </button>
        <button
          type="button"
          className={`btn ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading && <span className="spinner" />}
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}