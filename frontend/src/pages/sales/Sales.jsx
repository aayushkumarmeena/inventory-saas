import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { salesApi } from '../../api/salesApi';
import { productApi } from '../../api/productApi';
import { customerApi } from '../../api/customerApi';
import { fmtCurrency, fmtDate, downloadBlob } from '../../utils/formatters';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import SaleDetail from './SaleDetail';
import Receipt from './Receipt';
import EmptyState from '../../components/EmptyState';
import ConfirmDialog from '../../components/ConfirmDialog';

function statusBadge(s) {
  const map = { PAID: 'badge-success', PARTIAL: 'badge-warning', PENDING: 'badge-warning', OVERDUE: 'badge-danger', CANCELLED: 'badge-neutral' };
  return <span className={`badge ${map[s] || 'badge-neutral'}`}>{s}</span>;
}

function ReturnModal({ sale, onClose, onSaved }) {
  const [selected, setSelected] = useState(() =>
    Object.fromEntries((sale.items || []).map((i) => [i.id, '']))
  );
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const lines = (sale.items || []).filter((i) => Number(selected[i.id]) > 0);
  const total = lines.reduce((sum, i) => sum + Number(selected[i.id]) * i.unitPrice, 0);

  const submit = async (e) => {
    e.preventDefault();
    if (lines.length === 0) {
      setError('Enter a quantity to return for at least one item');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await salesApi.createReturn(sale.id, {
        reason: reason || null,
        items: lines.map((i) => ({ saleItemId: i.id, quantity: Number(selected[i.id]) })),
      });
      toast.success('Return recorded, stock restored');
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || (err.request ? 'Could not reach the server.' : 'Something went wrong'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Return items · ${sale.saleNumber}`} onClose={onClose} maxWidth={480}>
      {error && <div className="banner banner-error"><i className="ti ti-alert-circle" /><span>{error}</span></div>}
      <form onSubmit={submit}>
        <label className="field-label">Quantity to return per item</label>
        {(sale.items || []).map((i) => (
          <div key={i.id} style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <div style={{ fontSize: 12.5, color: 'var(--text-primary)' }}>
              {i.productName} <span style={{ color: 'var(--text-secondary)' }}>(bought {i.quantity})</span>
            </div>
            <input
              className="field-input"
              type="number"
              min="0"
              max={i.quantity}
              placeholder="0"
              value={selected[i.id]}
              onChange={(e) => setSelected((s) => ({ ...s, [i.id]: e.target.value }))}
            />
          </div>
        ))}

        <div style={{ marginTop: 10, marginBottom: 4 }}>
          <label className="field-label">Reason (optional)</label>
          <input className="field-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Damaged, wrong item…" />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid var(--glass-border)', marginTop: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Refund total</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{fmtCurrency(total)}</span>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving && <span className="spinner" />}
            {saving ? 'Processing…' : 'Confirm return'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function RecordPaymentModal({ sale, onClose, onSaved }) {
  const [amount, setAmount] = useState(sale.balanceDue);
  const [method, setMethod] = useState('CASH');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await salesApi.recordPayment(sale.id, { amount: Number(amount), method, notes: notes || null });
      toast.success('Payment recorded');
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || (err.request ? 'Could not reach the server.' : 'Something went wrong'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Record payment · ${sale.saleNumber}`} onClose={onClose} maxWidth={400}>
      {error && <div className="banner banner-error"><i className="ti ti-alert-circle" /><span>{error}</span></div>}
      <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 14 }}>
        Balance due: <strong style={{ color: 'var(--text-primary)' }}>{fmtCurrency(sale.balanceDue)}</strong> of {fmtCurrency(sale.totalAmount)}
      </div>
      <form onSubmit={submit}>
        <div className="field-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label className="field-label">Amount</label>
            <input className="field-input" type="number" step="0.01" min="0.01" max={sale.balanceDue} value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div>
            <label className="field-label">Method</label>
            <select className="field-input" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="CASH">Cash</option>
              <option value="CARD">Card (POS / Swipe)</option>
              <option value="UPI">UPI / QR Code</option>
              <option value="BANK_TRANSFER">Bank transfer / NEFT</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 4 }}>
          <label className="field-label">Notes (optional)</label>
          <input className="field-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Transaction ref, Cheque no." />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving && <span className="spinner" />}
            {saving ? 'Recording…' : 'Record payment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function NewSaleModal({ onClose, onSaved }) {
  const [products, setProducts] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [knownCustomers, setKnownCustomers] = useState([]);
  const [lines, setLines] = useState([{ productId: '', quantity: 1 }]);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const toast = useToast();

  useEffect(() => {
    productApi
      .list({ page: 0, size: 200 })
      .then((r) => setProducts(r.data.data.content || []))
      .catch(() => {})
      .finally(() => setLoadingProducts(false));
    customerApi.list({ page: 0, size: 200 }).then((r) => setKnownCustomers(r.data.data.content || [])).catch(() => {});
  }, []);

  const updateLine = (i, key, val) => setLines((p) => p.map((l, idx) => (idx === i ? { ...l, [key]: val } : l)));
  const addLine = () => setLines((p) => [...p, { productId: '', quantity: 1 }]);
  const removeLine = (i) => setLines((p) => p.filter((_, idx) => idx !== i));

  const productById = (id) => products.find((p) => String(p.id) === String(id));
  const subtotal = lines.reduce((sum, l) => {
    const p = productById(l.productId);
    return sum + (p ? p.price * Number(l.quantity || 0) : 0);
  }, 0);

  const submit = async (e) => {
    e.preventDefault();
    const validLines = lines.filter((l) => l.productId && Number(l.quantity) > 0);
    if (validLines.length === 0) {
      setError('Add at least one product line');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await salesApi.create({
        customerName: customerName || null,
        paymentMethod: paymentMethod,
        items: validLines.map((l) => ({ productId: Number(l.productId), quantity: Number(l.quantity) })),
      });
      toast.success('Sale recorded successfully');
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || (err.request ? 'Could not reach the server.' : 'Something went wrong'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Record New Sale" onClose={onClose} maxWidth={580}>
      {error && <div className="banner banner-error"><i className="ti ti-alert-circle" /><span>{error}</span></div>}

      {loadingProducts ? (
        <div className="empty-state" style={{ padding: '30px 0' }}>
          <div className="skeleton-bar" style={{ width: 160, height: 16, margin: '0 auto' }} />
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon="ti-package-off"
          title="No products to sell"
          description="Add products to your catalog first before recording a sale."
          compact
        />
      ) : (
        <form onSubmit={submit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12, marginBottom: 14 }} className="field-grid">
            <div>
              <label className="field-label">Customer (optional)</label>
              <input className="field-input" list="known-customers" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Walk-in Customer" />
              <datalist id="known-customers">
                {knownCustomers.map((c) => <option key={c.id} value={c.name} />)}
              </datalist>
            </div>
            <div>
              <label className="field-label">Payment Mode</label>
              <select className="field-input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="CASH">Cash</option>
                <option value="UPI">UPI / QR Code</option>
                <option value="CARD">Card / POS</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
              </select>
            </div>
          </div>

          <label className="field-label">Sale Items</label>
          {lines.map((line, i) => {
            const p = productById(line.productId);
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 32px', gap: 8, marginBottom: 8, alignItems: 'center' }} className="item-row-grid">
                <select className="field-input" value={line.productId} onChange={(e) => updateLine(i, 'productId', e.target.value)}>
                  <option value="">Select product…</option>
                  {products.map((prod) => (
                    <option key={prod.id} value={prod.id} disabled={prod.stockQuantity <= 0}>
                      {prod.name} · {fmtCurrency(prod.price)} {prod.stockQuantity <= 0 ? '(Out of stock)' : `(${prod.stockQuantity} in stock)`}
                    </option>
                  ))}
                </select>
                <input
                  className="field-input"
                  type="number"
                  min="1"
                  max={p?.stockQuantity || undefined}
                  value={line.quantity}
                  onChange={(e) => updateLine(i, 'quantity', e.target.value)}
                />
                <button type="button" className="btn btn-ghost btn-icon" onClick={() => removeLine(i)} disabled={lines.length === 1} aria-label="Remove line">
                  <i className="ti ti-trash" style={{ fontSize: 14 }} />
                </button>
              </div>
            );
          })}
          <button type="button" className="btn btn-secondary btn-sm" onClick={addLine} style={{ marginBottom: 16 }}>
            <i className="ti ti-plus" /> Add line
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderTop: '1px solid var(--glass-border)', marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Total Payable</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--brand)', fontFamily: 'var(--font-display)' }}>{fmtCurrency(subtotal)}</span>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving && <span className="spinner" />}
              {saving ? 'Recording…' : 'Complete Sale'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

const STATUSES = ['', 'PAID', 'PARTIAL', 'PENDING', 'OVERDUE', 'CANCELLED'];

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [showNew, setShowNew] = useState(false);
  const [filters, setFilters] = useState({ from: '', to: '', status: '', customer: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDetailSaleId, setSelectedDetailSaleId] = useState(null);
  const [receiptSale, setReceiptSale] = useState(null);
  const [paymentSale, setPaymentSale] = useState(null);
  const [returnSale, setReturnSale] = useState(null);
  const [cancelSaleItem, setCancelSaleItem] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [exporting, setExporting] = useState(false);
  const nav = useNavigate();
  const toast = useToast();
  const [loadError, setLoadError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setLoadError('');
    salesApi
      .list({
        page, size: 20,
        from: filters.from || undefined, to: filters.to || undefined,
        status: filters.status || undefined, customer: filters.customer || undefined,
      })
      .then((r) => {
        setSales(r.data.data.content || []);
        setTotalPages(r.data.data.totalPages || 0);
      })
      .catch((err) => {
        setLoadError(err.response?.data?.message || (err.request ? 'Could not reach the server.' : 'Failed to load sales.'));
        setSales([]);
      })
      .finally(() => setLoading(false));
  }, [page, filters]);

  useEffect(() => {
    load();
  }, [load]);

  const onSaved = () => {
    setShowNew(false);
    setPage(0);
    load();
  };

  const handleConfirmCancel = async () => {
    if (!cancelSaleItem) return;
    setCancelling(true);
    try {
      await salesApi.cancel(cancelSaleItem.id);
      toast.success('Sale cancelled, product stock restored');
      setCancelSaleItem(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not cancel sale');
    } finally {
      setCancelling(false);
    }
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const totalPageRevenue = useMemo(() => {
    return sales
      .filter((s) => s.paymentStatus !== 'CANCELLED')
      .reduce((sum, s) => sum + Number(s.totalAmount || 0), 0);
  }, [sales]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const r = await salesApi.export({
        from: filters.from || undefined, to: filters.to || undefined,
        status: filters.status || undefined, customer: filters.customer || undefined,
      });
      downloadBlob(r.data, 'sales.csv');
      toast.success('Sales exported');
    } catch (err) {
      toast.error('Could not export sales');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales & Billing</h1>
          <p className="page-subtitle">Record customer purchases, collect payments, print receipts, and issue GST tax invoices.</p>
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
            <i className="ti ti-plus" /> New sale
          </button>
        </div>
      </div>

      {/* Filter Bar */}
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
            <label className="field-label">Customer</label>
            <input className="field-input" value={filters.customer} onChange={(e) => { setFilters((f) => ({ ...f, customer: e.target.value })); setPage(0); }} placeholder="Search customer…" />
          </div>
          {activeFilterCount > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setFilters({ from: '', to: '', status: '', customer: '' }); setPage(0); }}>
              Clear
            </button>
          )}
        </div>
      )}

      {loadError && <div className="banner banner-error"><i className="ti ti-alert-circle" /><span>{loadError}</span></div>}

      {/* Sales Data Table */}
      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Sale #</th>
              <th>Date</th>
              <th>Customer</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(4)].map((_, i) => (
                <tr key={i} className="skeleton-row">
                  {[...Array(6)].map((__, j) => (
                    <td key={j}><div className="skeleton-bar" style={{ width: '60%' }} /></td>
                  ))}
                </tr>
              ))
            ) : sales.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    icon="ti-receipt-off"
                    title={activeFilterCount ? 'No sales match your filters' : 'No sales recorded yet'}
                    description={activeFilterCount ? 'Try widening or clearing your search filters.' : 'Record your first sale to start tracking revenue.'}
                    actionText={!activeFilterCount ? 'Record new sale' : undefined}
                    onAction={() => setShowNew(true)}
                  />
                </td>
              </tr>
            ) : (
              sales.map((s) => (
                <tr
                  key={s.id}
                  className="is-clickable"
                  style={{ opacity: s.paymentStatus === 'CANCELLED' ? 0.55 : 1 }}
                  onClick={() => setSelectedDetailSaleId(s.id)}
                >
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--brand)', fontWeight: 600 }}>
                    {s.saleNumber}
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{fmtDate(s.saleDate)}</td>
                  <td>{s.customerName || 'Walk-in Customer'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {fmtCurrency(s.totalAmount)}
                    {Number(s.balanceDue) > 0 && s.paymentStatus !== 'CANCELLED' && (
                      <div style={{ fontSize: 10.5, color: 'var(--danger-text)', fontWeight: 400 }}>{fmtCurrency(s.balanceDue)} due</div>
                    )}
                  </td>
                  <td>{statusBadge(s.paymentStatus)}</td>
                  <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon btn-sm"
                        title="Print Receipt"
                        onClick={() => setReceiptSale(s)}
                      >
                        <i className="ti ti-printer" style={{ fontSize: 13 }} />
                      </button>
                      {Number(s.balanceDue) > 0 && s.paymentStatus !== 'CANCELLED' && (
                        <button className="btn btn-secondary btn-sm" onClick={() => setPaymentSale(s)}>
                          <i className="ti ti-cash" /> Pay
                        </button>
                      )}
                      <button className="btn btn-secondary btn-sm" onClick={() => nav(`/gst/invoices/new?saleId=${s.id}`)}>
                        <i className="ti ti-file-invoice" /> GST
                      </button>
                      {s.paymentStatus !== 'CANCELLED' && (
                        <button className="btn btn-secondary btn-sm" onClick={() => setReturnSale(s)}>
                          <i className="ti ti-rotate" /> Return
                        </button>
                      )}
                      {s.paymentStatus !== 'CANCELLED' && (
                        <button className="btn btn-danger btn-sm" onClick={() => setCancelSaleItem(s)}>
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

      {!loading && sales.length > 0 && (
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

      {/* Modals & Slide-over Drawer */}
      {showNew && <NewSaleModal onClose={() => setShowNew(false)} onSaved={onSaved} />}

      {selectedDetailSaleId && (
        <SaleDetail
          saleId={selectedDetailSaleId}
          onClose={() => setSelectedDetailSaleId(null)}
          onPrintReceipt={(s) => { setSelectedDetailSaleId(null); setReceiptSale(s); }}
          onRecordPayment={(s) => setPaymentSale(s)}
          onGenerateGstInvoice={(s) => nav(`/gst/invoices/new?saleId=${s.id}`)}
        />
      )}

      {receiptSale && (
        <Receipt
          sale={receiptSale}
          onClose={() => setReceiptSale(null)}
        />
      )}

      {paymentSale && (
        <RecordPaymentModal
          sale={paymentSale}
          onClose={() => setPaymentSale(null)}
          onSaved={() => { setPaymentSale(null); load(); }}
        />
      )}

      {returnSale && (
        <ReturnModal
          sale={returnSale}
          onClose={() => setReturnSale(null)}
          onSaved={() => { setReturnSale(null); load(); }}
        />
      )}

      {cancelSaleItem && (
        <ConfirmDialog
          isOpen={Boolean(cancelSaleItem)}
          title="Cancel Sale"
          message={`Are you sure you want to cancel sale ${cancelSaleItem.saleNumber}? This will restore stock for all items in this sale.`}
          confirmText="Cancel Sale"
          variant="danger"
          loading={cancelling}
          onConfirm={handleConfirmCancel}
          onCancel={() => setCancelSaleItem(null)}
        />
      )}
    </div>
  );
}