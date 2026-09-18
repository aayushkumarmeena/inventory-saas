import React from 'react';

export default function ProgressBar({
  value = 0,
  max = 100,
  reorderPoint,
  color,
  showLabel = false,
  height = 6,
}) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  let fillClass = 'brand';
  if (color) {
    fillClass = color;
  } else if (reorderPoint !== undefined) {
    if (value <= 0) fillClass = 'danger';
    else if (value <= reorderPoint) fillClass = 'danger';
    else if (value <= reorderPoint * 1.5) fillClass = 'warning';
    else fillClass = 'success';
  }

  return (
    <div style={{ width: '100%' }}>
      {showLabel && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
          <span>Stock: <strong>{value}</strong></span>
          <span>{reorderPoint !== undefined ? `Reorder @ ${reorderPoint}` : `${Math.round(percent)}%`}</span>
        </div>
      )}
      <div className="progress-bar-wrap" style={{ height }}>
        <div
          className={`progress-bar-fill ${fillClass}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}