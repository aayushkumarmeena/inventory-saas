import React, { useState, useEffect } from 'react';
import { gstApi } from '../../api/gstApi';
import { fmtCurrency } from '../../utils/formatters';
import { useToast } from '../../context/ToastContext';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const YEARS = [2025, 2026, 2027];

function Gstr1() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await gstApi.getGstr1(month, year);
      setData(r.data.data);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not generate report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div><h1 className="page-title">GSTR-1 report</h1><p className="page-subtitle">Outward supplies for a filing period.</p></div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <select className="field-input" style={{ width: 160 }} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>
        <select className="field-input" style={{ width: 100 }} value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {YEARS.map((y) => <option key={y}>{y}</option>)}
        </select>
        <button className="btn btn-primary" onClick={load} disabled={loading}>{loading && <span className="spinner" />}{loading ? 'Loading…' : 'Generate'}</button>
      </div>
      {error && <div className="banner banner-error"><i className="ti ti-alert-circle" /><span>{error}</span></div>}
      {data && (
        <div className="card card-pad">
          <div style={{ fontSize: 13, marginBottom: 14, color: 'var(--text-secondary)' }}>
            GSTIN: <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{data.gstin}</span> · {data.legalName}
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[['Taxable', data.totalTaxableValue], ['CGST', data.totalCgst], ['SGST', data.totalSgst], ['IGST', data.totalIgst]].map(([l, v]) => (
              <div key={l} style={{ background: 'var(--glass-bg-strong)', border: '1px solid var(--glass-border)', borderRadius: 10, padding: '10px 16px', minWidth: 110 }}>
                <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>{l}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{fmtCurrency(v)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Returns() {
  const [periods, setPeriods] = useState([]);
  const [form, setForm] = useState({ type: 'GSTR1', month: new Date().getMonth() + 1, year: new Date().getFullYear() });
  const toast = useToast();
  const load = () => gstApi.listPeriods().then((r) => setPeriods(r.data.data || [])).catch(() => {});
  const create = async () => {
    try {
      await gstApi.upsertPeriod(form.type, form.month, form.year);
      toast.success('Return period prepared');
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not prepare period');
    }
  };
  const file = async (id) => {
    if (!window.confirm('Mark this period as filed?')) return;
    try {
      await gstApi.markFiled(id);
      toast.success('Marked as filed');
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not update period');
    }
  };
  useEffect(() => { load(); }, []);

  const stBadge = (s) => <span className={`badge ${s === 'FILED' ? 'badge-success' : 'badge-warning'}`}>{s}</span>;

  return (
    <div className="page">
      <div className="page-header">
        <div><h1 className="page-title">GST return periods</h1><p className="page-subtitle">Prepare and track your filing periods.</p></div>
      </div>
      <div className="card card-pad" style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <select className="field-input" style={{ width: 120 }} value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
          <option>GSTR1</option><option>GSTR3B</option>
        </select>
        <select className="field-input" style={{ width: 160 }} value={form.month} onChange={(e) => setForm((f) => ({ ...f, month: Number(e.target.value) }))}>
          {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>
        <select className="field-input" style={{ width: 100 }} value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: Number(e.target.value) }))}>
          {YEARS.map((y) => <option key={y}>{y}</option>)}
        </select>
        <button className="btn btn-primary" onClick={create}><i className="ti ti-file-plus" /> Prepare</button>
      </div>
      <div className="table-card">
        <table className="data-table">
          <thead><tr>{['Period', 'Type', 'Taxable', 'Status', ''].map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {periods.length === 0 ? (
              <tr><td colSpan={5}><div className="empty-state"><i className="ti ti-calendar" /><div className="empty-state-title">No periods prepared yet</div></div></td></tr>
            ) : periods.map((p) => (
              <tr key={p.id}>
                <td>{MONTHS[(p.month || 1) - 1]} {p.year}</td>
                <td style={{ fontFamily: 'monospace' }}>{p.periodType}</td>
                <td style={{ textAlign: 'right' }}>{fmtCurrency(p.totalOutwardTaxable)}</td>
                <td>{stBadge(p.status)}</td>
                <td>{p.status !== 'FILED' && <button className="btn btn-secondary btn-sm" onClick={() => file(p.id)}>Mark filed</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Calculator() {
  const [form, setForm] = useState({ amount: 1000, rate: 18, taxInclusive: false, supplyType: 'INTRA' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const calc = async () => {
    setError('');
    try {
      const r = await gstApi.calculateTax(form.amount, form.rate, form.taxInclusive, form.supplyType);
      setResult(r.data.data);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not calculate');
    }
  };
  return (
    <div className="page" style={{ maxWidth: 520 }}>
      <div className="page-header"><div><h1 className="page-title">GST tax calculator</h1><p className="page-subtitle">Quickly work out CGST/SGST/IGST on any amount.</p></div></div>
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div><label className="field-label">Amount (₹)</label><input className="field-input" type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} /></div>
          <div><label className="field-label">Rate (%)</label><select className="field-input" value={form.rate} onChange={(e) => setForm((f) => ({ ...f, rate: Number(e.target.value) }))}>{[0, 5, 12, 18, 28].map((s) => <option key={s} value={s}>{s}%</option>)}</select></div>
          <div><label className="field-label">Supply</label><select className="field-input" value={form.supplyType} onChange={(e) => setForm((f) => ({ ...f, supplyType: e.target.value }))}><option value="INTRA">Intra-State</option><option value="INTER">Inter-State</option></select></div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <label style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--text-primary)' }}>
              <input type="checkbox" checked={form.taxInclusive} onChange={(e) => setForm((f) => ({ ...f, taxInclusive: e.target.checked }))} /> Tax-inclusive
            </label>
          </div>
        </div>
        {error && <div className="banner banner-error"><i className="ti ti-alert-circle" /><span>{error}</span></div>}
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={calc}>Calculate</button>
      </div>
      {result && (
        <div className="table-card">
          {[['Taxable', result.taxableValue], ['CGST', result.cgstAmount], ['SGST', result.sgstAmount], ['IGST', result.igstAmount], ['Total tax', result.totalTax], ['Total', result.totalAmount]].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 16px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{l}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{fmtCurrency(v)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GstPages1({ page }) {
  if (page === 'returns') return <Returns />;
  if (page === 'calculator') return <Calculator />;
  return <Gstr1 />;
}
