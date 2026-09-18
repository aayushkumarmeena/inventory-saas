import React, { useState, useEffect } from 'react';
import { gstApi } from '../../api/gstApi';
import { useToast } from '../../context/ToastContext';

const STATES = [
  ['01', 'Jammu & Kashmir'], ['06', 'Haryana'], ['07', 'Delhi'], ['09', 'Uttar Pradesh'],
  ['19', 'West Bengal'], ['24', 'Gujarat'], ['27', 'Maharashtra'], ['29', 'Karnataka'],
  ['32', 'Kerala'], ['33', 'Tamil Nadu'], ['36', 'Telangana'],
];

function Section({ title }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.06em', margin: '18px 0 12px' }}>{title}</div>;
}

function Field({ k, l, ph, req, form, set, errors, type = 'text' }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label className="field-label">{l}{req && <span style={{ color: '#ef4444' }}> *</span>}</label>
      <input className="field-input" type={type} value={form[k] || ''} onChange={(e) => set(k, e.target.value)} placeholder={ph} />
      {errors[k] && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>{errors[k]}</div>}
    </div>
  );
}

export default function GstConfig() {
  const [form, setForm] = useState({
    gstin: '', legalName: '', tradeName: '', addressLine1: '', addressLine2: '', city: '',
    state: '', stateCode: '', pincode: '', pan: '', email: '', phone: '', isComposition: false, filingFrequency: 'MONTHLY',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [saved, setSaved] = useState(false);
  const [apiError, setApiError] = useState('');
  const toast = useToast();

  useEffect(() => {
    gstApi.getConfig().then((r) => setForm((f) => ({ ...f, ...r.data.data }))).catch(() => {}).finally(() => setFetching(false));
  }, []);

  const set = (k, v) => {
    setErrors((e) => ({ ...e, [k]: '' }));
    setForm((f) => {
      const n = { ...f, [k]: v };
      if (k === 'gstin' && v.length >= 2) {
        const st = STATES.find((s) => s[0] === v.substring(0, 2));
        if (st) { n.stateCode = st[0]; n.state = st[1]; }
      }
      if (k === 'stateCode') {
        const st = STATES.find((s) => s[0] === v);
        if (st) n.state = st[1];
      }
      return n;
    });
  };

  const validate = () => {
    const e = {};
    if (!form.gstin) e.gstin = 'Required';
    else if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(form.gstin.toUpperCase())) e.gstin = 'Not a valid GSTIN format';
    if (!form.legalName) e.legalName = 'Required';
    if (!form.state) e.state = 'Required';
    if (!form.stateCode) e.stateCode = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setSaved(false);
    setApiError('');
    try {
      await gstApi.saveConfig({ ...form, gstin: form.gstin.toUpperCase() });
      setSaved(true);
      toast.success('GST configuration saved');
      setTimeout(() => setSaved(false), 4000);
    } catch (err) {
      setApiError(err.response?.data?.message || (err.request ? 'Could not reach the server.' : 'Save failed'));
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="page"><div className="skeleton-bar" style={{ width: 200, height: 20 }} /></div>;

  return (
    <div className="page" style={{ maxWidth: 820 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">GST configuration</h1>
          <p className="page-subtitle">Your business's GST registration details, used on every invoice.</p>
        </div>
        {saved && <span className="badge badge-success" style={{ padding: '6px 14px', fontSize: 12.5 }}><i className="ti ti-check" style={{ marginRight: 4 }} />Saved</span>}
      </div>

      {apiError && <div className="banner banner-error"><i className="ti ti-alert-circle" /><span>{apiError}</span></div>}

      <form onSubmit={submit} className="card card-pad">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }} className="responsive-grid-2">
          <div>
            <Section title="GST Registration" />
            <Field k="gstin" l="GSTIN" ph="27AABCU9603R1ZX" req form={form} set={set} errors={errors} />
            <Field k="legalName" l="Legal name" ph="Your Company Pvt Ltd" req form={form} set={set} errors={errors} />
            <Field k="tradeName" l="Trade name" ph="Optional" form={form} set={set} errors={errors} />
            <Field k="pan" l="PAN" ph="AABCU9603R" form={form} set={set} errors={errors} />
            <div style={{ marginBottom: 12 }}>
              <label className="field-label">State{errors.state && <span style={{ color: '#ef4444' }}> *</span>}</label>
              <select className="field-input" value={form.stateCode || ''} onChange={(e) => set('stateCode', e.target.value)}>
                <option value="">Select…</option>
                {STATES.map(([c, n]) => <option key={c} value={c}>{c} — {n}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label className="field-label">Filing frequency</label>
              <select className="field-input" value={form.filingFrequency} onChange={(e) => set('filingFrequency', e.target.value)}>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
              </select>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-primary)' }}>
              <input type="checkbox" checked={form.isComposition} onChange={(e) => set('isComposition', e.target.checked)} />
              Registered under Composition Scheme
            </label>
          </div>
          <div>
            <Section title="Business Address" />
            <Field k="addressLine1" l="Address line 1" ph="Street" form={form} set={set} errors={errors} />
            <Field k="addressLine2" l="Address line 2" ph="Optional" form={form} set={set} errors={errors} />
            <Field k="city" l="City" ph="Mumbai" form={form} set={set} errors={errors} />
            <Field k="pincode" l="Pincode" ph="400001" form={form} set={set} errors={errors} />
            <Field k="email" l="Email" ph="gst@company.com" type="email" form={form} set={set} errors={errors} />
            <Field k="phone" l="Phone" ph="9876543210" form={form} set={set} errors={errors} />
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 12 }}>
          {loading && <span className="spinner" />}
          {loading ? 'Saving…' : 'Save GST configuration'}
        </button>
      </form>
    </div>
  );
}
