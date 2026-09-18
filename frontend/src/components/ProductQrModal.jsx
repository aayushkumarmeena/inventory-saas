import React, { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import Modal from './Modal';
import { encodeProductQr } from '../utils/qr';
import { fmtCurrency } from '../utils/formatters';

export default function ProductQrModal({ product, onClose }) {
  const canvasWrapRef = useRef(null);

  const download = () => {
    const canvas = canvasWrapRef.current?.querySelector('canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-${product.sku}.png`;
    a.click();
  };

  const print = () => {
    const canvas = canvasWrapRef.current?.querySelector('canvas');
    if (!canvas) return;
    const win = window.open('', '_blank', 'width=460,height=560');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Label - ${product.sku}</title>
          <style>
            @page { margin: 10mm; size: auto; }
            body {
              background: #ffffff !important;
              color: #000000 !important;
              margin: 0;
              padding: 20px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              text-align: center;
            }
            .label-box {
              border: 2px dashed #333;
              border-radius: 12px;
              padding: 20px 24px;
              display: inline-flex;
              flex-direction: column;
              align-items: center;
            }
            .title { font-size: 16px; font-weight: 700; margin-top: 12px; max-width: 240px; }
            .sku { font-size: 13px; font-family: monospace; color: #444; margin-top: 4px; }
            .price { font-size: 15px; font-weight: 700; margin-top: 6px; }
          </style>
        </head>
        <body>
          <div class="label-box">
            <img src="${canvas.toDataURL('image/png')}" style="width:180px;height:180px;display:block;" />
            <div class="title">${product.name}</div>
            <div class="sku">SKU: ${product.sku}</div>
            ${product.price ? `<div class="price">${fmtCurrency(product.price)}</div>` : ''}
          </div>
          <script>
            window.onload = function() {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <Modal title="Product QR Code Label" onClose={onClose} maxWidth={380}>
      <div style={{ textAlign: 'center' }}>
        <div
          ref={canvasWrapRef}
          style={{
            display: 'inline-block',
            padding: 16,
            background: '#fff',
            borderRadius: 12,
            marginBottom: 14,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
        >
          <QRCodeCanvas value={encodeProductQr(product.sku)} size={200} level="M" includeMargin={false} />
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{product.name}</div>
        <div style={{ fontSize: 12.5, fontFamily: 'monospace', color: 'var(--text-secondary)', marginBottom: 4 }}>SKU: {product.sku}</div>
        {product.price && (
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--brand)', marginBottom: 18 }}>
            {fmtCurrency(product.price)}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button type="button" className="btn btn-secondary" onClick={print}>
            <i className="ti ti-printer" /> Print Label
          </button>
          <button type="button" className="btn btn-primary" onClick={download}>
            <i className="ti ti-download" /> Download PNG
          </button>
        </div>
      </div>
    </Modal>
  );
}