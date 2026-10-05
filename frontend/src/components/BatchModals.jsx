import React, { useState } from 'react';
import Modal from './Modal';
import { batchApi } from '../api/batchApi';
import { useToast } from '../context/ToastContext';
import { fmtDate } from '../utils/formatters';

export function NewBatchModal({ products, onClose, onSaved }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    productId: '',
    batchNumber: '',
    mfgDate: '',
    expiryDate: '',
    initialQuantity: 10,
    purchasePrice: '',
    sellingPrice: '',
    notes: '',
  });

  const handleProductSelect = (pid) => {
    const prod = products.find((p) => String(p.id) === String(pid));
    setForm((f) => ({
      ...f,
      productId: pid,
      sellingPrice: prod ? prod.price : '',
    }));
  };

  const generateBatchNumber = () => {
    const d = new Date();
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const rnd = Math.floor(1000 + Math.random() * 9000);
    setForm((f) => ({ ...f, batchNumber: `BAT-${yr}${mo}-${rnd}` }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.productId) {
      setError('Please select a product');
      return;
    }
    if (!form.batchNumber.trim()) {
      setError('Please enter a batch number');
      return;
    }
    if (!form.expiryDate) {
      setError('Please select an expiry date');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await batchApi.create({
        productId: Number(form.productId),
        batchNumber: form.batchNumber.trim().toUpperCase(),
        mfgDate: form.mfgDate || null,
        expiryDate: form.expiryDate,
        initialQuantity: Number(form.initialQuantity),
        purchasePrice: form.purchasePrice ? Number(form.purchasePrice) : null,
        sellingPrice: form.sellingPrice ? Number(form.sellingPrice) : null,
        notes: form.notes || null,
      });
      toast.success(`Batch ${form.batchNumber.toUpperCase()} added successfully`);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save batch');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Inward New Product Batch (FEFO)" onClose={onClose}>
      {error && <div className="banner banner-error"><i className="ti ti-alert-circle" /><span>{error}</span></div>}
      <form onSubmit={submit}>
        <div style={{ marginBottom: 14 }}>
          <label className="field-label">Product <span style={{ color: 'var(--danger)' }}>*</span></label>
          <select
            className="field-input"
            value={form.productId}
            onChange={(e) => handleProductSelect(e.target.value)}
            required
          >
            <option value="">Select a product…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.sku ? `(${p.sku})` : ''} · {p.stockQuantity} in stock
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <label className="field-label" style={{ margin: 0 }}>Batch Number <span style={{ color: 'var(--danger)' }}>*</span></label>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ padding: '2px 8px', fontSize: 11 }}
              onClick={generateBatchNumber}
            >
              <i className="ti ti-wand" /> Auto-generate
            </button>
          </div>
          <input
            className="field-input"
            value={form.batchNumber}
            onChange={(e) => setForm((f) => ({ ...f, batchNumber: e.target.value.toUpperCase() }))}
            placeholder="e.g. LOT-2026-0881, BAT-99"
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label className="field-label">Manufacturing Date</label>
            <input
              type="date"
              className="field-input"
              value={form.mfgDate}
              onChange={(e) => setForm((f) => ({ ...f, mfgDate: e.target.value }))}
            />
          </div>
          <div>
            <label className="field-label">Expiry Date <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input
              type="date"
              className="field-input"
              value={form.expiryDate}
              onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))}
              required
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label className="field-label">Quantity <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input
              type="number"
              min="1"
              className="field-input"
              value={form.initialQuantity}
              onChange={(e) => setForm((f) => ({ ...f, initialQuantity: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="field-label">Purchase Cost (₹)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="field-input"
              value={form.purchasePrice}
              onChange={(e) => setForm((f) => ({ ...f, purchasePrice: e.target.value }))}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="field-label">Selling MRP (₹)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="field-input"
              value={form.sellingPrice}
              onChange={(e) => setForm((f) => ({ ...f, sellingPrice: e.target.value }))}
              placeholder="0.00"
            />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="field-label">Notes (Storage Bin / Supplier lot)</label>
          <input
            className="field-input"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="e.g. Stored in Cold Storage Rack A2"
          />
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Inwarding…' : 'Inward Batch Stock'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function AdjustBatchModal({ batch, onClose, onSaved }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    newQuantity: batch.quantity,
    reason: 'EXPIRED',
    notes: '',
  });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await batchApi.adjust(batch.id, {
        newQuantity: Number(form.newQuantity),
        reason: form.reason,
        notes: form.notes || null,
      });
      toast.success(`Batch ${batch.batchNumber} adjusted to ${form.newQuantity} units`);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to adjust batch');
    } finally {
      setSaving(false);
    }
  };

  const delta = Number(form.newQuantity) - batch.quantity;

  return (
    <Modal title={`Adjust Batch · ${batch.batchNumber}`} onClose={onClose}>
      {error && <div className="banner banner-error"><i className="ti ti-alert-circle" /><span>{error}</span></div>}
      <form onSubmit={submit}>
        <div style={{ padding: '10px 14px', background: 'var(--surface-sunken)', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{batch.productName}</div>
          <div style={{ color: 'var(--text-secondary)' }}>
            Batch: <strong>{batch.batchNumber}</strong> · Expiry: <strong>{fmtDate(batch.expiryDate)}</strong>
          </div>
          <div style={{ marginTop: 4, color: 'var(--text-secondary)' }}>
            Current Recorded Stock: <strong style={{ color: 'var(--brand)' }}>{batch.quantity} units</strong>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label className="field-label">New Corrected Quantity</label>
          <input
            type="number"
            min="0"
            className="field-input"
            value={form.newQuantity}
            onChange={(e) => setForm((f) => ({ ...f, newQuantity: e.target.value }))}
            required
          />
          <div style={{ fontSize: 11, color: delta < 0 ? 'var(--danger)' : delta > 0 ? 'var(--success)' : 'var(--text-muted)', marginTop: 4 }}>
            Stock adjustment impact: {delta > 0 ? `+${delta}` : delta} units
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label className="field-label">Reason for Adjustment</label>
          <select
            className="field-input"
            value={form.reason}
            onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            required
          >
            <option value="EXPIRED">Spoiled / Expired Stock (Write Off)</option>
            <option value="DAMAGED">Damaged in Transit / Warehouse</option>
            <option value="AUDIT_CORRECTION">Stocktake / Physical Count Discrepancy</option>
            <option value="WRITE_OFF">General Stock Write-Off</option>
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="field-label">Notes / Discard Protocol</label>
          <input
            className="field-input"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="e.g. Incinerated / Returned to supplier"
          />
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Updating…' : 'Confirm Batch Adjustment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
