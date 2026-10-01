import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerApi } from '../../api/customerApi';
import { salesApi } from '../../api/salesApi';
import { gstApi } from '../../api/gstApi';
import { fmtCurrency, fmtDate } from '../../utils/formatters';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import Drawer from '../../components/Drawer';
import EmptyState from '../../components/EmptyState';
import useDebouncedValue from '../../hooks/useDebouncedValue';

function CustomerDetailDrawer({ customer, onClose, onEdit, onCollectPayment, onRefresh }) {
  const nav = useNavigate();
  const [salesHistory, setSalesHistory] = useState([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [storeDetails, setStoreDetails] = useState({ name: 'InventoryPro Store', upiId: '' });
  const [activeTab, setActiveTab] = useState('overview'); // overview | khata

  useEffect(() => {
    if (!customer?.id) return;
    setLoadingSales(true);
    salesApi.list({ customer: customer.name, page: 0, size: 20 })
      .then((r) => setSalesHistory(r.data?.data?.content || []))
      .catch(() => {})
      .finally(() => setLoadingSales(false));

    try {
      const cached = localStorage.getItem('inventory_store_details');
      if (cached) setStoreDetails(JSON.parse(cached));
      else gstApi.getConfig().then((r) => {
        if (r.data?.data?.tradeName) {
          setStoreDetails((s) => ({ ...s, name: r.data.data.tradeName }));
        }
      }).catch(() => {});
    } catch (_) {}
  }, [customer]);

  if (!customer) return null;

  const outstanding = Number(customer.outstandingBalance || 0);

  const sendWhatsAppReminder = () => {
    const rawPhone = (customer.phone || '').replace(/[^0-9]/g, '');
    const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    if (!cleanPhone) {
      alert('No valid phone number for this customer.');
      return;
    }

    const upiPart = storeDetails.upiId ? `\n\nScan & Pay via UPI ID: ${storeDetails.upiId}` : '';
    const message = encodeURIComponent(
      `Hello ${customer.name},\n\nThis is a friendly payment reminder from *${storeDetails.name || 'Store'}*.\n` +
      `Your outstanding balance is *${fmtCurrency(outstanding)}*.\n\n` +
      `Kindly clear the pending dues at your earliest convenience.${upiPart}\n\nThank you for your business!`
    );

    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  return (
    <Drawer
      title={`Customer · ${customer.name}`}
      isOpen={Boolean(customer)}
      onClose={onClose}
      maxWidth={560}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 8 }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => { onClose(); onEdit(customer); }}
          >
            <i className="ti ti-edit" /> Edit
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            {outstanding > 0 && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => onCollectPayment(customer)}
              >
                <i className="ti ti-coin" /> Settle Dues
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => nav(`/sales?customer=${encodeURIComponent(customer.name)}`)}
            >
              <i className="ti ti-receipt" /> All Sales
            </button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'overview' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('overview')}
          >
            <i className="ti ti-user" /> Profile & Stats
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'khata' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('khata')}
          >
            <i className="ti ti-notebook" /> Credit Ledger (Khata)
            {outstanding > 0 && (
              <span style={{ background: '#ef4444', color: '#fff', fontSize: 10, padding: '1px 5px', borderRadius: 8, marginLeft: 4 }}>
                Due
              </span>
            )}
          </button>
        </div>

        {activeTab === 'overview' && (
          <>
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
                <div style={{ fontSize: 16, fontWeight: 700, color: outstanding > 0 ? '#ef4444' : '#10b981', marginTop: 4 }}>
                  {fmtCurrency(outstanding)}
                </div>
              </div>
            </div>

            {/* Dues Alert Banner & WhatsApp Reminder */}
            {outstanding > 0 && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: 12,
                  padding: 14,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#ef4444' }}>
                    Payment Due: {fmtCurrency(outstanding)}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>
                    This customer has unpaid or partial invoices.
                  </div>
                </div>
                {customer.phone && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ background: '#25D366', color: '#fff', border: 'none', whiteSpace: 'nowrap' }}
                    onClick={sendWhatsAppReminder}
                  >
                    <i className="ti ti-brand-whatsapp" /> Remind
                  </button>
                )}
              </div>
            )}

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
          </>
        )}

        {activeTab === 'khata' && (
          <div className="card card-pad">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Sales & Ledger Entries</div>
              {outstanding > 0 && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => onCollectPayment(customer)}
                >
                  <i className="ti ti-coin" /> Settle Dues
                </button>
              )}
            </div>

            {loadingSales ? (
              <div style={{ padding: '20px 0', textAlign: 'center' }}>
                <div className="skeleton-bar" style={{ width: '80%', height: 20, margin: '0 auto' }} />
              </div>
            ) : salesHistory.length === 0 ? (
              <EmptyState
                icon="ti-receipt-off"
                title="No sales records"
                description="No sales recorded for this customer yet."
                compact
              />
            ) : (
              <div className="table-responsive" style={{ maxHeight: 320 }}>
                <table className="table" style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Invoice #</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesHistory.map((s) => {
                      const isDue = s.paymentStatus === 'PENDING' || s.paymentStatus === 'PARTIAL';
                      return (
                        <tr key={s.id}>
                          <td>{fmtDate(s.saleDate)}</td>
                          <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{s.invoiceNumber}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtCurrency(s.totalAmount)}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span
                              className={`badge ${
                                s.paymentStatus === 'PAID'
                                  ? 'badge-success'
                                  : isDue
                                  ? 'badge-warning'
                                  : 'badge-neutral'
                              }`}
                              style={{ fontSize: 10 }}
                            >
                              {s.paymentStatus}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </Drawer>
  );
}

function CollectPaymentModal({ customer, onClose, onSaved }) {
  const [amount, setAmount] = useState(customer?.outstandingBalance ? String(customer.outstandingBalance) : '');
  const [method, setMethod] = useState('CASH');
  const [notes, setNotes] = useState('Settlement of outstanding balance');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  const submit = async (e) => {
    e.preventDefault();
    const num = Number(amount);
    if (!num || num <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Find oldest pending/partial sales for this customer
      const r = await salesApi.list({ customer: customer.name, size: 50 });
      const sales = r.data?.data?.content || [];
      const unpaidSales = sales.filter((s) => s.paymentStatus === 'PENDING' || s.paymentStatus === 'PARTIAL');

      if (unpaidSales.length === 0) {
        toast.info('No pending invoice found for this customer');
        onSaved();
        return;
      }

      // Record payment against the first unpaid sale
      const targetSale = unpaidSales[0];
      await salesApi.recordPayment(targetSale.id, {
        amount: num,
        paymentMethod: method,
        notes: notes || `Customer dues settlement via ${method}`,
      });

      toast.success(`Payment of ${fmtCurrency(num)} recorded successfully`);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Collect Payment · ${customer?.name}`} onClose={onClose} maxWidth={440}>
      {error && <div className="banner banner-error"><i className="ti ti-alert-circle" /><span>{error}</span></div>}
      <form onSubmit={submit}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Outstanding Balance</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#ef4444', marginTop: 2 }}>
            {fmtCurrency(customer?.outstandingBalance || 0)}
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label className="field-label">Payment Amount (₹)</label>
          <input
            className="field-input"
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label className="field-label">Payment Mode</label>
          <select className="field-input" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="CASH">Cash</option>
            <option value="UPI">UPI / QR Code</option>
            <option value="CARD">Debit / Credit Card</option>
            <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="field-label">Payment Reference / Notes</label>
          <input
            className="field-input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Txn ID / Cheque # / Notes"
          />
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Recording…' : 'Confirm Settlement'}
          </button>
        </div>
      </form>
    </Modal>
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
  const [modal, setModal] = useState(null); // 'new' | customer
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [collectPaymentCustomer, setCollectPaymentCustomer] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    customerApi
      .list({ page, size: 20, q: debouncedSearch || undefined })
      .then((r) => { setCustomers(r.data?.data?.content || []); setTotalPages(r.data?.data?.totalPages || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, debouncedSearch]);

  useEffect(() => { load(); }, [load]);

  const onSaved = () => { setModal(null); setCollectPaymentCustomer(null); load(); };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers & Khata Directory</h1>
          <p className="page-subtitle">Client profiles, credit ledgers, lifetime purchase history, and outstanding accounts.</p>
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
                    <div style={{ display: 'inline-flex', gap: 4 }}>
                      {Number(c.outstandingBalance) > 0 && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '3px 8px', fontSize: 11 }}
                          title="Settle Dues"
                          onClick={() => setCollectPaymentCustomer(c)}
                        >
                          <i className="ti ti-coin" /> Settle
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon btn-sm"
                        title="Edit Customer"
                        onClick={() => setModal(c)}
                      >
                        <i className="ti ti-edit" style={{ fontSize: 13 }} />
                      </button>
                    </div>
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
          onCollectPayment={(cust) => setCollectPaymentCustomer(cust)}
          onRefresh={load}
        />
      )}

      {collectPaymentCustomer && (
        <CollectPaymentModal
          customer={collectPaymentCustomer}
          onClose={() => setCollectPaymentCustomer(null)}
          onSaved={onSaved}
        />
      )}

      {modal && <CustomerModal customer={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSaved={onSaved} />}
    </div>
  );
}
