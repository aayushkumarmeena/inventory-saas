import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('Unhandled UI error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--shell-bg, #0a0d1a)',
            padding: 24,
          }}
        >
          <div
            style={{
              maxWidth: 420,
              textAlign: 'center',
              background: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 18,
              padding: '40px 32px',
              color: '#f1f2f6',
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'rgba(239,68,68,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <i className="ti ti-alert-triangle" style={{ fontSize: 24, color: '#fca5a5' }} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Something went wrong</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 22, lineHeight: 1.5 }}>
              The app hit an unexpected error. Reloading usually fixes it — your data is safe.
            </div>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 20px',
                borderRadius: 10,
                border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reload the app
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
