import React, { useEffect, useRef, useState, useCallback } from 'react';
import { productApi } from '../api/productApi';
import { stockApi } from '../api/stockApi';
import { decodeProductQr } from '../utils/qr';
import { useToast } from '../context/ToastContext';
import Modal from './Modal';

const READER_ID = 'qr-stock-reader';

export default function ScanStockModal({ onClose, onAdjusted }) {
  const scannerRef = useRef(null);
  const busyRef = useRef(false);
  const [cameraError, setCameraError] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [found, setFound] = useState(null); // { product, quantity }
  const [lookupError, setLookupError] = useState('');
  const [saving, setSaving] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);
  const toast = useToast();

  // A camera-scanned value might be one of our own QR codes (invpro:sku:...)
  // or a real manufacturer barcode (UPC/EAN/etc) printed on the product.
  const resolveScannedCode = useCallback(async (raw) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setLookupError('');
    const sku = decodeProductQr(raw);
    try {
      const r = sku ? await productApi.lookupBySku(sku) : await productApi.lookupByBarcode(raw.trim());
      setFound({ product: r.data.data, quantity: 1 });
      scannerRef.current?.pause?.(true);
    } catch (err) {
      setLookupError(err.response?.data?.message || `No product found for "${raw}"`);
    } finally {
      busyRef.current = false;
    }
  }, []);

  // Manual entry is plain text (a SKU or a barcode), never our QR-prefixed
  // format — try it as a SKU first since that's what people usually type,
  // falling back to a barcode lookup if that doesn't match anything.
  const resolveManualCode = useCallback(async (raw) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setLookupError('');
    const trimmed = raw.trim();
    try {
      const r = await productApi.lookupBySku(trimmed);
      setFound({ product: r.data.data, quantity: 1 });
      scannerRef.current?.pause?.(true);
    } catch (skuErr) {
      try {
        const r = await productApi.lookupByBarcode(trimmed);
        setFound({ product: r.data.data, quantity: 1 });
        scannerRef.current?.pause?.(true);
      } catch (barcodeErr) {
        setLookupError(`No product found for "${trimmed}"`);
      }
    } finally {
      busyRef.current = false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    import('html5-qrcode')
      .then(({ Html5QrcodeScanner, Html5QrcodeSupportedFormats }) => {
        if (cancelled) return;
        const scanner = new Html5QrcodeScanner(
          READER_ID,
          {
            fps: 10,
            qrbox: 220,
            rememberLastUsedCamera: true,
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
        scanner.render(
          (decodedText) => {
            setScannedCount((c) => c + 1);
            resolveScannedCode(decodedText);
          },
          () => {} // ignore per-frame decode failures — expected while aiming
        );
        scannerRef.current = scanner;
      })
      .catch(() => setCameraError('Could not load the camera scanner in this browser.'));

    return () => {
      cancelled = true;
      scannerRef.current?.clear?.().catch(() => {});
    };
  }, [resolveScannedCode]);

  const submitManual = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    resolveManualCode(manualCode);
  };

  const confirmAdd = async () => {
    if (!found) return;
    setSaving(true);
    try {
      await stockApi.adjust({
        productId: found.product.id,
        direction: 'IN',
        quantity: Number(found.quantity),
        reason: 'Scan restock',
      });
      toast.success(`Added ${found.quantity} × ${found.product.name}`);
      onAdjusted?.();
      setFound(null);
      setManualCode('');
      scannerRef.current?.resume?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update stock');
    } finally {
      setSaving(false);
    }
  };

  const skipItem = () => {
    setFound(null);
    setLookupError('');
    scannerRef.current?.resume?.();
  };

  return (
    <Modal title="Scan to add stock" onClose={onClose} maxWidth={440}>
      <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: -6, marginBottom: 14 }}>
        Point the camera at a product's QR code or its manufacturer barcode, or type either below. Scanned {scannedCount} so far this session.
      </p>

      {!found && (
        <>
          <div
            id={READER_ID}
            style={{
              borderRadius: 12,
              overflow: 'hidden',
              background: 'var(--glass-bg-strong)',
              border: '1px solid var(--glass-border)',
              marginBottom: 14,
              minHeight: 200,
            }}
          />

          {cameraError && (
            <div className="banner banner-error"><i className="ti ti-camera-off" /><span>{cameraError}</span></div>
          )}

          {lookupError && (
            <div className="banner banner-error"><i className="ti ti-alert-circle" /><span>{lookupError}</span></div>
          )}

          <form onSubmit={submitManual} style={{ display: 'flex', gap: 8 }}>
            <input
              className="field-input"
              placeholder="Or type a SKU or barcode…"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
            />
            <button type="submit" className="btn btn-secondary" style={{ flexShrink: 0 }}>
              <i className="ti ti-search" />
            </button>
          </form>
        </>
      )}

      {found && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, background: 'var(--glass-bg-strong)', border: '1px solid var(--glass-border)', borderRadius: 12, marginBottom: 16 }}>
            <div
              style={{
                width: 44, height: 44, borderRadius: 10, flexShrink: 0, overflow: 'hidden',
                background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {found.product.imageUrl ? (
                <img src={found.product.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
              ) : (
                <i className="ti ti-package" style={{ fontSize: 18, color: 'var(--text-secondary)' }} />
              )}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{found.product.name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                {found.product.stockQuantity} currently in stock · SKU {found.product.sku}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label className="field-label">Quantity to add</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button type="button" className="btn btn-secondary btn-icon" onClick={() => setFound((f) => ({ ...f, quantity: Math.max(1, f.quantity - 1) }))}>
                <i className="ti ti-minus" />
              </button>
              <input
                className="field-input"
                type="number"
                min="1"
                style={{ textAlign: 'center', maxWidth: 90 }}
                value={found.quantity}
                onChange={(e) => setFound((f) => ({ ...f, quantity: e.target.value }))}
              />
              <button type="button" className="btn btn-secondary btn-icon" onClick={() => setFound((f) => ({ ...f, quantity: Number(f.quantity) + 1 }))}>
                <i className="ti ti-plus" />
              </button>
            </div>
          </div>

          <div className="modal-actions" style={{ marginTop: 0 }}>
            <button type="button" className="btn btn-secondary" onClick={skipItem}>Scan next instead</button>
            <button type="button" className="btn btn-primary" onClick={confirmAdd} disabled={saving}>
              {saving && <span className="spinner" />}
              {saving ? 'Adding…' : 'Add to stock'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
