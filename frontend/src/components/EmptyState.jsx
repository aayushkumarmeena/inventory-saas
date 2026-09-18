import React from 'react';

export default function EmptyState({
  icon = 'ti-box',
  title = 'No items found',
  description = 'Get started by creating a new record.',
  actionText,
  onAction,
  actionIcon = 'ti-plus',
  compact = false,
}) {
  return (
    <div className="empty-state" style={compact ? { padding: '30px 16px' } : undefined}>
      <i className={`ti ${icon}`} />
      <div className="empty-state-title">{title}</div>
      {description && <div className="empty-state-desc">{description}</div>}
      {actionText && onAction && (
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={onAction}
          style={{ marginTop: 6 }}
        >
          {actionIcon && <i className={`ti ${actionIcon}`} />}
          {actionText}
        </button>
      )}
    </div>
  );
}