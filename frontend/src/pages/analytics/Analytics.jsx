import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../../api/analyticsApi';
import { fmtCurrency } from '../../utils/formatters';
import useCountUp from '../../hooks/useCountUp';
import EmptyState from '../../components/EmptyState';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];
const RANGES = [
  { label: '7 Days', days: 7 },
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 },
];

const tooltipStyle = {
  contentStyle: { background: 'var(--glass-bg-strong)', backdropFilter: 'blur(16px)', border: '1px solid var(--glass-border)', borderRadius: 10, fontSize: 12 },
  labelStyle: { color: 'var(--text-primary)', fontWeight: 600, marginBottom: 4 },
  itemStyle: { color: 'var(--text-secondary)' },
};

function StatCard({ label, value, icon, color, currency = true }) {
  const animated = useCountUp(Number(value) || 0);
  return (
    <div className="stat-card">
      <div className="stat-icon float" style={{ background: color }}>
        <i className={`ti ${icon}`} />
      </div>
      <div className="stat-body">
        <div className="stat-label">{label}</div>
        <div className="stat-value count-value">{currency ? fmtCurrency(animated) : Math.round(animated).toLocaleString('en-IN')}</div>
      </div>
    </div>
  );
}

export default function Analytics() {
  const [range, setRange] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    analyticsApi
      .overview(range)
      .then((r) => setData(r.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Could not load analytics summary'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [range]);

  const trend = (data?.revenueTrend || []).map((t) => ({
    date: new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    revenue: Number(t.revenue || 0),
  }));

  const topProducts = (data?.topProducts || []).map((p) => ({
    name: p.productName,
    revenue: Number(p.revenue || 0),
    qty: Number(p.quantity || 0),
  }));

  const categories = (data?.categoryBreakdown || [])
    .map((c) => ({ name: c.category, value: Number(c.stockValue || 0) }))
    .filter((c) => c.value > 0);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Business Analytics</h1>
          <p className="page-subtitle">Revenue trajectories, sales velocity, top merchandise, and inventory valuation breakdown.</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {RANGES.map((r) => (
            <button
              key={r.days}
              className={`btn btn-sm ${range === r.days ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setRange(r.days)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="banner banner-error" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="ti ti-alert-circle" />
            <span>{error}</span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={load}>Retry</button>
        </div>
      )}

      {loading ? (
        <div className="stat-grid">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="stat-card">
              <div className="skeleton-bar" style={{ width: '100%', height: 40 }} />
            </div>
          ))}
        </div>
      ) : data && (
        <>
          <div className="stat-grid stagger">
            <StatCard label={`Revenue (${range}D)`} value={data.periodRevenue} icon="ti-currency-rupee" color="#6366f1" />
            <StatCard label="Orders Recorded" value={data.periodSalesCount} icon="ti-receipt" color="#10b981" currency={false} />
            <StatCard label="Avg Order Value" value={data.avgOrderValue} icon="ti-chart-line" color="#f59e0b" />
            <StatCard label="Purchase Orders" value={data.totalPurchases} icon="ti-truck-delivery" color="#8b5cf6" currency={false} />
          </div>

          <div className="card card-pad" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>Revenue Trend</div>
            {trend.length > 0 ? (
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={trend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10.5, fill: 'var(--text-secondary)' }} axisLine={{ stroke: 'var(--glass-border)' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10.5, fill: 'var(--text-secondary)' }} tickFormatter={(v) => '₹' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => [fmtCurrency(v), 'Revenue']} {...tooltipStyle} cursor={{ stroke: 'var(--brand)', strokeWidth: 1 }} />
                  <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} fill="url(#revGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon="ti-chart-area" title="No sales data in this period" description="Record sales to see revenue trend charts." compact />
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }} className="responsive-grid-2">
            <div className="card card-pad">
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>Top Products by Revenue</div>
              {topProducts.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={topProducts} layout="vertical" margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickFormatter={(v) => '₹' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v) => [fmtCurrency(v), 'Revenue']} {...tooltipStyle} cursor={{ fill: 'var(--glass-bg)' }} />
                    <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                      {topProducts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState icon="ti-package" title="No sales data yet" description="Top product revenue rankings will appear here." compact />
              )}
            </div>

            <div className="card card-pad">
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>Stock Value by Category</div>
              {categories.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={categories} dataKey="value" cx="50%" cy="45%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {categories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [fmtCurrency(v), 'Stock Value']} {...tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState icon="ti-chart-pie" title="No category stock yet" description="Categorize products and assign stock to see breakdown." compact />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}