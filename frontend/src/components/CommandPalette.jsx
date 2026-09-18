import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { productApi } from '../api/productApi';

const PAGES = [
  { label: 'Dashboard', icon: 'ti-layout-dashboard', path: '/' },
  { label: 'Products', icon: 'ti-package', path: '/products' },
  { label: 'Sales', icon: 'ti-receipt', path: '/sales' },
  { label: 'Purchases', icon: 'ti-truck-delivery', path: '/purchases' },
  { label: 'Stock', icon: 'ti-arrows-exchange', path: '/inventory' },
  { label: 'Customers', icon: 'ti-users', path: '/customers' },
  { label: 'Suppliers', icon: 'ti-building-warehouse', path: '/suppliers' },
  { label: 'Print Labels', icon: 'ti-qrcode', path: '/labels' },
  { label: 'Team', icon: 'ti-users-group', path: '/team' },
  { label: 'Activity', icon: 'ti-history', path: '/activity' },
  { label: 'Analytics', icon: 'ti-chart-bar', path: '/analytics' },
  { label: 'Settings', icon: 'ti-settings', path: '/settings' },
  { label: 'GST Overview', icon: 'ti-receipt-tax', path: '/gst' },
  { label: 'GST Invoices', icon: 'ti-file-invoice', path: '/gst/invoices' },
  { label: 'Generate GST Invoice', icon: 'ti-file-plus', path: '/gst/invoices/new' },
  { label: 'GSTR-1', icon: 'ti-report', path: '/gst/gstr1' },
  { label: 'GST Reports', icon: 'ti-chart-area', path: '/gst/reports' },
  { label: 'Return Periods', icon: 'ti-calendar', path: '/gst/returns' },
  { label: 'HSN / SAC Codes', icon: 'ti-list', path: '/gst/hsn-sac' },
  { label: 'Tax Calculator', icon: 'ti-calculator', path: '/gst/calculator' },
  { label: 'GST Setup', icon: 'ti-settings-2', path: '/gst/config' },
];

/**
 * Cmd/Ctrl+K global search — jumps to any page instantly, and searches
 * products live (debounced). Products currently the only searchable data
 * type since that's the only backend endpoint with server-side search.
 */
export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [productResults, setProductResults] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const nav = useNavigate();

  useEffect(() => {
    const onKeyDown = (e) => {
      const isK = e.key === 'k' || e.key === 'K';
      if ((e.metaKey || e.ctrlKey) && isK) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setProductResults([]);
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setProductResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      productApi
        .list({ page: 0, size: 5, q: query })
        .then((r) => setProductResults(r.data.data.content || []))
        .catch(() => {});
    }, 220);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const filteredPages = PAGES.filter((p) => p.label.toLowerCase().includes(query.toLowerCase()));
  const results = [
    ...filteredPages.map((p) => ({ type: 'page', ...p })),
    ...productResults.map((p) => ({ type: 'product', label: p.name, sub: p.sku, id: p.id })),
  ];

  const close = useCallback(() => setOpen(false), []);

  const go = (item) => {
    if (item.type === 'page') nav(item.path);
    else nav('/products');
    close();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && results[activeIndex]) {
      e.preventDefault();
      go(results[activeIndex]);
    }
  };

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      style={{ alignItems: 'flex-start', paddingTop: '12vh' }}
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <div
        className="modal-panel"
        style={{ maxWidth: 560, padding: 0, overflow: 'hidden' }}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid var(--glass-border)' }}>
          <i className="ti ti-search" style={{ color: 'var(--text-secondary)', fontSize: 17 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
            onKeyDown={onKeyDown}
            placeholder="Search pages or products…"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 14.5,
              color: 'var(--text-primary)',
            }}
          />
          <kbd style={{ fontSize: 10.5, color: 'var(--text-secondary)', background: 'var(--glass-bg-strong)', padding: '3px 6px', borderRadius: 5, border: '1px solid var(--glass-border)' }}>
            ESC
          </kbd>
        </div>

        <div style={{ maxHeight: 360, overflowY: 'auto', padding: 6 }}>
          {results.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 0' }}>
              <i className="ti ti-search-off" />
              <div className="empty-state-desc">No matches for "{query}"</div>
            </div>
          ) : (
            results.map((item, i) => (
              <button
                key={`${item.type}-${item.path || item.id}`}
                onClick={() => go(item)}
                onMouseEnter={() => setActiveIndex(i)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 9,
                  border: 'none',
                  background: i === activeIndex ? 'var(--glass-bg-strong)' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  font: 'inherit',
                  color: 'var(--text-primary)',
                }}
              >
                <i
                  className={`ti ${item.type === 'product' ? 'ti-package' : item.icon}`}
                  style={{ fontSize: 15, color: item.type === 'product' ? '#f59e0b' : 'var(--brand)', flexShrink: 0 }}
                />
                <span style={{ fontSize: 13.5, flex: 1 }}>{item.label}</span>
                {item.sub && <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{item.sub}</span>}
                {item.type === 'page' && <span style={{ fontSize: 10.5, color: 'var(--text-secondary)' }}>Page</span>}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
