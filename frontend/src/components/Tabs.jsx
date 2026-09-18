import React from 'react';

export default function Tabs({ tabs, activeTab, onChange }) {
  return (
    <div className="tabs-nav">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            className={`tab-btn ${isActive ? 'active' : ''}`}
            onClick={() => onChange(tab.id)}
          >
            {tab.icon && <i className={`ti ${tab.icon}`} />}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className={`badge ${tab.badgeClass || 'badge-neutral'}`} style={{ padding: '1px 6px', fontSize: 10 }}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}