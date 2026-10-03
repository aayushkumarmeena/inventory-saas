import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { salesApi } from '../../api/salesApi';
import { productApi } from '../../api/productApi';
import { customerApi } from '../../api/customerApi';
import { fmtCurrency, fmtDate, downloadBlob } from '../../utils/formatters';
import { decodeProductQr } from '../../utils/qr';
import { posAudio } from '../../utils/audio';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import SaleDetail from './SaleDetail';
import Receipt from './Receipt';
import EmptyState from '../../components/EmptyState';
import ConfirmDialog from '../../components/ConfirmDialog';
import { offlineDB } from '../../utils/offlineDB';
import { notifyOfflineSyncListeners } from '../../hooks/useOfflineStatus';

function statusBadge(s) {
  const map = {
    PAID: 'badge-success',
    PARTIAL: 'badge-warning',
    PENDING: 'badge-warning',
    OVERDUE: 'badge-danger',
    CANCELLED: 'badge-neutral',
  };
  return <span className={`badge ${map[s] || 'badge-neutral'}`}>{s || 'UNKNOWN'}</span>;
}

function ReturnModal({ sale, onClose, onSaved }) {
  const [reason, setReason] = useState('');
  const [selected, setSelected] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const lines = (sale?.items || []).filter((i) => Number(selected[i.id] || 0) > 0);

  const setQty = (id, max, val) => {
    const n = Math.max(0, Math.min(Number(max), Number(val)));
    setSelected((p) => ({ ...p, [id]: n }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (lines.length === 0) {
      setError('Enter a quantity to return for at least one item');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await salesApi.createReturn(sale.id, {
        reason: reason || null,
        items: lines.map((i) => ({ saleItemId: i.id, quantity: Number(selected[i.id]) })),
      });
      toast.success('Return recorded, product stock restored');
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || (err.request ? 'Could not reach the server.' : 'Something went wrong'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Return items · ${sale.saleNumber}`} onClose={onClose} maxWidth={540}>
      {error && <div className="banner banner-error"><i className="ti ti-alert-circle" /><span>{error}</span></div>}
      <form onSubmit={submit}>
        <div style={{ marginBottom: 14 }}>
          <label className="field-label">Reason for return (optional)</label>
          <input className="field-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Damaged, wrong item, customer exchange" />
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>
            Select items & quantity to return
          </div>
          {(sale.items || []).map((item) => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.productName}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Sold: {item.quantity} · {fmtCurrency(item.unitPrice)} each</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="number"
                  min="0"
                  max={item.quantity}
                  value={selected[item.id] || ''}
                  onChange={(e) => setQty(item.id, item.quantity, e.target.value)}
                  placeholder="0"
                  style={{ width: 68, textAlign: 'center', padding: '4px 6px', fontSize: 13 }}
                  className="field-input"
                />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>/ {item.quantity}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving || lines.length === 0}>
            {saving && <span className="spinner" />}
            {saving ? 'Processing…' : `Return ${lines.length} item(s)`}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function RecordPaymentModal({ sale, onClose, onSaved }) {
  const [amount, setAmount] = useState(sale.balanceDue || '');
  const [method, setMethod] = useState('CASH');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  const submit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setError('Enter a valid payment amount');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await salesApi.recordPayment(sale.id, {
        amount: Number(amount),
        method,
        notes: notes || null,
      });
      toast.success('Payment recorded successfully');
      posAudio.playSuccessChime();
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || (err.request ? 'Could not reach the server.' : 'Something went wrong'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Record payment · ${sale.saleNumber}`} onClose={onClose} maxWidth={400}>
      {error && <div className="banner banner-error"><i className="ti ti-alert-circle" /><span>{error}</span></div>}
      <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 14 }}>
        Balance due: <strong style={{ color: 'var(--text-primary)' }}>{fmtCurrency(sale.balanceDue)}</strong> of {fmtCurrency(sale.totalAmount)}
      </div>
      <form onSubmit={submit}>
        <div className="field-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label className="field-label">Amount</label>
            <input className="field-input" type="number" step="0.01" min="0.01" max={sale.balanceDue} value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div>
            <label className="field-label">Method</label>
            <select className="field-input" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="CASH">Cash</option>
              <option value="CARD">Card (POS / Swipe)</option>
              <option value="UPI">UPI / QR Code</option>
              <option value="BANK_TRANSFER">Bank transfer / NEFT</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 4 }}>
          <label className="field-label">Notes (optional)</label>
          <input className="field-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Transaction ref, UPI ID, Cheque no." />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving && <span className="spinner" />}
            {saving ? 'Recording…' : 'Record payment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Full-Speed POS Counter Modal with Barcode Scanning, Audio Feedback, and Cash Calculator
function NewSaleModal({ onClose, onSaved }) {
  const [products, setProducts] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [knownCustomers, setKnownCustomers] = useState([]);
  const [lines, setLines] = useState([{ productId: '', quantity: 1 }]);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [cashReceived, setCashReceived] = useState('');
  const [discountType, setDiscountType] = useState('FLAT'); // 'FLAT' | 'PERCENT'
  const [discountVal, setDiscountVal] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(posAudio.enabled);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queuedOffline, setQueuedOffline] = useState(false); // flag: last sale was queued

  const barcodeInputRef = useRef(null);
  const scannerInstanceRef = useRef(null);
  const toast = useToast();

  // Track online/offline inside modal
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    // Try live API first, fall back to IndexedDB cache if offline
    productApi
      .list({ page: 0, size: 300 })
      .then(async (r) => {
        const fetched = r.data.data.content || [];
        setProducts(fetched);
        // Cache for offline use
        try {
          await offlineDB.cacheProducts(fetched);
          await offlineDB.markProductCacheTime();
        } catch {}
      })
      .catch(async () => {
        // Offline fallback — load from IndexedDB
        try {
          const cached = await offlineDB.getCachedProducts();
          const real = (cached || []).filter((p) => p.id !== '__meta__');
          if (real.length > 0) {
            setProducts(real);
            toast.warning('Offline mode — using cached product catalog', 4000);
          }
        } catch {}
      })
      .finally(() => setLoadingProducts(false));
    customerApi.list({ page: 0, size: 200 }).then((r) => setKnownCustomers(r.data.data.content || [])).catch(() => {});
  }, []);

  // Auto-focus barcode input for rapid scanning
  useEffect(() => {
    if (!loadingProducts) {
      setTimeout(() => barcodeInputRef.current?.focus(), 150);
    }
  }, [loadingProducts]);

  // Keyboard shortcut listener inside the POS modal (Ctrl+Enter to finish, F2 to focus barcode)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        submitForm();
      } else if (e.key === 'F2') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lines, customerName, paymentMethod, discountVal, discountType]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    posAudio.setEnabled(next);
  };

  const productById = (id) => products.find((p) => String(p.id) === String(id));

  const subtotal = lines.reduce((sum, l) => {
    const p = productById(l.productId);
    return sum + (p ? Number(p.price) * Number(l.quantity || 0) : 0);
  }, 0);

  const discountAmount = useMemo(() => {
    const val = Number(discountVal || 0);
    if (val <= 0) return 0;
    if (discountType === 'PERCENT') {
      return (subtotal * Math.min(val, 100)) / 100;
    }
    return Math.min(val, subtotal);
  }, [subtotal, discountVal, discountType]);

  const netPayable = Math.max(0, subtotal - discountAmount);
  const changeToReturn = Number(cashReceived || 0) - netPayable;

  const updateLine = (i, key, val) => setLines((p) => p.map((l, idx) => (idx === i ? { ...l, [key]: val } : l)));
  const addLine = () => setLines((p) => [...p, { productId: '', quantity: 1 }]);
  const removeLine = (i) => setLines((p) => p.filter((_, idx) => idx !== i));

  // Add or increment item with POS laser audio feedback
  const addItemToSale = (product, qty = 1) => {
    if (!product) return;
    if (product.stockQuantity <= 0) {
      posAudio.playErrorBuzz();
      toast.warning(`${product.name} is OUT OF STOCK!`);
      return;
    }
    posAudio.playScanBeep();

    setLines((prev) => {
      const existingIdx = prev.findIndex((l) => String(l.productId) === String(product.id));
      if (existingIdx >= 0) {
        const newLines = [...prev];
        const currentQty = Number(newLines[existingIdx].quantity || 0);
        const maxStock = product.stockQuantity;
        if (currentQty + qty > maxStock) {
          posAudio.playErrorBuzz();
          toast.warning(`Cannot exceed available stock of ${maxStock} units`);
          return prev;
        }
        newLines[existingIdx] = { ...newLines[existingIdx], quantity: currentQty + qty };
        return newLines;
      } else {
        if (prev.length === 1 && !prev[0].productId) {
          return [{ productId: product.id, quantity: qty }];
        }
        return [...prev, { productId: product.id, quantity: qty }];
      }
    });

    toast.success(`+ ${product.name}`, 1200);
    setTimeout(() => barcodeInputRef.current?.focus(), 50);
  };

  // Instant barcode search (supports both USB hardware scanner hits and keyboard typing)
  const handleBarcodeSubmit = (e) => {
    e?.preventDefault();
    const query = barcodeInput.trim();
    if (!query) return;

    // 1. Instant local lookup across products in cache
    const match = products.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === query.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase() === query.toLowerCase()) ||
        (p.name && p.name.toLowerCase() === query.toLowerCase())
    );

    if (match) {
      addItemToSale(match, 1);
      setBarcodeInput('');
      return;
    }

    // 2. Fallback server-side lookup
    productApi.lookupByBarcode(query)
      .then((r) => {
        if (r.data?.data) {
          addItemToSale(r.data.data, 1);
          setBarcodeInput('');
        }
      })
      .catch(() => {
        productApi.lookupBySku(query)
          .then((r2) => {
            if (r2.data?.data) {
              addItemToSale(r2.data.data, 1);
              setBarcodeInput('');
            } else {
              posAudio.playErrorBuzz();
              toast.error(`Item not found for: "${query}"`);
            }
          })
          .catch(() => {
            posAudio.playErrorBuzz();
            toast.error(`Item not found for: "${query}"`);
          });
      });
  };

  // Camera Barcode Scanner using html5-qrcode
  useEffect(() => {
    if (!showCameraScanner) {
      if (scannerInstanceRef.current) {
        scannerInstanceRef.current.clear().catch(() => {});
        scannerInstanceRef.current = null;
      }
      return;
    }

    let isSubscribed = true;
    import('html5-qrcode').then(({ Html5QrcodeScanner, Html5QrcodeSupportedFormats }) => {
      if (!isSubscribed) return;
      const scanner = new Html5QrcodeScanner(
        'pos-camera-reader',
        {
          fps: 10,
          qrbox: 240,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
          ],
        },
        false
      );

      scanner.render((decodedText) => {
        const sku = decodeProductQr(decodedText);
        const codeToFind = sku || decodedText.trim();
        const p = products.find(
          (prod) =>
            (prod.sku && prod.sku.toLowerCase() === codeToFind.toLowerCase()) ||
            (prod.barcode && prod.barcode.toLowerCase() === codeToFind.toLowerCase())
        );

        if (p) {
          addItemToSale(p, 1);
        } else {
          productApi.lookupByBarcode(codeToFind)
            .then((r) => r.data?.data && addItemToSale(r.data.data, 1))
            .catch(() => {
              productApi.lookupBySku(codeToFind)
                .then((r2) => r2.data?.data && addItemToSale(r2.data.data, 1))
                .catch(() => posAudio.playErrorBuzz());
            });
        }
      }, () => {});

      scannerInstanceRef.current = scanner;
    }).catch(() => {});

    return () => {
      isSubscribed = false;
      scannerInstanceRef.current?.clear?.().catch(() => {});
    };
  }, [showCameraScanner, products]);

  const submitForm = async () => {
    const validLines = lines.filter((l) => l.productId && Number(l.quantity) > 0);
    if (validLines.length === 0) {
      setError('Add at least one product line to complete sale');
      posAudio.playErrorBuzz();
      return;
    }
    setSaving(true);
    setError('');
    setQueuedOffline(false);

    const payload = {
      customerName: customerName || null,
      paymentMethod: paymentMethod,
      items: validLines.map((l) => ({ productId: Number(l.productId), quantity: Number(l.quantity) })),
    };

    // If offline, queue immediately without even trying the API
    if (!navigator.onLine) {
      try {
        await offlineDB.queueSale(payload);
        notifyOfflineSyncListeners();
        posAudio.playSuccessChime();
        setQueuedOffline(true);
        // Build a fake sale object for the receipt preview so the counter isn't disrupted
        const fakeId = `OFFLINE-${Date.now()}`;
        const fakeSale = {
          id: fakeId,
          saleNumber: fakeId,
          saleDate: new Date().toISOString(),
          customerName: payload.customerName,
          paymentMethod: payload.paymentMethod,
          paymentStatus: 'PENDING',
          items: validLines.map((l) => {
            const prod = products.find((p) => String(p.id) === String(l.productId));
            return { productName: prod?.name || `#${l.productId}`, quantity: l.quantity, unitPrice: prod?.price || 0 };
          }),
          _offline: true,
        };
        toast.success('📴 Offline — sale queued, will sync when back online', 5000);
        onSaved(fakeSale);
      } catch (e) {
        posAudio.playErrorBuzz();
        setError('Failed to queue sale offline. Please retry.');
      } finally {
        setSaving(false);
      }
      return;
    }

    // Online path — try API, fall back to queue on network error
    try {
      const resp = await salesApi.create(payload);
      posAudio.playSuccessChime();
      toast.success('Sale completed successfully');
      onSaved(resp?.data?.data);
    } catch (err) {
      // If it's a network error (no response), queue offline automatically
      if (!err.response && err.request) {
        try {
          await offlineDB.queueSale(payload);
          notifyOfflineSyncListeners();
          posAudio.playSuccessChime();
          setQueuedOffline(true);
          const fakeId = `OFFLINE-${Date.now()}`;
          const fakeSale = {
            id: fakeId,
            saleNumber: fakeId,
            saleDate: new Date().toISOString(),
            customerName: payload.customerName,
            paymentMethod: payload.paymentMethod,
            paymentStatus: 'PENDING',
            items: validLines.map((l) => {
              const prod = products.find((p) => String(p.id) === String(l.productId));
              return { productName: prod?.name || `#${l.productId}`, quantity: l.quantity, unitPrice: prod?.price || 0 };
            }),
            _offline: true,
          };
          toast.success('📴 Server unreachable — sale queued, will auto-sync when online', 5000);
          onSaved(fakeSale);
        } catch {
          posAudio.playErrorBuzz();
          setError('Could not reach server and offline queue failed. Check your connection.');
        }
      } else {
        posAudio.playErrorBuzz();
        setError(err.response?.data?.message || 'Something went wrong');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Fast POS Checkout · New Sale" onClose={onClose} maxWidth={680}>
      {/* Modal Toolbar: Sound & Shortcuts */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            <kbd>F2</kbd> Scan Item &nbsp;|&nbsp; <kbd>Ctrl+Enter</kbd> Complete Bill
          </span>
          {/* Offline mode badge */}
          {!isOnline && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.4)',
              color: '#ca8a04', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700,
            }}>
              <i className="ti ti-wifi-off" style={{ fontSize: 12 }} />
              OFFLINE MODE · Sales will auto-sync
            </span>
          )}
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={toggleSound}
          title={soundEnabled ? 'Mute POS Beep' : 'Enable POS Beep'}
          style={{ fontSize: 11.5 }}
        >
          <i className={`ti ${soundEnabled ? 'ti-volume' : 'ti-volume-off'}`} style={{ color: soundEnabled ? '#10b981' : '#9ca3af' }} />
          <span>{soundEnabled ? 'Sound ON' : 'Muted'}</span>
        </button>
      </div>

      {error && <div className="banner banner-error"><i className="ti ti-alert-circle" /><span>{error}</span></div>}


      {loadingProducts ? (
        <div className="empty-state" style={{ padding: '30px 0' }}>
          <div className="skeleton-bar" style={{ width: 160, height: 16, margin: '0 auto' }} />
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon="ti-package-off"
          title="No products in catalog"
          description="Add products to your catalog first before recording a sale."
          compact
        />
      ) : (
        <div>
          {/* Quick Barcode Scanner Bar */}
          <form onSubmit={handleBarcodeSubmit} className="pos-scan-box" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <i className="ti ti-barcode" style={{ fontSize: 22, color: 'var(--brand)' }} />
            <input
              ref={barcodeInputRef}
              type="text"
              className="field-input"
              style={{ flex: 1, height: 38, fontSize: 13, background: 'transparent', border: 'none', outline: 'none' }}
              placeholder="Scan barcode or type SKU / Name and press Enter (or F2)..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-sm" style={{ padding: '6px 14px' }}>
              Add
            </button>
            <button
              type="button"
              className={`btn btn-sm ${showCameraScanner ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setShowCameraScanner(!showCameraScanner)}
              title="Toggle Webcam / Phone Camera Barcode Scanner"
            >
              <i className="ti ti-camera" /> {showCameraScanner ? 'Close Cam' : 'Camera'}
            </button>
          </form>

          {/* Camera Scanner Viewport */}
          {showCameraScanner && (
            <div style={{ background: '#000', borderRadius: 8, padding: 8, marginBottom: 14 }}>
              <div id="pos-camera-reader" style={{ width: '100%' }} />
            </div>
          )}

          {/* Customer & Payment Mode */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12, marginBottom: 14 }} className="field-grid">
            <div>
              <label className="field-label">Customer (optional)</label>
              <input
                className="field-input"
                list="pos-known-customers"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Walk-in Customer"
              />
              <datalist id="pos-known-customers">
                {knownCustomers.map((c) => <option key={c.id} value={c.name} />)}
              </datalist>
            </div>
            <div>
              <label className="field-label">Payment Mode</label>
              <select className="field-input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="CASH">Cash</option>
                <option value="UPI">UPI / QR Code</option>
                <option value="CARD">Card / POS Terminal</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
              </select>
            </div>
          </div>

          {/* Itemized Sale Lines */}
          <label className="field-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Sale Items ({lines.filter((l) => l.productId).length})</span>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Click + Add line or scan items</span>
          </label>

          <div style={{ maxHeight: '28vh', overflowY: 'auto', paddingRight: 4, marginBottom: 8 }}>
            {lines.map((line, i) => {
              const p = productById(line.productId);
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 32px', gap: 8, marginBottom: 8, alignItems: 'center' }} className="item-row-grid">
                  <select className="field-input" value={line.productId} onChange={(e) => updateLine(i, 'productId', e.target.value)}>
                    <option value="">Select product…</option>
                    {products.map((prod) => (
                      <option key={prod.id} value={prod.id} disabled={prod.stockQuantity <= 0}>
                        {prod.name} · {fmtCurrency(prod.price)} {prod.stockQuantity <= 0 ? '(Out of stock)' : `(${prod.stockQuantity} in stock)`}
                      </option>
                    ))}
                  </select>
                  <input
                    className="field-input"
                    type="number"
                    min="1"
                    max={p?.stockQuantity || undefined}
                    value={line.quantity}
                    onChange={(e) => updateLine(i, 'quantity', e.target.value)}
                  />
                  <button type="button" className="btn btn-ghost btn-icon" onClick={() => removeLine(i)} disabled={lines.length === 1} aria-label="Remove line">
                    <i className="ti ti-trash" style={{ fontSize: 14 }} />
                  </button>
                </div>
              );
            })}
          </div>

          <button type="button" className="btn btn-secondary btn-sm" onClick={addLine} style={{ marginBottom: 14 }}>
            <i className="ti ti-plus" /> Add line
          </button>

          {/* Order Discount Section */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--glass-bg)', borderRadius: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>
              Order Discount:
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <div style={{ display: 'flex', background: 'var(--glass-bg-strong)', borderRadius: 6, padding: 2 }}>
                <button
                  type="button"
                  className={`btn btn-sm ${discountType === 'FLAT' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ padding: '3px 8px', fontSize: 11 }}
                  onClick={() => setDiscountType('FLAT')}
                >
                  ₹ Flat
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${discountType === 'PERCENT' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ padding: '3px 8px', fontSize: 11 }}
                  onClick={() => setDiscountType('PERCENT')}
                >
                  % Off
                </button>
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                className="field-input"
                style={{ width: 85, textAlign: 'right', padding: '5px 8px', fontSize: 12.5 }}
                value={discountVal}
                onChange={(e) => setDiscountVal(e.target.value)}
              />
            </div>
          </div>

          {/* Totals & Calculations */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginBottom: 10 }}>
            {discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 4 }}>
                <span>Subtotal:</span>
                <span>{fmtCurrency(subtotal)}</span>
              </div>
            )}
            {discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#10b981', marginBottom: 4 }}>
                <span>Discount applied:</span>
                <span>- {fmtCurrency(discountAmount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Total Payable</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--brand)', fontFamily: 'var(--font-display)' }}>
                {fmtCurrency(netPayable)}
              </span>
            </div>
          </div>

          {/* Cash Tendered & Change Return Calculator */}
          {paymentMethod === 'CASH' && (
            <div className="pos-cash-calculator">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label className="field-label" style={{ margin: 0, fontWeight: 700 }}>
                  <i className="ti ti-cash" /> Cash Received / Tendered
                </label>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: 11 }}
                  onClick={() => setCashReceived(String(Math.ceil(netPayable)))}
                >
                  Exact Cash
                </button>
              </div>

              <input
                type="number"
                min="0"
                step="1"
                className="field-input"
                style={{ fontSize: 16, fontWeight: 700, height: 42, marginBottom: 8 }}
                placeholder="Enter cash given by customer (₹)..."
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
              />

              {/* Quick Cash Presets */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {[50, 100, 200, 500, 2000].map((note) => (
                  <button
                    key={note}
                    type="button"
                    className="denom-chip"
                    onClick={() => {
                      const cur = Number(cashReceived || 0);
                      setCashReceived(String(cur + note));
                    }}
                  >
                    +₹{note}
                  </button>
                ))}
                <button
                  type="button"
                  className="denom-chip"
                  style={{ background: 'var(--glass-border)' }}
                  onClick={() => setCashReceived('')}
                >
                  Clear
                </button>
              </div>

              {/* Dynamic Return Calculation Card */}
              {cashReceived && (
                <div className={`change-return-badge ${changeToReturn >= 0 ? 'success' : 'warning'}`}>
                  <div>
                    <i className={`ti ${changeToReturn >= 0 ? 'ti-check' : 'ti-alert-circle'}`} style={{ marginRight: 6 }} />
                    {changeToReturn >= 0 ? 'Change to Return to Customer:' : 'Remaining Balance Due:'}
                  </div>
                  <div style={{ fontSize: 16, fontFamily: 'monospace', fontWeight: 800 }}>
                    {fmtCurrency(Math.abs(changeToReturn))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Modal Actions */}
          <div className="modal-actions" style={{ marginTop: 14 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={saving}
              onClick={submitForm}
              style={{ minWidth: 150 }}
            >
              {saving && <span className="spinner" />}
              {saving ? 'Recording…' : 'Complete Sale (Ctrl+↵)'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

const STATUSES = ['', 'PAID', 'PARTIAL', 'PENDING', 'OVERDUE', 'CANCELLED'];

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [showNew, setShowNew] = useState(false);
  const [filters, setFilters] = useState({ from: '', to: '', status: '', customer: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDetailSaleId, setSelectedDetailSaleId] = useState(null);
  const [receiptSale, setReceiptSale] = useState(null);
  const [paymentSale, setPaymentSale] = useState(null);
  const [returnSale, setReturnSale] = useState(null);
  const [cancelSaleItem, setCancelSaleItem] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [exporting, setExporting] = useState(false);
  const nav = useNavigate();
  const toast = useToast();
  const [loadError, setLoadError] = useState('');

  // Global POS Keyboard Shortcuts on the Sales screen
  useEffect(() => {
    const handleGlobalKeys = (e) => {
      // Don't trigger if user is typing in an input or textarea
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        setShowNew(true);
      } else if (e.key === 'F2') {
        e.preventDefault();
        setShowNew(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError('');
    salesApi
      .list({
        page,
        size: 20,
        from: filters.from || undefined,
        to: filters.to || undefined,
        status: filters.status || undefined,
        customer: filters.customer || undefined,
      })
      .then((r) => {
        setSales(r.data.data.content || []);
        setTotalPages(r.data.data.totalPages || 0);
      })
      .catch((err) => {
        setLoadError(err.response?.data?.message || (err.request ? 'Could not reach the server.' : 'Failed to load sales.'));
        setSales([]);
      })
      .finally(() => setLoading(false));
  }, [page, filters]);

  useEffect(() => {
    load();
  }, [load]);

  const onSaved = (createdSale) => {
    setShowNew(false);
    setPage(0);
    load();
    if (createdSale) {
      setReceiptSale(createdSale);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelSaleItem) return;
    setCancelling(true);
    try {
      await salesApi.cancel(cancelSaleItem.id);
      toast.success('Sale cancelled, product stock restored');
      setCancelSaleItem(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not cancel sale');
    } finally {
      setCancelling(false);
    }
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const totalPageRevenue = useMemo(() => {
    return sales
      .filter((s) => s.paymentStatus !== 'CANCELLED')
      .reduce((sum, s) => sum + Number(s.totalAmount || 0), 0);
  }, [sales]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const r = await salesApi.export({
        from: filters.from || undefined,
        to: filters.to || undefined,
        status: filters.status || undefined,
        customer: filters.customer || undefined,
      });
      downloadBlob(r.data, 'sales.csv');
      toast.success('Sales exported');
    } catch (err) {
      toast.error('Could not export sales');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales & POS Billing</h1>
          <p className="page-subtitle">Rapid retail checkout, barcode scanning, payments, GST invoices, and thermal receipts.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className={`btn btn-secondary ${activeFilterCount ? 'btn-primary' : ''}`} onClick={() => setShowFilters((s) => !s)}>
            <i className="ti ti-filter" /> Filters{activeFilterCount ? ` (${activeFilterCount})` : ''}
          </button>
          <button className="btn btn-secondary" onClick={exportCsv} disabled={exporting}>
            {exporting && <span className="spinner" />}
            <i className="ti ti-download" /> Export CSV
          </button>
          <button className="btn btn-primary" onClick={() => setShowNew(true)}>
            <i className="ti ti-plus" /> Fast New Sale (Ctrl+N)
          </button>
        </div>
      </div>

      {/* POS Shortcuts Bar */}
      <div className="pos-shortcuts-bar">
        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
          <i className="ti ti-bolt" style={{ color: '#f59e0b', marginRight: 4 }} /> POS Counter Shortcuts:
        </span>
        <span><kbd>Ctrl+N</kbd> New Sale</span>
        <span><kbd>F2</kbd> Barcode Scanner</span>
        <span><kbd>Ctrl+Enter</kbd> Finish & Print</span>
        <span><kbd>Esc</kbd> Close Dialog</span>
      </div>

      {/* Filter Bar */}
      {showFilters && (
        <div className="card card-pad" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16 }}>
          <div>
            <label className="field-label">From</label>
            <input className="field-input" type="date" value={filters.from} onChange={(e) => { setFilters((f) => ({ ...f, from: e.target.value })); setPage(0); }} />
          </div>
          <div>
            <label className="field-label">To</label>
            <input className="field-input" type="date" value={filters.to} onChange={(e) => { setFilters((f) => ({ ...f, to: e.target.value })); setPage(0); }} />
          </div>
          <div>
            <label className="field-label">Status</label>
            <select className="field-input" value={filters.status} onChange={(e) => { setFilters((f) => ({ ...f, status: e.target.value })); setPage(0); }}>
              {STATUSES.map((s) => <option key={s} value={s}>{s || 'Any'}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label className="field-label">Customer</label>
            <input className="field-input" value={filters.customer} onChange={(e) => { setFilters((f) => ({ ...f, customer: e.target.value })); setPage(0); }} placeholder="Search customer…" />
          </div>
          {activeFilterCount > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setFilters({ from: '', to: '', status: '', customer: '' }); setPage(0); }}>
              Clear
            </button>
          )}
        </div>
      )}

      {loadError && <div className="banner banner-error"><i className="ti ti-alert-circle" /><span>{loadError}</span></div>}

      {/* Sales Data Table */}
      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Sale #</th>
              <th>Date</th>
              <th>Customer</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(4)].map((_, i) => (
                <tr key={i} className="skeleton-row">
                  {[...Array(6)].map((__, j) => (
                    <td key={j}><div className="skeleton-bar" style={{ width: '60%' }} /></td>
                  ))}
                </tr>
              ))
            ) : sales.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    icon="ti-receipt-off"
                    title={activeFilterCount ? 'No sales match your filters' : 'No sales recorded yet'}
                    description={activeFilterCount ? 'Try widening or clearing your search filters.' : 'Record your first sale to start tracking revenue.'}
                    actionText={!activeFilterCount ? 'Record new sale' : undefined}
                    onAction={() => setShowNew(true)}
                  />
                </td>
              </tr>
            ) : (
              sales.map((s) => (
                <tr
                  key={s.id}
                  className="is-clickable"
                  style={{ opacity: s.paymentStatus === 'CANCELLED' ? 0.55 : 1 }}
                  onClick={() => setSelectedDetailSaleId(s.id)}
                >
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--brand)', fontWeight: 600 }}>
                    {s.saleNumber}
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{fmtDate(s.saleDate)}</td>
                  <td>{s.customerName || 'Walk-in Customer'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {fmtCurrency(s.totalAmount)}
                    {Number(s.balanceDue) > 0 && s.paymentStatus !== 'CANCELLED' && (
                      <div style={{ fontSize: 10.5, color: 'var(--danger-text)', fontWeight: 400 }}>{fmtCurrency(s.balanceDue)} due</div>
                    )}
                  </td>
                  <td>{statusBadge(s.paymentStatus)}</td>
                  <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon btn-sm"
                        title="Print Bill / Invoice"
                        onClick={() => setReceiptSale(s)}
                      >
                        <i className="ti ti-printer" style={{ fontSize: 13 }} />
                      </button>
                      {Number(s.balanceDue) > 0 && s.paymentStatus !== 'CANCELLED' && (
                        <button className="btn btn-secondary btn-sm" onClick={() => setPaymentSale(s)}>
                          <i className="ti ti-cash" /> Pay
                        </button>
                      )}
                      <button className="btn btn-secondary btn-sm" onClick={() => nav(`/gst/invoices/new?saleId=${s.id}`)}>
                        <i className="ti ti-file-invoice" /> GST
                      </button>
                      {s.paymentStatus !== 'CANCELLED' && (
                        <button className="btn btn-secondary btn-sm" onClick={() => setReturnSale(s)}>
                          <i className="ti ti-rotate" /> Return
                        </button>
                      )}
                      {s.paymentStatus !== 'CANCELLED' && (
                        <button className="btn btn-danger btn-sm" onClick={() => setCancelSaleItem(s)}>
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && sales.length > 0 && (
        <div className="pagination">
          <button className="btn btn-secondary btn-sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
            <i className="ti ti-chevron-left" /> Prev
          </button>
          <span>Page {page + 1} of {Math.max(1, totalPages)}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage((p) => p + 1)} disabled={page + 1 >= totalPages}>
            Next <i className="ti ti-chevron-right" />
          </button>
        </div>
      )}

      {/* Modals & Slide-over Drawer */}
      {showNew && <NewSaleModal onClose={() => setShowNew(false)} onSaved={onSaved} />}

      {selectedDetailSaleId && (
        <SaleDetail
          saleId={selectedDetailSaleId}
          onClose={() => setSelectedDetailSaleId(null)}
          onPrintReceipt={(s) => { setSelectedDetailSaleId(null); setReceiptSale(s); }}
          onRecordPayment={(s) => setPaymentSale(s)}
          onGenerateGstInvoice={(s) => nav(`/gst/invoices/new?saleId=${s.id}`)}
        />
      )}

      {receiptSale && (
        <Receipt
          sale={receiptSale}
          onClose={() => setReceiptSale(null)}
        />
      )}

      {paymentSale && (
        <RecordPaymentModal
          sale={paymentSale}
          onClose={() => setPaymentSale(null)}
          onSaved={() => { setPaymentSale(null); load(); }}
        />
      )}

      {returnSale && (
        <ReturnModal
          sale={returnSale}
          onClose={() => setReturnSale(null)}
          onSaved={() => { setReturnSale(null); load(); }}
        />
      )}

      {cancelSaleItem && (
        <ConfirmDialog
          isOpen={Boolean(cancelSaleItem)}
          title="Cancel Sale"
          message={`Are you sure you want to cancel sale ${cancelSaleItem.saleNumber}? This will restore stock for all items in this sale.`}
          confirmText="Cancel Sale"
          variant="danger"
          loading={cancelling}
          onConfirm={handleConfirmCancel}
          onCancel={() => setCancelSaleItem(null)}
        />
      )}
    </div>
  );
}
