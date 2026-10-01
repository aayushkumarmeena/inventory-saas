import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { teamApi } from '../../api/teamApi';
import { productApi } from '../../api/productApi';
import { salesApi } from '../../api/salesApi';
import { purchaseApi } from '../../api/purchaseApi';
import { customerApi } from '../../api/customerApi';
import { analyticsApi } from '../../api/analyticsApi';
import { downloadBlob, fmtCurrency } from '../../utils/formatters';
import Tabs from '../../components/Tabs';
import ConfirmDialog from '../../components/ConfirmDialog';

const DEFAULT_BRANDING = {
  logoDataUrl: '',
  accentColor: '#2563eb',
  headerLayout: 'logo-left',
  showLogoOnThermal: false,
  footerMessage: 'Thank you for shopping with us! Visit again.',
  termsAndConditions: '1. Goods once sold will not be exchanged or returned without original bill.\n2. Please verify items and cash before leaving counter.\n3. Subject to local jurisdiction only.',
  showTermsOnA4: true,
  showQrOnA4: true,
  showQrOnThermal: true,
  invoiceTitle: 'TAX INVOICE / BILL',
  footerNote: '',
};

function loadBranding() {
  try {
    const s = localStorage.getItem('inventorypro_branding');
    if (s) return { ...DEFAULT_BRANDING, ...JSON.parse(s) };
  } catch (e) {}
  return { ...DEFAULT_BRANDING };
}

function saveBranding(b) {
  localStorage.setItem('inventorypro_branding', JSON.stringify(b));
}

function Row({ label, value, subtext }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</div>
        {subtext && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{subtext}</div>}
      </div>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{value || '—'}</span>
    </div>
  );
}

function ChangePasswordCard() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault(); setError('');
    if (form.newPassword.length < 6) { setError('New password must be at least 6 characters'); return; }
    if (form.newPassword !== form.confirm) { setError("New passwords don't match"); return; }
    setSaving(true);
    try {
      await teamApi.changeOwnPassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast.success('Password updated successfully');
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      setError(err.response?.data?.message || (err.request ? 'Could not reach the server.' : 'Something went wrong'));
    } finally { setSaving(false); }
  };
  return (
    <div className="card card-pad" style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>Change Password</div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>Keep your account secure with a strong password.</div>
      {error && <div className="banner banner-error"><i className="ti ti-alert-circle" /><span>{error}</span></div>}
      <form onSubmit={submit}>
        <div style={{ marginBottom: 12 }}>
          <label className="field-label">Current Password</label>
          <input className="field-input" type="password" value={form.currentPassword} onChange={set('currentPassword')} required />
        </div>
        <div className="field-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label className="field-label">New Password</label>
            <input className="field-input" type="password" minLength={6} value={form.newPassword} onChange={set('newPassword')} required placeholder="Min 6 chars" />
          </div>
          <div>
            <label className="field-label">Confirm New Password</label>
            <input className="field-input" type="password" minLength={6} value={form.confirm} onChange={set('confirm')} required />
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving && <span className="spinner" />}{saving ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}

function InvoicePreviewCard({ branding, storeName }) {
  const ac = branding.accentColor || '#2563eb';
  const logoEl = branding.logoDataUrl
    ? <img src={branding.logoDataUrl} alt="Logo" style={{ height: 44, maxWidth: 110, objectFit: 'contain', display: 'block' }} />
    : <div style={{ width: 56, height: 44, borderRadius: 8, background: ac, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 18 }}>{(storeName || 'S')[0]}</div>;
  const isCenter = branding.headerLayout === 'logo-center';
  const isRight = branding.headerLayout === 'logo-right';
  const textOnly = branding.headerLayout === 'text-only';
  return (
    <div style={{ background: '#fff', color: '#1f2937', borderRadius: 8, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.25)', fontSize: 9, userSelect: 'none', maxWidth: 420, margin: '0 auto' }}>
      <div style={{ borderBottom: `2.5px solid ${ac}`, padding: '10px 14px', ...(isCenter ? { textAlign: 'center' } : { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }) }}>
        {isCenter ? (
          <>
            {branding.logoDataUrl && <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>{logoEl}</div>}
            <div style={{ fontWeight: 800, fontSize: 14, color: ac, textTransform: 'uppercase' }}>{storeName || 'Your Store'}</div>
            <div style={{ fontSize: 8, color: '#6b7280', marginTop: 1 }}>Retail &amp; Wholesale · GST Compliant</div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexDirection: isRight ? 'row-reverse' : 'row' }}>
              {!textOnly && logoEl}
              <div>
                <div style={{ fontWeight: 800, fontSize: 13, color: ac, textTransform: 'uppercase' }}>{storeName || 'Your Store'}</div>
                <div style={{ fontSize: 8, color: '#6b7280', marginTop: 1 }}>Retail &amp; Wholesale · GST Compliant</div>
                <div style={{ fontSize: 8, color: '#6b7280' }}>Mumbai, Maharashtra | GSTIN: 27XXXXX</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'inline-block', background: '#eff6ff', border: `1.5px solid ${ac}`, color: ac, fontSize: 8, fontWeight: 800, padding: '2px 8px', borderRadius: 4 }}>{branding.invoiceTitle || 'TAX INVOICE / BILL'}</div>
              <div style={{ fontSize: 7, color: '#6b7280', marginTop: 2 }}>Original for Recipient</div>
              <div style={{ marginTop: 4, fontSize: 8 }}>
                <div><strong>Invoice #:</strong> <span style={{ fontFamily: 'monospace', color: ac }}>INV-2026-00042</span></div>
                <div><strong>Date:</strong> 01 Oct 2026</div>
              </div>
            </div>
          </>
        )}
      </div>
      <div style={{ padding: '6px 14px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 8 }}>
          <thead><tr style={{ background: '#f8fafc' }}>
            <th style={{ padding: '3px 4px', textAlign: 'left', border: '1px solid #e5e7eb' }}>Item</th>
            <th style={{ padding: '3px 4px', textAlign: 'center', width: 30, border: '1px solid #e5e7eb' }}>Qty</th>
            <th style={{ padding: '3px 4px', textAlign: 'right', width: 50, border: '1px solid #e5e7eb' }}>Amount</th>
          </tr></thead>
          <tbody>
            <tr><td style={{ padding: '3px 4px', border: '1px solid #e5e7eb' }}>Wireless Mouse</td><td style={{ padding: '3px 4px', textAlign: 'center', border: '1px solid #e5e7eb' }}>2</td><td style={{ padding: '3px 4px', textAlign: 'right', border: '1px solid #e5e7eb' }}>Rs.1,600</td></tr>
            <tr style={{ background: '#fbfcfe' }}><td style={{ padding: '3px 4px', border: '1px solid #e5e7eb' }}>Keyboard</td><td style={{ padding: '3px 4px', textAlign: 'center', border: '1px solid #e5e7eb' }}>1</td><td style={{ padding: '3px 4px', textAlign: 'right', border: '1px solid #e5e7eb' }}>Rs.4,200</td></tr>
          </tbody>
        </table>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
          <div style={{ background: ac, color: '#fff', padding: '3px 10px', borderRadius: 4, fontWeight: 800, fontSize: 9 }}>TOTAL: Rs.5,800</div>
        </div>
      </div>
      <div style={{ borderTop: '1px solid #e5e7eb', padding: '5px 14px', background: '#f9fafb', textAlign: 'center' }}>
        <div style={{ fontSize: 8, color: '#6b7280' }}>{branding.footerMessage || 'Thank you!'}</div>
        {branding.footerNote && <div style={{ fontSize: 7, color: '#9ca3af', marginTop: 2 }}>{branding.footerNote}</div>}
        {branding.termsAndConditions && branding.showTermsOnA4 && (
          <div style={{ fontSize: 7, color: '#9ca3af', marginTop: 3, textAlign: 'left' }}>{branding.termsAndConditions.substring(0, 100)}...</div>
        )}
      </div>
    </div>
  );
}

function BrandingTab({ toast }) {
  const [branding, setBranding] = useState(loadBranding);
  const [saved, setSaved] = useState(false);
  const [storeName, setStoreName] = useState(() => {
    try { return JSON.parse(localStorage.getItem('inventorypro_store_profile') || '{}').name || 'Your Store'; } catch { return 'Your Store'; }
  });
  const fileRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const set = (k) => (v) => setBranding((b) => ({ ...b, [k]: v }));
  const setE = (k) => (e) => set(k)(e.target.value);
  const setChk = (k) => (e) => set(k)(e.target.checked);

  const handleSave = () => {
    saveBranding(branding);
    setSaved(true);
    toast.success('Branding & invoice settings saved!');
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = () => {
    if (!window.confirm('Reset all branding settings to default?')) return;
    setBranding({ ...DEFAULT_BRANDING });
    saveBranding({ ...DEFAULT_BRANDING });
    toast.success('Branding reset to default');
  };

  const processImageFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image file (PNG, JPG, SVG, WebP)'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Logo must be under 2 MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => set('logoDataUrl')(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => processImageFile(e.target.files[0]);
  const handleDrop = (e) => { e.preventDefault(); setDragging(false); processImageFile(e.dataTransfer.files[0]); };

  const ACCENT_PRESETS = [
    { color: '#2563eb', label: 'Classic Blue' }, { color: '#7c3aed', label: 'Royal Purple' },
    { color: '#059669', label: 'Forest Green' }, { color: '#dc2626', label: 'Crimson Red' },
    { color: '#d97706', label: 'Amber Gold' }, { color: '#0891b2', label: 'Teal Cyan' },
    { color: '#db2777', label: 'Rose Pink' }, { color: '#374151', label: 'Charcoal' },
  ];

  const LAYOUT_OPTIONS = [
    { id: 'logo-left', label: 'Logo Left', icon: 'ti-layout-sidebar', desc: 'Logo + name on left, badge on right' },
    { id: 'logo-center', label: 'Centered', icon: 'ti-layout-distribute-horizontal', desc: 'Logo & store name centered' },
    { id: 'logo-right', label: 'Logo Right', icon: 'ti-layout-sidebar-right', desc: 'Text left, logo on right' },
    { id: 'text-only', label: 'Text Only', icon: 'ti-typography', desc: 'No logo, large store name only' },
  ];

  return (
    <div className="stagger">
      {/* Logo Upload */}
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>
          <i className="ti ti-photo-up" style={{ marginRight: 6 }} />Store Logo
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
          Upload your store logo — appears on all A4 invoices, thermal receipts (optional), and delivery challans. PNG with transparent background recommended.
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            style={{ border: `2px dashed ${dragging ? 'var(--brand)' : 'var(--border)'}`, borderRadius: 12, padding: '20px 28px', textAlign: 'center', cursor: 'pointer', background: dragging ? 'rgba(99,102,241,0.05)' : 'var(--surface-3)', transition: 'all 0.15s', minWidth: 180 }}
          >
            <i className="ti ti-cloud-upload" style={{ fontSize: 28, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }} />
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Click or Drop Image</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>PNG, JPG, SVG, WebP · Max 2 MB</div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Logo</div>
            {branding.logoDataUrl ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ padding: 12, borderRadius: 10, background: '#fff', border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 120, minHeight: 64 }}>
                  <img src={branding.logoDataUrl} alt="Light bg" style={{ maxHeight: 60, maxWidth: 180, objectFit: 'contain' }} />
                </div>
                <div style={{ padding: 12, borderRadius: 10, background: '#0a0d1a', border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 120, minHeight: 64 }}>
                  <img src={branding.logoDataUrl} alt="Dark bg" style={{ maxHeight: 60, maxWidth: 180, objectFit: 'contain' }} />
                </div>
                <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--danger-text)', fontSize: 11 }} onClick={() => set('logoDataUrl')('')}>
                  <i className="ti ti-trash" /> Remove Logo
                </button>
              </div>
            ) : (
              <div style={{ width: 120, height: 72, borderRadius: 10, background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border)' }}>
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 11 }}>
                  <i className="ti ti-image-off" style={{ fontSize: 20, display: 'block' }} />No logo
                </div>
              </div>
            )}
          </div>
          {branding.logoDataUrl && (
            <div style={{ alignSelf: 'flex-end' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12 }}>
                <input type="checkbox" checked={branding.showLogoOnThermal} onChange={setChk('showLogoOnThermal')} />
                Show logo on 80mm thermal receipts
              </label>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Logo prints slower — disable for high-speed POS.</div>
            </div>
          )}
        </div>
      </div>

      {/* Accent Color */}
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>
          <i className="ti ti-palette" style={{ marginRight: 6 }} />Invoice Accent Color
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
          Used for header underline, invoice badge border, grand total row background, and section headings.
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
          {ACCENT_PRESETS.map((p) => (
            <button key={p.color} type="button" title={p.label} onClick={() => set('accentColor')(p.color)}
              style={{ width: 36, height: 36, borderRadius: 8, background: p.color, border: branding.accentColor === p.color ? '3px solid var(--text-primary)' : '2px solid transparent', cursor: 'pointer', transition: 'border 0.15s', outline: 'none' }}
            />
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-3)', borderRadius: 8, padding: '4px 10px', border: '1px solid var(--border)' }}>
            <input type="color" value={branding.accentColor} onChange={setE('accentColor')} style={{ width: 28, height: 28, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
            <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-primary)' }}>{branding.accentColor}</span>
          </div>
        </div>
      </div>

      {/* Header Layout */}
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>
          <i className="ti ti-layout" style={{ marginRight: 6 }} />Invoice Header Layout
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
          Choose how your logo and store name appear at the top of the A4 invoice.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 10 }}>
          {LAYOUT_OPTIONS.map((opt) => (
            <div key={opt.id} onClick={() => set('headerLayout')(opt.id)}
              style={{ padding: '12px 14px', borderRadius: 10, cursor: 'pointer', border: branding.headerLayout === opt.id ? '2px solid var(--brand)' : '1px solid var(--border)', background: branding.headerLayout === opt.id ? 'rgba(99,102,241,0.06)' : 'var(--surface-3)', transition: 'all 0.15s' }}
            >
              <i className={`ti ${opt.icon}`} style={{ fontSize: 20, color: branding.headerLayout === opt.id ? 'var(--brand)' : 'var(--text-secondary)', display: 'block', marginBottom: 6 }} />
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{opt.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>{opt.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Invoice Text */}
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>
          <i className="ti ti-file-invoice" style={{ marginRight: 6 }} />Invoice Text &amp; Content
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
          Customize the text that appears on your printed invoices and thermal receipts.
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <label className="field-label">Invoice Title <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(header badge text)</span></label>
            <input className="field-input" placeholder="TAX INVOICE / BILL" value={branding.invoiceTitle} onChange={setE('invoiceTitle')} />
          </div>
          <div>
            <label className="field-label">Footer Message <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(appears below invoice)</span></label>
            <input className="field-input" placeholder="Thank you for shopping with us! Come again." value={branding.footerMessage} onChange={setE('footerMessage')} />
          </div>
          <div>
            <label className="field-label">Footer Note <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(small print: CIN, website, e-waste)</span></label>
            <input className="field-input" placeholder="e.g. CIN: U12345MH2020PTC123456 | www.yourstore.com" value={branding.footerNote} onChange={setE('footerNote')} />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label className="field-label" style={{ margin: 0 }}>Terms &amp; Conditions</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                <input type="checkbox" checked={branding.showTermsOnA4} onChange={setChk('showTermsOnA4')} />
                Show on A4 invoice
              </label>
            </div>
            <textarea className="field-input" style={{ minHeight: 90, resize: 'vertical', fontFamily: 'inherit', fontSize: 12 }}
              placeholder="Enter your return policy, exchange terms, legal disclaimers..."
              value={branding.termsAndConditions} onChange={setE('termsAndConditions')}
            />
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12 }}>
              <input type="checkbox" checked={branding.showQrOnA4} onChange={setChk('showQrOnA4')} />
              Show UPI QR code on A4 invoice
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12 }}>
              <input type="checkbox" checked={branding.showQrOnThermal} onChange={setChk('showQrOnThermal')} />
              Show UPI QR on thermal receipt
            </label>
          </div>
        </div>
      </div>

      {/* Live Preview */}
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>
          <i className="ti ti-eye" style={{ marginRight: 6 }} />Live Invoice Preview
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
          Real-time preview of how your A4 invoice header will look when printed.
        </div>
        <div style={{ background: '#1e293b', padding: 20, borderRadius: 12 }}>
          <InvoicePreviewCard branding={branding} storeName={storeName} />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 24 }}>
        <button type="button" className="btn btn-ghost" onClick={handleReset}>
          <i className="ti ti-refresh" /> Reset to Default
        </button>
        <button type="button" className="btn btn-primary" onClick={handleSave}>
          {saved ? <><i className="ti ti-check" /> Saved!</> : <><i className="ti ti-device-floppy" /> Save Branding &amp; Invoice Settings</>}
        </button>
      </div>
    </div>
  );
}

export default function Settings() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('account');
  const [exportingType, setExportingType] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallApp = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') setInstallPrompt(null);
    } else {
      alert('To install: on Chrome/Edge click the Install icon in the address bar, or on Safari tap Share -> Add to Home Screen.');
    }
  };

  const TABS = [
    { id: 'account', label: 'Account Profile', icon: 'ti-user' },
    { id: 'branding', label: 'Branding & Invoice', icon: 'ti-brush' },
    { id: 'appearance', label: 'Appearance & App', icon: 'ti-palette' },
    { id: 'data', label: 'Data & Reports Export', icon: 'ti-download' },
    { id: 'security', label: 'Security', icon: 'ti-shield-lock' },
  ];

  const handleExport = async (type) => {
    setExportingType(type);
    try {
      if (type === 'products') { const r = await productApi.export(); downloadBlob(r.data, 'products_backup.csv'); }
      else if (type === 'sales') { const r = await salesApi.export(); downloadBlob(r.data, 'sales_backup.csv'); }
      else if (type === 'purchases') { const r = await purchaseApi.export(); downloadBlob(r.data, 'purchases_backup.csv'); }
      else if (type === 'receivables') {
        const r = await customerApi.list({ page: 0, size: 1000 });
        const custs = r.data?.data?.content || [];
        const header = "Customer Name,Phone,Email,Address,Total Orders,Total Spent,Outstanding Dues\n";
        const rows = custs.map(c => `"${c.name.replace(/"/g, '""')}","${c.phone || ''}","${c.email || ''}","${(c.address || '').replace(/"/g, '""')}",${c.totalOrders || 0},${c.totalSpent || 0},${c.outstandingBalance || 0}`).join('\n');
        downloadBlob(header + rows, `customer_receivables_${new Date().toISOString().slice(0, 10)}.csv`);
      } else if (type === 'pnl') {
        const r = await analyticsApi.profit(365); const data = r.data?.data || {};
        const header = "Date,Revenue,COGS,Gross Profit,Net Margin %\n";
        const rows = (data.trend || []).map(t => { const rev = Number(t.revenue || 0); const prof = Number(t.profit || 0); const margin = rev > 0 ? ((prof / rev) * 100).toFixed(2) : '0'; return `${t.date},${rev},${t.cost || 0},${prof},${margin}%`; }).join('\n');
        downloadBlob(header + rows, `pnl_statement_annual_${new Date().toISOString().slice(0, 10)}.csv`);
      } else if (type === 'inventory_audit') {
        const r = await analyticsApi.inventoryIntel(); const items = r.data?.data?.items || [];
        const header = "SKU,Product Name,Category,Price,Unit Cost,In Stock,Reorder Level,Velocity,Runway (Days),Status,Suggested Reorder,Valuation\n";
        const rows = items.map(i => `"${i.sku}","${i.name.replace(/"/g, '""')}","${i.category}",${i.price},${i.unitCost},${i.stockQuantity},${i.reorderLevel},${i.dailyVelocity},${i.runwayDays},"${i.badge}",${i.suggestedReorder},${i.stockValuation}`).join('\n');
        downloadBlob(header + rows, `inventory_audit_report_${new Date().toISOString().slice(0, 10)}.csv`);
      }
      toast.success(`${type.toUpperCase()} report exported successfully`);
    } catch (err) { toast.error(`Failed to export ${type} data`); }
    finally { setExportingType(null); }
  };

  return (
    <div className="page" style={{ maxWidth: 780 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Workspace Settings</h1>
          <p className="page-subtitle">Manage credentials, branding, invoice design, preferences, themes, and audit report exports.</p>
        </div>
      </div>

      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'account' && (
        <div className="stagger">
          <div className="card card-pad" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>Profile Details</div>
            <Row label="Full Name" value={`${user?.firstName || ''} ${user?.lastName || ''}`.trim()} />
            <Row label="Email Address" value={user?.email} />
            <Row label="System Role" value={user?.role} subtext="Assigned permissions level" />
            <Row label="Tenant Organization" value={user?.tenantName} subtext="Isolated multi-tenant container" />
          </div>
        </div>
      )}

      {activeTab === 'branding' && <BrandingTab toast={toast} />}

      {activeTab === 'appearance' && (
        <div className="stagger">
          <div className="card card-pad" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>Visual Theme</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>Choose your preferred interface lighting mode.</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div onClick={() => theme === 'dark' && toggle()} style={{ padding: 16, borderRadius: 12, border: theme === 'light' ? '2px solid var(--brand)' : '1px solid var(--glass-border)', background: '#ffffff', color: '#12131a', cursor: 'pointer', transition: 'all 0.15s ease' }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Light Theme</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>High-contrast clean white aesthetic</div>
              </div>
              <div onClick={() => theme === 'light' && toggle()} style={{ padding: 16, borderRadius: 12, border: theme === 'dark' ? '2px solid var(--brand)' : '1px solid var(--glass-border)', background: '#0a0d1a', color: '#f8fafc', cursor: 'pointer', transition: 'all 0.15s ease' }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Dark Glass Theme</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Modern dark glass with vibrant neon accents</div>
              </div>
            </div>
          </div>
          <div className="card card-pad" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>PWA Desktop &amp; Tablet App</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>Run InventoryPro as a standalone full-screen app on desktop, POS terminal, iPad, or Android tablet.</div>
            <button onClick={handleInstallApp} className="btn btn-primary btn-sm" style={{ gap: 8 }}>
              <i className="ti ti-device-mobile-down" style={{ fontSize: 16 }} />Install Standalone App
            </button>
          </div>
        </div>
      )}

      {activeTab === 'data' && (
        <div className="stagger">
          <div className="card card-pad" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>Data Export &amp; Financial Reports</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>Download complete CSV archives and analytical audits of your business records at any time.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { type: 'pnl', label: 'Profit & Loss (P&L) Statement CSV', desc: 'Daily revenue, COGS, gross profits, and net margin %', btn: 'Export P&L' },
                { type: 'receivables', label: 'Customer Khata & Receivables CSV', desc: 'Accounts receivable ledger, client contacts, and pending balances', btn: 'Export Ledger' },
                { type: 'inventory_audit', label: 'Inventory Health & Stockout Audit CSV', desc: 'Dead stock valuation, velocity runway, and suggested replenishment', btn: 'Export Audit' },
                { type: 'products', label: 'Products Catalog CSV', desc: 'All SKU items, stock levels, pricing, HSN codes', btn: 'Export CSV' },
                { type: 'sales', label: 'Sales Transactions CSV', desc: 'All sales receipts, payment statuses, customer details', btn: 'Export CSV' },
                { type: 'purchases', label: 'Purchases & Procurement CSV', desc: 'All vendor purchase orders and procurement costs', btn: 'Export CSV' },
              ].map(({ type, label, desc, btn }) => (
                <div key={type} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 10, background: 'var(--surface-3)' }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{desc}</div>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleExport(type)} disabled={exportingType === type}>
                    {exportingType === type ? <span className="spinner" /> : <i className="ti ti-download" />}{btn}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="stagger">
          <ChangePasswordCard />
          <div className="card card-pad" style={{ border: '1px solid rgba(239,68,68,0.3)', marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--danger-text)', marginBottom: 4 }}>Session &amp; Danger Zone</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>Terminate your active authentication session on this device.</div>
            <button onClick={() => setShowLogoutConfirm(true)} className="btn btn-danger" style={{ width: '100%', justifyContent: 'center' }}>
              <i className="ti ti-logout" /> End Session &amp; Log Out
            </button>
          </div>
        </div>
      )}

      {showLogoutConfirm && (
        <ConfirmDialog isOpen={showLogoutConfirm} title="Log out of InventoryPro?" message="You will need to sign back in with your credentials to access your store inventory." confirmText="Log out" variant="danger" onConfirm={logout} onCancel={() => setShowLogoutConfirm(false)} />
      )}
    </div>
  );
}
