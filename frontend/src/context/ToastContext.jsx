import React, { createContext, useContext, useCallback, useState, useRef } from 'react';

const ToastContext = createContext(null);

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const push = useCallback(
    (message, type = 'success', duration = 3500) => {
      const id = ++idCounter;
      setToasts((t) => [...t, { id, message, type }]);
      timers.current[id] = setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  const toast = {
    success: (msg, duration) => push(msg, 'success', duration),
    error: (msg, duration) => push(msg, 'error', duration),
    info: (msg, duration) => push(msg, 'info', duration),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 200,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          maxWidth: 340,
        }}
      >
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const ICONS = { success: 'ti-circle-check', error: 'ti-alert-circle', info: 'ti-info-circle' };
const COLORS = {
  success: { bg: 'var(--success-bg)', text: 'var(--success-text)' },
  error: { bg: 'var(--danger-bg)', text: 'var(--danger-text)' },
  info: { bg: 'var(--glass-bg-strong)', text: 'var(--text-primary)' },
};

function Toast({ toast, onDismiss }) {
  const c = COLORS[toast.type] || COLORS.info;
  return (
    <div
      role="status"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '12px 14px',
        borderRadius: 12,
        background: 'var(--glass-bg-strong)',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        border: '1px solid var(--glass-border)',
        boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
        animation: 'toast-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        fontSize: 13,
        color: 'var(--text-primary)',
      }}
    >
      <i className={`ti ${ICONS[toast.type]}`} style={{ color: c.text, fontSize: 16, marginTop: 1, flexShrink: 0 }} />
      <span style={{ flex: 1, lineHeight: 1.4 }}>{toast.message}</span>
      <button
        onClick={onDismiss}
        aria-label="Dismiss notification"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 2, flexShrink: 0 }}
      >
        <i className="ti ti-x" style={{ fontSize: 13 }} />
      </button>
    </div>
  );
}

export const useToast = () => useContext(ToastContext);
