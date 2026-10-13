import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../../api/dashboardApi';
import { analyticsApi } from '../../api/analyticsApi';
import { salesApi } from '../../api/salesApi';
import { productApi } from '../../api/productApi';
import { useAuth } from '../../context/AuthContext';
import { fmtCurrency, fmtDate } from '../../utils/formatters';
import useCountUp from '../../hooks/useCountUp';
import EmptyState from '../../components/EmptyState';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const STATS = [
  { key: 'totalRevenue', label: 'Total revenue', icon: 'ti-currency-rupee', color: '#6366f1', currency: true },
  { key: 'totalSales', label: 'Total sales', icon: 'ti-receipt', color: '#10b981' },
  { key: 'totalProducts', label: 'Products in catalog', icon: 'ti-package', color: '#f59e0b' },
  { key: 'lowStockCount', label: 'Low stock items', icon: 'ti-alert-triangle', color: '#ef4444' },
];

const ACTIONS = [
  { label: 'Add a product', desc: 'Catalog item & set pricing', icon: 'ti-package', path: '/products' },
  { label: 'Record a sale', desc: 'Log transaction & update stock', icon: 'ti-receipt', path: '/sales' },
  { label: 'New purchase', desc: 'Restock inventory from supplier', icon: 'ti-truck-delivery', path: '/purchases' },
  { label: 'GST Tax Invoice', desc: 'Create compliant e-invoice', icon: 'ti-file-invoice', path: '/gst/invoices/new' },
];

function statusBadge(s) {
  const map = {
    PAID: 'badge-success',
    PARTIAL: 'badge-warning',
    PENDING: 'badge-warning',
    OVERDUE: 'badge-danger',
    CANCELLED: 'badge-neutral',
  };
  return <span className={`badge ${map[s] || 'badge-neutral'}`}>{s}</span>;
}

function StatCard({ stat, value, loading, index }) {
  const animated = useCountUp(value ?? 0);
  return (
    <div className="stat-card">
      <div className="stat-icon float" style={{ background: stat.color, animationDelay: `${index * 0.3}s` }}>
        <i className={`ti ${stat.icon}`} />
      </div>
      <div className="stat-body">
        <div className="stat-label">{stat.label}</div>
        <div className="stat-value count-value">
          {loading ? (
            <div className="skeleton-bar" style={{ width: 80, height: 24 }} />
          ) : stat.currency ? (
            fmtCurrency(animated)
          ) : (
            Math.round(animated).toLocaleString('en-IN')
          )}
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [recentSales, setRecentSales] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      dashboardApi.getSummary(),
      analyticsApi.overview(7),
      salesApi.list({ page: 0, size: 5 }),
      productApi.lowStock(),
    ]).then(([summaryRes, analyticsRes, salesRes, lowStockRes]) => {
      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value.data.data);
      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value.data.data);
      if (salesRes.status === 'fulfilled') setRecentSales(salesRes.value.data.data.content || []);
      if (lowStockRes.status === 'fulfilled') setLowStockItems(lowStockRes.value.data.data || []);
      setLoading(false);
    });
  }, []);

  const chartData = (analytics?.revenueTrend || []).map((t) => ({
    date: new Date(t.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }),
    revenue: Number(t.revenue || 0),
  }));

  const topSelling = (analytics?.topProducts || []).slice(0, 4);

  const formattedDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {getGreeting()}{user?.firstName ? `, ${user.firstName}` : ''} 👋
          </h1>
          <p className="page-subtitle">
            {formattedDate} · Overview of today's business performance and inventory alerts.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => nav('/analytics')}>
            <i className="ti ti-chart-bar" /> Analytics
          </button>
          <button className="btn btn-primary" onClick={() => nav('/sales')}>
            <i className="ti ti-plus" /> New sale
          </button>
        </div>
      </div>

      {/* Low stock critical alert banner with product breakdown */}
      {!loading && lowStockItems.length > 0 && (
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(239, 68, 68, 0.04) 100%)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            padding: '14px 18px',
            marginBottom: 20,
            borderRadius: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: 20, color: '#ef4444' }} />
              <strong style={{ fontSize: 13.5, color: '#ef4444' }}>
                {lowStockItems.length} Products Running Low on Stock:
              </strong>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              style={{ fontSize: 11.5, padding: '4px 10px', borderColor: 'rgba(239,68,68,0.3)' }}
              onClick={() => nav('/products?filter=low-stock')}
            >
              Manage in Products <i className="ti ti-arrow-right" style={{ fontSize: 11 }} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {lowStockItems.map((p) => (
              <div
                key={p.id}
                onClick={() => nav('/inventory')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 12px',
                  background: 'var(--surface-1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: 10,
                  fontSize: 12,
                  cursor: 'pointer',
                  transition: 'transform 0.15s, border-color 0.15s',
                }}
              >
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</span>
                <span style={{ color: '#ef4444', fontWeight: 700 }}>{p.stockQuantity} in stock</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>(reorder threshold: {p.reorderPoint || p.reorderLevel || 10})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main 4 Stat Cards */}
      <div className="stat-grid stagger">
        {STATS.map((s, i) => (
          <StatCard key={s.key} stat={s} value={summary?.[s.key]} loading={loading} index={i} />
        ))}
      </div>

      {/* Revenue 7-Day Sparkline & Top Products Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16, marginBottom: 24 }} className="responsive-grid-2">
        {/* Revenue 7-Day Chart */}
        <div className="card card-pad">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Revenue Trend (Last 7 Days)</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                7-day total: <strong style={{ color: 'var(--brand)' }}>{fmtCurrency(analytics?.periodRevenue || 0)}</strong>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => nav('/analytics')}>
              View details <i className="ti ti-arrow-right" />
            </button>
          </div>

          {loading ? (
            <div className="skeleton-bar" style={{ width: '100%', height: 160, borderRadius: 10 }} />
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickFormatter={(v) => '₹' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v) => [fmtCurrency(v), 'Revenue']}
                  contentStyle={{ background: 'var(--glass-bg-strong)', backdropFilter: 'blur(16px)', border: '1px solid var(--glass-border)', borderRadius: 10, fontSize: 12 }}
                  labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} fill="url(#dashRevGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon="ti-chart-area" title="No recent sales" description="Record sales to see the 7-day revenue trend." compact />
          )}
        </div>

        {/* Top Selling Products */}
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Top Selling Products</div>
            <button className="btn btn-ghost btn-sm" onClick={() => nav('/products')}>
              Catalog <i className="ti ti-arrow-right" />
            </button>
          </div>

          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="skeleton-bar" style={{ width: '100%', height: 32, marginBottom: 8, borderRadius: 8 }} />
            ))
          ) : topSelling.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, justifyContent: 'center' }}>
              {topSelling.map((p, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 9,
                    background: 'var(--surface-3)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : '#b45309',
                        color: '#000',
                        fontSize: 10.5,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.productName}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>{fmtCurrency(p.revenue)}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--text-secondary)' }}>{p.quantity} sold</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon="ti-package" title="No sales yet" description="Top selling items will show up here once sales occur." compact />
          )}
        </div>
      </div>

      {/* Recent Transactions & Quick Actions Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16, marginBottom: 20 }} className="responsive-grid-2">
        {/* Recent Transactions Table */}
        <div className="card card-pad" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Recent Transactions</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Latest 5 recorded sales</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => nav('/sales')}>
              All sales <i className="ti ti-arrow-right" />
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sale #</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i} className="skeleton-row">
                      {[...Array(5)].map((__, j) => (
                        <td key={j}><div className="skeleton-bar" style={{ width: '70%' }} /></td>
                      ))}
                    </tr>
                  ))
                ) : recentSales.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <EmptyState
                        icon="ti-receipt"
                        title="No transactions yet"
                        description="Record your first sale to see it listed here."
                        actionText="Create sale"
                        onAction={() => nav('/sales')}
                        compact
                      />
                    </td>
                  </tr>
                ) : (
                  recentSales.map((s) => (
                    <tr
                      key={s.id}
                      className="is-clickable"
                      onClick={() => nav('/sales')}
                      title="View in Sales"
                    >
                      <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--brand)' }}>{s.saleNumber}</td>
                      <td>{s.customerName || 'Walk-in'}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{fmtDate(s.saleDate)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtCurrency(s.totalAmount)}</td>
                      <td>{statusBadge(s.paymentStatus)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>Quick Actions</div>
          {ACTIONS.map((a) => (
            <button
              key={a.path}
              onClick={() => nav(a.path)}
              className="card quick-action"
              style={{
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                font: 'inherit',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'rgba(99,102,241,0.14)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <i className={`ti ${a.icon}`} style={{ color: 'var(--brand)', fontSize: 18 }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{a.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{a.desc}</div>
              </div>
              <i className="ti ti-chevron-right" style={{ color: 'var(--text-secondary)', fontSize: 14 }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}