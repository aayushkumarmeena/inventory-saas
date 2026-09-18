import React, { useEffect, useRef } from 'react';

/**
 * Shared modal shell: traps focus, closes on Escape or backdrop click,
 * restores focus to the trigger element on close, and exposes the right
 * ARIA attributes. Every modal in the app should use this instead of
 * hand-rolling the overlay/panel markup.
 */
export default function Modal({ title, onClose, children, maxWidth = 480 }) {
  const panelRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    previouslyFocused.current = document.activeElement;
    const panel = panelRef.current;
    const focusable = panel?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.[0]?.focus();

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab' && focusable?.length) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused.current?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel" style={{ maxWidth }} ref={panelRef} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close dialog">
            <i className="ti ti-x" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
