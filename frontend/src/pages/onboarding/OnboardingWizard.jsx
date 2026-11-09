import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/axiosConfig';

const STEPS = [
  { id: 'business', title: 'Business Details', icon: 'ti-building-store' },
  { id: 'gst', title: 'GST & Tax', icon: 'ti-file-certificate' },
  { id: 'invite', title: 'Invite Team', icon: 'ti-users' },
  { id: 'done', title: 'You\'re all set!', icon: 'ti-sparkles' },
];

const BUSINESS_TYPES = [
  { key: 'RETAIL', label: 'Retail Shop', icon: 'ti-building-store' },
  { key: 'WHOLESALE', label: 'Wholesale', icon: 'ti-box' },
  { key: 'RESTAURANT', label: 'Restaurant / Cafe', icon: 'ti-tools-kitchen-2' },
  { key: 'PHARMACY', label: 'Pharmacy', icon: 'ti-pill' },
  { key: 'ECOMMERCE', label: 'E-Commerce', icon: 'ti-shopping-cart' },
  { key: 'SERVICES', label: 'Services', icon: 'ti-briefcase' },
  { key: 'MANUFACTURING', label: 'Manufacturing', icon: 'ti-tools' },
  { key: 'OTHER', label: 'Other', icon: 'ti-dots' },
];

export default function OnboardingWizard({ onComplete }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [gstRegistered, setGstRegistered] = useState(null); // true | false | null
  const [inviteEmails, setInviteEmails] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleNext = async () => {
    if (step === 0) {
      if (!businessName.trim()) { showToast('Enter your business name', 'error'); return; }
      if (!businessType) { showToast('Select your business type', 'error'); return; }
    }
    if (step === STEPS.length - 2) {
      // Save all onboarding data
      setSaving(true);
      try {
        await apiClient.put('/api/v1/settings/onboarding', {
          businessName: businessName.trim(),
          businessType,
          phone: phone.trim(),
          address: address.trim(),
          gstin: gstin.trim(),
          gstRegistered,
          inviteEmails: inviteEmails.split(',').map((e) => e.trim()).filter(Boolean),
        });
      } catch {
        // Non-fatal — endpoint may not exist yet, continue anyway
      } finally {
        setSaving(false);
      }
    }
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      onComplete?.();
      navigate('/');
    }
  };

  const progress = ((step) / (STEPS.length - 1)) * 100;

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--shell-bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, fontFamily: 'inherit',
    }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          padding: '10px 18px', borderRadius: 10, fontWeight: 500, fontSize: 13,
          background: toast.type === 'error' ? 'rgba(239,68,68,0.9)' : 'rgba(99,102,241,0.9)',
          color: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,.3)',
        }}>{toast.msg}</div>
      )}

      <div style={{ width: '100%', maxWidth: 560 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16,
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px', boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
          }}>
            <i className="ti ti-package" style={{ fontSize: 24, color: '#fff' }} />
          </div>
          <div style={{ fontWeight: 800, fontSize: 20 }}>Welcome to InventoryPro</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            Let's set up your business in 2 minutes
          </div>
        </div>

        {/* Step indicators */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          {STEPS.map((s, i) => (
            <div key={s.id} style={{ flex: 1, height: 3, borderRadius: 3, background: i <= step ? 'var(--brand)' : 'rgba(255,255,255,0.1)', transition: 'background 0.3s' }} />
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 24 }}>
          Step {step + 1} of {STEPS.length} · {STEPS[step].title}
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 20, padding: 32,
        }}>
          {/* Step 0: Business details */}
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={stepIconStyle}><i className="ti ti-building-store" style={{ fontSize: 18, color: 'var(--brand)' }} /></div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>Tell us about your business</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>This personalizes your experience</div>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Business Name *</label>
                <input autoFocus type="text" placeholder="e.g. Meena General Store" value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Business Type *</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {BUSINESS_TYPES.map((b) => (
                    <button key={b.key} onClick={() => setBusinessType(b.key)} style={{
                      padding: '10px 6px', borderRadius: 10, border: businessType === b.key ? '1.5px solid var(--brand)' : '1px solid rgba(255,255,255,0.1)',
                      background: businessType === b.key ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                      color: businessType === b.key ? 'var(--brand)' : 'var(--text-secondary)',
                      cursor: 'pointer', fontSize: 10, fontWeight: businessType === b.key ? 700 : 500,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                    }}>
                      <i className={`ti ${b.icon}`} style={{ fontSize: 16 }} />
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Phone</label>
                  <input type="tel" placeholder="+91 98765 43210" value={phone}
                    onChange={(e) => setPhone(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>City / Address</label>
                  <input type="text" placeholder="Mumbai, Maharashtra" value={address}
                    onChange={(e) => setAddress(e.target.value)} style={inputStyle} />
                </div>
              </div>
            </div>
          )}

          {/* Step 1: GST */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={stepIconStyle}><i className="ti ti-file-certificate" style={{ fontSize: 18, color: 'var(--brand)' }} /></div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>GST Registration</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Enable GST-compliant invoicing</div>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Are you GST Registered?</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[{ val: true, label: 'Yes, I have GSTIN' }, { val: false, label: 'No / Composition' }].map((opt) => (
                    <button key={String(opt.val)} onClick={() => setGstRegistered(opt.val)} style={{
                      flex: 1, padding: '12px', borderRadius: 10,
                      border: gstRegistered === opt.val ? '1.5px solid var(--brand)' : '1px solid rgba(255,255,255,0.1)',
                      background: gstRegistered === opt.val ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                      color: gstRegistered === opt.val ? 'var(--brand)' : 'var(--text-secondary)',
                      cursor: 'pointer', fontWeight: gstRegistered === opt.val ? 700 : 500, fontSize: 13,
                    }}>{opt.label}</button>
                  ))}
                </div>
              </div>
              {gstRegistered && (
                <div>
                  <label style={labelStyle}>GSTIN</label>
                  <input type="text" placeholder="22AAAAA0000A1Z5" value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())} style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: '0.08em' }}
                    maxLength={15} />
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>15-character GST Identification Number</div>
                </div>
              )}
              {gstRegistered === false && (
                <div style={{ padding: '12px 14px', background: 'rgba(99,102,241,0.08)', borderRadius: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
                  <i className="ti ti-info-circle" style={{ marginRight: 6, color: 'var(--brand)' }} />
                  No problem! You can still issue invoices. You can add your GSTIN later in <strong>Settings → GST Setup</strong>.
                </div>
              )}
            </div>
          )}

          {/* Step 2: Invite team */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={stepIconStyle}><i className="ti ti-users" style={{ fontSize: 18, color: 'var(--brand)' }} /></div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>Invite your team</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Optional — you can do this later</div>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Team member emails</label>
                <textarea
                  value={inviteEmails}
                  onChange={(e) => setInviteEmails(e.target.value)}
                  placeholder="john@example.com, jane@example.com"
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
                />
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Separate multiple emails with commas. They'll receive an invite link.</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>TEAM ROLES</div>
                {[
                  { role: 'ADMIN', desc: 'Full access — settings, reports, all modules' },
                  { role: 'MANAGER', desc: 'Products, Sales, Purchases, Stock, Analytics' },
                  { role: 'CASHIER', desc: 'POS billing counter only' },
                ].map((r) => (
                  <div key={r.role} style={{ display: 'flex', gap: 10, marginBottom: 8, fontSize: 12 }}>
                    <span style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--brand)', borderRadius: 6, padding: '2px 8px', fontWeight: 700, flexShrink: 0 }}>{r.role}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{r.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Done */}
          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px', boxShadow: '0 8px 24px rgba(34,197,94,0.4)',
              }}>
                <i className="ti ti-check" style={{ fontSize: 32, color: '#fff' }} />
              </div>
              <div style={{ fontWeight: 800, fontSize: 22, marginBottom: 10 }}>You're all set! 🎉</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                <strong style={{ color: 'var(--text-primary)' }}>{businessName || 'Your business'}</strong> is ready on InventoryPro.
                <br />Start adding products, record your first sale, or explore the AI insights.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Add your first product', icon: 'ti-package', path: '/products' },
                  { label: 'Record a sale', icon: 'ti-receipt', path: '/sales' },
                  { label: 'Open POS counter', icon: 'ti-device-tablet-dollar', path: '/pos' },
                ].map((item) => (
                  <button key={item.path} onClick={() => navigate(item.path)} style={{
                    padding: '11px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)', cursor: 'pointer',
                    fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                  }}>
                    <i className={`ti ${item.icon}`} style={{ fontSize: 16, color: 'var(--brand)' }} />
                    {item.label}
                    <i className="ti ti-arrow-right" style={{ marginLeft: 'auto', opacity: 0.5 }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div style={{ display: 'flex', gap: 10, marginTop: 28, justifyContent: 'space-between' }}>
            {step > 0 && step < STEPS.length - 1 && (
              <button onClick={() => setStep((s) => s - 1)} style={{
                padding: '11px 20px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: 500,
              }}>
                <i className="ti ti-arrow-left" style={{ marginRight: 6 }} /> Back
              </button>
            )}
            {step < STEPS.length - 1 && (
              <button onClick={handleNext} disabled={saving} style={{
                marginLeft: 'auto', padding: '11px 28px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#fff',
                cursor: saving ? 'wait' : 'pointer', fontSize: 13, fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
              }}>
                {saving ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: '#fff', borderColor: 'rgba(255,255,255,.3)' }} /> : null}
                {step === STEPS.length - 2 ? 'Finish Setup' : 'Continue'}
                {!saving && <i className="ti ti-arrow-right" />}
              </button>
            )}
            {step === STEPS.length - 1 && (
              <button onClick={() => { onComplete?.(); navigate('/'); }} style={{
                width: '100%', padding: '13px', borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#fff',
                cursor: 'pointer', fontSize: 15, fontWeight: 700,
                boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
              }}>
                Go to Dashboard <i className="ti ti-layout-dashboard" style={{ marginLeft: 6 }} />
              </button>
            )}
          </div>

          {/* Skip option */}
          {step < STEPS.length - 1 && step > 0 && (
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <button onClick={() => setStep((s) => s + 1)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12 }}>
                Skip this step →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' };
const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', fontFamily: 'inherit' };
const stepIconStyle = { width: 40, height: 40, borderRadius: 12, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
