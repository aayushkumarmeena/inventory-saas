import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { stockApi } from '../../api/stockApi';
import { productApi } from '../../api/productApi';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import ScanStockModal from '../../components/ScanStockModal';
import { fmtDate, fmtCurrency } from '../../utils/formatters';

function AdjustModal({ presetProductId, onClose, onSaved }) {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ productId: presetProductId || '', direction: 'IN', quantity: 1, reason: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    productApi.list({ page: 0, size: 200 }).then((r) => setProducts(r.data.data.content || [])).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.productId) {
      setError('Select a product');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await stockApi.adjust({ ...form, quantity: Number(form.quantity) });
      toast.success('Stock updated');
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || (err.request ? 'Could not reach the server.' : 'Something went wrong'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Adjust stock" onClose={onClose}>
      {error && <div className="banner banner-error"><i className="ti ti-alert-circle" /><span>{error}</span></div>}
      <form onSubmit={submit}>
        <div style={{ marginBottom: 12 }}>
          <label className="field-label">Product</label>
          <select className="field-input" value={form.productId} onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))} required>
            <option value="">Select product…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name} · {p.stockQuantity} in stock</option>
            ))}
          </select>
        </div>
        <div className="field-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label className="field-label">Direction</label>
            <select className="field-input" value={form.direction} onChange={(e) => setForm((f) => ({ ...f, direction: e.target.value }))}>
              <option value="IN">Stock in (+)</option>
              <option value="OUT">Stock out (−)</option>
            </select>
          </div>
          <div>
            <label className="field-label">Quantity</label>
            <input className="field-input" type="number" min="1" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} required />
          </div>
        </div>
        <div style={{ marginBottom: 4 }}>
          <label className="field-label">Reason (optional)</label>
          <input className="field-input" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} placeholder="Restock, damage, correction…" />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving && <span className="spinner" />}
            {saving ? 'Saving…' : 'Apply adjustment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Inventory() {
  const [params, setParams] = useSearchParams();
  const productIdFilter = params.get('productId') || '';

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [showScan, setShowScan] = useState(false);
  const [presetProductId, setPresetProductId] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [lowStock, setLowStock] = useState([]);

  const load = useCallback(() => {
    setLoading(true);
    stockApi
      .list({ page, size: 20, productId: productIdFilter || undefined })
      .then((r) => { setRows(r.data.data.content || []); setTotalPages(r.data.data.totalPages || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, productIdFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    productApi.list({ page: 0, size: 200 }).then((r) => setAllProducts(r.data.data.content || [])).catch(() => {});
    productApi.lowStock().then((r) => setLowStock(r.data.data || [])).catch(() => {});
  }, []);

  const openAdjust = (productId) => {
    setPresetProductId(productId || null);
    setShowModal(true);
  };

  const onSaved = () => {
    setShowModal(false);
    setPage(0);
    load();
    productApi.lowStock().then((r) => setLowStock(r.data.data || [])).catch(() => {});
  };

  const filterByProduct = (id) => {
    setPage(0);
    if (id) setParams({ productId: id });
    else setParams({});
  };

  const filteredProductName = allProducts.find((p) => String(p.id) === String(productIdFilter))?.name;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Stock</h1>
          <p className="page-subtitle">Manual stock adjustments and movement history.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setShowScan(true)}>
            <i className="ti ti-qrcode" /> Scan to add stock
          </button>
          <button className="btn btn-primary" onClick={() => openAdjust(null)}>
            <i className="ti ti-adjustments" /> Adjust stock
          </button>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="card card-pad" style={{ marginBottom: 16, borderColor: 'var(--danger-text)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <i className="ti ti-alert-triangle" style={{ color: 'var(--danger-text)' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              {lowStock.length} product{lowStock.length === 1 ? '' : 's'} running low
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {lowStock.map((p) => (
              <button key={p.id} className="btn btn-secondary btn-sm" onClick={() => openAdjust(p.id)}>
                <i className="ti ti-plus" /> {p.name} ({p.stockQuantity} left)
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 240 }}>
          <select className="field-input" value={productIdFilter} onChange={(e) => filterByProduct(e.target.value)}>
            <option value="">All products</option>
            {allProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        {productIdFilter && (
          <button className="btn btn-ghost btn-sm" onClick={() => filterByProduct(null)}>
            <i className="ti ti-x" /> Clear filter
          </button>
        )}
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Direction</th>
              <th style={{ textAlign: 'right' }}>Qty</th>
              <th style={{ textAlign: 'right' }}>Resulting stock</th>
              <th>Reason</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="skeleton-row">
                  {[...Array(7)].map((__, j) => <td key={j}><div className="skeleton-bar" style={{ width: '60%' }} /></td>)}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">
                    <i className="ti ti-arrows-exchange" />
                    <div className="empty-state-title">
                      {productIdFilter ? `No stock movements for ${filteredProductName || 'this product'}` : 'No stock movements yet'}
                    </div>
                    <div className="empty-state-desc">Adjustments you make will show up here as a history.</div>
                    <button className="btn btn-primary btn-sm" onClick={() => openAdjust(productIdFilter || null)}><i className="ti ti-adjustments" /> Adjust stock</button>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 500 }}>{r.productName}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 11.5, color: 'var(--text-secondary)' }}>{r.productSku}</td>
                  <td>
                    <span className={`badge ${r.direction === 'IN' ? 'badge-success' : 'badge-danger'}`}>
                      <i className={`ti ${r.direction === 'IN' ? 'ti-arrow-up' : 'ti-arrow-down'}`} style={{ marginRight: 4 }} />
                      {r.direction}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>{r.quantity}</td>
                  <td style={{ textAlign: 'right', fontWeight: 500 }}>{r.resultingStock}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{r.reason || '—'}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{fmtDate(r.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && rows.length > 0 && (
        <div className="pagination">
          <button className="btn btn-secondary btn-sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}><i className="ti ti-chevron-left" /> Prev</button>
          <span>Page {page + 1} of {Math.max(1, totalPages)}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage((p) => p + 1)} disabled={page + 1 >= totalPages}>Next <i className="ti ti-chevron-right" /></button>
        </div>
      )}

      {showModal && <AdjustModal presetProductId={presetProductId} onClose={() => setShowModal(false)} onSaved={onSaved} />}
      {showScan && <ScanStockModal onClose={() => setShowScan(false)} onAdjusted={onSaved} />}
    </div>
  );
}
