import React, { useState, useEffect, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { productApi } from '../../api/productApi';
import { encodeProductQr } from '../../utils/qr';
import { fmtCurrency } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import EmptyState from '../../components/EmptyState';

export default function PrintLabels() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState({});
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('select'); // 'select' | 'preview'

  // Label settings
  const [columns, setColumns] = useState(3);
  const [showCompany, setShowCompany] = useState(true);
  const [showName, setShowName] = useState(true);
  const [showSku, setShowSku] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [qrSize, setQrSize] = useState(85);

  useEffect(() => {
    productApi.list({ page: 0, size: 500 })
      .then((r) => {
        const items = r.data.data.content || [];
        setProducts(items);
        const initQuantities = {};
        items.forEach((p) => {
          initQuantities[p.id] = 1;
        });
        setQuantities(initQuantities);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const setQty = (id, val) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    setQuantities((prev) => ({ ...prev, [id]: num }));
  };

  const toggleProduct = (id) => {
    setQuantities((prev) => ({
      ...prev,
      [id]: prev[id] > 0 ? 0 : 1,
    }));
  };

  const selectAll = () => {
    const next = {};
    products.forEach((p) => { next[p.id] = 1; });
    setQuantities(next);
  };

  const deselectAll = () => {
    const next = {};
    products.forEach((p) => { next[p.id] = 0; });
    setQuantities(next);
  };

  const filtered = useMemo(() => {
    return products.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
    );
  }, [products, search]);

  const printableLabels = useMemo(() => {
    const list = [];
    products.forEach((p) => {
      const count = quantities[p.id] || 0;
      for (let i = 0; i < count; i++) {
        list.push({ ...p, labelIndex: i });
      }
    });
    return list;
  }, [products, quantities]);

  const totalLabels = printableLabels.length;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="page">
      {/* Screen Header */}
      <div className="page-header no-print">
        <div>
          <h1 className="page-title">QR Barcode Label Studio</h1>
          <p className="page-subtitle">Generate and print scannable QR labels for merchandise, shelf tags, and inventory boxes.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className={`btn ${activeTab === 'select' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('select')}
          >
            <i className="ti ti-checklist" /> Select Items
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'preview' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('preview')}
          >
            <i className="ti ti-eye" /> Sheet Preview ({totalLabels})
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handlePrint}
            disabled={totalLabels === 0}
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }}
          >
            <i className="ti ti-printer" /> Print {totalLabels} Label{totalLabels === 1 ? '' : 's'}
          </button>
        </div>
      </div>

      {/* Configuration Controls Bar */}
      <div className="card card-pad no-print" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          {/* Layout options */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>Grid Layout:</span>
            <div style={{ display: 'flex', background: 'var(--surface-3)', borderRadius: 8, padding: 3, gap: 2 }}>
              <button
                type="button"
                className={`btn btn-sm ${columns === 2 ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => { setColumns(2); setQrSize(110); }}
              >
                2 Columns (Large)
              </button>
              <button
                type="button"
                className={`btn btn-sm ${columns === 3 ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => { setColumns(3); setQrSize(85); }}
              >
                3 Columns (Standard)
              </button>
              <button
                type="button"
                className={`btn btn-sm ${columns === 4 ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => { setColumns(4); setQrSize(68); }}
              >
                4 Columns (Compact)
              </button>
            </div>
          </div>

          {/* Toggle fields */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-primary)', cursor: 'pointer' }}>
              <input type="checkbox" checked={showCompany} onChange={(e) => setShowCompany(e.target.checked)} />
              <span>Store Name</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-primary)', cursor: 'pointer' }}>
              <input type="checkbox" checked={showName} onChange={(e) => setShowName(e.target.checked)} />
              <span>Product Title</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-primary)', cursor: 'pointer' }}>
              <input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} />
              <span>Price (₹)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-primary)', cursor: 'pointer' }}>
              <input type="checkbox" checked={showSku} onChange={(e) => setShowSku(e.target.checked)} />
              <span>SKU Code</span>
            </label>
          </div>
        </div>
      </div>

      {/* Tab: Select Products & Set Quantities */}
      {activeTab === 'select' && (
        <div className="no-print">
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div className="search-wrap" style={{ marginBottom: 0, minWidth: 260 }}>
              <i className="ti ti-search" />
              <input
                className="search-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products by name or SKU…"
              />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                Total Selected: <strong>{totalLabels}</strong>
              </span>
              <button type="button" className="btn btn-secondary btn-sm" onClick={selectAll}>
                Select All
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={deselectAll}>
                Clear Selection
              </button>
            </div>
          </div>

          {loading ? (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <div className="skeleton-bar" style={{ width: 160, height: 16, margin: '0 auto' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="card card-pad">
              <EmptyState
                icon="ti-package-off"
                title="No products found"
                description={search ? 'Try clearing your search query.' : 'Add products to your inventory catalog first.'}
              />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginBottom: 24 }}>
              {filtered.map((p) => {
                const qty = quantities[p.id] || 0;
                const isSelected = qty > 0;
                return (
                  <div
                    key={p.id}
                    className="card"
                    style={{
                      padding: 14,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      border: isSelected ? '1.5px solid var(--brand)' : '1px solid var(--glass-border)',
                      background: isSelected ? 'var(--glass-bg-strong)' : 'var(--glass-bg)',
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, cursor: 'pointer', flex: 1 }}
                      onClick={() => toggleProduct(p.id)}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleProduct(p.id)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ cursor: 'pointer' }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                          {p.sku} · {fmtCurrency(p.price)}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Qty:</span>
                      <input
                        type="number"
                        min="0"
                        max="99"
                        className="field-input"
                        style={{ width: 56, padding: '4px 6px', textAlign: 'center', fontSize: 12 }}
                        value={qty}
                        onChange={(e) => setQty(p.id, e.target.value)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: On-Screen Sheet Preview */}
      {activeTab === 'preview' && (
        <div className="no-print" style={{ marginBottom: 24 }}>
          <div
            style={{
              background: '#e5e7eb',
              borderRadius: 14,
              padding: '24px 16px',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                background: '#ffffff',
                color: '#111827',
                width: '100%',
                maxWidth: 820,
                minHeight: 500,
                padding: 24,
                borderRadius: 8,
                boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed #cbd5e1', paddingBottom: 12, marginBottom: 16 }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: '#111827' }}>
                    {user?.tenantName || 'InventoryPro'} · Print Sheet Preview
                  </span>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>
                    {totalLabels} total labels ({columns} columns grid)
                  </div>
                </div>
                <button type="button" className="btn btn-primary btn-sm" onClick={handlePrint}>
                  <i className="ti ti-printer" /> Print Sheet
                </button>
              </div>

              {totalLabels === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
                  <i className="ti ti-qrcode" style={{ fontSize: 36, opacity: 0.5, marginBottom: 8 }} />
                  <div>No labels selected. Switch to "Select Items" tab and set quantities.</div>
                </div>
              ) : (
                <div className="label-preview-container">
                  <div className={`label-sheet cols-${columns}`}>
                    {printableLabels.map((p, idx) => (
                      <div key={`preview-${p.id}-${idx}`} className="label-cell">
                        {showCompany && (
                          <div className="label-company">{user?.tenantName || 'InventoryPro'}</div>
                        )}
                        <QRCodeSVG
                          value={encodeProductQr(p.sku)}
                          size={qrSize}
                          level="M"
                          includeMargin={false}
                          fgColor="#000000"
                          bgColor="#ffffff"
                        />
                        {showName && <div className="label-name" title={p.name}>{p.name}</div>}
                        {showSku && <div className="label-sku">{p.sku}</div>}
                        {showPrice && <div className="label-price">{fmtCurrency(p.price)}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Printable Sheet (Rendered exclusively in print mode) */}
      <div className={`label-sheet cols-${columns}`}>
        {printableLabels.map((p, idx) => (
          <div key={`print-${p.id}-${idx}`} className="label-cell">
            {showCompany && (
              <div className="label-company">{user?.tenantName || 'InventoryPro'}</div>
            )}
            <QRCodeSVG
              value={encodeProductQr(p.sku)}
              size={qrSize}
              level="M"
              includeMargin={false}
              fgColor="#000000"
              bgColor="#ffffff"
            />
            {showName && <div className="label-name">{p.name}</div>}
            {showSku && <div className="label-sku">{p.sku}</div>}
            {showPrice && <div className="label-price">{fmtCurrency(p.price)}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}