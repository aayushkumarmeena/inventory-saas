import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fmtCurrency } from '../../utils/formatters';

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    price: 0,
    billing: 'forever',
    color: '#94a3b8',
    gradient: 'linear-gradient(135deg, #334155, #1e293b)',
    icon: 'ti-leaf',
    description: 'Perfect for getting started',
    limits: '100 transactions/month · 1 user · 500 products',
    features: [
      { text: '100 sales transactions / month', ok: true },
      { text: '500 product catalog', ok: true },
      { text: 'GST invoicing', ok: true },
      { text: 'Basic analytics', ok: true },
      { text: 'POS billing counter', ok: true },
      { text: 'AI Intelligence agent', ok: false },
      { text: 'Email invoice delivery', ok: false },
      { text: 'Multi-user (team access)', ok: false },
      { text: 'Daily digest reports', ok: false },
      { text: 'Priority support', ok: false },
    ],
  },
  {
    key: 'pro',
    name: 'Pro',
    price: 999,
    billing: 'per month',
    color: '#6366f1',
    gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    icon: 'ti-rocket',
    description: 'For growing businesses',
    badge: 'Most Popular',
    limits: 'Unlimited transactions · 5 users · Unlimited products',
    features: [
      { text: 'Unlimited sales transactions', ok: true },
      { text: 'Unlimited product catalog', ok: true },
      { text: 'GST invoicing + GSTR reports', ok: true },
      { text: 'Advanced analytics', ok: true },
      { text: 'POS billing counter', ok: true },
      { text: 'AI Intelligence agent', ok: true },
      { text: 'Email invoice delivery', ok: true },
      { text: 'Up to 5 team members', ok: true },
      { text: 'Daily digest reports', ok: true },
      { text: 'Email support', ok: false },
    ],
  },
  {
    key: 'business',
    name: 'Business',
    price: 2499,
    billing: 'per month',
    color: '#a855f7',
    gradient: 'linear-gradient(135deg, #a855f7, #ec4899)',
    icon: 'ti-building-skyscraper',
    description: 'For large operations',
    limits: 'Everything unlimited · Unlimited users · Dedicated support',
    features: [
      { text: 'Everything in Pro', ok: true },
      { text: 'Unlimited team members', ok: true },
      { text: 'Multi-warehouse support', ok: true },
      { text: 'Custom branding on invoices', ok: true },
      { text: 'API access', ok: true },
      { text: 'WhatsApp invoice delivery', ok: true },
      { text: 'Auto stock reorder rules', ok: true },
      { text: 'Dedicated account manager', ok: true },
      { text: 'Phone + priority support', ok: true },
      { text: 'Custom integrations', ok: true },
    ],
  },
];

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [billing, setBilling] = useState('monthly'); // 'monthly' | 'annual'
  const [upgrading, setUpgrading] = useState(null);

  const handleUpgrade = async (plan) => {
    if (plan.key === 'free') return;
    setUpgrading(plan.key);
    // Razorpay integration point — for now show a coming-soon alert
    setTimeout(() => {
      alert(`💳 Razorpay payment for ${plan.name} plan coming soon!\n\nFor early access pricing, contact: billing@inventorypro.in`);
      setUpgrading(null);
    }, 800);
  };

  const annualDiscount = 0.2; // 20% off on annual
  const getPrice = (p) => billing === 'annual' ? Math.round(p * (1 - annualDiscount)) : p;

  return (
    <div style={{ padding: '32px 24px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
          borderRadius: 20, padding: '5px 14px', marginBottom: 16, fontSize: 12, color: 'var(--brand)', fontWeight: 600,
        }}>
          <i className="ti ti-crown" style={{ fontSize: 13 }} /> Plans & Pricing
        </div>
        <h1 style={{ margin: '0 0 12px', fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em' }}>
          Simple, transparent pricing
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15, margin: '0 0 24px' }}>
          Start free. Scale as you grow. No hidden fees.
        </p>

        {/* Billing toggle */}
        <div style={{
          display: 'inline-flex', background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 4,
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          {['monthly', 'annual'].map((b) => (
            <button key={b} onClick={() => setBilling(b)} style={{
              padding: '7px 20px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: billing === b ? 'var(--brand)' : 'transparent',
              color: billing === b ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.2s',
            }}>
              {b === 'monthly' ? 'Monthly' : 'Annual'}
              {b === 'annual' && (
                <span style={{ marginLeft: 7, fontSize: 10, background: '#22c55e', color: '#fff', borderRadius: 6, padding: '2px 6px' }}>
                  Save 20%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Plan cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
        {PLANS.map((plan) => (
          <div key={plan.key} style={{
            borderRadius: 20, overflow: 'hidden',
            border: plan.key === 'pro' ? `2px solid ${plan.color}` : '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.03)',
            position: 'relative',
            transition: 'transform 0.2s',
          }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            {/* Popular badge */}
            {plan.badge && (
              <div style={{
                position: 'absolute', top: 16, right: 16,
                background: plan.gradient, color: '#fff',
                fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
              }}>
                {plan.badge}
              </div>
            )}

            {/* Header */}
            <div style={{ background: plan.gradient, padding: '24px 24px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className={`ti ${plan.icon}`} style={{ fontSize: 18, color: '#fff' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 18, color: '#fff' }}>{plan.name}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{plan.description}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 36, fontWeight: 800, color: '#fff' }}>
                  {plan.price === 0 ? 'Free' : `₹${getPrice(plan.price).toLocaleString('en-IN')}`}
                </span>
                {plan.price > 0 && (
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>/ {billing === 'annual' ? 'month, billed annually' : 'month'}</span>
                )}
              </div>
              {billing === 'annual' && plan.price > 0 && (
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 4 }}>
                  Save ₹{(plan.price * 12 * annualDiscount).toLocaleString('en-IN')} per year
                </div>
              )}
            </div>

            {/* Body */}
            <div style={{ padding: '20px 24px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 16, fontWeight: 500 }}>
                <i className="ti ti-info-circle" style={{ marginRight: 4 }} />{plan.limits}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                {plan.features.map((f) => (
                  <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13 }}>
                    <i className={`ti ${f.ok ? 'ti-check' : 'ti-x'}`} style={{
                      fontSize: 14, flexShrink: 0,
                      color: f.ok ? '#4ade80' : '#475569',
                      width: 18, height: 18,
                      background: f.ok ? 'rgba(34,197,94,0.12)' : 'transparent',
                      borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }} />
                    <span style={{ color: f.ok ? 'var(--text-primary)' : '#475569' }}>{f.text}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => plan.key === 'free' ? navigate('/') : handleUpgrade(plan)}
                disabled={upgrading === plan.key}
                style={{
                  width: '100%', padding: '12px', borderRadius: 12, border: 'none',
                  background: plan.key === 'free' ? 'rgba(255,255,255,0.07)' : plan.gradient,
                  color: plan.key === 'free' ? 'var(--text-secondary)' : '#fff',
                  fontWeight: 700, fontSize: 14, cursor: upgrading === plan.key ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: plan.key !== 'free' ? `0 4px 20px ${plan.color}40` : 'none',
                  transition: 'opacity 0.15s',
                }}
              >
                {upgrading === plan.key ? (
                  <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} />
                ) : (
                  <>
                    <i className={`ti ${plan.key === 'free' ? 'ti-check' : 'ti-credit-card'}`} />
                    {plan.key === 'free' ? 'Current Plan' : `Upgrade to ${plan.name}`}
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div style={{ textAlign: 'center', marginTop: 40, color: 'var(--text-secondary)', fontSize: 13 }}>
        <i className="ti ti-lock" style={{ marginRight: 6 }} />
        Secure payments via Razorpay · Cancel anytime · GST invoice provided
        <br />
        <span style={{ marginTop: 8, display: 'block' }}>
          Questions? Email us at{' '}
          <a href="mailto:billing@inventorypro.in" style={{ color: 'var(--brand)' }}>billing@inventorypro.in</a>
        </span>
      </div>
    </div>
  );
}
