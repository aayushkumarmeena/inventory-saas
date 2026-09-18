import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Shown for any URL that doesn't match a route. Previously the catch-all
 * route silently redirected to "/" with no explanation, so a stale bookmark,
 * typo, or a link shared before a permission change all looked like the app
 * had just... ignored the click. This tells the person what happened and
 * gives them a way forward, in the same visual language as EmptyState /
 * ErrorBoundary elsewhere in the app.
 */
export default function NotFound() {
  const { user } = useAuth();

  return (
    <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="empty-state" style={{ maxWidth: 420 }}>
        <i className="ti ti-map-off" />
        <div className="empty-state-title">Page not found</div>
        <div className="empty-state-desc">
          The page you're looking for doesn't exist, or you may not have access to it.
        </div>
        <Link to={user ? '/' : '/login'} className="btn btn-primary btn-sm" style={{ marginTop: 6, textDecoration: 'none' }}>
          <i className="ti ti-arrow-left" />
          {user ? 'Back to dashboard' : 'Back to login'}
        </Link>
      </div>
    </div>
  );
}
