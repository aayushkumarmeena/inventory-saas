import React, { useState, useEffect, useCallback } from 'react';
import { purchaseApi } from '../../api/purchaseApi';
import { productApi } from '../../api/productApi';
import { supplierApi } from '../../api/supplierApi';
import { fmtCurrency, fmtDate, downloadBlob } from '../../utils/formatters';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import ConfirmDialog from '../../components/ConfirmDialog';

function statusBadge(s) {
  const map = { RECEIVED: 'badge-success', ORDERED: 'badge-warning', CANCELLED: 'badge-neutral' };
  return <span className={`badge ${map[s] || 'badge-neutral'}`}>{s}</span>;
}

function NewPurchaseModal({ onClose, onSaved }) {
  const [products, setProducts] = useState([]);
  const [supplierName, setSupplierName] = useState('');
  const [knownSuppliers, setKnownSuppliers] = useState([]);
  const [lines, setLines] = useState([{ productId: '', quantity: 1, unitCost: '' }]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const toast = useToast();

  useEffect(() => {
    productApi.list({ page: 0, size: 200 }).then((r) => setProducts(r.data.data.content || [])).catch(() => {}).finally(() => setLoadingProducts(false));
    supplierApi.list({ page: 0, size: 200 }).then((r) => setKnownSuppliers(r.data.data.content || [])).catch(() => {});
  }, []);

  const updateLine = (i, key, val) => setLines((p) => p.map((l, idx) => {
    if (idx !== i) return l;
    const next = { ...l, [key]: val };
    if (key === 'productId' && !l.unitCost) {
      const prod = products.find((pr) => String(pr.id) === String(val));
      if (prod) next.unitCost = prod.price;
    }
    return next;
  }));
  const addLine = () => setLines((p) => [...p, { productId: '', quantity: 1, unitCost: '' }]);
  const removeLine = (i) => setLines((p) => p.filter((_, idx) => idx !== i));

  const total = lines.reduce((sum, l) => sum + Number(l.quantity || 0) * Number(l.unitCost || 0), 0);

  const submit = async (e) => {
    e.preventDefault();
    const validLines = lines.filter((l) => l.productId && Number(l.quantity) > 0 && l.unitCost !== '');
    if (validLines.length === 0) {
      setError('Add at least one product line with a cost');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await purchaseApi.create({
        supplierName: supplierName || null,
        items: validLines.map((l) => ({ productId: Number(l.productId), quantity: Number(l.quantity), unitCost: Number(l.unitCost) })),
      });
      toast.success('Purchase recorded, stock updated');
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || (err.request ? 'Could not reach the server.' : 'Something went wrong'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Create Purchase Order" onClose={onClose} maxWidth={600}>
      {error && <div className="banner banner-error"><i className="ti ti-alert-circle" /><span>{error}</span></div>}

      {loadingProducts ? (
        <div className="empty-state" style={{ padding: '30px 0' }}>
          <div className="skeleton-bar" style={{ width: 160, height: 16, margin: '0 auto' }} />
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon="ti-package-off"
          title="No products yet"
          description="Add products to catalog first before recording a purchase."
          compact
        />
      ) : (
        <form onSubmit={submit}>
          <div style={{ marginBottom: 14 }}>
            <label className="field-label">Supplier (optional)</label>
            <input className="field-input" list="known-suppliers" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="Acme Distributors" />
            <datalist id="known-suppliers">
              {knownSuppliers.map((s) => <option key={s.id} value={s.name} />)}
            </datalist>
          </div>

          <label className="field-label">Items to Restock</label>
          {lines.map((line, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.6fr 0.7fr 0.9fr 32px', gap: 8, marginBottom: 8 }} className="item-row-grid">
              <select className="field-input" value={line.productId} onChange={(e) => updateLine(i, 'productId', e.target.value)}>
                <option value="">Select product…</option>
                {products.map((prod) => <option key={prod.id} value={prod.id}>{prod.name} · {prod.stockQuantity} in stock</option>)}
              </select>
              <input className="field-input" type="number" min="1" placeholder="Qty" value={line.quantity} onChange={(e) => updateLine(i, 'quantity', e.target.value)} />
              <input className="field-input" type="number" min="0" step="0.01" placeholder="Unit cost" value={line.unitCost} onChange={(e) => updateLine(i, 'unitCost', e.target.value)} />
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => removeLine(i)} disabled={lines.length === 1} aria-label="Remove line">
                <i className="ti ti-trash" style={{ fontSize: 14 }} />
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-secondary btn-sm" onClick={addLine} style={{ marginBottom: 16 }}>
            <i className="ti ti-plus" /> Add line
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid var(--glass-border)', marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Total cost</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{fmtCurrency(total)}</span>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving && <span className="spinner" />}
              {saving ? 'Recording…' : 'Record purchase'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

const STATUSES = ['', 'ORDERED', 'RECEIVED', 'CANCELLED'];

export default function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [showNew, setShowNew] = useState(false);
  const [filters, setFilters] = useState({ from: '', to: '', status: '', supplier: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [cancelPurchaseItem, setCancelPurchaseItem] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [exporting, setExporting] = useState(false);
  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    setLoadError('');
    purchaseApi
      .list({
        page, size: 20,
        from: filters.from || undefined, to: filters.to || undefined,
        status: filters.status || undefined, supplier: filters.supplier || undefined,
      })
      .then((r) => { setPurchases(r.data.data.content || []); setTotalPages(r.data.data.totalPages || 0); })
      .catch((err) => {
        setLoadError(err.response?.data?.message || (err.request ? 'Could not reach the server.' : 'Failed to load purchases.'));
        setPurchases([]);
      })
      .finally(() => setLoading(false));
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);

  const onSaved = () => { setShowNew(false); setPage(0); load(); };

  const handleConfirmCancel = async () => {
    if (!cancelPurchaseItem) return;
    setCancelling(true);
    try {
      await purchaseApi.cancel(cancelPurchaseItem.id);
      toast.success('Purchase cancelled, stock reversed');
      setCancelPurchaseItem(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not cancel purchase');
    } finally {
      setCancelling(false);
    }
  };

  const receivePurchase = async (id) => {
    try {
      await purchaseApi.receive(id);
      toast.success('Marked received — stock added');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not mark as received');
    }
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const exportCsv = async () => {
    setExporting(true);
    try {
      const r = await purchaseApi.export({
        from: filters.from || undefined, to: filters.to || undefined,
        status: filters.status || undefined, supplier: filters.supplier || undefined,
      });
      downloadBlob(r.data, 'purchases.csv');
      toast.success('Purchases exported');
    } catch (err) {
      toast.error('Could not export purchases');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Purchases & Procurement</h1>
          <p className="page-subtitle">Order stock from suppliers, manage inbound shipments, and replenish catalog inventory.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`btn btn-secondary ${activeFilterCount ? 'btn-primary' : ''}`} onClick={() => setShowFilters((s) => !s)}>
            <i className="ti ti-filter" /> Filters{activeFilterCount ? ` (${activeFilterCount})` : ''}
          </button>
          <button className="btn btn-secondary" onClick={exportCsv} disabled={exporting}>
            {exporting && <span className="spinner" />}
            <i className="ti ti-download" /> Export CSV
          </button>
          <button className="btn btn-primary" onClick={() => setShowNew(true)}>
            <i className="ti ti-plus" /> New purchase
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="card card-pad" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16 }}>
          <div>
            <label className="field-label">From</label>
            <input className="field-input" type="date" value={filters.from} onChange={(e) => { setFilters((f) => ({ ...f, from: e.target.value })); setPage(0); }} />
          </div>
          <div>
            <label className="field-label">To</label>
            <input className="field-input" type="date" value={filters.to} onChange={(e) => { setFilters((f) => ({ ...f, to: e.target.value })); setPage(0); }} />
          </div>
          <div>
            <label className="field-label">Status</label>
            <select className="field-input" value={filters.status} onChange={(e) => { setFilters((f) => ({ ...f, status: e.target.value })); setPage(0); }}>
              {STATUSES.map((s) => <option key={s} value={s}>{s || 'Any'}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label className="field-label">Supplier</label>
            <input className="field-input" value={filters.supplier} onChange={(e) => { setFilters((f) => ({ ...f, supplier: e.target.value })); setPage(0); }} placeholder="Search supplier…" />
          </div>
          {activeFilterCount > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setFilters({ from: '', to: '', status: '', supplier: '' }); setPage(0); }}>Clear</button>
          )}
        </div>
      )}

      {loadError && <div className="banner banner-error"><i className="ti ti-alert-circle" /><span>{loadError}</span></div>}

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>PO #</th>
              <th>Date</th>
              <th>Supplier</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(4)].map((_, i) => (
                <tr key={i} className="skeleton-row">{[...Array(6)].map((__, j) => <td key={j}><div className="skeleton-bar" style={{ width: '60%' }} /></td>)}</tr>
              ))
            ) : purchases.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    icon="ti-truck-delivery"
                    title={activeFilterCount ? 'No purchases match your filters' : 'No purchases recorded yet'}
                    description={activeFilterCount ? 'Try clearing or widening your search filters.' : 'Record purchase orders to replenish product catalog stock.'}
                    actionText={!activeFilterCount ? 'Create purchase order' : undefined}
                    onAction={() => setShowNew(true)}
                  />
                </td>
              </tr>
            ) : (
              purchases.map((p) => (
                <tr key={p.id} style={{ opacity: p.status === 'CANCELLED' ? 0.55 : 1 }}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--brand)', fontWeight: 600 }}>{p.purchaseNumber}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{fmtDate(p.purchaseDate)}</td>
                  <td>{p.supplierName || 'Unspecified'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtCurrency(p.totalAmount)}</td>
                  <td>{statusBadge(p.status)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      {p.status === 'ORDERED' && (
                        <button className="btn btn-secondary btn-sm" onClick={() => receivePurchase(p.id)}>
                          <i className="ti ti-package-import" /> Receive
                        </button>
                      )}
                      {p.status !== 'CANCELLED' && (
                        <button className="btn btn-danger btn-sm" onClick={() => setCancelPurchaseItem(p)}>
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && purchases.length > 0 && (
        <div className="pagination">
          <button className="btn btn-secondary btn-sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}><i className="ti ti-chevron-left" /> Prev</button>
          <span>Page {page + 1} of {Math.max(1, totalPages)}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage((p) => p + 1)} disabled={page + 1 >= totalPages}>Next <i className="ti ti-chevron-right" /></button>
        </div>
      )}

      {showNew && <NewPurchaseModal onClose={() => setShowNew(false)} onSaved={onSaved} />}

      {cancelPurchaseItem && (
        <ConfirmDialog
          isOpen={Boolean(cancelPurchaseItem)}
          title="Cancel Purchase Order"
          message={`Are you sure you want to cancel purchase order ${cancelPurchaseItem.purchaseNumber}? Any stock already added will be reversed.`}
          confirmText="Cancel Purchase"
          variant="danger"
          loading={cancelling}
          onConfirm={handleConfirmCancel}
          onCancel={() => setCancelPurchaseItem(null)}
        />
      )}
    </div>
  );
}