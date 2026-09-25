import React, { useState, useEffect } from 'react';
import { salesApi } from '../../api/salesApi';
import { fmtCurrency, fmtDate } from '../../utils/formatters';
import Drawer from '../../components/Drawer';

function statusBadge(s) {
  const map = { PAID: 'badge-success', PARTIAL: 'badge-warning', PENDING: 'badge-warning', OVERDUE: 'badge-danger', CANCELLED: 'badge-neutral' };
  return <span className={`badge ${map[s] || 'badge-neutral'}`}>{s}</span>;
}

export default function SaleDetail({ saleId, onClose, onPrintReceipt, onRecordPayment, onReturnItems, onGenerateGstInvoice }) {
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!saleId) return;
    setLoading(true);
    setError('');
    salesApi
      .getSaleById(saleId)
      .then((r) => setSale(r.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Could not load sale details'))
      .finally(() => setLoading(false));
  }, [saleId]);

  if (!saleId) return null;

  return (
    <Drawer
      title={sale ? `Sale · ${sale.saleNumber}` : 'Sale Details'}
      isOpen={Boolean(saleId)}
      onClose={onClose}
      maxWidth={560}
      footer={
        sale && (
          <div style={{ display: 'flex', gap: 8, width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onPrintReceipt(sale)}
            >
              <i className="ti ti-printer" /> Print Bill / Invoice
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              {Number(sale.balanceDue) > 0 && sale.paymentStatus !== 'CANCELLED' && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => { onClose(); onRecordPayment(sale); }}
                >
                  <i className="ti ti-cash" /> Record Payment
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => { onClose(); onGenerateGstInvoice(sale); }}
              >
                <i className="ti ti-file-invoice" /> GST Invoice
              </button>
            </div>
          </div>
        )
      }
    >
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="skeleton-bar" style={{ width: '60%', height: 20 }} />
          <div className="skeleton-bar" style={{ width: '100%', height: 80 }} />
          <div className="skeleton-bar" style={{ width: '100%', height: 140 }} />
        </div>
      ) : error ? (
        <div className="banner banner-error">
          <i className="ti ti-alert-circle" />
          <span>{error}</span>
        </div>
      ) : sale ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Header Summary */}
          <div
            style={{
              padding: 16,
              borderRadius: 12,
              background: 'var(--surface-3)',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Customer</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{sale.customerName || 'Walk-in Customer'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Date</div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 2 }}>{fmtDate(sale.saleDate)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Payment Status</div>
              <div style={{ marginTop: 4 }}>{statusBadge(sale.paymentStatus)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Total Amount</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--brand)', marginTop: 2 }}>{fmtCurrency(sale.totalAmount)}</div>
            </div>
          </div>

          {/* Items Purchased */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
              Items ({(sale.items || []).length})
            </div>
            <div className="table-card">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th style={{ textAlign: 'right' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Price</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(sale.items || []).map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{item.productName}</div>
                        {item.productSku && <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{item.productSku}</div>}
                      </td>
                      <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right' }}>{fmtCurrency(item.unitPrice)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtCurrency(Number(item.quantity) * Number(item.unitPrice))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Amount Breakdown */}
          <div style={{ padding: '12px 16px', borderRadius: 10, background: 'var(--glass-bg-strong)', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 6 }}>
              <span>Subtotal:</span>
              <span>{fmtCurrency(sale.subtotal || sale.totalAmount)}</span>
            </div>
            {Number(sale.discountAmount || 0) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--success-text)', marginBottom: 6 }}>
                <span>Discount:</span>
                <span>-{fmtCurrency(sale.discountAmount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 6 }}>
              <span>Amount Paid:</span>
              <span>{fmtCurrency(Number(sale.totalAmount) - Number(sale.balanceDue || 0))}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', borderTop: '1px solid var(--glass-border)', paddingTop: 8 }}>
              <span>Balance Due:</span>
              <span style={{ color: Number(sale.balanceDue) > 0 ? 'var(--danger-text)' : 'var(--text-primary)' }}>
                {fmtCurrency(sale.balanceDue || 0)}
              </span>
            </div>
          </div>

          {/* Payments History */}
          {(sale.payments || []).length > 0 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Payment Records</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {sale.payments.map((p) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--surface-3)', borderRadius: 8, fontSize: 12 }}>
                    <div>
                      <span className="badge badge-neutral" style={{ marginRight: 8 }}>{p.method}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{fmtDate(p.paymentDate || p.createdAt)}</span>
                      {p.notes && <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>({p.notes})</span>}
                    </div>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{fmtCurrency(p.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Returns History */}
          {(sale.returns || []).length > 0 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--danger-text)', marginBottom: 8 }}>Returned Items</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {sale.returns.map((ret) => (
                  <div key={ret.id} style={{ padding: '8px 12px', background: 'var(--danger-bg)', color: 'var(--danger-text)', borderRadius: 8, fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                      <span>Return Ref #{ret.id}</span>
                      <span>{fmtDate(ret.createdAt)}</span>
                    </div>
                    {ret.reason && <div style={{ marginTop: 2, opacity: 0.9 }}>Reason: {ret.reason}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </Drawer>
  );
}