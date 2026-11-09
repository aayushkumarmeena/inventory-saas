import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { expenseApi } from '../../api/expenseApi';
import { fmtCurrency, fmtDate } from '../../utils/formatters';
import Modal from '../../components/Modal';

const CATEGORIES = [
  { key: 'RENT', label: 'Rent', icon: 'ti-building', color: '#6366f1' },
  { key: 'UTILITIES', label: 'Utilities', icon: 'ti-bolt', color: '#f59e0b' },
  { key: 'SALARIES', label: 'Salaries', icon: 'ti-users', color: '#10b981' },
  { key: 'SUPPLIES', label: 'Supplies', icon: 'ti-box', color: '#3b82f6' },
  { key: 'MARKETING', label: 'Marketing', icon: 'ti-speakerphone', color: '#a855f7' },
  { key: 'MAINTENANCE', label: 'Maintenance', icon: 'ti-tool', color: '#ef4444' },
  { key: 'TRANSPORT', label: 'Transport', icon: 'ti-truck', color: '#06b6d4' },
  { key: 'OTHER', label: 'Other', icon: 'ti-dots', color: '#94a3b8' },
];

const PAYMENT_METHODS = ['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CHEQUE'];

const catMap = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]));

function today() {
  return new Date().toISOString().slice(0, 10);
}

function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

const emptyForm = {
  amount: '',
  category: 'OTHER',
  description: '',
  expenseDate: today(),
  paymentMethod: 'CASH',
  vendor: '',
  referenceNumber: '',
  notes: '',
};

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({ total: 0, byCategory: {} });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [filterCat, setFilterCat] = useState('ALL');
  const [dateFrom, setDateFrom] = useState(monthStart());
  const [dateTo, setDateTo] = useState(today());

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, sumRes] = await Promise.all([
        expenseApi.list({ page, size: 20 }),
        expenseApi.summary(dateFrom, dateTo),
      ]);
      const paged = listRes.data?.data;
      setExpenses(paged?.content ?? []);
      setTotalPages(paged?.totalPages ?? 1);
      setSummary(sumRes.data?.data ?? { total: 0, byCategory: {} });
    } catch {
      showToast('Failed to load expenses', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, dateFrom, dateTo]);

  useEffect(() => { loadData(); }, [loadData]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (exp) => {
    setEditing(exp);
    setForm({
      amount: String(exp.amount),
      category: exp.category,
      description: exp.description || '',
      expenseDate: exp.expenseDate,
      paymentMethod: exp.paymentMethod || 'CASH',
      vendor: exp.vendor || '',
      referenceNumber: exp.referenceNumber || '',
      notes: exp.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.amount || isNaN(parseFloat(form.amount))) {
      showToast('Enter a valid amount', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, amount: parseFloat(form.amount) };
      if (editing) {
        await expenseApi.update(editing.id, payload);
        showToast('Expense updated');
      } else {
        await expenseApi.create(payload);
        showToast('Expense added');
      }
      setShowModal(false);
      loadData();
    } catch (e) {
      showToast(e?.response?.data?.message ?? 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    setDeleting(id);
    try {
      await expenseApi.delete(id);
      showToast('Expense deleted');
      loadData();
    } catch {
      showToast('Delete failed', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const filtered = useMemo(
    () => (filterCat === 'ALL' ? expenses : expenses.filter((e) => e.category === filterCat)),
    [expenses, filterCat]
  );

  const totalFiltered = useMemo(
    () => filtered.reduce((s, e) => s + Number(e.amount), 0),
    [filtered]
  );

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 16, right: 16, zIndex: 9999,
          padding: '10px 18px', borderRadius: 10, fontWeight: 500, fontSize: 13,
          background: toast.type === 'error' ? 'rgba(239,68,68,0.92)' : 'rgba(34,197,94,0.92)',
          color: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,.3)',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Expenses</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: 13 }}>
            Track all business outflows — rent, salaries, supplies, and more
          </p>
        </div>
        <button onClick={openCreate} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <i className="ti ti-plus" /> Add Expense
        </button>
      </div>

      {/* Date range + summary cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label style={labelStyle}>From</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>To</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={inputStyle} />
        </div>
      </div>

      {/* Summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        {/* Total card */}
        <div style={{ ...cardStyle, gridColumn: 'span 2', background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.1))', border: '1px solid rgba(99,102,241,0.25)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Expenses</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--brand)', marginTop: 4 }}>
            {fmtCurrency(summary.total || 0)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>{dateFrom} → {dateTo}</div>
        </div>
        {/* Per-category mini cards */}
        {CATEGORIES.filter((c) => summary.byCategory?.[c.key]).map((cat) => (
          <div key={cat.key} style={{ ...cardStyle, cursor: 'pointer', borderColor: filterCat === cat.key ? cat.color : undefined }}
            onClick={() => setFilterCat(filterCat === cat.key ? 'ALL' : cat.key)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: cat.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className={`ti ${cat.icon}`} style={{ fontSize: 14, color: cat.color }} />
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>{cat.label}</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginTop: 8 }}>
              {fmtCurrency(summary.byCategory[cat.key] || 0)}
            </div>
          </div>
        ))}
      </div>

      {/* Category filter chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={() => setFilterCat('ALL')} style={chipStyle(filterCat === 'ALL')}>All</button>
        {CATEGORIES.map((c) => (
          <button key={c.key} onClick={() => setFilterCat(c.key)} style={chipStyle(filterCat === c.key, c.color)}>
            <i className={`ti ${c.icon}`} style={{ fontSize: 11 }} /> {c.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
            <span className="spinner" style={{ width: 24, height: 24, borderWidth: 3 }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-secondary)' }}>
            <i className="ti ti-receipt-off" style={{ fontSize: 40, display: 'block', marginBottom: 12, opacity: 0.3 }} />
            <div style={{ fontWeight: 600, marginBottom: 4 }}>No expenses found</div>
            <div style={{ fontSize: 12 }}>Click "Add Expense" to record your first one</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {['Date', 'Category', 'Vendor / Description', 'Payment', 'Amount', ''].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((exp) => {
                const cat = catMap[exp.category] || catMap['OTHER'];
                return (
                  <tr key={exp.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.12s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    <td style={tdStyle}>{exp.expenseDate}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: cat.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <i className={`ti ${cat.icon}`} style={{ fontSize: 12, color: cat.color }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{cat.label}</span>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{exp.vendor || '—'}</div>
                      {exp.description && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{exp.description}</div>}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.07)', borderRadius: 6, padding: '3px 8px' }}>{exp.paymentMethod}</span>
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: '#ef4444', fontSize: 14 }}>
                      {fmtCurrency(exp.amount)}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEdit(exp)} style={iconBtnStyle} title="Edit">
                          <i className="ti ti-pencil" style={{ fontSize: 13 }} />
                        </button>
                        <button onClick={() => handleDelete(exp.id)} disabled={deleting === exp.id} style={{ ...iconBtnStyle, color: '#ef4444' }} title="Delete">
                          <i className={`ti ${deleting === exp.id ? 'ti-loader' : 'ti-trash'}`} style={{ fontSize: 13 }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.15)' }}>
                <td colSpan={4} style={{ ...tdStyle, fontWeight: 700, fontSize: 13 }}>
                  Total ({filtered.length} items{filterCat !== 'ALL' ? ` · ${catMap[filterCat]?.label}` : ''})
                </td>
                <td style={{ ...tdStyle, fontWeight: 800, fontSize: 15, color: '#ef4444' }}>
                  {fmtCurrency(totalFiltered)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: 16, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} style={iconBtnStyle}>
              <i className="ti ti-chevron-left" />
            </button>
            <span style={{ padding: '6px 12px', fontSize: 12, color: 'var(--text-secondary)' }}>
              Page {page + 1} of {totalPages}
            </span>
            <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} style={iconBtnStyle}>
              <i className="ti ti-chevron-right" />
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Expense' : 'Add Expense'} size="md">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Amount */}
          <div>
            <label style={labelStyle}>Amount (₹) *</label>
            <input type="number" min="0.01" step="0.01" placeholder="0.00" value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} style={inputStyle} autoFocus />
          </div>

          {/* Category */}
          <div>
            <label style={labelStyle}>Category *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {CATEGORIES.map((c) => (
                <button key={c.key} onClick={() => setForm((f) => ({ ...f, category: c.key }))}
                  style={{
                    padding: '8px 4px', borderRadius: 9, border: form.category === c.key ? `1.5px solid ${c.color}` : '1px solid rgba(255,255,255,0.1)',
                    background: form.category === c.key ? c.color + '20' : 'rgba(255,255,255,0.03)',
                    color: form.category === c.key ? c.color : 'var(--text-secondary)',
                    cursor: 'pointer', fontSize: 10, fontWeight: form.category === c.key ? 700 : 500,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  }}>
                  <i className={`ti ${c.icon}`} style={{ fontSize: 15 }} />
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date + Payment method row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Date *</label>
              <input type="date" value={form.expenseDate}
                onChange={(e) => setForm((f) => ({ ...f, expenseDate: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Payment Method</label>
              <select value={form.paymentMethod} onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))} style={inputStyle}>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Vendor + Description row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Vendor / Payee</label>
              <input type="text" placeholder="e.g. Electricity Board" value={form.vendor}
                onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Reference No.</label>
              <input type="text" placeholder="Bill / invoice number" value={form.referenceNumber}
                onChange={(e) => setForm((f) => ({ ...f, referenceNumber: e.target.value }))} style={inputStyle} />
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Description</label>
            <input type="text" placeholder="Brief note about this expense…" value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} style={inputStyle} />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button onClick={() => setShowModal(false)} className="btn" style={{ background: 'rgba(255,255,255,0.07)', color: 'var(--text-secondary)' }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              {saving ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <i className="ti ti-check" />}
              {editing ? 'Save Changes' : 'Add Expense'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Styles
const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' };
const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', fontFamily: 'inherit' };
const cardStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px 16px' };
const tdStyle = { padding: '11px 16px', fontSize: 13, verticalAlign: 'middle' };
const iconBtnStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: 'var(--text-secondary)', cursor: 'pointer', padding: '5px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.12s' };
const chipStyle = (active, color) => ({
  padding: '5px 12px', borderRadius: 20, border: active ? `1.5px solid ${color || 'var(--brand)'}` : '1px solid rgba(255,255,255,0.1)',
  background: active ? (color ? color + '18' : 'rgba(99,102,241,0.15)') : 'rgba(255,255,255,0.04)',
  color: active ? (color || 'var(--brand)') : 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, fontWeight: active ? 600 : 400,
  display: 'inline-flex', alignItems: 'center', gap: 5, transition: 'all 0.15s',
});
