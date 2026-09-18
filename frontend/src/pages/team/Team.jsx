import React, { useState, useEffect } from 'react';
import { teamApi } from '../../api/teamApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import ConfirmDialog from '../../components/ConfirmDialog';
import { fmtDate } from '../../utils/formatters';

const ROLES = ['ADMIN', 'MANAGER', 'STAFF'];

function InviteModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', role: 'STAFF' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await teamApi.invite(form);
      toast.success('Team member added');
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || (err.request ? 'Could not reach the server.' : 'Something went wrong'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Add team member" onClose={onClose} maxWidth={460}>
      {error && <div className="banner banner-error"><i className="ti ti-alert-circle" /><span>{error}</span></div>}
      <form onSubmit={submit}>
        <div className="field-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label className="field-label">First name</label>
            <input className="field-input" value={form.firstName} onChange={set('firstName')} required placeholder="Priya" />
          </div>
          <div>
            <label className="field-label">Last name</label>
            <input className="field-input" value={form.lastName} onChange={set('lastName')} required placeholder="Sharma" />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label className="field-label">Email</label>
          <input className="field-input" type="email" value={form.email} onChange={set('email')} required placeholder="priya@company.com" />
        </div>
        <div className="field-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12, marginBottom: 4 }}>
          <div>
            <label className="field-label">Temporary password</label>
            <input className="field-input" type="text" minLength={6} value={form.password} onChange={set('password')} required placeholder="Min 6 characters" />
          </div>
          <div>
            <label className="field-label">Role</label>
            <select className="field-input" value={form.role} onChange={set('role')}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginBottom: 16 }}>
          Share this password with them directly so they can log in right away.
        </p>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving && <span className="spinner" />}
            {saving ? 'Adding…' : 'Add member'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function roleBadge(role) {
  const map = { ADMIN: 'badge-danger', MANAGER: 'badge-warning', STAFF: 'badge-neutral' };
  return <span className={`badge ${map[role] || 'badge-neutral'}`}>{role}</span>;
}

function ResetPasswordModal({ member, onClose }) {
  const [tempPassword, setTempPassword] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const doReset = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await teamApi.resetPassword(member.id);
      setTempPassword(r.data.data.temporaryPassword);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reset password');
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    navigator.clipboard?.writeText(tempPassword);
    toast.success('Copied to clipboard');
  };

  return (
    <Modal title={`Reset password · ${member.firstName} ${member.lastName}`} onClose={onClose} maxWidth={400}>
      {error && <div className="banner banner-error"><i className="ti ti-alert-circle" /><span>{error}</span></div>}
      {!tempPassword ? (
        <>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
            This generates a new temporary password for <strong style={{ color: 'var(--text-primary)' }}>{member.email}</strong> and replaces their current one.
          </p>
          <div className="modal-actions" style={{ marginTop: 0 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={doReset} disabled={loading}>
              {loading && <span className="spinner" />}
              {loading ? 'Resetting…' : 'Generate New Password'}
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 8 }}>New temporary password:</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <div style={{ flex: 1, padding: '10px 14px', borderRadius: 10, background: 'var(--glass-bg-strong)', border: '1px solid var(--glass-border)', fontFamily: 'monospace', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.03em' }}>
              {tempPassword}
            </div>
            <button className="btn btn-secondary btn-icon" onClick={copy} aria-label="Copy password">
              <i className="ti ti-copy" />
            </button>
          </div>
          <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Share this temporary password with the user.
          </p>
          <div className="modal-actions" style={{ marginTop: 0 }}>
            <button type="button" className="btn btn-primary" onClick={onClose}>Done</button>
          </div>
        </>
      )}
    </Modal>
  );
}

export default function Team() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const { user } = useAuth();
  const toast = useToast();

  const load = () => {
    setLoading(true);
    teamApi.list().then((r) => setMembers(r.data.data || [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const isAdmin = user?.role === 'ADMIN';

  const changeRole = async (id, role) => {
    try {
      await teamApi.updateRole(id, role);
      toast.success('Role updated');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update role');
    }
  };

  const handleToggleActive = async () => {
    if (!deactivateTarget) return;
    try {
      if (deactivateTarget.isActive) await teamApi.deactivate(deactivateTarget.id);
      else await teamApi.activate(deactivateTarget.id);
      toast.success(deactivateTarget.isActive ? 'Member deactivated' : 'Member activated');
      setDeactivateTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update member status');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Team Management</h1>
          <p className="page-subtitle">Users, roles, and access controls for this workspace.</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowInvite(true)}>
            <i className="ti ti-user-plus" /> Add team member
          </button>
        )}
      </div>

      {!isAdmin && (
        <div className="banner" style={{ background: 'var(--glass-bg-strong)', color: 'var(--text-secondary)', marginBottom: 16 }}>
          <i className="ti ti-info-circle" />
          <span>Only workspace admins can invite members, change roles, or reset credentials.</span>
        </div>
      )}

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined Date</th>
              {isAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(3)].map((_, i) => (
                <tr key={i} className="skeleton-row">{[...Array(6)].map((__, j) => <td key={j}><div className="skeleton-bar" style={{ width: '60%' }} /></td>)}</tr>
              ))
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    icon="ti-users-group"
                    title="No team members found"
                    description="Invite team members to collaborate in your workspace."
                    actionText={isAdmin ? 'Add team member' : undefined}
                    onAction={() => setShowInvite(true)}
                  />
                </td>
              </tr>
            ) : (
              members.map((m) => {
                const initials = `${m.firstName?.[0] || ''}${m.lastName?.[0] || ''}`.toUpperCase();
                return (
                  <tr key={m.id} style={{ opacity: m.isActive ? 1 : 0.55 }}>
                    <td style={{ fontWeight: 500 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                            color: '#fff',
                            fontSize: 11,
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {initials}
                        </div>
                        <div>
                          <div>{m.firstName} {m.lastName}</div>
                          {m.id === user?.id && <div style={{ fontSize: 10, color: 'var(--brand)', fontWeight: 600 }}>Current User</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 12.5 }}>{m.email}</td>
                    <td>
                      {isAdmin && m.id !== user?.id ? (
                        <select className="field-input" style={{ width: 110, padding: '5px 8px', fontSize: 12 }} value={m.role} onChange={(e) => changeRole(m.id, e.target.value)}>
                          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      ) : roleBadge(m.role)}
                    </td>
                    <td>
                      <span className={`badge ${m.isActive ? 'badge-success' : 'badge-neutral'}`}>{m.isActive ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{fmtDate(m.createdAt)}</td>
                    {isAdmin && (
                      <td style={{ textAlign: 'right' }}>
                        {m.id !== user?.id && (
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => setResetTarget(m)} title="Reset Password">
                              <i className="ti ti-key" /> Reset
                            </button>
                            <button
                              className={`btn btn-sm ${m.isActive ? 'btn-danger' : 'btn-secondary'}`}
                              onClick={() => setDeactivateTarget(m)}
                            >
                              {m.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} onSaved={() => { setShowInvite(false); load(); }} />}
      {resetTarget && <ResetPasswordModal member={resetTarget} onClose={() => setResetTarget(null)} />}
      {deactivateTarget && (
        <ConfirmDialog
          isOpen={Boolean(deactivateTarget)}
          title={`${deactivateTarget.isActive ? 'Deactivate' : 'Activate'} User?`}
          message={`Are you sure you want to ${deactivateTarget.isActive ? 'deactivate' : 'activate'} ${deactivateTarget.firstName} ${deactivateTarget.lastName}?`}
          confirmText={deactivateTarget.isActive ? 'Deactivate' : 'Activate'}
          variant={deactivateTarget.isActive ? 'danger' : 'primary'}
          onConfirm={handleToggleActive}
          onCancel={() => setDeactivateTarget(null)}
        />
      )}
    </div>
  );
}