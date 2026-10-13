import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { productApi } from '../api/productApi';
import { batchApi } from '../api/batchApi';

export default function NotificationPopover({ isOpen, onClose }) {
  const nav = useNavigate();
  const popoverRef = useRef(null);
  const [filter, setFilter] = useState('ALL'); // ALL | STOCK | EXPIRY
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [readIds, setReadIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('inventory_read_notifications') || '[]');
    } catch {
      return [];
    }
  });

  // Load low stock items and expiring batches
  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    Promise.allSettled([
      productApi.lowStock(),
      batchApi.summary(),
      batchApi.list({ page: 0, size: 20 }),
    ]).then(([stockRes, summaryRes, batchListRes]) => {
      const items = [];

      // 1. Process Low Stock Alerts
      if (stockRes.status === 'fulfilled' && stockRes.value?.data?.data) {
        const lowProds = stockRes.value.data.data;
        lowProds.forEach((p) => {
          items.push({
            id: `stock-${p.id}`,
            type: 'STOCK',
            severity: 'DANGER',
            title: `Low Stock: ${p.name}`,
            message: `Only ${p.stockQuantity} units left in stock (reorder threshold: ${p.reorderPoint || p.reorderLevel || 10})`,
            icon: 'ti-alert-triangle',
            iconColor: '#ef4444',
            iconBg: 'rgba(239, 68, 68, 0.12)',
            timestamp: 'Action required',
            actionPath: '/products',
          });
        });
      }

      // 2. Process Batch Expiry Alerts
      let batches = [];
      if (batchListRes.status === 'fulfilled' && batchListRes.value?.data?.data?.content) {
        batches = batchListRes.value.data.data.content;
      }
      batches.forEach((b) => {
        const days = b.daysUntilExpiry;
        if (b.isExpired || days <= 30) {
          items.push({
            id: `batch-${b.id}`,
            type: 'EXPIRY',
            severity: days <= 15 ? 'DANGER' : 'WARNING',
            title: `Batch Expiring: ${b.productName || 'Product'} (${b.batchNumber})`,
            message: b.isExpired
              ? `Expired ${Math.abs(days)} days ago · ${b.quantity} units remaining`
              : `Expires in ${days} days (${b.expiryDate}) · ${b.quantity} units on shelf`,
            icon: 'ti-calendar-time',
            iconColor: days <= 15 ? '#ef4444' : '#f59e0b',
            iconBg: days <= 15 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.12)',
            timestamp: `${days}d left`,
            actionPath: '/inventory',
          });
        }
      });

      // 3. Informative / System Alert
      items.push({
        id: 'system-online',
        type: 'SYSTEM',
        severity: 'INFO',
        title: 'System Operational',
        message: 'Cloud inventory and GST billing services are fully synchronized.',
        icon: 'ti-shield-check',
        iconColor: '#10b981',
        iconBg: 'rgba(16, 185, 129, 0.12)',
        timestamp: 'Active',
        actionPath: '/dashboard',
      });

      setAlerts(items);
      setLoading(false);
    });
  }, [isOpen]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        const trigger = e.target.closest('[data-notification-trigger]');
        if (!trigger) {
          onClose();
        }
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Mark all as read
  const handleMarkAllRead = () => {
    const allIds = alerts.map((a) => a.id);
    const updated = Array.from(new Set([...readIds, ...allIds]));
    setReadIds(updated);
    try {
      localStorage.setItem('inventory_read_notifications', JSON.stringify(updated));
    } catch {}
  };

  const handleItemClick = (item) => {
    if (!readIds.includes(item.id)) {
      const updated = [...readIds, item.id];
      setReadIds(updated);
      try {
        localStorage.setItem('inventory_read_notifications', JSON.stringify(updated));
      } catch {}
    }
    onClose();
    if (item.actionPath) {
      nav(item.actionPath);
    }
  };

  if (!isOpen) return null;

  const filtered = alerts.filter((a) => {
    if (filter === 'ALL') return true;
    if (filter === 'STOCK') return a.type === 'STOCK';
    if (filter === 'EXPIRY') return a.type === 'EXPIRY';
    return true;
  });

  const unreadCount = alerts.filter((a) => !readIds.includes(a.id)).length;

  return (
    <div
      ref={popoverRef}
      style={{
        position: 'absolute',
        top: 48,
        right: 0,
        width: 380,
        maxWidth: '92vw',
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        boxShadow: '0 20px 48px -8px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        zIndex: 1000,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface-2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-bell-ringing" style={{ fontSize: 18, color: 'var(--brand)' }} />
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
            Notifications
          </span>
          {unreadCount > 0 && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                background: 'var(--brand)',
                color: '#fff',
                padding: '1px 7px',
                borderRadius: 12,
              }}
            >
              {unreadCount} new
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {unreadCount > 0 && (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ fontSize: 11, padding: '3px 8px' }}
              onClick={handleMarkAllRead}
              title="Mark all notifications as read"
            >
              <i className="ti ti-check" /> Mark all read
            </button>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            style={{ width: 24, height: 24, padding: 0 }}
            onClick={onClose}
            aria-label="Close notifications"
          >
            <i className="ti ti-x" style={{ fontSize: 14 }} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          padding: '8px 14px',
          gap: 6,
          background: 'var(--surface-sunken)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {[
          { key: 'ALL', label: 'All Alerts', count: alerts.length },
          { key: 'STOCK', label: 'Low Stock', count: alerts.filter((a) => a.type === 'STOCK').length },
          { key: 'EXPIRY', label: 'Expiry & Batches', count: alerts.filter((a) => a.type === 'EXPIRY').length },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            style={{
              padding: '4px 10px',
              fontSize: 11.5,
              fontWeight: filter === tab.key ? 600 : 500,
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              background: filter === tab.key ? 'var(--brand)' : 'transparent',
              color: filter === tab.key ? '#fff' : 'var(--text-secondary)',
              transition: 'background 0.15s, color 0.15s',
            }}
            onClick={() => setFilter(tab.key)}
          >
            {tab.label} {tab.count > 0 && `(${tab.count})`}
          </button>
        ))}
      </div>

      {/* Alert list */}
      <div style={{ maxHeight: 380, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 36 }}>
            <span className="spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-secondary)' }}>
            <i className="ti ti-bell-off" style={{ fontSize: 32, opacity: 0.4, display: 'block', marginBottom: 8 }} />
            <div style={{ fontSize: 13, fontWeight: 500 }}>No notifications found</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>You're all caught up on inventory and stock events.</div>
          </div>
        ) : (
          filtered.map((item) => {
            const isRead = readIds.includes(item.id);
            return (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  background: isRead ? 'transparent' : 'rgba(99, 102, 241, 0.05)',
                  transition: 'background 0.15s',
                  position: 'relative',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = isRead ? 'transparent' : 'rgba(99, 102, 241, 0.05)'; }}
              >
                {!isRead && (
                  <span
                    style={{
                      position: 'absolute',
                      left: 6,
                      top: 16,
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--brand)',
                    }}
                  />
                )}

                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: item.iconBg,
                    color: item.iconColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: 16,
                  }}
                >
                  <i className={`ti ${item.icon}`} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
                    <div style={{ fontSize: 12.5, fontWeight: isRead ? 500 : 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.title}
                    </div>
                    <span style={{ fontSize: 10.5, color: 'var(--text-muted)', flexShrink: 0 }}>
                      {item.timestamp}
                    </span>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {item.message}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '10px 16px',
          background: 'var(--surface-2)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          style={{ fontSize: 11.5, padding: '4px 8px', color: 'var(--brand)' }}
          onClick={() => { onClose(); nav('/inventory'); }}
        >
          Stock & Batches <i className="ti ti-arrow-right" style={{ fontSize: 11 }} />
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          style={{ fontSize: 11.5, padding: '4px 8px' }}
          onClick={() => { onClose(); nav('/products'); }}
        >
          All Products <i className="ti ti-arrow-right" style={{ fontSize: 11 }} />
        </button>
      </div>
    </div>
  );
}
