import React, { useState, useEffect, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import Modal from '../../components/Modal';
import { fmtCurrency, fmtDate, amountInWords } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { gstApi } from '../../api/gstApi';
import { customerApi } from '../../api/customerApi';

// Dedicated isolated print engine: prints via a clean hidden iframe
function printDocument(htmlContent) {
  let iframe = document.getElementById('inventory-invoice-print-frame');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'inventory-invoice-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow || iframe.contentDocument;
  const targetDoc = doc.document || doc;
  targetDoc.open();
  targetDoc.write(htmlContent);
  targetDoc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (err) {
      // Fallback: open clean popup window
      const win = window.open('', '_blank', 'width=850,height=950');
      if (win) {
        win.document.open();
        win.document.write(htmlContent);
        win.document.close();
        setTimeout(() => {
          win.focus();
          win.print();
        }, 300);
      }
    }
  }, 250);
}

export default function Receipt({ sale, onClose }) {
  const { user } = useAuth();
  const [template, setTemplate] = useState('a4'); // 'a4' | 'thermal'
  const [showCustomize, setShowCustomize] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [whatsAppPhone, setWhatsAppPhone] = useState('');
  const [customerData, setCustomerData] = useState(null);
  const qrCanvasRef = useRef(null);

  // Branding config (logo, accent color, custom footer/terms)
  const [branding] = useState(() => {
    const DEFAULT_BRANDING = {
      logoDataUrl: '', accentColor: '#2563eb', headerLayout: 'logo-left',
      showLogoOnThermal: false,
      footerMessage: 'Thank you for shopping with us! Visit again.',
      termsAndConditions: '1. Goods once sold will not be exchanged or returned without original bill.\n2. Please verify items and cash before leaving counter.\n3. Subject to local jurisdiction only.',
      showTermsOnA4: true, showQrOnA4: true, showQrOnThermal: true,
      invoiceTitle: 'TAX INVOICE / BILL', footerNote: '',
    };
    try {
      const s = localStorage.getItem('inventorypro_branding');
      if (s) return { ...DEFAULT_BRANDING, ...JSON.parse(s) };
    } catch (e) {}
    return DEFAULT_BRANDING;
  });

  // Store information state with local fallback & persistent localStorage cache
  const [store, setStore] = useState(() => {
    const saved = localStorage.getItem('inventorypro_store_profile');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      name: user?.tenantName || 'InventoryPro Superstore',
      tagline: 'Retail, Wholesale & Inventory Management',
      addressLine1: 'Main Market Road, Commercial Complex',
      addressLine2: '',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      phone: '+91 98765 43210',
      email: user?.email || 'contact@store.com',
      gstin: '27AAAAA0000A1Z5',
      pan: 'AAAAA0000A',
      upiId: 'inventorypro@upi',
      terms: '1. Goods once sold will not be exchanged or returned without original bill.\n2. Please verify items and cash before leaving counter.\n3. Subject to local jurisdiction only.',
    };
  });

  const [editForm, setEditForm] = useState(store);

  // Load GST config and Customer details if available
  useEffect(() => {
    gstApi.getConfig()
      .then((r) => {
        const d = r.data?.data;
        if (d && (d.tradeName || d.legalName || d.gstin)) {
          setStore((prev) => {
            const updated = {
              ...prev,
              name: d.tradeName || d.legalName || prev.name,
              addressLine1: d.addressLine1 || prev.addressLine1,
              addressLine2: d.addressLine2 || prev.addressLine2,
              city: d.city || prev.city,
              state: d.state || prev.state,
              pincode: d.pincode || prev.pincode,
              phone: d.phone || prev.phone,
              email: d.email || prev.email,
              gstin: d.gstin || prev.gstin,
              pan: d.pan || prev.pan,
            };
            setEditForm(updated);
            return updated;
          });
        }
      })
      .catch(() => {});

    if (sale?.customerId) {
      customerApi.get(sale.customerId)
        .then((r) => {
          const cust = r.data?.data;
          setCustomerData(cust);
          if (cust?.phone) {
            setWhatsAppPhone(cust.phone);
          }
        })
        .catch(() => {});
    }
  }, [sale?.customerId]);

  if (!sale) return null;

  const handleSaveStore = (e) => {
    e.preventDefault();
    setStore(editForm);
    localStorage.setItem('inventorypro_store_profile', JSON.stringify(editForm));
    setShowCustomize(false);
  };

  const paymentMethod = sale.payments?.[0]?.method || 'CASH';
  const cashierName = sale.createdByName || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Store Staff');
  const fullAddress = [store.addressLine1, store.addressLine2, store.city, store.state ? `${store.state} - ${store.pincode}` : store.pincode]
    .filter(Boolean)
    .join(', ');

  const grandTotal = Number(sale.totalAmount || 0);
  const amountPaid = Number(sale.amountPaid || grandTotal);
  const balanceDue = Number(sale.balanceDue || 0);
  const upiPayAmount = balanceDue > 0 ? balanceDue : grandTotal;

  // Standard NPCI UPI URI
  const upiId = store.upiId || 'store@upi';
  const upiString = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(store.name || 'Store')}&am=${upiPayAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Bill ' + sale.saleNumber)}`;

  // Generate pure HTML string for printing
  const generatePrintHtml = (format) => {
    const isThermal = format === 'thermal';
    let qrDataUrl = '';
    try {
      const canvas = document.getElementById('inventory-upi-qr-canvas');
      if (canvas) {
        qrDataUrl = canvas.toDataURL('image/png');
      }
    } catch (e) {}

    if (isThermal) {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt - ${sale.saleNumber}</title>
  <style>
    @page { size: 80mm auto; margin: 4mm 3mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', Courier, monospace, monospace;
      font-size: 11.5px;
      line-height: 1.35;
      color: #000;
      background: #fff;
      width: 100%;
      max-width: 290px;
      margin: 0 auto;
      padding: 4px;
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: bold; }
    .store-name { font-size: 15px; font-weight: bold; text-transform: uppercase; margin-bottom: 2px; }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
    .double-divider { border-top: 2px dashed #000; margin: 7px 0; }
    .row { display: flex; justify-content: space-between; margin: 2px 0; font-size: 11px; }
    .item-header { display: grid; grid-template-columns: 2fr 1fr 1fr; font-size: 10.5px; font-weight: bold; border-bottom: 1px dashed #000; padding-bottom: 3px; }
    .item-row { display: grid; grid-template-columns: 2fr 1fr 1fr; font-size: 10.5px; padding: 2px 0; }
  </style>
</head>
<body>
  <div class="center">
    ${branding.logoDataUrl && branding.showLogoOnThermal ? `<img src="${branding.logoDataUrl}" style="max-height:50px; max-width:150px; object-fit:contain; display:block; margin:0 auto 4px;" alt="Logo" />` : ''}
    <div class="store-name" style="color:${branding.accentColor || '#000'};">${store.name}</div>
    ${store.tagline ? `<div style="font-size: 10px; margin-bottom: 2px;">${store.tagline}</div>` : ''}
    <div style="font-size: 10px;">${fullAddress}</div>
    ${store.phone ? `<div style="font-size: 10px;">Phone: ${store.phone}</div>` : ''}
    ${store.gstin ? `<div style="font-size: 10px;">GSTIN: ${store.gstin}</div>` : ''}
  </div>

  <div class="divider"></div>

  <div class="row"><span>Receipt #:</span><span class="bold">${sale.saleNumber}</span></div>
  <div class="row"><span>Date:</span><span>${fmtDate(sale.saleDate)}</span></div>
  <div class="row"><span>Customer:</span><span>${sale.customerName || 'Walk-in'}</span></div>
  <div class="row"><span>Cashier:</span><span>${cashierName}</span></div>
  <div class="row"><span>Pay Mode:</span><span>${paymentMethod}</span></div>

  <div class="divider"></div>

  <div class="item-header">
    <span>Item</span>
    <span class="center">Qty</span>
    <span class="right">Amt</span>
  </div>

  ${(sale.items || []).map((it) => `
    <div class="item-row">
      <div>
        <div>${it.productName}</div>
        <div style="font-size: 9px; color: #333;">@${fmtCurrency(it.unitPrice)}</div>
      </div>
      <div class="center">${it.quantity}</div>
      <div class="right bold">${fmtCurrency(Number(it.quantity) * Number(it.unitPrice))}</div>
    </div>
  `).join('')}

  <div class="double-divider"></div>

  <div class="row bold" style="font-size: 13px;">
    <span>TOTAL:</span>
    <span>${fmtCurrency(grandTotal)}</span>
  </div>
  <div class="row">
    <span>Paid:</span>
    <span>${fmtCurrency(amountPaid)}</span>
  </div>
  ${balanceDue > 0 ? `
    <div class="row bold" style="color: #b45309;">
      <span>Balance Due:</span>
      <span>${fmtCurrency(balanceDue)}</span>
    </div>
  ` : `
    <div class="row bold">
      <span>Status:</span>
      <span>PAID IN FULL</span>
    </div>
  `}

  ${qrDataUrl && branding.showQrOnThermal ? `
    <div class="divider"></div>
    <div class="center" style="margin: 6px 0;">
      <div style="font-size: 9.5px; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">SCAN &amp; PAY VIA UPI (GPAY / PHONEPE)</div>
      <img src="${qrDataUrl}" width="105" height="105" alt="UPI QR" style="display: block; margin: 0 auto;" />
      <div style="font-size: 8.5px; margin-top: 3px; font-family: monospace;">UPI ID: ${upiId}</div>
      <div style="font-size: 9px; font-weight: bold; margin-top: 1px;">Amount: ${fmtCurrency(upiPayAmount)}</div>
    </div>
  ` : ''}

  <div class="divider"></div>

  <div class="center" style="font-size: 10px; margin-top: 8px;">
    <div style="font-weight:bold;">${branding.footerMessage || '*** Thank You for Shopping With Us! ***'}</div>
    ${branding.footerNote ? `<div style="font-size: 8.5px; margin-top: 3px;">${branding.footerNote}</div>` : ''}
    <div style="font-size: 9px; margin-top: 3px;">Computer Generated Bill</div>
  </div>
</body>
</html>`;
    }

    // Standard Professional A4 / Letter Tax Invoice
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Tax Invoice - ${sale.saleNumber}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm 14mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 12.5px;
      line-height: 1.45;
      color: #1f2937;
      background: #ffffff;
      padding: 15px;
    }
    .invoice-box {
      max-width: 820px;
      margin: 0 auto;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      padding: 24px 28px;
    }
    .header-table {
      width: 100%;
      border-bottom: 2px solid ${branding.accentColor || '#2563eb'};
      padding-bottom: 16px;
      margin-bottom: 18px;
    }
    .store-title {
      font-size: 22px;
      font-weight: 800;
      color: ${branding.accentColor || '#1e3a8a'};
      text-transform: uppercase;
      letter-spacing: -0.01em;
    }
    .store-sub {
      font-size: 11px;
      font-weight: 600;
      color: #4b5563;
      text-transform: uppercase;
      margin-top: 2px;
      letter-spacing: 0.04em;
    }
    .store-address {
      font-size: 11.5px;
      color: #4b5563;
      margin-top: 4px;
      line-height: 1.4;
    }
    .invoice-badge-box {
      text-align: right;
    }
    .doc-type {
      display: inline-block;
      background: #eff6ff;
      border: 1.5px solid ${branding.accentColor || '#2563eb'};
      color: ${branding.accentColor || '#1d4ed8'};
      font-size: 13px;
      font-weight: 800;
      padding: 5px 12px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .doc-original {
      font-size: 10px;
      color: #6b7280;
      text-transform: uppercase;
      margin-top: 4px;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      overflow: hidden;
    }
    .info-table td {
      padding: 12px 14px;
      vertical-align: top;
      font-size: 12px;
    }
    .info-label {
      font-size: 10.5px;
      font-weight: 700;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 6px;
    }
    .info-value-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .items-table th {
      background: #f8fafc;
      color: #1e293b;
      font-weight: 700;
      font-size: 11.5px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      padding: 9px 12px;
      border: 1px solid #d1d5db;
      text-align: left;
    }
    .items-table td {
      padding: 9px 12px;
      border: 1px solid #e5e7eb;
      font-size: 12px;
    }
    .items-table tr:nth-child(even) td {
      background: #fbfcfe;
    }
    .summary-section {
      display: table;
      width: 100%;
      margin-bottom: 20px;
    }
    .summary-left {
      display: table-cell;
      width: 55%;
      vertical-align: top;
      padding-right: 18px;
    }
    .summary-right {
      display: table-cell;
      width: 45%;
      vertical-align: top;
    }
    .totals-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      overflow: hidden;
    }
    .totals-table td {
      padding: 7px 12px;
      font-size: 12px;
      border-bottom: 1px solid #f1f5f9;
    }
    .totals-table tr.grand-row td {
      background: ${branding.accentColor || '#1e3a8a'};
      color: #ffffff;
      font-size: 14.5px;
      font-weight: 800;
      border-bottom: none;
      padding: 10px 12px;
    }
    .words-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 12px;
      font-size: 11.5px;
      margin-bottom: 12px;
    }
    .terms-block {
      font-size: 10px;
      color: #64748b;
      line-height: 1.45;
      white-space: pre-line;
    }
    .footer-signatures {
      display: table;
      width: 100%;
      margin-top: 32px;
      padding-top: 14px;
      border-top: 1px solid #e5e7eb;
    }
    .sign-col {
      display: table-cell;
      width: 50%;
      vertical-align: bottom;
    }
    .sign-line {
      width: 180px;
      border-top: 1px solid #4b5563;
      margin-bottom: 4px;
    }
    .stamp-text {
      font-size: 11px;
      color: #4b5563;
      font-weight: 600;
    }
    .badge-paid {
      display: inline-block;
      background: #dcfce7;
      color: #15803d;
      padding: 2px 7px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 11px;
    }
    .badge-unpaid {
      display: inline-block;
      background: #fee2e2;
      color: #b91c1c;
      padding: 2px 7px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 11px;
    }
    .upi-card {
      display: flex;
      align-items: center;
      gap: 12px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 9px 12px;
      background: #faf5ff;
      margin-bottom: 12px;
    }
  </style>
</head>
<body>
  <div class="invoice-box">
    <!-- Header Block -->
    ${branding.headerLayout === 'logo-center' ? `
    <table class="header-table" style="text-align: center;">
      <tr>
        <td colspan="2" style="text-align: center; padding-bottom: 8px;">
          ${branding.logoDataUrl && branding.headerLayout !== 'text-only' ? `<div style="margin-bottom: 6px;"><img src="${branding.logoDataUrl}" alt="Logo" style="max-height: 55px; max-width: 180px; object-fit: contain;" /></div>` : ''}
          <div class="store-title">${store.name}</div>
          ${store.tagline ? `<div class="store-sub">${store.tagline}</div>` : ''}
          <div class="store-address">
            ${fullAddress} ${store.phone ? `&bull; Phone: ${store.phone}` : ''} ${store.email ? `&bull; ${store.email}` : ''}<br/>
            ${store.gstin ? `<strong>GSTIN:</strong> ${store.gstin} &nbsp;|&nbsp; ` : ''}
            ${store.pan ? `<strong>PAN:</strong> ${store.pan}` : ''}
          </div>
        </td>
      </tr>
      <tr>
        <td style="text-align: left; vertical-align: bottom; padding-top: 8px;">
          <div class="doc-type">${branding.invoiceTitle || 'TAX INVOICE / BILL'}</div>
          <div class="doc-original">Original for Recipient</div>
        </td>
        <td style="text-align: right; vertical-align: bottom; padding-top: 8px; font-size: 12px;">
          <div><strong>Invoice No:</strong> <span style="font-family: monospace; font-size: 13px; color: ${branding.accentColor || '#1e3a8a'}; font-weight: 700;">${sale.saleNumber}</span></div>
          <div><strong>Date:</strong> ${fmtDate(sale.saleDate)} &nbsp;|&nbsp; <strong>Billed By:</strong> ${cashierName}</div>
        </td>
      </tr>
    </table>
    ` : branding.headerLayout === 'logo-right' ? `
    <table class="header-table">
      <tr>
        <td style="vertical-align: top; width: 60%;">
          <div class="store-title">${store.name}</div>
          ${store.tagline ? `<div class="store-sub">${store.tagline}</div>` : ''}
          <div class="store-address">
            ${fullAddress}<br/>
            ${store.phone ? `<strong>Phone:</strong> ${store.phone} &nbsp;|&nbsp; ` : ''}
            ${store.email ? `<strong>Email:</strong> ${store.email}` : ''}<br/>
            ${store.gstin ? `<strong>GSTIN:</strong> ${store.gstin} &nbsp;|&nbsp; ` : ''}
            ${store.pan ? `<strong>PAN:</strong> ${store.pan}` : ''}
          </div>
        </td>
        <td class="invoice-badge-box" style="vertical-align: top; width: 40%; text-align: right;">
          ${branding.logoDataUrl && branding.headerLayout !== 'text-only' ? `<div style="margin-bottom: 8px;"><img src="${branding.logoDataUrl}" alt="Logo" style="max-height: 52px; max-width: 150px; object-fit: contain;" /></div>` : ''}
          <div class="doc-type">${branding.invoiceTitle || 'TAX INVOICE / BILL'}</div>
          <div class="doc-original">Original for Recipient</div>
          <div style="margin-top: 8px; font-size: 12px;">
            <div><strong>Invoice No:</strong> <span style="font-family: monospace; font-size: 13px; color: ${branding.accentColor || '#1e3a8a'}; font-weight: 700;">${sale.saleNumber}</span></div>
            <div><strong>Date:</strong> ${fmtDate(sale.saleDate)}</div>
            <div><strong>Billed By:</strong> ${cashierName}</div>
          </div>
        </td>
      </tr>
    </table>
    ` : `
    <table class="header-table">
      <tr>
        <td style="vertical-align: top; width: 62%;">
          <div style="display: flex; align-items: flex-start; gap: 14px;">
            ${branding.logoDataUrl && branding.headerLayout !== 'text-only' ? `<div><img src="${branding.logoDataUrl}" alt="Logo" style="max-height: 55px; max-width: 160px; object-fit: contain; margin-top: 2px;" /></div>` : ''}
            <div>
              <div class="store-title">${store.name}</div>
              ${store.tagline ? `<div class="store-sub">${store.tagline}</div>` : ''}
              <div class="store-address">
                ${fullAddress}<br/>
                ${store.phone ? `<strong>Phone:</strong> ${store.phone} &nbsp;|&nbsp; ` : ''}
                ${store.email ? `<strong>Email:</strong> ${store.email}` : ''}<br/>
                ${store.gstin ? `<strong>GSTIN:</strong> ${store.gstin} &nbsp;|&nbsp; ` : ''}
                ${store.pan ? `<strong>PAN:</strong> ${store.pan}` : ''}
              </div>
            </div>
          </div>
        </td>
        <td class="invoice-badge-box" style="vertical-align: top; width: 38%;">
          <div class="doc-type">${branding.invoiceTitle || 'TAX INVOICE / BILL'}</div>
          <div class="doc-original">Original for Recipient</div>
          <div style="margin-top: 10px; font-size: 12px;">
            <div><strong>Invoice No:</strong> <span style="font-family: monospace; font-size: 13px; color: ${branding.accentColor || '#1e3a8a'}; font-weight: 700;">${sale.saleNumber}</span></div>
            <div><strong>Date:</strong> ${fmtDate(sale.saleDate)}</div>
            <div><strong>Billed By:</strong> ${cashierName}</div>
          </div>
        </td>
      </tr>
    </table>
    `}

    <!-- Buyer & Bill Details Table -->
    <table class="info-table">
      <tr>
        <td style="width: 50%; border-right: 1px solid #e5e7eb; background: #fafafa;">
          <div class="info-label">Customer / Buyer Details</div>
          <div style="font-size: 13.5px; font-weight: 700; color: #111827; margin-bottom: 3px;">
            ${sale.customerName || 'Walk-in Customer'}
          </div>
          ${customerData?.phone ? `<div><strong>Phone:</strong> ${customerData.phone}</div>` : ''}
          ${customerData?.email ? `<div><strong>Email:</strong> ${customerData.email}</div>` : ''}
          ${customerData?.address ? `<div><strong>Address:</strong> ${customerData.address}</div>` : ''}
          ${customerData?.gstin ? `<div><strong>Buyer GSTIN:</strong> ${customerData.gstin}</div>` : ''}
        </td>
        <td style="width: 50%;">
          <div class="info-label">Payment & Supply Details</div>
          <div class="info-value-row">
            <span style="color: #6b7280;">Payment Mode:</span>
            <strong>${paymentMethod}</strong>
          </div>
          <div class="info-value-row">
            <span style="color: #6b7280;">Payment Status:</span>
            <span>
              ${sale.paymentStatus === 'PAID' ? '<span class="badge-paid">PAID IN FULL</span>' : `<span class="badge-unpaid">${sale.paymentStatus}</span>`}
            </span>
          </div>
          <div class="info-value-row">
            <span style="color: #6b7280;">Place of Supply:</span>
            <span>${store.state || 'Local State'}</span>
          </div>
        </td>
      </tr>
    </table>

    <!-- Line Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 38px; text-align: center;">#</th>
          <th>Item Description</th>
          <th style="width: 60px; text-align: center;">Qty</th>
          <th style="width: 95px; text-align: right;">Unit Price</th>
          <th style="width: 105px; text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${(sale.items || []).map((it, idx) => `
          <tr>
            <td style="text-align: center; color: #6b7280;">${idx + 1}</td>
            <td>
              <div style="font-weight: 600; color: #111827;">${it.productName}</div>
              ${it.productId ? `<div style="font-size: 10px; color: #6b7280; font-family: monospace;">SKU: #${it.productId}</div>` : ''}
            </td>
            <td style="text-align: center; font-weight: 600;">${it.quantity}</td>
            <td style="text-align: right; font-family: monospace;">${fmtCurrency(it.unitPrice)}</td>
            <td style="text-align: right; font-weight: 700; font-family: monospace;">
              ${fmtCurrency(Number(it.quantity) * Number(it.unitPrice))}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- Summary & Totals -->
    <div class="summary-section">
      <div class="summary-left">
        <div class="words-card">
          <div style="font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase;">Amount in Words:</div>
          <div style="font-weight: 600; color: #111827; margin-top: 3px;">${amountInWords(grandTotal)}</div>
        </div>

        ${qrDataUrl && branding.showQrOnA4 ? `
          <div class="upi-card">
            <img src="${qrDataUrl}" width="82" height="82" alt="UPI QR" style="border-radius: 6px; border: 1px solid #d8b4fe;" />
            <div>
              <div style="font-size: 10.5px; font-weight: 800; color: #6b21a8; text-transform: uppercase; letter-spacing: 0.04em;">Scan to Pay via UPI</div>
              <div style="font-size: 10px; color: #4b5563; margin-top: 2px;">Google Pay, PhonePe, Paytm, BHIM</div>
              <div style="font-size: 10.5px; font-family: monospace; font-weight: 700; color: #1e1b4b; margin-top: 3px;">${upiId}</div>
              <div style="font-size: 10.5px; color: #7e22ce; font-weight: 700; margin-top: 2px;">Amount: ${fmtCurrency(upiPayAmount)}</div>
            </div>
          </div>
        ` : ''}

        ${(branding.termsAndConditions || store.terms) && branding.showTermsOnA4 ? `
          <div class="terms-block">
            <strong>Terms &amp; Conditions:</strong><br/>
            ${branding.termsAndConditions || store.terms}
          </div>
        ` : ''}
      </div>

      <div class="summary-right">
        <table class="totals-table">
          <tr>
            <td>Subtotal (Taxable Value):</td>
            <td style="text-align: right; font-family: monospace; font-weight: 600;">${fmtCurrency(grandTotal)}</td>
          </tr>
          ${store.gstin ? `
            <tr>
              <td style="color: #6b7280;">GST (Inclusive/Applicable):</td>
              <td style="text-align: right; font-family: monospace; color: #6b7280;">Included</td>
            </tr>
          ` : ''}
          <tr class="grand-row">
            <td>Grand Total:</td>
            <td style="text-align: right; font-family: monospace;">${fmtCurrency(grandTotal)}</td>
          </tr>
          <tr>
            <td>Amount Paid:</td>
            <td style="text-align: right; font-family: monospace; font-weight: 600; color: #15803d;">${fmtCurrency(amountPaid)}</td>
          </tr>
          ${balanceDue > 0 ? `
            <tr style="background: #fffbeb;">
              <td style="color: #b45309; font-weight: 700;">Balance Due:</td>
              <td style="text-align: right; font-family: monospace; font-weight: 700; color: #b45309;">${fmtCurrency(balanceDue)}</td>
            </tr>
          ` : ''}
        </table>
      </div>
    </div>

    <!-- Signatures -->
    <div class="footer-signatures">
      <div class="sign-col">
        <div style="font-size: 11px; color: #6b7280; font-weight: 600;">${branding.footerMessage || 'Thank you for your business!'}</div>
        ${branding.footerNote ? `<div style="font-size: 9.5px; color: #9ca3af; margin-top: 2px;">${branding.footerNote}</div>` : ''}
        <div style="font-size: 9px; color: #9ca3af; margin-top: 2px;">Computer generated tax invoice.</div>
      </div>
      <div class="sign-col" style="text-align: right;">
        <div class="stamp-text" style="margin-bottom: 35px;">For ${store.name}</div>
        <div class="sign-line" style="margin-left: auto;"></div>
        <div class="stamp-text">Authorized Signatory</div>
      </div>
    </div>
  </div>
</body>
</html>`;
  };

  const handlePrint = () => {
    const html = generatePrintHtml(template);
    printDocument(html);
  };

  const handleOpenNewTab = () => {
    const html = generatePrintHtml(template);
    const win = window.open('', '_blank');
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
    }
  };

  // WhatsApp Bill Sharing Handler
  const handleSendWhatsApp = (e) => {
    e?.preventDefault();
    const cleanPhone = (whatsAppPhone || '').replace(/[^0-9]/g, '');
    const phoneParam = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;

    const itemsSummary = (sale.items || [])
      .map((it, idx) => `${idx + 1}. *${it.productName}*\n   ${it.quantity} x ₹${Number(it.unitPrice).toFixed(2)} = *₹${(Number(it.quantity) * Number(it.unitPrice)).toFixed(2)}*`)
      .join('\n');

    const message = `🧾 *TAX INVOICE / BILL*
━━━━━━━━━━━━━━━━━━━━
🏪 *${store.name}*
${fullAddress ? `📍 ${fullAddress}\n` : ''}${store.phone ? `📞 Ph: ${store.phone}\n` : ''}${store.gstin ? `🏛️ GSTIN: ${store.gstin}\n` : ''}━━━━━━━━━━━━━━━━━━━━
📄 *Invoice #:* ${sale.saleNumber}
📅 *Date:* ${fmtDate(sale.saleDate)}
👤 *Customer:* ${sale.customerName || 'Customer'}
💳 *Payment Mode:* ${paymentMethod}
━━━━━━━━━━━━━━━━━━━━
🛒 *ITEMS:*
${itemsSummary}
━━━━━━━━━━━━━━━━━━━━
💰 *Grand Total:* ₹${grandTotal.toFixed(2)}
💵 *Amount Paid:* ₹${amountPaid.toFixed(2)}
${balanceDue > 0 ? `⚠️ *Balance Due:* ₹${balanceDue.toFixed(2)}\n\n📲 *Pay via UPI:* ${upiId}\n🔗 *UPI Payment Link:* ${upiString}` : '✅ *Status:* PAID IN FULL'}

✨ *Thank you for shopping with us!*`;

    const url = phoneParam
      ? `https://wa.me/${phoneParam}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(url, '_blank');
    setShowWhatsApp(false);
  };

  return (
    <Modal title={`Invoice & Bill · ${sale.saleNumber}`} onClose={onClose} maxWidth={840}>
      {/* Hidden QR Canvas for Print rendering */}
      <div style={{ display: 'none' }}>
        <QRCodeCanvas
          id="inventory-upi-qr-canvas"
          ref={qrCanvasRef}
          value={upiString}
          size={160}
          level="M"
          includeMargin={false}
        />
      </div>

      {/* Action Bar & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        {/* Template Toggle */}
        <div style={{ display: 'flex', background: 'var(--glass-bg)', padding: 3, borderRadius: 8, border: '1px solid var(--border)' }}>
          <button
            type="button"
            className={`btn btn-sm ${template === 'a4' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '5px 12px', fontSize: 12 }}
            onClick={() => setTemplate('a4')}
          >
            <i className="ti ti-file-text" /> A4 Tax Invoice
          </button>
          <button
            type="button"
            className={`btn btn-sm ${template === 'thermal' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '5px 12px', fontSize: 12 }}
            onClick={() => setTemplate('thermal')}
          >
            <i className="ti ti-receipt" /> POS Thermal (80mm)
          </button>
        </div>

        {/* Quick Tools */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-sm"
            style={{ background: '#16a34a', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: 5 }}
            onClick={() => setShowWhatsApp(true)}
            title="Share bill details on WhatsApp"
          >
            <i className="ti ti-brand-whatsapp" style={{ fontSize: 15 }} /> Share WhatsApp
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowCustomize(!showCustomize)}
            title="Edit Store Name, Address, Phone, GSTIN, and UPI ID"
          >
            <i className="ti ti-edit" /> {showCustomize ? 'Hide Edit' : 'Edit Store & UPI'}
          </button>
          <a
            href="/settings"
            className="btn btn-secondary btn-sm"
            title="Open Branding & Invoice Customizer in Settings"
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <i className="ti ti-brush" /> Logo &amp; Branding
          </a>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleOpenNewTab}
            title="Open printable bill in separate browser tab"
          >
            <i className="ti ti-external-link" /> Full View / PDF
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handlePrint}
          >
            <i className="ti ti-printer" /> Print Bill
          </button>
        </div>
      </div>

      {/* WhatsApp Share Popover Modal */}
      {showWhatsApp && (
        <div style={{ background: 'var(--glass-bg)', padding: 16, borderRadius: 10, border: '1px solid #16a34a', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-brand-whatsapp" style={{ fontSize: 18 }} />
              Share Digital Bill on WhatsApp
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowWhatsApp(false)}>
              <i className="ti ti-x" />
            </button>
          </div>
          <form onSubmit={handleSendWhatsApp}>
            <div style={{ marginBottom: 12 }}>
              <label className="field-label" style={{ fontSize: 11 }}>Customer WhatsApp Number (10 digits)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ padding: '7px 10px', background: 'var(--border)', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>+91</span>
                <input
                  type="tel"
                  className="field-input"
                  placeholder="e.g. 9876543210 (or leave empty to pick contact)"
                  value={whatsAppPhone}
                  onChange={(e) => setWhatsAppPhone(e.target.value)}
                  style={{ fontSize: 13, flex: 1 }}
                />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                Instant bill breakdown, items list, total, and UPI payment link will be sent.
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowWhatsApp(false)}>Cancel</button>
              <button type="submit" className="btn btn-sm" style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '6px 16px' }}>
                <i className="ti ti-send" /> Open WhatsApp
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Collapsible Store Details Editor */}
      {showCustomize && (
        <form onSubmit={handleSaveStore} style={{ background: 'var(--glass-bg)', padding: 14, borderRadius: 10, border: '1px solid var(--border)', marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            Customize Store Details & UPI ID (Prints on Header & Bills)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 10 }}>
            <div>
              <label className="field-label" style={{ fontSize: 11 }}>Store / Business Name</label>
              <input
                className="field-input"
                style={{ fontSize: 12.5, padding: '6px 10px' }}
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="field-label" style={{ fontSize: 11 }}>Store Tagline / Category</label>
              <input
                className="field-input"
                style={{ fontSize: 12.5, padding: '6px 10px' }}
                value={editForm.tagline}
                onChange={(e) => setEditForm({ ...editForm, tagline: e.target.value })}
              />
            </div>
            <div>
              <label className="field-label" style={{ fontSize: 11 }}>Store UPI ID (For Bill QR Code)</label>
              <input
                className="field-input"
                style={{ fontSize: 12.5, padding: '6px 10px', borderColor: '#8b5cf6' }}
                placeholder="e.g. merchant@oksbi or yourname@upi"
                value={editForm.upiId || ''}
                onChange={(e) => setEditForm({ ...editForm, upiId: e.target.value })}
              />
            </div>
            <div>
              <label className="field-label" style={{ fontSize: 11 }}>Phone Number</label>
              <input
                className="field-input"
                style={{ fontSize: 12.5, padding: '6px 10px' }}
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="field-label" style={{ fontSize: 11 }}>GSTIN / Tax ID</label>
              <input
                className="field-input"
                style={{ fontSize: 12.5, padding: '6px 10px' }}
                value={editForm.gstin}
                onChange={(e) => setEditForm({ ...editForm, gstin: e.target.value })}
              />
            </div>
            <div>
              <label className="field-label" style={{ fontSize: 11 }}>Store Address</label>
              <input
                className="field-input"
                style={{ fontSize: 12.5, padding: '6px 10px' }}
                value={editForm.addressLine1}
                onChange={(e) => setEditForm({ ...editForm, addressLine1: e.target.value })}
              />
            </div>
            <div>
              <label className="field-label" style={{ fontSize: 11 }}>City & State</label>
              <input
                className="field-input"
                style={{ fontSize: 12.5, padding: '6px 10px' }}
                value={`${editForm.city}, ${editForm.state}`}
                onChange={(e) => {
                  const parts = e.target.value.split(',');
                  setEditForm({ ...editForm, city: parts[0]?.trim() || '', state: parts[1]?.trim() || '' });
                }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowCustomize(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm">Save Store Details</button>
          </div>
        </form>
      )}

      {/* Live Interactive Invoice Preview Container */}
      <div style={{ background: '#1e293b', padding: '16px 12px', borderRadius: 10, overflowX: 'auto', maxHeight: '58vh', overflowY: 'auto' }}>
        {template === 'a4' ? (
          /* A4 Interactive Preview */
          <div
            style={{
              background: '#ffffff',
              color: '#1f2937',
              maxWidth: 720,
              margin: '0 auto',
              padding: '24px 28px',
              borderRadius: 6,
              boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontSize: 12,
            }}
          >
            {/* Header */}
            {branding.headerLayout === 'logo-center' ? (
              <div style={{ borderBottom: `2px solid ${branding.accentColor || '#2563eb'}`, paddingBottom: 14, marginBottom: 14, textAlign: 'center' }}>
                {branding.logoDataUrl && branding.headerLayout !== 'text-only' && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
                    <img src={branding.logoDataUrl} alt="Logo" style={{ maxHeight: 52, maxWidth: 160, objectFit: 'contain' }} />
                  </div>
                )}
                <div style={{ fontSize: 20, fontWeight: 800, color: branding.accentColor || '#1e3a8a', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
                  {store.name}
                </div>
                {store.tagline && (
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {store.tagline}
                  </div>
                )}
                <div style={{ fontSize: 11, color: '#4b5563', marginTop: 4, lineHeight: 1.4 }}>
                  {fullAddress} {store.phone && <span>&bull; Tel: {store.phone} </span>} {store.email && <span>&bull; {store.email}</span>}<br />
                  {store.gstin && <span><strong>GSTIN:</strong> {store.gstin} &nbsp;|&nbsp; </span>}
                  {store.pan && <span><strong>PAN:</strong> {store.pan}</span>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 10, paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'inline-block', background: '#eff6ff', border: `1.5px solid ${branding.accentColor || '#2563eb'}`, color: branding.accentColor || '#1d4ed8', fontSize: 12, fontWeight: 800, padding: '4px 10px', borderRadius: 5, textTransform: 'uppercase' }}>
                    {branding.invoiceTitle || 'TAX INVOICE / BILL'}
                  </div>
                  <div style={{ fontSize: 11.5, textAlign: 'right' }}>
                    <span><strong>Invoice #:</strong> <span style={{ fontFamily: 'monospace', color: branding.accentColor || '#1e3a8a', fontWeight: 700 }}>{sale.saleNumber}</span></span>
                    <span style={{ marginLeft: 12 }}><strong>Date:</strong> {fmtDate(sale.saleDate)}</span>
                  </div>
                </div>
              </div>
            ) : branding.headerLayout === 'logo-right' ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `2px solid ${branding.accentColor || '#2563eb'}`, paddingBottom: 14, marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: branding.accentColor || '#1e3a8a', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
                    {store.name}
                  </div>
                  {store.tagline && (
                    <div style={{ fontSize: 10.5, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {store.tagline}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: '#4b5563', marginTop: 4, lineHeight: 1.4 }}>
                    {fullAddress}<br />
                    {store.phone && <span><strong>Tel:</strong> {store.phone} &nbsp;|&nbsp; </span>}
                    {store.email && <span><strong>Email:</strong> {store.email}</span>}<br />
                    {store.gstin && <span><strong>GSTIN:</strong> {store.gstin} &nbsp;|&nbsp; </span>}
                    {store.pan && <span><strong>PAN:</strong> {store.pan}</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {branding.logoDataUrl && branding.headerLayout !== 'text-only' && (
                    <div style={{ marginBottom: 6 }}>
                      <img src={branding.logoDataUrl} alt="Logo" style={{ maxHeight: 50, maxWidth: 150, objectFit: 'contain' }} />
                    </div>
                  )}
                  <div style={{ display: 'inline-block', background: '#eff6ff', border: `1.5px solid ${branding.accentColor || '#2563eb'}`, color: branding.accentColor || '#1d4ed8', fontSize: 12, fontWeight: 800, padding: '4px 10px', borderRadius: 5, textTransform: 'uppercase' }}>
                    {branding.invoiceTitle || 'TAX INVOICE / BILL'}
                  </div>
                  <div style={{ fontSize: 9.5, color: '#6b7280', textTransform: 'uppercase', marginTop: 2 }}>Original for Recipient</div>
                  <div style={{ marginTop: 6, fontSize: 11.5 }}>
                    <div><strong>Invoice #:</strong> <span style={{ fontFamily: 'monospace', color: branding.accentColor || '#1e3a8a', fontWeight: 700 }}>{sale.saleNumber}</span></div>
                    <div><strong>Date:</strong> {fmtDate(sale.saleDate)}</div>
                    <div><strong>Billed By:</strong> {cashierName}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `2px solid ${branding.accentColor || '#2563eb'}`, paddingBottom: 14, marginBottom: 14 }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  {branding.logoDataUrl && branding.headerLayout !== 'text-only' && (
                    <div>
                      <img src={branding.logoDataUrl} alt="Logo" style={{ maxHeight: 52, maxWidth: 150, objectFit: 'contain', marginTop: 2 }} />
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: branding.accentColor || '#1e3a8a', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
                      {store.name}
                    </div>
                    {store.tagline && (
                      <div style={{ fontSize: 10.5, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {store.tagline}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: '#4b5563', marginTop: 4, lineHeight: 1.4 }}>
                      {fullAddress}<br />
                      {store.phone && <span><strong>Tel:</strong> {store.phone} &nbsp;|&nbsp; </span>}
                      {store.email && <span><strong>Email:</strong> {store.email}</span>}<br />
                      {store.gstin && <span><strong>GSTIN:</strong> {store.gstin} &nbsp;|&nbsp; </span>}
                      {store.pan && <span><strong>PAN:</strong> {store.pan}</span>}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ display: 'inline-block', background: '#eff6ff', border: `1.5px solid ${branding.accentColor || '#2563eb'}`, color: branding.accentColor || '#1d4ed8', fontSize: 12, fontWeight: 800, padding: '4px 10px', borderRadius: 5, textTransform: 'uppercase' }}>
                    {branding.invoiceTitle || 'TAX INVOICE / BILL'}
                  </div>
                  <div style={{ fontSize: 9.5, color: '#6b7280', textTransform: 'uppercase', marginTop: 2 }}>
                    Original for Recipient
                  </div>
                  <div style={{ marginTop: 8, fontSize: 11.5 }}>
                    <div><strong>Invoice #:</strong> <span style={{ fontFamily: 'monospace', color: branding.accentColor || '#1e3a8a', fontWeight: 700 }}>{sale.saleNumber}</span></div>
                    <div><strong>Date:</strong> {fmtDate(sale.saleDate)}</div>
                    <div><strong>Billed By:</strong> {cashierName}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Buyer & Payment Meta Box */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid #e5e7eb', borderRadius: 6, marginBottom: 16, overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', background: '#f9fafb', borderRight: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4 }}>Bill To / Buyer:</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{sale.customerName || 'Walk-in Customer'}</div>
                {customerData?.phone && <div style={{ fontSize: 11, color: '#4b5563', marginTop: 2 }}>Phone: {customerData.phone}</div>}
                {customerData?.address && <div style={{ fontSize: 11, color: '#4b5563' }}>Address: {customerData.address}</div>}
                {customerData?.gstin && <div style={{ fontSize: 11, color: '#4b5563' }}>GSTIN: {customerData.gstin}</div>}
              </div>

              <div style={{ padding: '10px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4 }}>Payment Details:</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ color: '#6b7280' }}>Payment Mode:</span>
                  <strong>${paymentMethod}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ color: '#6b7280' }}>Payment Status:</span>
                  <span style={{ color: sale.paymentStatus === 'PAID' ? '#15803d' : '#b45309', fontWeight: 700, fontSize: 11 }}>
                    {sale.paymentStatus === 'PAID' ? 'PAID IN FULL' : sale.paymentStatus}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Place of Supply:</span>
                  <span>{store.state || 'Local State'}</span>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
              <thead>
                <tr style={{ background: '#f8fafc', border: '1px solid #d1d5db' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'center', width: 34, fontSize: 11, border: '1px solid #d1d5db' }}>#</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, border: '1px solid #d1d5db' }}>Item Description</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', width: 60, fontSize: 11, border: '1px solid #d1d5db' }}>Qty</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', width: 90, fontSize: 11, border: '1px solid #d1d5db' }}>Rate</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', width: 100, fontSize: 11, border: '1px solid #d1d5db' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {(sale.items || []).map((it, idx) => (
                  <tr key={idx} style={{ background: idx % 2 === 1 ? '#fbfcfe' : '#ffffff' }}>
                    <td style={{ padding: '8px 10px', textAlign: 'center', border: '1px solid #e5e7eb', color: '#6b7280' }}>{idx + 1}</td>
                    <td style={{ padding: '8px 10px', border: '1px solid #e5e7eb' }}>
                      <div style={{ fontWeight: 600, color: '#111827' }}>{it.productName}</div>
                      {it.productId && <div style={{ fontSize: 10, color: '#6b7280', fontFamily: 'monospace' }}>SKU: #{it.productId}</div>}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, border: '1px solid #e5e7eb' }}>{it.quantity}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', border: '1px solid #e5e7eb' }}>{fmtCurrency(it.unitPrice)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', border: '1px solid #e5e7eb' }}>
                      {fmtCurrency(Number(it.quantity) * Number(it.unitPrice))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Calculations, Totals & UPI Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 12px', marginBottom: 10 }}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Amount in Words:</div>
                  <div style={{ fontWeight: 600, color: '#111827', marginTop: 2, fontSize: 11.5 }}>{amountInWords(grandTotal)}</div>
                </div>

                {/* Scan & Pay UPI Interactive Card */}
                {branding.showQrOnA4 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', background: '#faf5ff', marginBottom: 10 }}>
                    <div style={{ background: '#fff', padding: 4, borderRadius: 6, border: '1px solid #d8b4fe' }}>
                      <QRCodeCanvas value={upiString} size={78} level="M" />
                    </div>
                    <div>
                      <div style={{ fontSize: 10.5, fontWeight: 800, color: '#6b21a8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Scan & Pay via UPI
                      </div>
                      <div style={{ fontSize: 10, color: '#4b5563', marginTop: 2 }}>
                        GPay, PhonePe, Paytm, BHIM, CRED
                      </div>
                      <div style={{ fontSize: 10.5, fontFamily: 'monospace', fontWeight: 700, color: '#1e1b4b', marginTop: 3 }}>
                        {upiId}
                      </div>
                      <div style={{ fontSize: 10.5, color: '#7e22ce', fontWeight: 700, marginTop: 2 }}>
                        Amount: {fmtCurrency(upiPayAmount)}
                      </div>
                    </div>
                  </div>
                )}

                {(branding.termsAndConditions || store.terms) && branding.showTermsOnA4 && (
                  <div style={{ fontSize: 9.5, color: '#64748b', lineHeight: 1.4, whiteSpace: 'pre-line' }}>
                    <strong>Terms & Conditions:</strong><br />
                    {branding.termsAndConditions || store.terms}
                  </div>
                )}
              </div>

              <div>
                <div style={{ border: '1px solid #d1d5db', borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', borderBottom: '1px solid #f1f5f9' }}>
                    <span>Subtotal:</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{fmtCurrency(grandTotal)}</span>
                  </div>
                  {store.gstin && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', borderBottom: '1px solid #f1f5f9', color: '#6b7280' }}>
                      <span>GST:</span>
                      <span style={{ fontFamily: 'monospace' }}>Included</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 10px', background: branding.accentColor || '#1e3a8a', color: '#fff', fontWeight: 800, fontSize: 13.5 }}>
                    <span>Grand Total:</span>
                    <span style={{ fontFamily: 'monospace' }}>{fmtCurrency(grandTotal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', borderBottom: '1px solid #f1f5f9' }}>
                    <span>Amount Paid:</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#15803d' }}>{fmtCurrency(amountPaid)}</span>
                  </div>
                  {balanceDue > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#fffbeb', color: '#b45309', fontWeight: 700 }}>
                      <span>Balance Due:</span>
                      <span style={{ fontFamily: 'monospace' }}>{fmtCurrency(balanceDue)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Signatures */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid #e5e7eb', paddingTop: 14, marginTop: 20 }}>
              <div style={{ fontSize: 10, color: '#6b7280' }}>
                <div style={{ fontWeight: 600 }}>${branding.footerMessage || 'Thank you for your business!'}</div>
                {branding.footerNote && <div style={{ fontSize: 9.5, color: '#9ca3af', marginTop: 2 }}>${branding.footerNote}</div>}
                <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 2 }}>Computer generated tax invoice.</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: '#4b5563', marginBottom: 28 }}>For {store.name}</div>
                <div style={{ width: 140, borderTop: '1px solid #4b5563', marginLeft: 'auto', marginBottom: 3 }} />
                <div style={{ fontSize: 10, color: '#4b5563', fontWeight: 600 }}>Authorized Signatory</div>
              </div>
            </div>
          </div>
        ) : (
          /* Thermal POS Slip Interactive Preview */
          <div
            style={{
              background: '#ffffff',
              color: '#111827',
              maxWidth: 320,
              margin: '0 auto',
              padding: '16px 14px',
              borderRadius: 6,
              boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
              fontFamily: 'Courier New, Courier, monospace',
              fontSize: 11,
              lineHeight: 1.35,
            }}
          >
            <div style={{ textAlign: 'center' }}>
              {branding.logoDataUrl && branding.showLogoOnThermal && (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
                  <img src={branding.logoDataUrl} alt="Logo" style={{ maxHeight: 42, maxWidth: 130, objectFit: 'contain' }} />
                </div>
              )}
              <div style={{ fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase', color: branding.accentColor || '#111827' }}>{store.name}</div>
              {store.tagline && <div style={{ fontSize: 9.5 }}>{store.tagline}</div>}
              <div style={{ fontSize: 9.5 }}>{fullAddress}</div>
              {store.phone && <div style={{ fontSize: 9.5 }}>Phone: {store.phone}</div>}
              {store.gstin && <div style={{ fontSize: 9.5 }}>GSTIN: {store.gstin}</div>}
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5 }}>
              <span>Receipt #:</span>
              <strong>{sale.saleNumber}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5 }}>
              <span>Date:</span>
              <span>{fmtDate(sale.saleDate)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5 }}>
              <span>Customer:</span>
              <span>{sale.customerName || 'Walk-in'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5 }}>
              <span>Cashier:</span>
              <span>{cashierName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5 }}>
              <span>Pay Mode:</span>
              <span>{paymentMethod}</span>
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', fontSize: 10, fontWeight: 'bold', borderBottom: '1px dashed #000', paddingBottom: 3 }}>
              <span>Item</span>
              <span style={{ textAlign: 'center' }}>Qty</span>
              <span style={{ textAlign: 'right' }}>Amt</span>
            </div>

            {(sale.items || []).map((it, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', fontSize: 10, padding: '3px 0' }}>
                <div>
                  <div>{it.productName}</div>
                  <div style={{ fontSize: 8.5, color: '#555' }}>@{fmtCurrency(it.unitPrice)}</div>
                </div>
                <div style={{ textAlign: 'center' }}>{it.quantity}</div>
                <div style={{ textAlign: 'right', fontWeight: 'bold' }}>{fmtCurrency(Number(it.quantity) * Number(it.unitPrice))}</div>
              </div>
            ))}

            <div style={{ borderTop: '2px dashed #000', margin: '8px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 'bold' }}>
              <span>TOTAL:</span>
              <span>{fmtCurrency(grandTotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, marginTop: 2 }}>
              <span>Paid:</span>
              <span>{fmtCurrency(amountPaid)}</span>
            </div>
            {balanceDue > 0 ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, fontWeight: 'bold', color: '#b45309', marginTop: 2 }}>
                <span>Balance Due:</span>
                <span>{fmtCurrency(balanceDue)}</span>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, fontWeight: 'bold', marginTop: 2 }}>
                <span>Status:</span>
                <span>PAID IN FULL</span>
              </div>
            )}

            {/* UPI QR in Thermal Slip */}
            {branding.showQrOnThermal && (
              <>
                <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />
                <div style={{ textAlign: 'center', margin: '6px 0' }}>
                  <div style={{ fontSize: 9.5, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 }}>
                    SCAN & PAY VIA UPI
                  </div>
                  <div style={{ display: 'inline-block', background: '#fff', padding: 4, border: '1px solid #ccc' }}>
                    <QRCodeCanvas value={upiString} size={90} level="M" />
                  </div>
                  <div style={{ fontSize: 8.5, fontFamily: 'monospace', marginTop: 3 }}>
                    UPI: {upiId}
                  </div>
                </div>
              </>
            )}

            <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

            <div style={{ textAlign: 'center', fontSize: 9.5, marginTop: 6 }}>
              <div style={{ fontWeight: 'bold' }}>{branding.footerMessage || '*** Thank You for Shopping! ***'}</div>
              {branding.footerNote && <div style={{ fontSize: 8.5, marginTop: 2 }}>{branding.footerNote}</div>}
              <div style={{ fontSize: 8.5, marginTop: 2 }}>Computer Generated Bill</div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="btn btn-sm"
            style={{ background: '#16a34a', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: 5 }}
            onClick={() => setShowWhatsApp(true)}
          >
            <i className="ti ti-brand-whatsapp" style={{ fontSize: 15 }} /> WhatsApp
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleOpenNewTab}>
            <i className="ti ti-external-link" /> Full Screen / Save PDF
          </button>
          <button type="button" className="btn btn-primary" onClick={handlePrint}>
            <i className="ti ti-printer" /> Print Bill Now
          </button>
        </div>
      </div>
    </Modal>
  );
}
