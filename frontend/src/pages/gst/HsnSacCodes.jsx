import React, { useState, useEffect } from 'react';
import { gstApi } from '../../api/gstApi';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';

export default function HsnSacCodes() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', type: 'HSN', description: '', cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: 0 });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const load = () => {
    setLoading(true);
    gstApi.listHsnSac({ page: 0, size: 50 }).then((r) => setCodes(r.data.data.content || [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const setF = (k, v) => setForm((f) => {
    const n = { ...f, [k]: v };
    if (k === 'cgstRate') { n.sgstRate = v; n.igstRate = Number(v) * 2; }
    return n;
  });

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await gstApi.createHsnSac(form);
      toast.success('HSN/SAC code added');
      setShowForm(false);
      setForm({ code: '', type: 'HSN', description: '', cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: 0 });
      load();
    } catch (e2) {
      setError(e2.response?.data?.message || (e2.request ? 'Could not reach the server.' : 'Could not save'));
    } finally {
      setSaving(false);
    }
  };

  const del = async (id) => {
    if (!window.confirm('Deactivate this code?')) return;
    try {
      await gstApi.deleteHsnSac(id);
      toast.success('Code deactivated');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not deactivate code');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">HSN / SAC codes</h1>
          <p className="page-subtitle">Tax classification codes used when generating invoices.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}><i className="ti ti-plus" /> Add code</button>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>{['Code', 'Type', 'Description', 'CGST%', 'SGST%', 'IGST%', ''].map((h) => <th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(4)].map((_, i) => (
                <tr key={i} className="skeleton-row">{[...Array(7)].map((__, j) => <td key={j}><div className="skeleton-bar" style={{ width: '60%' }} /></td>)}</tr>
              ))
            ) : codes.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">
                    <i className="ti ti-list" />
                    <div className="empty-state-title">No HSN/SAC codes yet</div>
                    <div className="empty-state-desc">Add codes to classify products and services for GST.</div>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}><i className="ti ti-plus" /> Add code</button>
                  </div>
                </td>
              </tr>
            ) : (
              codes.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{c.code}</td>
                  <td><span className={`badge ${c.type === 'HSN' ? 'badge-neutral' : 'badge-success'}`}>{c.type}</span></td>
                  <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.description}</td>
                  <td style={{ textAlign: 'right' }}>{c.cgstRate}%</td>
                  <td style={{ textAlign: 'right' }}>{c.sgstRate}%</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--brand)' }}>{c.igstRate}%</td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => del(c.id)}>Deactivate</button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal title="Add HSN/SAC code" onClose={() => setShowForm(false)} maxWidth={420}>
          {error && <div className="banner banner-error"><i className="ti ti-alert-circle" /><span>{error}</span></div>}
          <form onSubmit={save}>
            <div style={{ marginBottom: 10 }}>
              <label className="field-label">Code</label>
              <input className="field-input" placeholder="8471" value={form.code} onChange={(e) => setF('code', e.target.value)} required />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label className="field-label">Description</label>
              <input className="field-input" placeholder="Computers and peripherals" value={form.description} onChange={(e) => setF('description', e.target.value)} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label className="field-label">Type</label>
              <select className="field-input" value={form.type} onChange={(e) => setF('type', e.target.value)}>
                <option>HSN</option><option>SAC</option>
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }} className="field-grid">
              <div><label className="field-label">CGST%</label><input className="field-input" type="number" value={form.cgstRate} onChange={(e) => setF('cgstRate', e.target.value)} /></div>
              <div><label className="field-label">SGST%</label><input className="field-input" type="number" value={form.sgstRate} readOnly /></div>
              <div><label className="field-label">IGST%</label><input className="field-input" type="number" value={form.igstRate} readOnly /></div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving && <span className="spinner" />}{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
