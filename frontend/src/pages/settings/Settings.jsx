import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { teamApi } from '../../api/teamApi';
import { productApi } from '../../api/productApi';
import { salesApi } from '../../api/salesApi';
import { purchaseApi } from '../../api/purchaseApi';
import { downloadBlob } from '../../utils/formatters';
import Tabs from '../../components/Tabs';
import ConfirmDialog from '../../components/ConfirmDialog';

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
    e.preventDefault();
    setError('');
    if (form.newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    if (form.newPassword !== form.confirm) {
      setError("New passwords don't match");
      return;
    }
    setSaving(true);
    try {
      await teamApi.changeOwnPassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast.success('Password updated successfully');
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      setError(err.response?.data?.message || (err.request ? 'Could not reach the server.' : 'Something went wrong'));
    } finally {
      setSaving(false);
    }
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
          {saving && <span className="spinner" />}
          {saving ? 'Updating…' : 'Update Password'}
        </button>
      </form>
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

  const TABS = [
    { id: 'account', label: 'Account Profile', icon: 'ti-user' },
    { id: 'appearance', label: 'Appearance', icon: 'ti-palette' },
    { id: 'data', label: 'Data Export', icon: 'ti-download' },
    { id: 'security', label: 'Security', icon: 'ti-shield-lock' },
  ];

  const handleExport = async (type) => {
    setExportingType(type);
    try {
      if (type === 'products') {
        const r = await productApi.export();
        downloadBlob(r.data, 'products_backup.csv');
      } else if (type === 'sales') {
        const r = await salesApi.export();
        downloadBlob(r.data, 'sales_backup.csv');
      } else if (type === 'purchases') {
        const r = await purchaseApi.export();
        downloadBlob(r.data, 'purchases_backup.csv');
      }
      toast.success(`${type.toUpperCase()} data exported`);
    } catch (err) {
      toast.error(`Failed to export ${type} data`);
    } finally {
      setExportingType(null);
    }
  };

  return (
    <div className="page" style={{ maxWidth: 720 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Workspace Settings</h1>
          <p className="page-subtitle">Manage your credentials, preferences, visual theme, and data exports.</p>
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

      {activeTab === 'appearance' && (
        <div className="stagger">
          <div className="card card-pad" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>Visual Theme</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
              Choose your preferred interface lighting mode.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div
                onClick={() => theme === 'dark' && toggle()}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  border: theme === 'light' ? '2px solid var(--brand)' : '1px solid var(--glass-border)',
                  background: '#ffffff',
                  color: '#12131a',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <i className="ti ti-sun" style={{ fontSize: 20, color: '#f59e0b' }} />
                  {theme === 'light' && <span className="badge badge-success">Active</span>}
                </div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Light Aurora</div>
                <div style={{ fontSize: 11.5, color: '#6b7280', marginTop: 2 }}>Clean frosted glass with high contrast.</div>
              </div>

              <div
                onClick={() => theme === 'light' && toggle()}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  border: theme === 'dark' ? '2px solid var(--brand)' : '1px solid var(--glass-border)',
                  background: '#161923',
                  color: '#f1f2f6',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <i className="ti ti-moon" style={{ fontSize: 20, color: '#818cf8' }} />
                  {theme === 'dark' && <span className="badge badge-success">Active</span>}
                </div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Dark Aurora</div>
                <div style={{ fontSize: 11.5, color: '#94a0b8', marginTop: 2 }}>Deep obsidian night with glowing accents.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'data' && (
        <div className="stagger">
          <div className="card card-pad" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>Data Export & Backups</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
              Download complete CSV archives of your business records at any time.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 10, background: 'var(--surface-3)' }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>Products Catalog CSV</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>All SKU items, stock levels, pricing, HSN codes</div>
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleExport('products')}
                  disabled={exportingType === 'products'}
                >
                  {exportingType === 'products' ? <span className="spinner" /> : <i className="ti ti-download" />}
                  Export CSV
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 10, background: 'var(--surface-3)' }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>Sales Transactions CSV</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>All sales receipts, payment statuses, customer details</div>
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleExport('sales')}
                  disabled={exportingType === 'sales'}
                >
                  {exportingType === 'sales' ? <span className="spinner" /> : <i className="ti ti-download" />}
                  Export CSV
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 10, background: 'var(--surface-3)' }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>Purchases & Procurement CSV</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>All vendor purchase orders and procurement costs</div>
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleExport('purchases')}
                  disabled={exportingType === 'purchases'}
                >
                  {exportingType === 'purchases' ? <span className="spinner" /> : <i className="ti ti-download" />}
                  Export CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="stagger">
          <ChangePasswordCard />

          <div className="card card-pad" style={{ border: '1px solid rgba(239,68,68,0.3)', marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--danger-text)', marginBottom: 4 }}>Session & Danger Zone</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
              Terminate your active authentication session on this device.
            </div>

            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="btn btn-danger"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <i className="ti ti-logout" /> End Session & Log Out
            </button>
          </div>
        </div>
      )}

      {showLogoutConfirm && (
        <ConfirmDialog
          isOpen={showLogoutConfirm}
          title="Log out of InventoryPro?"
          message="You will need to sign back in with your credentials to access your store inventory."
          confirmText="Log out"
          variant="danger"
          onConfirm={logout}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      )}
    </div>
  );
}