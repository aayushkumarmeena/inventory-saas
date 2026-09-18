import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { activityApi } from '../../api/activityApi';
import { fmtDate } from '../../utils/formatters';
import EmptyState from '../../components/EmptyState';

const ICONS = {
  SALE: 'ti-receipt',
  PURCHASE: 'ti-truck-delivery',
  STOCK: 'ti-arrows-exchange',
  GST_INVOICE: 'ti-file-invoice',
  TEAM: 'ti-users-group',
  PRODUCT: 'ti-package',
};

const ACTION_COLORS = {
  CREATE: '#6366f1',
  CANCEL: '#ef4444',
  RECEIVE: '#10b981',
  PAYMENT: '#f59e0b',
  RETURN: '#f59e0b',
  IN: '#10b981',
  OUT: '#ef4444',
  INVITE: '#6366f1',
  ROLE_CHANGE: '#8b5cf6',
  ACTIVATE: '#10b981',
  DEACTIVATE: '#ef4444',
  PASSWORD_RESET: '#8b5cf6',
  PASSWORD_CHANGE: '#8b5cf6',
};

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return fmtDate(dateStr);
}

const FILTER_TYPES = [
  { id: '', label: 'All Activity' },
  { id: 'SALE', label: 'Sales' },
  { id: 'PURCHASE', label: 'Purchases' },
  { id: 'STOCK', label: 'Stock' },
  { id: 'GST_INVOICE', label: 'GST Invoices' },
  { id: 'TEAM', label: 'Team' },
];

export default function Activity() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [typeFilter, setTypeFilter] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    activityApi
      .list({ page, size: 30 })
      .then((r) => {
        setEntries(r.data.data.content || []);
        setTotalPages(r.data.data.totalPages || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const filteredEntries = useMemo(() => {
    if (!typeFilter) return entries;
    return entries.filter((e) => e.entityType === typeFilter);
  }, [entries, typeFilter]);

  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Activity & Audit Trail</h1>
          <p className="page-subtitle">Real-time audit log of all actions across your workspace in chronological order.</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6, marginBottom: 16 }}>
        {FILTER_TYPES.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`btn btn-sm ${typeFilter === f.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTypeFilter(f.id)}
            style={{ borderRadius: 8 }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="card card-pad">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: i < 5 ? '1px solid var(--glass-border)' : 'none' }}>
              <div className="skeleton-bar" style={{ width: 34, height: 34, borderRadius: 10 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton-bar" style={{ width: '70%', height: 13, marginBottom: 6 }} />
                <div className="skeleton-bar" style={{ width: '35%', height: 11 }} />
              </div>
            </div>
          ))
        ) : filteredEntries.length === 0 ? (
          <EmptyState
            icon="ti-history"
            title={typeFilter ? `No ${typeFilter.toLowerCase()} activity recorded` : 'No activity logged yet'}
            description="Actions across your store (sales, purchases, stock movements) will be recorded here automatically."
          />
        ) : (
          filteredEntries.map((e, i) => (
            <div
              key={e.id}
              style={{
                display: 'flex',
                gap: 12,
                padding: '12px 0',
                borderBottom: i < filteredEntries.length - 1 ? '1px solid var(--glass-border)' : 'none',
                alignItems: 'flex-start',
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  flexShrink: 0,
                  background: (ACTION_COLORS[e.action] || '#6366f1') + '22',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <i
                  className={`ti ${ICONS[e.entityType] || 'ti-activity'}`}
                  style={{ fontSize: 16, color: ACTION_COLORS[e.action] || 'var(--brand)' }}
                />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13.5, color: 'var(--text-primary)', fontWeight: 500 }}>
                  {e.description}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2, display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span>{e.userName || 'System'}</span>
                  <span>·</span>
                  <span>{timeAgo(e.createdAt)}</span>
                  {e.entityType && (
                    <>
                      <span>·</span>
                      <span className="badge badge-neutral" style={{ fontSize: 9.5, padding: '0 5px' }}>
                        {e.entityType}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {!loading && entries.length > 0 && (
        <div className="pagination">
          <button className="btn btn-secondary btn-sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
            <i className="ti ti-chevron-left" /> Prev
          </button>
          <span>Page {page + 1} of {Math.max(1, totalPages)}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage((p) => p + 1)} disabled={page + 1 >= totalPages}>
            Next <i className="ti ti-chevron-right" />
          </button>
        </div>
      )}
    </div>
  );
}