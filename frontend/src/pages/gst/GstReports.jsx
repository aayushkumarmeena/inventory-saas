import React, { useState } from 'react';
import { gstApi } from '../../api/gstApi';
import { useToast } from '../../context/ToastContext';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function GstReports() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const download = async (type) => {
    setLoading(true);
    try {
      const resp = type === 'gstr1' ? await gstApi.exportGstr1(month, year) : await gstApi.exportGstr3b(month, year);
      const url = URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_${month}_${year}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${type === 'gstr1' ? 'GSTR-1' : 'GSTR-3B'} exported`);
    } catch (e) {
      toast.error(e.response?.data?.message || (e.request ? 'Could not reach the server.' : 'Export failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ maxWidth: 700 }}>
      <div className="page-header"><div><h1 className="page-title">GST reports & exports</h1><p className="page-subtitle">Download return-ready data and track filing due dates.</p></div></div>

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: 'var(--text-primary)' }}>GST return exports</div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <select className="field-input" style={{ width: 160 }} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
          <select className="field-input" style={{ width: 100 }} value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[2025, 2026, 2027].map((y) => <option key={y}>{y}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={() => download('gstr1')} disabled={loading}>
            {loading && <span className="spinner" />}<i className="ti ti-download" /> Export GSTR-1
          </button>
          <button className="btn btn-secondary" onClick={() => download('gstr3b')} disabled={loading}>
            {loading && <span className="spinner" />}<i className="ti ti-download" /> Export GSTR-3B
          </button>
        </div>
      </div>

      <div className="card card-pad">
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, color: 'var(--text-primary)' }}>Filing calendar</div>
        {[['GSTR-1', '11th of next month'], ['GSTR-3B', '20th of next month']].map(([r, d]) => (
          <div key={r} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--glass-border)' }}>
            <span style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-primary)' }}>{r}</span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Due: {d}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
