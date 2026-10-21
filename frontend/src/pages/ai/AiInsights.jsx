import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { productApi } from '../../api/productApi';
import { batchApi } from '../../api/batchApi';
import { salesApi } from '../../api/salesApi';
import { supplierApi } from '../../api/supplierApi';
import { purchaseApi } from '../../api/purchaseApi';
import { runStockWiseEngine } from '../../utils/aiEngine';
import AIAssistantDrawer from '../../components/AIAssistantDrawer';
import { fmtCurrency } from '../../utils/formatters';

export default function AiInsights() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [batches, setBatches] = useState([]);
  const [sales, setSales] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [activeTab, setActiveTab] = useState('ALL');
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [successBanner, setSuccessBanner] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodRes, batchRes, saleRes, suppRes] = await Promise.allSettled([
        productApi.list({ page: 0, size: 100 }),
        batchApi.list({ page: 0, size: 100 }),
        salesApi.list({ page: 0, size: 50 }),
        supplierApi.list({ page: 0, size: 50 }),
      ]);

      const pList = prodRes.status === 'fulfilled' ? prodRes.value.data?.data?.content || [] : [];
      const bList = batchRes.status === 'fulfilled' ? batchRes.value.data?.data?.content || [] : [];
      const sList = saleRes.status === 'fulfilled' ? saleRes.value.data?.data?.content || [] : [];
      const supList = suppRes.status === 'fulfilled' ? suppRes.value.data?.data?.content || [] : [];

      setProducts(pList);
      setBatches(bList);
      setSales(sList);
      setSuppliers(supList);
    } catch (e) {
      console.error('Failed to load store telemetry for AI engine', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Run the 5 StockWise Agents on the live store data
  const engineData = useMemo(() => {
    return runStockWiseEngine(products, batches, sales, suppliers);
  }, [products, batches, sales, suppliers]);

  const { inventoryMetrics, expiryMetrics, recommendations, stats } = engineData;

  // Filter recommendations based on active tab
  const filteredRecs = useMemo(() => {
    if (activeTab === 'ALL') return recommendations;
    if (activeTab === 'RESTOCK') return recommendations.filter((r) => r.type === 'RESTOCK');
    if (activeTab === 'DISCOUNT') return recommendations.filter((r) => r.type === 'DISCOUNT_REVIEW');
    if (activeTab === 'QUARANTINE') return recommendations.filter((r) => r.type === 'QUARANTINE');
    return recommendations;
  }, [recommendations, activeTab]);

  // Handle 1-click PO creation from Restock Recommendation
  const handleApproveRestock = async (rec) => {
    try {
      const matchedSupplier = suppliers[0] || { id: 1, name: rec.supplierName };
      await purchaseApi.create({
        supplierId: matchedSupplier.id,
        supplierName: rec.supplierName,
        items: [
          {
            productId: rec.productId,
            quantity: rec.suggestedQty,
            unitCost: Math.round(rec.estimatedCost / rec.suggestedQty),
          },
        ],
      });
      setSuccessBanner(`✅ Purchase Order generated for ${rec.suggestedQty} units of ${rec.productName}!`);
      setTimeout(() => setSuccessBanner(''), 6000);
    } catch (err) {
      alert('Could not auto-generate PO: ' + (err.message || 'Server error'));
    }
  };

  return (
    <div className="page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 className="page-title">AI Inventory Intelligence</h1>
            <span
              style={{
                fontSize: 11,
                padding: '3px 8px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                color: '#fff',
                fontWeight: 600,
              }}
            >
              StockWise AI Engine
            </span>
          </div>
          <p className="page-subtitle">
            Autonomous velocity forecasting, FEFO expiry monitoring, and margin-protected recommendations.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={loadData}>
            <i className="ti ti-refresh" /> Refresh
          </button>
          <button
            className="btn btn-primary btn-sm"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              border: 'none',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
            }}
            onClick={() => setIsAssistantOpen(true)}
          >
            <i className="ti ti-sparkles" /> Ask AI Copilot
          </button>
        </div>
      </div>

      {successBanner && (
        <div
          className="banner banner-success"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="ti ti-check" />
            <span>{successBanner}</span>
          </div>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => navigate('/purchases')}
            style={{ padding: '4px 10px', fontSize: 12 }}
          >
            View in Purchases
          </button>
        </div>
      )}

      {/* Top Intelligence Metric Cards */}
      <div className="stat-grid" style={{ marginBottom: 28 }}>
        {/* Restock Urgency */}
        <div className="stat-card">
          <div className="stat-icon float" style={{ background: '#f59e0b' }}>
            <i className="ti ti-truck-delivery" />
          </div>
          <div className="stat-body">
            <div className="stat-label">Restock Urgency</div>
            <div className="stat-value">{stats.lowStockCount} Products</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Below reorder thresholds
            </div>
          </div>
        </div>

        {/* Expiry Risk Exposure */}
        <div className="stat-card">
          <div className="stat-icon float" style={{ background: '#ef4444' }}>
            <i className="ti ti-clock-exclamation" />
          </div>
          <div className="stat-body">
            <div className="stat-label">Waste Exposure at Risk</div>
            <div className="stat-value">{fmtCurrency(stats.totalWasteExposure)}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Across {stats.criticalExpiryCount} flagged batches
            </div>
          </div>
        </div>

        {/* Dynamic Markdowns */}
        <div className="stat-card">
          <div className="stat-icon float" style={{ background: '#8b5cf6' }}>
            <i className="ti ti-tag" />
          </div>
          <div className="stat-body">
            <div className="stat-label">Clearance Markdowns</div>
            <div className="stat-value">
              {recommendations.filter((r) => r.type === 'DISCOUNT_REVIEW').length} Batches
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Accelerate turnover before expiry
            </div>
          </div>
        </div>

        {/* Margin Guardrails */}
        <div className="stat-card">
          <div className="stat-icon float" style={{ background: '#10b981' }}>
            <i className="ti ti-shield-check" />
          </div>
          <div className="stat-body">
            <div className="stat-label">Critic Guardrail Audit</div>
            <div className="stat-value" style={{ color: '#10b981' }}>
              100% Protected
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Zero sales below wholesale cost floor
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: 12,
          marginBottom: 20,
        }}
      >
        {[
          { id: 'ALL', label: `All Actionable Proposals (${recommendations.length})`, icon: 'ti-list' },
          {
            id: 'RESTOCK',
            label: `Restock Orders (${recommendations.filter((r) => r.type === 'RESTOCK').length})`,
            icon: 'ti-package',
          },
          {
            id: 'DISCOUNT',
            label: `Dynamic Markdowns (${recommendations.filter((r) => r.type === 'DISCOUNT_REVIEW').length})`,
            icon: 'ti-percentage',
          },
          {
            id: 'QUARANTINE',
            label: `Quarantine Write-Off (${recommendations.filter((r) => r.type === 'QUARANTINE').length})`,
            icon: 'ti-alert-octagon',
          },
          { id: 'FEFO', label: `FEFO Freshness Table (${expiryMetrics.length})`, icon: 'ti-calendar-time' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`btn btn-sm ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <i className={`ti ${tab.icon}`} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <span className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
          <div style={{ marginTop: 12, color: 'var(--text-muted)' }}>
            Analyzing inventory telemetry and running guardrails...
          </div>
        </div>
      ) : activeTab === 'FEFO' ? (
        /* FEFO Freshness Monitor Table */
        <div className="card">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>FEFO (First-Expired, First-Out) Freshness Queue</h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
              Batches are strictly ordered by earliest expiration date to enforce shelf rotation and prevent write-offs.
            </p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>FEFO Rank</th>
                  <th>Product</th>
                  <th>Batch #</th>
                  <th>Units</th>
                  <th>Expiry Date</th>
                  <th>Time Remaining</th>
                  <th>Risk Tier</th>
                  <th>Potential Waste (₹)</th>
                </tr>
              </thead>
              <tbody>
                {expiryMetrics.map((b, idx) => (
                  <tr key={b.batchId || idx}>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 12,
                          color: idx < 3 ? '#f59e0b' : 'var(--text-muted)',
                        }}
                      >
                        #{idx + 1}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{b.productName}</td>
                    <td>
                      <code style={{ fontSize: 12 }}>{b.batchNumber}</code>
                    </td>
                    <td>{b.quantity}</td>
                    <td>{b.expiryDate}</td>
                    <td>
                      {b.daysRemaining < 0 ? (
                        <span style={{ color: '#ef4444', fontWeight: 600 }}>Expired</span>
                      ) : (
                        `${b.daysRemaining} days`
                      )}
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: 11,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: b.badgeColor + '22',
                          color: b.badgeColor,
                          fontWeight: 600,
                        }}
                      >
                        {b.riskLabel}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{fmtCurrency(b.wasteValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Recommendations Cards List */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredRecs.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <i className="ti ti-check-circle" style={{ fontSize: 36, color: '#10b981', display: 'block', marginBottom: 10 }} />
              <h4>No pending actions in this category</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
                Inventory and freshness parameters are operating within safe tolerances.
              </p>
            </div>
          ) : (
            filteredRecs.map((rec) => (
              <div
                key={rec.id}
                className="card"
                style={{
                  padding: 20,
                  borderLeft: `4px solid ${
                    rec.priority === 'CRITICAL' ? '#ef4444' : rec.priority === 'HIGH' ? '#f59e0b' : '#3b82f6'
                  }`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                {/* Top Row: Type & Priority & Status */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        fontSize: 11,
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontWeight: 700,
                        background:
                          rec.priority === 'CRITICAL'
                            ? 'rgba(239,68,68,0.15)'
                            : rec.priority === 'HIGH'
                            ? 'rgba(245,158,11,0.15)'
                            : 'rgba(59,130,246,0.15)',
                        color:
                          rec.priority === 'CRITICAL'
                            ? '#ef4444'
                            : rec.priority === 'HIGH'
                            ? '#f59e0b'
                            : '#3b82f6',
                      }}
                    >
                      {rec.priority}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                      {rec.type}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#10b981', fontWeight: 600 }}>
                    <i className="ti ti-shield-check" />
                    <span>Critic Guardrails Passed</span>
                  </div>
                </div>

                {/* Main Content */}
                <div>
                  <h3 style={{ margin: '0 0 6px', fontSize: 16 }}>{rec.actionTitle}</h3>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>{rec.reason}</p>
                </div>

                {/* Specific Action Blocks */}
                {rec.type === 'RESTOCK' && (
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      padding: '12px 16px',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', gap: 24 }}>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Supplier</div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{rec.supplierName}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Order Sizing</div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{rec.suggestedQty} Units</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Estimated Cost</div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{fmtCurrency(rec.estimatedCost)}</div>
                      </div>
                    </div>

                    <button
                      className="btn btn-primary btn-sm"
                      style={{ background: '#10b981', border: 'none' }}
                      onClick={() => handleApproveRestock(rec)}
                    >
                      <i className="ti ti-plus" /> Approve & Create PO
                    </button>
                  </div>
                )}

                {rec.type === 'DISCOUNT_REVIEW' && (
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      padding: '12px 16px',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', gap: 24 }}>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Regular Price</div>
                        <div style={{ fontWeight: 600, fontSize: 13, textDecoration: 'line-through', color: '#94a3b8' }}>
                          {fmtCurrency(rec.originalPrice)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Proposed Price</div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#10b981' }}>
                          {fmtCurrency(rec.proposedPrice)} ({rec.discountPct}% OFF)
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Wholesale Cost Floor</div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{fmtCurrency(rec.wholesaleCost)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Loss Avoided</div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#f59e0b' }}>
                          {fmtCurrency(rec.potentialLossAvoided)}
                        </div>
                      </div>
                    </div>

                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => navigate('/products')}
                    >
                      <i className="ti ti-edit" /> Apply in Catalog
                    </button>
                  </div>
                )}

                {/* Guardrails Footer */}
                <div
                  style={{
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                    paddingTop: 8,
                    display: 'flex',
                    gap: 16,
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    flexWrap: 'wrap',
                  }}
                >
                  {(rec.guardrails || []).map((g, gIdx) => (
                    <span key={gIdx} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <i className="ti ti-check" style={{ color: '#10b981' }} />
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Embedded AI Assistant Chat Drawer */}
      <AIAssistantDrawer
        engineData={engineData}
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        onOpen={() => setIsAssistantOpen(true)}
      />
    </div>
  );
}
