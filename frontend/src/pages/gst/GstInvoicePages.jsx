import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { gstApi } from '../../api/gstApi';
import { fmtCurrency, fmtDate, downloadBlob } from '../../utils/formatters';
import { useToast } from '../../context/ToastContext';

function TypeBadge({ type, cancelled }) {
  if (cancelled) return <span className="badge badge-danger">CANCELLED</span>;
  const map = { B2B: 'badge-neutral', B2C: 'badge-success', EXPORT: 'badge-warning' };
  return <span className={`badge ${map[type] || 'badge-neutral'}`}>{type}</span>;
}

export default function GstInvoicePages() {
  const nav = useNavigate();
  const toast = useToast();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const load = () => {
    setLoading(true);
    gstApi.listInvoices({ page, size: 20, sort: 'createdAt,desc' })
      .then((r) => { setInvoices(r.data.data.content || []); setTotalPages(r.data.data.totalPages || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [page]);

  const handleCancel = async (id, e) => {
    e.stopPropagation();
    const reason = window.prompt('Cancellation reason:');
    if (!reason) return;
    try {
      await gstApi.cancelInvoice(id, reason);
      toast.success('Invoice cancelled');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not cancel invoice');
    }
  };

  const downloadPdf = async (inv, e) => {
    e.stopPropagation();
    try {
      const r = await gstApi.getInvoicePdf(inv.id);
      downloadBlob(r.data, `${inv.invoiceNumber}.pdf`);
    } catch (err) {
      toast.error('Could not generate PDF');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">GST Invoices</h1>
          <p className="page-subtitle">All tax invoices generated from your sales.</p>
        </div>
        <button className="btn btn-primary" onClick={() => nav('/gst/invoices/new')}>
          <i className="ti ti-plus" /> Generate invoice
        </button>
      </div>

      <div className="table-card">
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                {['Invoice #', 'Date', 'Buyer', 'GSTIN', 'Type', 'Taxable', 'CGST', 'SGST', 'IGST', 'Total', ''].map((h) => (
                  <th key={h} style={{ whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="skeleton-row">
                    {[...Array(11)].map((__, j) => <td key={j}><div className="skeleton-bar" style={{ width: '70%' }} /></td>)}
                  </tr>
                ))
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={11}>
                    <div className="empty-state">
                      <i className="ti ti-file-invoice" />
                      <div className="empty-state-title">No GST invoices yet</div>
                      <div className="empty-state-desc">Generate one from a recorded sale.</div>
                      <button className="btn btn-primary btn-sm" onClick={() => nav('/gst/invoices/new')}><i className="ti ti-plus" /> Generate invoice</button>
                    </div>
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{inv.invoiceNumber}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{fmtDate(inv.invoiceDate)}</td>
                    <td>{inv.buyerName || '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{inv.buyerGstin || '—'}</td>
                    <td><TypeBadge type={inv.invoiceType} cancelled={inv.isCancelled} /></td>
                    <td style={{ textAlign: 'right' }}>{fmtCurrency(inv.taxableValue)}</td>
                    <td style={{ textAlign: 'right' }}>{fmtCurrency(inv.cgstAmount)}</td>
                    <td style={{ textAlign: 'right' }}>{fmtCurrency(inv.sgstAmount)}</td>
                    <td style={{ textAlign: 'right' }}>{fmtCurrency(inv.igstAmount)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtCurrency(inv.totalAmount)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn btn-secondary btn-sm" onClick={(e) => downloadPdf(inv, e)} style={{ marginRight: 6 }}>
                        <i className="ti ti-file-type-pdf" />
                      </button>
                      {!inv.isCancelled && <button className="btn btn-danger btn-sm" onClick={(e) => handleCancel(inv.id, e)}>Cancel</button>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!loading && invoices.length > 0 && (
        <div className="pagination">
          <button className="btn btn-secondary btn-sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}><i className="ti ti-chevron-left" /> Prev</button>
          <span>Page {page + 1} of {Math.max(1, totalPages)}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage((p) => p + 1)} disabled={page + 1 >= totalPages}>Next <i className="ti ti-chevron-right" /></button>
        </div>
      )}
    </div>
  );
}
