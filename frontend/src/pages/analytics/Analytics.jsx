import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsApi } from '../../api/analyticsApi';
import { fmtCurrency, downloadBlob } from '../../utils/formatters';
import useCountUp from '../../hooks/useCountUp';
import EmptyState from '../../components/EmptyState';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];
const RANGES = [
  { label: '7 Days', days: 7 },
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 },
  { label: '1 Year', days: 365 },
];

const tooltipStyle = {
  contentStyle: {
    background: 'var(--glass-bg-strong)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid var(--glass-border)',
    borderRadius: 10,
    fontSize: 12,
  },
  labelStyle: { color: 'var(--text-primary)', fontWeight: 600, marginBottom: 4 },
  itemStyle: { color: 'var(--text-secondary)' },
};

function StatCard({ label, value, icon, color, currency = true, suffix = '', isFloat = false }) {
  const animated = useCountUp(Number(value) || 0);
  return (
    <div className="stat-card">
      <div className="stat-icon float" style={{ background: color }}>
        <i className={`ti ${icon}`} />
      </div>
      <div className="stat-body">
        <div className="stat-label">{label}</div>
        <div className="stat-value count-value">
          {currency
            ? fmtCurrency(animated)
            : isFloat
            ? animated.toFixed(1) + suffix
            : Math.round(animated).toLocaleString('en-IN') + suffix}
        </div>
      </div>
    </div>
  );
}

export default function Analytics() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [range, setRange] = useState(30);

  // Overview Data
  const [overviewData, setOverviewData] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState('');

  // Profit Data
  const [profitData, setProfitData] = useState(null);
  const [profitLoading, setProfitLoading] = useState(false);
  const [profitError, setProfitError] = useState('');

  // Inventory Intel Data
  const [inventoryData, setInventoryData] = useState(null);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState('');
  const [inventoryFilter, setInventoryFilter] = useState('ALL');
  const [inventorySearch, setInventorySearch] = useState('');

  const loadOverview = () => {
    setOverviewLoading(true);
    setOverviewError('');
    analyticsApi
      .overview(range)
      .then((r) => setOverviewData(r.data.data))
      .catch((err) => setOverviewError(err.response?.data?.message || 'Could not load overview'))
      .finally(() => setOverviewLoading(false));
  };

  const loadProfit = () => {
    setProfitLoading(true);
    setProfitError('');
    analyticsApi
      .profit(range)
      .then((r) => setProfitData(r.data.data))
      .catch((err) => setProfitError(err.response?.data?.message || 'Could not load profit intelligence'))
      .finally(() => setProfitLoading(false));
  };

  const loadInventory = () => {
    setInventoryLoading(true);
    setInventoryError('');
    analyticsApi
      .inventoryIntel()
      .then((r) => setInventoryData(r.data.data))
      .catch((err) => setInventoryError(err.response?.data?.message || 'Could not load inventory intelligence'))
      .finally(() => setInventoryLoading(false));
  };

  useEffect(() => {
    if (activeTab === 'overview') loadOverview();
    if (activeTab === 'profit') loadProfit();
    if (activeTab === 'inventory') loadInventory();
  }, [activeTab, range]);

  const exportProfitCsv = () => {
    if (!profitData?.products?.length) return;
    const header = 'Product Name,Qty Sold,Total Revenue,Avg Unit Cost,Gross Profit,Margin %\n';
    const rows = profitData.products
      .map(
        (p) =>
          `"${p.productName.replace(/"/g, '""')}",${p.quantity},${p.revenue},${p.avgCost},${p.grossProfit},${p.marginPct}%`
      )
      .join('\n');
    downloadBlob(header + rows, `profit_report_${range}d.csv`);
  };

  const exportInventoryCsv = () => {
    if (!inventoryData?.items?.length) return;
    const header = 'SKU,Product Name,Category,Price,Unit Cost,In Stock,Reorder Level,Velocity (Units/Day),Runway (Days),Status,Suggested Reorder\n';
    const rows = inventoryData.items
      .map(
        (i) =>
          `"${i.sku}","${i.name.replace(/"/g, '""')}","${i.category}",${i.price},${i.unitCost},${i.stockQuantity},${i.reorderLevel},${i.dailyVelocity},${i.runwayDays},"${i.badge}",${i.suggestedReorder}`
      )
      .join('\n');
    downloadBlob(header + rows, `inventory_intelligence_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const filteredInventoryItems = useMemo(() => {
    if (!inventoryData?.items) return [];
    return inventoryData.items.filter((item) => {
      let matchesFilter = true;
      if (inventoryFilter === 'REORDER') {
        matchesFilter = item.status === 'CRITICAL_REORDER' || item.status === 'OUT_OF_STOCK';
      } else if (inventoryFilter === 'DEAD') {
        matchesFilter = item.status === 'DEAD_STOCK';
      } else if (inventoryFilter === 'FAST') {
        matchesFilter = item.status === 'FAST_MOVER';
      } else if (inventoryFilter === 'SLOW') {
        matchesFilter = item.status === 'SLOW_MOVER';
      } else if (inventoryFilter === 'OVER') {
        matchesFilter = item.status === 'OVERSTOCK';
      }

      const q = inventorySearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);

      return matchesFilter && matchesSearch;
    });
  }, [inventoryData, inventoryFilter, inventorySearch]);

  return (
    <div className="page">
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="page-title">Intelligence & Analytics</h1>
          <p className="page-subtitle">
            Deep financial visibility, sales velocity tracking, and automated inventory health analytics.
          </p>
        </div>

        {activeTab !== 'inventory' && (
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
        )}
      </div>

      <div className="intel-tabs">
        <button
          className={`intel-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <i className="ti ti-chart-dots" />
          Revenue Overview
        </button>

        <button
          className={`intel-tab ${activeTab === 'profit' ? 'active' : ''}`}
          onClick={() => setActiveTab('profit')}
        >
          <i className="ti ti-coins" />
          Profit Intelligence
        </button>

        <button
          className={`intel-tab ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          <i className="ti ti-brain" />
          Inventory Intelligence
          {inventoryData?.criticalReorderCount > 0 && (
            <span
              style={{
                background: '#ef4444',
                color: '#fff',
                fontSize: 10,
                padding: '2px 6px',
                borderRadius: 10,
                fontWeight: 700,
              }}
            >
              {inventoryData.criticalReorderCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'overview' && (
        <>
          {overviewError && (
            <div className="banner banner-error" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ti ti-alert-circle" />
                <span>{overviewError}</span>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={loadOverview}>Retry</button>
            </div>
          )}

          {overviewLoading ? (
            <div className="stat-grid">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="stat-card">
                  <div className="skeleton-bar" style={{ width: '100%', height: 40 }} />
                </div>
              ))}
            </div>
          ) : overviewData && (
            <>
              <div className="stat-grid stagger">
                <StatCard label={`Revenue (${range}D)`} value={overviewData.periodRevenue} icon="ti-currency-rupee" color="#6366f1" />
                <StatCard label="Orders Recorded" value={overviewData.periodSalesCount} icon="ti-receipt" color="#10b981" currency={false} />
                <StatCard label="Avg Order Value" value={overviewData.avgOrderValue} icon="ti-chart-line" color="#f59e0b" />
                <StatCard label="Purchase Orders" value={overviewData.totalPurchases} icon="ti-truck-delivery" color="#8b5cf6" currency={false} />
              </div>

              <div className="card card-pad" style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>Revenue Trend</div>
                {overviewData.revenueTrend?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={230}>
                    <AreaChart
                      data={overviewData.revenueTrend.map((t) => ({
                        date: new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
                        revenue: Number(t.revenue || 0),
                      }))}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
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
                  {overviewData.topProducts?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart
                        data={overviewData.topProducts.map((p) => ({
                          name: p.productName,
                          revenue: Number(p.revenue || 0),
                          qty: Number(p.quantity || 0),
                        }))}
                        layout="vertical"
                        margin={{ left: 10, right: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickFormatter={(v) => '₹' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                        <Tooltip formatter={(v) => [fmtCurrency(v), 'Revenue']} {...tooltipStyle} cursor={{ fill: 'var(--glass-bg)' }} />
                        <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                          {overviewData.topProducts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState icon="ti-package" title="No sales data yet" description="Top product revenue rankings will appear here." compact />
                  )}
                </div>

                <div className="card card-pad">
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>Stock Value by Category</div>
                  {overviewData.categoryBreakdown?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={overviewData.categoryBreakdown
                            .map((c) => ({ name: c.category, value: Number(c.stockValue || 0) }))
                            .filter((c) => c.value > 0)}
                          dataKey="value"
                          cx="50%"
                          cy="45%"
                          outerRadius={80}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {overviewData.categoryBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
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
        </>
      )}

      {activeTab === 'profit' && (
        <>
          {profitError && (
            <div className="banner banner-error" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ti ti-alert-circle" />
                <span>{profitError}</span>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={loadProfit}>Retry</button>
            </div>
          )}

          {profitLoading ? (
            <div className="stat-grid">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="stat-card">
                  <div className="skeleton-bar" style={{ width: '100%', height: 40 }} />
                </div>
              ))}
            </div>
          ) : profitData && (
            <>
              <div className="stat-grid stagger">
                <StatCard
                  label="Gross Profit"
                  value={profitData.totalGrossProfit}
                  icon="ti-wallet"
                  color="#10b981"
                />
                <StatCard
                  label="Net Gross Margin"
                  value={profitData.netMarginPct}
                  icon="ti-percentage"
                  color="#6366f1"
                  currency={false}
                  suffix="%"
                  isFloat={true}
                />
                <StatCard
                  label="Cost of Goods Sold"
                  value={profitData.totalCost}
                  icon="ti-receipt-tax"
                  color="#f59e0b"
                />
                <StatCard
                  label="Total Sales Revenue"
                  value={profitData.totalRevenue}
                  icon="ti-cash"
                  color="#06b6d4"
                />
              </div>

              <div className="card card-pad" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Profit & Revenue Trajectory</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Compare gross profit against revenue & purchase costs over time</div>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10b981' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: '#10b981' }} /> Gross Profit
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6366f1' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: '#6366f1' }} /> Revenue
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#f59e0b' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: '#f59e0b' }} /> COGS
                    </span>
                  </div>
                </div>

                {profitData.trend?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart
                      data={profitData.trend.map((t) => ({
                        date: new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
                        profit: Number(t.profit || 0),
                        revenue: Number(t.revenue || 0),
                        cost: Number(t.cost || 0),
                      }))}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10.5, fill: 'var(--text-secondary)' }} axisLine={{ stroke: 'var(--glass-border)' }} tickLine={false} />
                      <YAxis tick={{ fontSize: 10.5, fill: 'var(--text-secondary)' }} tickFormatter={(v) => '₹' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(v, name) => [
                          fmtCurrency(v),
                          name === 'profit' ? 'Gross Profit' : name === 'revenue' ? 'Revenue' : 'Cost (COGS)'
                        ]}
                        {...tooltipStyle}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fillOpacity={0} />
                      <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2.5} fill="url(#profitGrad)" />
                      <Area type="monotone" dataKey="cost" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 4" fillOpacity={0} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState icon="ti-wallet" title="No profit data recorded" description="Record sales to view gross margins and profit trajectory." compact />
                )}
              </div>

              <div className="card card-pad" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Product Gross Margin Breakdown</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Profit margins calculated using actual PO unit cost vs sold unit price</div>
                  </div>
                  {profitData.products?.length > 0 && (
                    <button className="btn btn-secondary btn-sm" onClick={exportProfitCsv}>
                      <i className="ti ti-download" /> Export CSV
                    </button>
                  )}
                </div>

                {profitData.products?.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Product Name</th>
                          <th style={{ textAlign: 'right' }}>Qty Sold</th>
                          <th style={{ textAlign: 'right' }}>Revenue</th>
                          <th style={{ textAlign: 'right' }}>Avg Unit Cost</th>
                          <th style={{ textAlign: 'right' }}>Gross Profit</th>
                          <th style={{ textAlign: 'center' }}>Margin %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profitData.products.map((p) => {
                          const margin = Number(p.marginPct || 0);
                          const marginClass = margin >= 30 ? 'high' : margin >= 10 ? 'mid' : 'low';
                          return (
                            <tr key={p.productId}>
                              <td style={{ fontWeight: 600 }}>{p.productName}</td>
                              <td style={{ textAlign: 'right' }}>{Number(p.quantity).toLocaleString('en-IN')}</td>
                              <td style={{ textAlign: 'right' }}>{fmtCurrency(p.revenue)}</td>
                              <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{fmtCurrency(p.avgCost)}</td>
                              <td style={{ textAlign: 'right', fontWeight: 700, color: margin >= 0 ? '#10b981' : '#ef4444' }}>
                                {fmtCurrency(p.grossProfit)}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span className={`margin-chip ${marginClass}`}>
                                  {margin.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState icon="ti-currency-rupee" title="No product sales recorded yet" description="Make sales to see individual product gross profit and margins." compact />
                )}
              </div>
            </>
          )}
        </>
      )}

      {activeTab === 'inventory' && (
        <>
          {inventoryError && (
            <div className="banner banner-error" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ti ti-alert-circle" />
                <span>{inventoryError}</span>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={loadInventory}>Retry</button>
            </div>
          )}

          {inventoryLoading ? (
            <div className="stat-grid">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="stat-card">
                  <div className="skeleton-bar" style={{ width: '100%', height: 40 }} />
                </div>
              ))}
            </div>
          ) : inventoryData && (
            <>
              <div className="stat-grid stagger">
                <StatCard
                  label="Total Stock Valuation"
                  value={inventoryData.totalStockValuation}
                  icon="ti-building-warehouse"
                  color="#6366f1"
                />
                <StatCard
                  label="Capital in Dead Stock"
                  value={inventoryData.deadStockValuation}
                  icon="ti-lock"
                  color="#ef4444"
                />
                <StatCard
                  label="Reorder Urgent Alerts"
                  value={inventoryData.criticalReorderCount}
                  icon="ti-alert-triangle"
                  color="#f59e0b"
                  currency={false}
                />
                <StatCard
                  label="Fast Moving Items"
                  value={inventoryData.fastMoverCount}
                  icon="ti-bolt"
                  color="#10b981"
                  currency={false}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 16, marginBottom: 16 }} className="responsive-grid-2">
                <div className="card card-pad">
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>Stock Health Breakdown</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>Distribution of stock turnover health</div>
                  <ResponsiveContainer width="100%" height={210}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Healthy', value: inventoryData.healthyCount, color: '#3b82f6' },
                          { name: 'Fast Movers', value: inventoryData.fastMoverCount, color: '#10b981' },
                          { name: 'Low Stock', value: inventoryData.criticalReorderCount, color: '#f59e0b' },
                          { name: 'Dead Stock', value: inventoryData.deadStockCount, color: '#9ca3af' },
                          { name: 'Overstock', value: inventoryData.overstockCount, color: '#8b5cf6' },
                          { name: 'Out of Stock', value: inventoryData.outOfStockCount, color: '#ef4444' },
                        ].filter((d) => d.value > 0)}
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {[
                          { name: 'Healthy', color: '#3b82f6' },
                          { name: 'Fast Movers', color: '#10b981' },
                          { name: 'Low Stock', color: '#f59e0b' },
                          { name: 'Dead Stock', color: '#9ca3af' },
                          { name: 'Overstock', color: '#8b5cf6' },
                          { name: 'Out of Stock', color: '#ef4444' },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip {...tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                      Automated Inventory Diagnostics
                    </div>
                    <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      InventoryPro continuously monitors SKU turnover velocity against purchase history and lead times.
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                    <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 10, padding: 12 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Dead Capital Alert</div>
                      <div style={{ fontSize: 17, fontWeight: 700, color: '#ef4444', marginTop: 4 }}>
                        {fmtCurrency(inventoryData.deadStockValuation)}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                        {inventoryData.deadStockCount} SKUs have 0 sales in 30 days
                      </div>
                    </div>

                    <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: 10, padding: 12 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Stockout Risk</div>
                      <div style={{ fontSize: 17, fontWeight: 700, color: '#f59e0b', marginTop: 4 }}>
                        {inventoryData.criticalReorderCount} Items
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                        Stock below reorder threshold
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => navigate('/purchases')}>
                      <i className="ti ti-plus" /> Create Purchase Order
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={exportInventoryCsv}>
                      <i className="ti ti-download" /> Export Full Audit
                    </button>
                  </div>
                </div>
              </div>

              <div className="card card-pad">
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    <button
                      className={`filter-pill-btn ${inventoryFilter === 'ALL' ? 'active' : ''}`}
                      onClick={() => setInventoryFilter('ALL')}
                    >
                      All SKUs <span className="filter-pill-badge">{inventoryData.totalProducts}</span>
                    </button>
                    <button
                      className={`filter-pill-btn ${inventoryFilter === 'REORDER' ? 'active' : ''}`}
                      onClick={() => setInventoryFilter('REORDER')}
                    >
                      <i className="ti ti-alert-triangle" style={{ color: '#f59e0b' }} /> Reorder Needed
                      <span className="filter-pill-badge">{inventoryData.criticalReorderCount}</span>
                    </button>
                    <button
                      className={`filter-pill-btn ${inventoryFilter === 'DEAD' ? 'active' : ''}`}
                      onClick={() => setInventoryFilter('DEAD')}
                    >
                      <i className="ti ti-clock-pause" style={{ color: '#9ca3af' }} /> Dead Stock
                      <span className="filter-pill-badge">{inventoryData.deadStockCount}</span>
                    </button>
                    <button
                      className={`filter-pill-btn ${inventoryFilter === 'FAST' ? 'active' : ''}`}
                      onClick={() => setInventoryFilter('FAST')}
                    >
                      <i className="ti ti-bolt" style={{ color: '#10b981' }} /> Fast Movers
                      <span className="filter-pill-badge">{inventoryData.fastMoverCount}</span>
                    </button>
                    <button
                      className={`filter-pill-btn ${inventoryFilter === 'SLOW' ? 'active' : ''}`}
                      onClick={() => setInventoryFilter('SLOW')}
                    >
                      <i className="ti ti-snail" style={{ color: '#f59e0b' }} /> Slow Movers
                      <span className="filter-pill-badge">{inventoryData.slowMoverCount}</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ position: 'relative' }}>
                      <i
                        className="ti ti-search"
                        style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}
                      />
                      <input
                        type="text"
                        placeholder="Search product or SKU..."
                        value={inventorySearch}
                        onChange={(e) => setInventorySearch(e.target.value)}
                        className="form-input"
                        style={{ paddingLeft: 32, width: 220, height: 34, fontSize: 12.5 }}
                      />
                    </div>
                  </div>
                </div>

                {filteredInventoryItems.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>SKU / Product</th>
                          <th>Category</th>
                          <th style={{ textAlign: 'right' }}>Stock / Reorder</th>
                          <th style={{ textAlign: 'right' }}>30D Velocity</th>
                          <th style={{ textAlign: 'right' }}>Stock Runway</th>
                          <th style={{ textAlign: 'center' }}>Status</th>
                          <th style={{ textAlign: 'right' }}>Suggested Order</th>
                          <th style={{ textAlign: 'center' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredInventoryItems.map((item) => {
                          const statusClass =
                            item.status === 'OUT_OF_STOCK'
                              ? 'out'
                              : item.status === 'CRITICAL_REORDER'
                              ? 'low'
                              : item.status === 'DEAD_STOCK'
                              ? 'dead'
                              : item.status === 'FAST_MOVER'
                              ? 'fast'
                              : item.status === 'OVERSTOCK'
                              ? 'over'
                              : 'healthy';

                          const isLowRunway = item.runwayDays <= 7 && item.dailyVelocity > 0;

                          return (
                            <tr key={item.id}>
                              <td>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                                  {item.sku}
                                </div>
                              </td>
                              <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{item.category}</td>
                              <td style={{ textAlign: 'right' }}>
                                <span style={{ fontWeight: 700, color: item.stockQuantity <= item.reorderLevel ? '#ef4444' : 'var(--text-primary)' }}>
                                  {item.stockQuantity}
                                </span>
                                <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}> / {item.reorderLevel}</span>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 600 }}>{item.dailyVelocity} / day</div>
                                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                  {item.unitsSold30d} sold (30D)
                                </div>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                {item.runwayDays >= 999 ? (
                                  <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Stagnant</span>
                                ) : (
                                  <span
                                    style={{
                                      fontWeight: 700,
                                      color: isLowRunway ? '#ef4444' : '#10b981',
                                    }}
                                  >
                                    {item.runwayDays} days
                                  </span>
                                )}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span className={`stock-status-pill ${statusClass}`}>
                                  {item.badge}
                                </span>
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 700 }}>
                                {item.suggestedReorder > 0 ? (
                                  <span style={{ color: 'var(--brand)' }}>+{item.suggestedReorder}</span>
                                ) : (
                                  <span style={{ color: 'var(--text-secondary)' }}>—</span>
                                )}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                {item.suggestedReorder > 0 ? (
                                  <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => navigate('/purchases')}
                                    style={{ padding: '4px 8px', fontSize: 11 }}
                                    title="Create Purchase Order for this item"
                                  >
                                    <i className="ti ti-shopping-cart-plus" /> Reorder
                                  </button>
                                ) : (
                                  <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>Optimal</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState
                    icon="ti-search"
                    title="No items found"
                    description="No inventory items match the selected filter or search keyword."
                    compact
                  />
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
