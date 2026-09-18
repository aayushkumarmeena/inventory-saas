import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { gstApi } from '../../api/gstApi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { fmtCurrency } from '../../utils/formatters';
import useCountUp from '../../hooks/useCountUp';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const QUICK_LINKS = [
  ['ti-file-invoice', 'Invoices', '/gst/invoices'],
  ['ti-report', 'GSTR-1', '/gst/gstr1'],
  ['ti-chart-area', 'Reports', '/gst/reports'],
  ['ti-list', 'HSN/SAC', '/gst/hsn-sac'],
  ['ti-calendar', 'Returns', '/gst/returns'],
  ['ti-calculator', 'Tax Calc', '/gst/calculator'],
  ['ti-settings-2', 'Config', '/gst/config'],
];

const today = new Date();
const RANGES = {
  month: { from: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10), to: today.toISOString().slice(0, 10) },
  quarter: (() => {
    const q = Math.floor(today.getMonth() / 3) * 3;
    return { from: new Date(today.getFullYear(), q, 1).toISOString().slice(0, 10), to: today.toISOString().slice(0, 10) };
  })(),
  year: { from: new Date(today.getFullYear(), 3, 1).toISOString().slice(0, 10), to: today.toISOString().slice(0, 10) },
};

function StatCard({ label, value, sub, color, index = 0, currency = true }) {
  const animated = useCountUp(Number(value) || 0);
  return (
    <div className="stat-card">
      <div className="stat-icon float" style={{ background: color, animationDelay: `${index * 0.4}s` }}>
        <i className="ti ti-currency-rupee" />
      </div>
      <div className="stat-body">
        <div className="stat-label">{label}</div>
        <div className="stat-value count-value">{currency ? fmtCurrency(animated) : Math.round(animated).toLocaleString('en-IN')}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function GstDashboard() {
  const nav = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [error, setError] = useState('');

  useEffect(() => {
    const { from, to } = RANGES[period];
    setLoading(true);
    gstApi.getSummary(from, to).then((r) => setSummary(r.data.data)).catch(() => setError('Could not load GST summary')).finally(() => setLoading(false));
  }, [period]);

  const trendData = (summary?.monthlyTrend || []).map((m) => ({
    month: new Date(m.month).toLocaleString('en-IN', { month: 'short', year: '2-digit' }),
    CGST: Number(m.cgst || 0),
    SGST: Number(m.sgst || 0),
    IGST: Number(m.igst || 0),
  }));
  const slabData = (summary?.taxSlabBreakdown || []).map((s) => ({ name: `${Number(s.igst_rate || 0)}%`, value: Number(s.taxable || 0) })).filter((s) => s.value > 0);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">GST Dashboard</h1>
          <p className="page-subtitle">Tax collected, invoice mix, and filing shortcuts.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['month', 'quarter', 'year'].map((p) => (
            <button key={p} className={`btn btn-sm ${period === p ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPeriod(p)}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
          <button className="btn btn-primary btn-sm" onClick={() => nav('/gst/invoices/new')}>
            <i className="ti ti-plus" /> Generate invoice
          </button>
        </div>
      </div>

      {error && <div className="banner banner-error"><i className="ti ti-alert-circle" /><span>{error}</span></div>}

      {loading ? (
        <div className="stat-grid">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="stat-card"><div className="skeleton-bar" style={{ width: '100%', height: 40 }} /></div>
          ))}
        </div>
      ) : summary && (
        <>
          <div className="stat-grid stagger">
            <StatCard label="Invoice value" value={summary.totalInvoiceValue} color="#6366f1" index={0} />
            <StatCard label="Taxable value" value={summary.totalTaxableValue} color="#10b981" index={1} />
            <StatCard label="Total tax" value={summary.totalTax} color="#f59e0b" index={2} />
            <StatCard label="CGST + SGST" value={(+summary.totalCgst) + (+summary.totalSgst)} sub={`IGST: ${fmtCurrency(summary.totalIgst)}`} color="#8b5cf6" index={3} />
          </div>

          <div className="stat-grid stagger">
            <StatCard label="B2B invoices" value={summary.b2bCount ?? 0} color="#6366f1" currency={false} index={0} />
            <StatCard label="B2C invoices" value={summary.b2cCount ?? 0} color="#10b981" currency={false} index={1} />
            <StatCard label="Export" value={summary.exportCount ?? 0} color="#f59e0b" currency={false} index={2} />
            <StatCard label="Cancelled" value={summary.cancelledCount ?? 0} color="#ef4444" currency={false} index={3} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14, marginBottom: 20 }}>
            <div className="card card-pad">
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>Monthly GST trend</div>
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={{ stroke: 'var(--glass-border)' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickFormatter={(v) => '₹' + (v / 1000).toFixed(0) + 'k'} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(v) => fmtCurrency(v)}
                      contentStyle={{ background: 'var(--glass-bg-strong)', backdropFilter: 'blur(16px)', border: '1px solid var(--glass-border)', borderRadius: 10, fontSize: 12 }}
                      labelStyle={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 4 }}
                      itemStyle={{ color: 'var(--text-secondary)' }}
                      cursor={{ fill: 'var(--glass-bg)' }}
                    />
                    <Bar dataKey="CGST" fill="#6366f1" stackId="a" />
                    <Bar dataKey="SGST" fill="#8b5cf6" stackId="a" />
                    <Bar dataKey="IGST" fill="#06b6d4" stackId="a" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ padding: '40px 0' }}><i className="ti ti-chart-bar" /><span className="empty-state-desc">No data for this period</span></div>
              )}
            </div>
            <div className="card card-pad">
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>Tax slab breakdown</div>
              {slabData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={slabData} dataKey="value" cx="50%" cy="45%" outerRadius={68} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {slabData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip
                      formatter={(v) => fmtCurrency(v)}
                      contentStyle={{ background: 'var(--glass-bg-strong)', backdropFilter: 'blur(16px)', border: '1px solid var(--glass-border)', borderRadius: 10, fontSize: 12 }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ padding: '40px 0' }}><i className="ti ti-chart-pie" /><span className="empty-state-desc">No data for this period</span></div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {QUICK_LINKS.map(([icon, label, path]) => (
              <button key={path} className="btn btn-secondary btn-sm" onClick={() => nav(path)}>
                <i className={`ti ${icon}`} /> {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
