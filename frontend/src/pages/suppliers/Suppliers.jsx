import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supplierApi } from '../../api/supplierApi';
import { fmtCurrency } from '../../utils/formatters';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import Drawer from '../../components/Drawer';
import EmptyState from '../../components/EmptyState';
import useDebouncedValue from '../../hooks/useDebouncedValue';

function SupplierDetailDrawer({ supplier, onClose, onEdit }) {
  const nav = useNavigate();
  if (!supplier) return null;

  return (
    <Drawer
      title={`Supplier · ${supplier.name}`}
      isOpen={Boolean(supplier)}
      onClose={onClose}
      maxWidth={520}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => { onClose(); onEdit(supplier); }}
          >
            <i className="ti ti-edit" /> Edit Supplier
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => nav(`/purchases?supplier=${encodeURIComponent(supplier.name)}`)}
          >
            <i className="ti ti-truck-delivery" /> View Purchase Orders
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="card card-pad" style={{ padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Purchase Orders</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>{supplier.totalOrders || 0}</div>
          </div>
          <div className="card card-pad" style={{ padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Total Procured</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--brand)', marginTop: 4 }}>{fmtCurrency(supplier.totalSpent || 0)}</div>
          </div>
        </div>

        {/* Contact Info Card */}
        <div className="card card-pad">
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Vendor Information</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
              <i className="ti ti-phone" style={{ color: 'var(--text-secondary)', fontSize: 16 }} />
              <span>{supplier.phone || 'No contact number provided'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
              <i className="ti ti-mail" style={{ color: 'var(--text-secondary)', fontSize: 16 }} />
              <span>{supplier.email || 'No email address registered'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13 }}>
              <i className="ti ti-map-pin" style={{ color: 'var(--text-secondary)', fontSize: 16, marginTop: 2 }} />
              <span>{supplier.address || 'No dispatch address registered'}</span>
            </div>
          </div>
        </div>
      </div>
    </Drawer>
  );
}

function SupplierModal({ supplier, onClose, onSaved }) {
  const isEdit = Boolean(supplier);
  const [form, setForm] = useState(supplier || { name: '', phone: '', email: '', address: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await supplierApi.update(supplier.id, form);
        toast.success('Supplier updated');
      } else {
        await supplierApi.create(form);
        toast.success('Supplier added');
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || (err.request ? 'Could not reach the server.' : 'Something went wrong'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? 'Edit supplier' : 'Add supplier'} onClose={onClose}>
      {error && <div className="banner banner-error"><i className="ti ti-alert-circle" /><span>{error}</span></div>}
      <form onSubmit={submit}>
        <div style={{ marginBottom: 12 }}>
          <label className="field-label">Supplier / Vendor Name</label>
          <input className="field-input" value={form.name} onChange={set('name')} required placeholder="Acme Distributors Pvt Ltd" />
        </div>
        <div className="field-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label className="field-label">Phone</label>
            <input className="field-input" value={form.phone || ''} onChange={set('phone')} placeholder="+91 98765 43210" />
          </div>
          <div>
            <label className="field-label">Email</label>
            <input className="field-input" type="email" value={form.email || ''} onChange={set('email')} placeholder="sales@acme.com" />
          </div>
        </div>
        <div style={{ marginBottom: 4 }}>
          <label className="field-label">Address</label>
          <input className="field-input" value={form.address || ''} onChange={set('address')} placeholder="Industrial Area, Phase 2, Delhi" />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving && <span className="spinner" />}
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add supplier'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 350);
  const [modal, setModal] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    supplierApi
      .list({ page, size: 20, q: debouncedSearch || undefined })
      .then((r) => { setSuppliers(r.data.data.content || []); setTotalPages(r.data.data.totalPages || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, debouncedSearch]);

  useEffect(() => { load(); }, [load]);

  const onSaved = () => { setModal(null); load(); };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Suppliers & Vendors</h1>
          <p className="page-subtitle">Vendor directory, procurement history, and purchase order tracking.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('new')}>
          <i className="ti ti-plus" /> Add supplier
        </button>
      </div>

      <div className="search-wrap" style={{ marginBottom: 16 }}>
        <i className="ti ti-search" />
        <input className="search-input" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Search suppliers by name or contact…" />
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Supplier Name</th>
              <th>Contact Details</th>
              <th style={{ textAlign: 'right' }}>Purchase Orders</th>
              <th style={{ textAlign: 'right' }}>Total Procurement</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="skeleton-row">{[...Array(5)].map((__, j) => <td key={j}><div className="skeleton-bar" style={{ width: '60%' }} /></td>)}</tr>
              ))
            ) : suppliers.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <EmptyState
                    icon="ti-truck-delivery"
                    title={search ? 'No matching suppliers' : 'No suppliers registered yet'}
                    description={search ? 'Try clearing your search term.' : 'Suppliers are added automatically upon creating purchase orders or added directly here.'}
                    actionText={!search ? 'Add supplier' : undefined}
                    onAction={() => setModal('new')}
                  />
                </td>
              </tr>
            ) : (
              suppliers.map((s) => (
                <tr key={s.id} className="is-clickable" onClick={() => setSelectedSupplier(s)}>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 12.5 }}>
                    {s.phone || s.email ? [s.phone, s.email].filter(Boolean).join(' · ') : '—'}
                  </td>
                  <td style={{ textAlign: 'right' }}>{s.totalOrders}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtCurrency(s.totalSpent)}</td>
                  <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon btn-sm"
                      title="Edit Supplier"
                      onClick={() => setModal(s)}
                    >
                      <i className="ti ti-edit" style={{ fontSize: 13 }} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && suppliers.length > 0 && (
        <div className="pagination">
          <button className="btn btn-secondary btn-sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}><i className="ti ti-chevron-left" /> Prev</button>
          <span>Page {page + 1} of {Math.max(1, totalPages)}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage((p) => p + 1)} disabled={page + 1 >= totalPages}>Next <i className="ti ti-chevron-right" /></button>
        </div>
      )}

      {selectedSupplier && (
        <SupplierDetailDrawer
          supplier={selectedSupplier}
          onClose={() => setSelectedSupplier(null)}
          onEdit={(sup) => setModal(sup)}
        />
      )}

      {modal && <SupplierModal supplier={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSaved={onSaved} />}
    </div>
  );
}