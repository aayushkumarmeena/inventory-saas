import React from 'react';
import Modal from '../../components/Modal';
import { fmtCurrency, fmtDate } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';

export default function Receipt({ sale, onClose }) {
  const { user } = useAuth();

  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal title="Sale Receipt" onClose={onClose} maxWidth={500}>
      <div className="receipt-paper" id="printable-receipt">
        {/* Receipt Header */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px 0', textTransform: 'uppercase' }}>
            {user?.tenantName || 'InventoryPro Store'}
          </h2>
          <div style={{ fontSize: 11, color: '#555' }}>
            GST-Compliant Sales Receipt
          </div>
          <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
            Tel: Support / Point of Sale
          </div>
        </div>

        <div className="receipt-divider" />

        {/* Metadata */}
        <div className="receipt-row">
          <span>Receipt #:</span>
          <strong>{sale.saleNumber}</strong>
        </div>
        <div className="receipt-row">
          <span>Date:</span>
          <span>{fmtDate(sale.saleDate)}</span>
        </div>
        <div className="receipt-row">
          <span>Customer:</span>
          <span>{sale.customerName || 'Walk-in'}</span>
        </div>
        <div className="receipt-row">
          <span>Billed by:</span>
          <span>{user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'Cashier'}</span>
        </div>

        <div className="receipt-divider" />

        {/* Items Table */}
        <div style={{ margin: '10px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', fontSize: 11, fontWeight: 700, paddingBottom: 4, borderBottom: '1px solid #ddd' }}>
            <span>Item</span>
            <span style={{ textAlign: 'center' }}>Qty</span>
            <span style={{ textAlign: 'right' }}>Amt</span>
          </div>

          {(sale.items || []).map((item, idx) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', fontSize: 11, padding: '4px 0' }}>
              <div>
                <div>{item.productName}</div>
                <div style={{ fontSize: 9.5, color: '#666' }}>@{fmtCurrency(item.unitPrice)}</div>
              </div>
              <div style={{ textAlign: 'center' }}>{item.quantity}</div>
              <div style={{ textAlign: 'right', fontWeight: 600 }}>{fmtCurrency(Number(item.quantity) * Number(item.unitPrice))}</div>
            </div>
          ))}
        </div>

        <div className="receipt-divider" />

        {/* Totals */}
        <div className="receipt-row" style={{ fontSize: 13, fontWeight: 700 }}>
          <span>TOTAL:</span>
          <span>{fmtCurrency(sale.totalAmount)}</span>
        </div>

        {Number(sale.balanceDue) > 0 ? (
          <>
            <div className="receipt-row" style={{ color: '#d97706' }}>
              <span>Balance Due:</span>
              <span>{fmtCurrency(sale.balanceDue)}</span>
            </div>
            <div className="receipt-row">
              <span>Status:</span>
              <span>{sale.paymentStatus}</span>
            </div>
          </>
        ) : (
          <div className="receipt-row" style={{ color: '#059669', fontWeight: 600 }}>
            <span>Status:</span>
            <span>PAID IN FULL</span>
          </div>
        )}

        <div className="receipt-divider" />

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: 11, color: '#666', marginTop: 12 }}>
          <div>Thank you for your business!</div>
          <div style={{ fontSize: 9.5, marginTop: 4 }}>Powered by InventoryPro SaaS</div>
        </div>
      </div>

      <div className="modal-actions" style={{ marginTop: 18 }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
        <button type="button" className="btn btn-primary" onClick={handlePrint}>
          <i className="ti ti-printer" /> Print Now
        </button>
      </div>
    </Modal>
  );
}