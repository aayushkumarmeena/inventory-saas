import React, { useEffect } from 'react';

export default function Drawer({ title, isOpen = true, onClose, children, footer, maxWidth = 520 }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div
        className="drawer-panel"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="drawer-header">
          <h3 className="drawer-title">{title}</h3>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close drawer"
          >
            <i className="ti ti-x" />
          </button>
        </div>
        <div className="drawer-body">{children}</div>
        {footer && <div className="drawer-footer">{footer}</div>}
      </div>
    </div>
  );
}