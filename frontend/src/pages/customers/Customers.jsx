import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerApi } from '../../api/customerApi';
import { fmtCurrency, fmtDate } from '../../utils/formatters';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import Drawer from '../../components/Drawer';
import EmptyState from '../../components/EmptyState';
import useDebouncedValue from '../../hooks/useDebouncedValue';

function CustomerDetailDrawer({ customer, onClose, onEdit }) {
  const nav = useNavigate();
  if (!customer) return null;

  return (
    <Drawer
      title={`Customer · ${customer.name}`}
      isOpen={Boolean(customer)}
      onClose={onClose}
      maxWidth={520}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => { onClose(); onEdit(customer); }}
          >
            <i className="ti ti-edit" /> Edit Customer
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => nav(`/sales?customer=${encodeURIComponent(customer.name)}`)}
          >
            <i className="ti ti-receipt" /> View Sales History
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div className="card card-pad" style={{ padding: '12px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Total Orders</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>{customer.totalOrders || 0}</div>
          </div>
          <div className="card card-pad" style={{ padding: '12px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Lifetime Spend</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--brand)', marginTop: 4 }}>{fmtCurrency(customer.totalSpent || 0)}</div>
          </div>
          <div className="card card-pad" style={{ padding: '12px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Outstanding</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: Number(customer.outstandingBalance) > 0 ? 'var(--danger-text)' : 'var(--text-primary)', marginTop: 4 }}>
              {fmtCurrency(customer.outstandingBalance || 0)}
            </div>
          </div>
        </div>

        {/* Contact Info Card */}
        <div className="card card-pad">
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Contact Details</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
              <i className="ti ti-phone" style={{ color: 'var(--text-secondary)', fontSize: 16 }} />
              <span>{customer.phone || 'No phone number provided'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
              <i className="ti ti-mail" style={{ color: 'var(--text-secondary)', fontSize: 16 }} />
              <span>{customer.email || 'No email address provided'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13 }}>
              <i className="ti ti-map-pin" style={{ color: 'var(--text-secondary)', fontSize: 16, marginTop: 2 }} />
              <span>{customer.address || 'No billing address recorded'}</span>
            </div>
          </div>
        </div>
      </div>
    </Drawer>
  );
}

function CustomerModal({ customer, onClose, onSaved }) {
  const isEdit = Boolean(customer);
  const [form, setForm] = useState(customer || { name: '', phone: '', email: '', address: '' });
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
        await customerApi.update(customer.id, form);
        toast.success('Customer updated');
      } else {
        await customerApi.create(form);
        toast.success('Customer added');
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || (err.request ? 'Could not reach the server.' : 'Something went wrong'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? 'Edit customer' : 'Add customer'} onClose={onClose}>
      {error && <div className="banner banner-error"><i className="ti ti-alert-circle" /><span>{error}</span></div>}
      <form onSubmit={submit}>
        <div style={{ marginBottom: 12 }}>
          <label className="field-label">Customer Name</label>
          <input className="field-input" value={form.name} onChange={set('name')} required placeholder="Acme Corp / John Doe" />
        </div>
        <div className="field-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label className="field-label">Phone</label>
            <input className="field-input" value={form.phone || ''} onChange={set('phone')} placeholder="+91 98765 43210" />
          </div>
          <div>
            <label className="field-label">Email</label>
            <input className="field-input" type="email" value={form.email || ''} onChange={set('email')} placeholder="contact@example.com" />
          </div>
        </div>
        <div style={{ marginBottom: 4 }}>
          <label className="field-label">Address</label>
          <input className="field-input" value={form.address || ''} onChange={set('address')} placeholder="123 Commercial St, Bangalore" />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving && <span className="spinner" />}
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add customer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 350);
  const [modal, setModal] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    customerApi
      .list({ page, size: 20, q: debouncedSearch || undefined })
      .then((r) => { setCustomers(r.data.data.content || []); setTotalPages(r.data.data.totalPages || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, debouncedSearch]);

  useEffect(() => { load(); }, [load]);

  const onSaved = () => { setModal(null); load(); };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers Directory</h1>
          <p className="page-subtitle">Client profiles, contact information, lifetime purchase history, and outstanding accounts.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('new')}>
          <i className="ti ti-plus" /> Add customer
        </button>
      </div>

      <div className="search-wrap" style={{ marginBottom: 16 }}>
        <i className="ti ti-search" />
        <input className="search-input" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Search customers by name or contact…" />
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact Details</th>
              <th style={{ textAlign: 'right' }}>Orders</th>
              <th style={{ textAlign: 'right' }}>Total spent</th>
              <th style={{ textAlign: 'right' }}>Outstanding</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="skeleton-row">{[...Array(6)].map((__, j) => <td key={j}><div className="skeleton-bar" style={{ width: '60%' }} /></td>)}</tr>
              ))
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    icon="ti-users"
                    title={search ? 'No matching customers' : 'No customers recorded yet'}
                    description={search ? 'Try clearing your search term.' : 'Customers are automatically registered when recording sales or added manually.'}
                    actionText={!search ? 'Add customer' : undefined}
                    onAction={() => setModal('new')}
                  />
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id} className="is-clickable" onClick={() => setSelectedCustomer(c)}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 12.5 }}>
                    {c.phone || c.email ? [c.phone, c.email].filter(Boolean).join(' · ') : '—'}
                  </td>
                  <td style={{ textAlign: 'right' }}>{c.totalOrders}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtCurrency(c.totalSpent)}</td>
                  <td style={{ textAlign: 'right' }}>
                    {Number(c.outstandingBalance) > 0 ? (
                      <span className="badge badge-warning">{fmtCurrency(c.outstandingBalance)}</span>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)' }}>—</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon btn-sm"
                      title="Edit Customer"
                      onClick={() => setModal(c)}
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

      {!loading && customers.length > 0 && (
        <div className="pagination">
          <button className="btn btn-secondary btn-sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}><i className="ti ti-chevron-left" /> Prev</button>
          <span>Page {page + 1} of {Math.max(1, totalPages)}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage((p) => p + 1)} disabled={page + 1 >= totalPages}>Next <i className="ti ti-chevron-right" /></button>
        </div>
      )}

      {selectedCustomer && (
        <CustomerDetailDrawer
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          onEdit={(cust) => setModal(cust)}
        />
      )}

      {modal && <CustomerModal customer={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSaved={onSaved} />}
    </div>
  );
}