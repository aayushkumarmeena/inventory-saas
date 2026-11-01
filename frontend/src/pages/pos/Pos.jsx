import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { productApi } from '../../api/productApi';
import { salesApi } from '../../api/salesApi';
import { customerApi } from '../../api/customerApi';
import { offlineDB } from '../../utils/offlineDB';
import { posAudio } from '../../utils/audio';
import { decodeProductQr } from '../../utils/qr';
import { fmtCurrency } from '../../utils/formatters';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import Receipt from '../sales/Receipt';

// ─── Constants ────────────────────────────────────────────────────────────────
const PAYMENT_METHODS = [
  { key: 'CASH', label: 'Cash', icon: 'ti-cash' },
  { key: 'UPI', label: 'UPI', icon: 'ti-device-mobile' },
  { key: 'CARD', label: 'Card', icon: 'ti-credit-card' },
  { key: 'BANK_TRANSFER', label: 'Bank', icon: 'ti-building-bank' },
];

const GST_RATES = [0, 5, 12, 18, 28];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcTotals(cartItems, discountType, discountVal, gstRate) {
  const subtotal = cartItems.reduce(
    (s, it) => s + it.qty * it.unitPrice,
    0
  );
  const discountAmt =
    discountType === 'percent'
      ? (subtotal * Math.min(parseFloat(discountVal) || 0, 100)) / 100
      : Math.min(parseFloat(discountVal) || 0, subtotal);
  const afterDiscount = subtotal - discountAmt;
  const gstAmt = (afterDiscount * (parseFloat(gstRate) || 0)) / 100;
  const grandTotal = afterDiscount + gstAmt;
  return { subtotal, discountAmt, gstAmt, grandTotal };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CartItem({ item, onQtyChange, onRemove }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 0',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        animation: 'posSlideIn 0.18s ease',
      }}
    >
      {/* Product info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: 13,
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {item.name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
          {item.sku} · {fmtCurrency(item.unitPrice)} ea
        </div>
      </div>

      {/* Qty stepper */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          onClick={() => onQtyChange(item.cartId, item.qty - 1)}
          style={qtyBtnStyle}
          aria-label="Decrease quantity"
        >
          <i className="ti ti-minus" style={{ fontSize: 11 }} />
        </button>
        <input
          type="number"
          min="1"
          value={item.qty}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (!isNaN(v) && v >= 1) onQtyChange(item.cartId, v);
          }}
          style={{
            width: 40,
            textAlign: 'center',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 6,
            color: 'var(--text-primary)',
            fontSize: 13,
            fontWeight: 600,
            padding: '3px 0',
          }}
        />
        <button
          onClick={() => onQtyChange(item.cartId, item.qty + 1)}
          style={qtyBtnStyle}
          aria-label="Increase quantity"
        >
          <i className="ti ti-plus" style={{ fontSize: 11 }} />
        </button>
      </div>

      {/* Line total */}
      <div
        style={{
          width: 72,
          textAlign: 'right',
          fontWeight: 700,
          fontSize: 13,
          color: 'var(--brand)',
        }}
      >
        {fmtCurrency(item.qty * item.unitPrice)}
      </div>

      {/* Remove */}
      <button
        onClick={() => onRemove(item.cartId)}
        style={{
          background: 'none',
          border: 'none',
          color: '#ef4444',
          cursor: 'pointer',
          padding: 4,
          borderRadius: 6,
          lineHeight: 1,
          opacity: 0.7,
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.7)}
        aria-label="Remove item"
      >
        <i className="ti ti-trash" style={{ fontSize: 14 }} />
      </button>
    </div>
  );
}

const qtyBtnStyle = {
  width: 24,
  height: 24,
  borderRadius: 6,
  border: '1px solid rgba(255,255,255,0.15)',
  background: 'rgba(255,255,255,0.06)',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  lineHeight: 1,
  transition: 'background 0.15s',
};

function ProductCard({ product, onAdd }) {
  const inStock = product.stockQuantity > 0;
  return (
    <button
      onClick={() => inStock && onAdd(product)}
      disabled={!inStock}
      style={{
        background: inStock
          ? 'rgba(255,255,255,0.04)'
          : 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: '12px 14px',
        cursor: inStock ? 'pointer' : 'not-allowed',
        textAlign: 'left',
        transition: 'background 0.15s, border-color 0.15s, transform 0.1s',
        opacity: inStock ? 1 : 0.45,
      }}
      onMouseEnter={(e) => {
        if (inStock) {
          e.currentTarget.style.background = 'rgba(99,102,241,0.12)';
          e.currentTarget.style.borderColor = 'rgba(99,102,241,0.35)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = inStock
          ? 'rgba(255,255,255,0.04)'
          : 'rgba(255,255,255,0.02)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
      }}
      onMouseDown={(e) => {
        if (inStock) e.currentTarget.style.transform = 'scale(0.97)';
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text-primary)',
          lineHeight: 1.3,
          marginBottom: 6,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {product.name}
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 6 }}>
        {product.sku}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 4,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--brand)' }}>
          {fmtCurrency(product.sellingPrice ?? product.price ?? 0)}
        </span>
        <span
          style={{
            fontSize: 10,
            padding: '2px 6px',
            borderRadius: 6,
            background:
              product.stockQuantity > 10
                ? 'rgba(34,197,94,0.12)'
                : 'rgba(234,179,8,0.12)',
            color:
              product.stockQuantity > 10
                ? '#4ade80'
                : '#fbbf24',
          }}
        >
          {product.stockQuantity} left
        </span>
      </div>
    </button>
  );
}

// ─── Main POS Page ────────────────────────────────────────────────────────────
export default function Pos() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isOnline = useOfflineStatus();

  // ── Product catalog ──
  const [allProducts, setAllProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Cart ──
  const [cart, setCart] = useState([]);
  const cartIdRef = useRef(0);

  // ── Discount ──
  const [discountType, setDiscountType] = useState('flat'); // 'flat' | 'percent'
  const [discountVal, setDiscountVal] = useState('');
  const [gstRate, setGstRate] = useState(0);

  // ── Payment ──
  const [payMethod, setPayMethod] = useState('CASH');
  const [cashReceived, setCashReceived] = useState('');
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [notes, setNotes] = useState('');

  // ── UI State ──
  const [charging, setCharging] = useState(false);
  const [lastSale, setLastSale] = useState(null); // shows receipt after checkout
  const [toasts, setToasts] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(posAudio.enabled);

  // ── Barcode scanner ──
  const barcodeInputRef = useRef(null);
  const barcodeBuffer = useRef('');
  const barcodeTimer = useRef(null);

  // ── Sync pending offline sales when back online ──
  const syncPending = useCallback(async () => {
    if (!isOnline) return;
    try {
      const pending = await offlineDB.getPendingSales();
      for (const sale of pending) {
        if (sale.status === 'syncing') continue;
        try {
          await offlineDB.updatePendingSaleStatus(sale.localId, 'syncing');
          await salesApi.create(sale.payload);
          await offlineDB.removePendingSale(sale.localId);
        } catch {
          await offlineDB.updatePendingSaleStatus(sale.localId, 'failed');
        }
      }
    } catch {
      /* ignore */
    }
  }, [isOnline]);

  // ── Load products ──
  useEffect(() => {
    async function load() {
      setLoadingProducts(true);
      try {
        if (isOnline) {
          const res = await productApi.list({ page: 0, size: 500, status: 'ACTIVE' });
          const data = res.data?.data?.content ?? res.data?.content ?? [];
          setAllProducts(data);
          await offlineDB.cacheProducts(data);
        } else {
          const cached = await offlineDB.getCachedProducts();
          setAllProducts(cached);
          addToast('Offline mode — showing cached products', 'warning');
        }
      } catch {
        // Fallback to cache
        try {
          const cached = await offlineDB.getCachedProducts();
          setAllProducts(cached);
          if (cached.length) addToast('Using cached product list', 'info');
        } catch {
          /* ignore */
        }
      } finally {
        setLoadingProducts(false);
      }
    }
    load();
  }, [isOnline]);

  // ── Sync pending when online ──
  useEffect(() => {
    if (isOnline) syncPending();
  }, [isOnline, syncPending]);

  // ── Focus barcode input on mount ──
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  // ── Keyboard shortcut: Ctrl+Enter = charge ──
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleCharge();
      }
      if (e.key === 'F2') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
      }
      if (e.key === 'Escape' && lastSale) {
        setLastSale(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  // ── Toast system ──
  const addToast = useCallback((msg, type = 'info') => {
    const id = Date.now();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  // ── Barcode hardware-scanner input handler ──
  const handleBarcodeKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter') {
        clearTimeout(barcodeTimer.current);
        const raw = barcodeBuffer.current.trim();
        barcodeBuffer.current = '';
        if (!raw) return;
        const sku = decodeProductQr(raw) ?? raw;
        // First try exact SKU match in catalog
        const found = allProducts.find(
          (p) =>
            p.sku?.toLowerCase() === sku.toLowerCase() ||
            p.barcode?.toLowerCase() === raw.toLowerCase()
        );
        if (found) {
          addToCart(found);
        } else if (isOnline) {
          // Fallback: API lookup
          productApi
            .lookupBySku(sku)
            .then((r) => {
              const p = r.data?.data ?? r.data;
              if (p) {
                addToCart(p);
              } else {
                posAudio.playErrorBuzz();
                addToast(`No product found for: ${sku}`, 'error');
              }
            })
            .catch(() => {
              posAudio.playErrorBuzz();
              addToast(`Lookup failed for: ${sku}`, 'error');
            });
        } else {
          posAudio.playErrorBuzz();
          addToast(`Product not in cache: ${sku}`, 'error');
        }
      } else {
        barcodeBuffer.current += e.key;
        clearTimeout(barcodeTimer.current);
        barcodeTimer.current = setTimeout(() => {
          barcodeBuffer.current = '';
        }, 200);
      }
    },
    [allProducts, isOnline]
  );

  // ── Cart operations ──
  const addToCart = useCallback((product) => {
    const price = product.sellingPrice ?? product.price ?? 0;
    posAudio.playScanBeep();
    setCart((prev) => {
      const existing = prev.find((it) => it.productId === product.id);
      if (existing) {
        return prev.map((it) =>
          it.productId === product.id
            ? { ...it, qty: it.qty + 1 }
            : it
        );
      }
      return [
        ...prev,
        {
          cartId: ++cartIdRef.current,
          productId: product.id,
          name: product.name,
          sku: product.sku,
          unitPrice: price,
          qty: 1,
          batchId: null,
        },
      ];
    });
    barcodeInputRef.current?.focus();
  }, []);

  const updateQty = useCallback((cartId, qty) => {
    if (qty < 1) {
      removeItem(cartId);
      return;
    }
    setCart((prev) =>
      prev.map((it) => (it.cartId === cartId ? { ...it, qty } : it))
    );
  }, []);

  const removeItem = useCallback((cartId) => {
    setCart((prev) => prev.filter((it) => it.cartId !== cartId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setDiscountVal('');
    setCashReceived('');
    setNotes('');
    setCustomerName('Walk-in Customer');
    setGstRate(0);
    barcodeInputRef.current?.focus();
  }, []);

  // ── Derived totals ──
  const { subtotal, discountAmt, gstAmt, grandTotal } = useMemo(
    () => calcTotals(cart, discountType, discountVal, gstRate),
    [cart, discountType, discountVal, gstRate]
  );

  const changeToReturn = useMemo(() => {
    if (payMethod !== 'CASH') return 0;
    const recv = parseFloat(cashReceived) || 0;
    return Math.max(0, recv - grandTotal);
  }, [payMethod, cashReceived, grandTotal]);

  // ── Filtered products ──
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return allProducts;
    return allProducts.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
    );
  }, [allProducts, searchQuery]);

  // ── Checkout ──
  const handleCharge = async () => {
    if (cart.length === 0) {
      addToast('Cart is empty', 'error');
      return;
    }
    if (grandTotal <= 0) {
      addToast('Grand total must be > 0', 'error');
      return;
    }
    if (payMethod === 'CASH') {
      const recv = parseFloat(cashReceived) || 0;
      if (recv < grandTotal) {
        addToast(
          `Cash received (${fmtCurrency(recv)}) is less than total (${fmtCurrency(grandTotal)})`,
          'error'
        );
        return;
      }
    }

    setCharging(true);
    const payload = {
      customerName: customerName.trim() || 'Walk-in Customer',
      paymentMethod: payMethod,
      items: cart.map((it) => ({
        productId: it.productId,
        quantity: it.qty,
        unitPrice: it.unitPrice,
        ...(it.batchId ? { batchId: it.batchId } : {}),
      })),
      discountAmount: discountAmt,
      taxAmount: gstAmt,
      notes: notes.trim(),
    };

    try {
      let saleData;
      if (isOnline) {
        const res = await salesApi.create(payload);
        saleData = res.data?.data ?? res.data;
      } else {
        const localId = await offlineDB.queueSale(payload);
        saleData = {
          id: `offline-${localId}`,
          ...payload,
          totalAmount: grandTotal,
          createdAt: new Date().toISOString(),
          isOffline: true,
        };
        addToast('Sale saved offline — will sync when back online', 'warning');
      }
      posAudio.playSuccessChime();
      setLastSale({ ...saleData, totalAmount: grandTotal });
      clearCart();
    } catch (err) {
      posAudio.playErrorBuzz();
      addToast(
        err?.response?.data?.message ?? 'Checkout failed. Please retry.',
        'error'
      );
    } finally {
      setCharging(false);
    }
  };

  // ── Quick cash presets ──
  const cashPresets = useMemo(() => {
    const g = Math.ceil(grandTotal);
    const presets = new Set([
      Math.ceil(g / 10) * 10,
      Math.ceil(g / 50) * 50,
      Math.ceil(g / 100) * 100,
      Math.ceil(g / 500) * 500,
    ]);
    return [...presets].filter((v) => v >= g).slice(0, 4);
  }, [grandTotal]);

  // ─── Receipt overlay ────────────────────────────────────────────────────────
  if (lastSale) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--shell-bg)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(0,0,0,0.3)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <i className="ti ti-check" style={{ fontSize: 18, color: '#fff' }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>
                Sale Complete!
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {lastSale.isOffline ? 'Saved offline · will sync' : `Invoice #${lastSale.id}`}
              </div>
            </div>
          </div>
          <button
            onClick={() => setLastSale(null)}
            style={{
              background: 'rgba(99,102,241,0.18)',
              border: '1px solid rgba(99,102,241,0.35)',
              borderRadius: 10,
              color: 'var(--brand)',
              cursor: 'pointer',
              padding: '8px 18px',
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            <i className="ti ti-plus" style={{ marginRight: 6 }} />
            New Sale
          </button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          <Receipt sale={lastSale} onClose={() => setLastSale(null)} />
        </div>
      </div>
    );
  }

  // ─── Main POS Layout ────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--shell-bg)',
        overflow: 'hidden',
        fontFamily: 'inherit',
      }}
    >
      {/* ── Toasts ── */}
      <div
        style={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 9000,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 500,
              background:
                t.type === 'error'
                  ? 'rgba(239,68,68,0.92)'
                  : t.type === 'warning'
                  ? 'rgba(234,179,8,0.92)'
                  : 'rgba(99,102,241,0.92)',
              color: '#fff',
              boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
              animation: 'posSlideIn 0.2s ease',
              backdropFilter: 'blur(12px)',
            }}
          >
            {t.msg}
          </div>
        ))}
      </div>

      {/* ── Hidden barcode scanner input (always focused) ── */}
      <input
        ref={barcodeInputRef}
        onKeyDown={handleBarcodeKeyDown}
        style={{
          position: 'fixed',
          top: -9999,
          left: -9999,
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: 'none',
        }}
        readOnly
        tabIndex={-1}
        aria-hidden
      />

      {/* ── POS Header ── */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(0,0,0,0.25)',
          backdropFilter: 'blur(16px)',
          flexShrink: 0,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        {/* Brand & status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <i className="ti ti-device-tablet-dollar" style={{ fontSize: 18, color: '#fff' }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em' }}>
              POS Counter
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: isOnline ? '#22c55e' : '#f59e0b',
                  display: 'inline-block',
                }}
              />
              {isOnline ? 'Online' : 'Offline mode'} · {user?.name || user?.email}
            </div>
          </div>
        </div>

        {/* Date + shortcuts info */}
        <div
          style={{
            fontSize: 11,
            color: 'var(--text-secondary)',
            display: 'flex',
            gap: 14,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <span>
            <i className="ti ti-keyboard" style={{ marginRight: 4 }} />
            <kbd style={kbdStyle}>F2</kbd> Barcode
            {'  '}
            <kbd style={kbdStyle}>Ctrl+↵</kbd> Charge
          </span>
          <span>{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => {
              posAudio.setEnabled(!soundEnabled);
              setSoundEnabled(!soundEnabled);
            }}
            title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
            style={iconBtnStyle}
          >
            <i className={`ti ${soundEnabled ? 'ti-volume' : 'ti-volume-off'}`} style={{ fontSize: 15 }} />
          </button>
          <button
            onClick={() => navigate('/')}
            style={{
              ...iconBtnStyle,
              color: '#94a3b8',
              background: 'rgba(255,255,255,0.05)',
              padding: '7px 14px',
              gap: 6,
              display: 'flex',
              alignItems: 'center',
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            <i className="ti ti-x" style={{ fontSize: 13 }} />
            Exit POS
          </button>
        </div>
      </header>

      {/* ── Body: Product Panel + Cart ── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          gap: 0,
        }}
      >
        {/* ════ Left: Products ════ */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderRight: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          {/* Search bar */}
          <div
            style={{
              padding: '14px 16px 10px',
              background: 'rgba(0,0,0,0.15)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              flexShrink: 0,
            }}
          >
            <div style={{ position: 'relative' }}>
              <i
                className="ti ti-search"
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-secondary)',
                  fontSize: 15,
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                placeholder="Search by name, SKU or category…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 12px 10px 36px',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: 4,
                    lineHeight: 1,
                  }}
                >
                  <i className="ti ti-x" style={{ fontSize: 13 }} />
                </button>
              )}
            </div>
          </div>

          {/* Product grid */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: 14,
            }}
          >
            {loadingProducts ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: 10,
                }}
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="skeleton-bar"
                    style={{ height: 90, borderRadius: 12 }}
                  />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  color: 'var(--text-secondary)',
                }}
              >
                <i className="ti ti-package-off" style={{ fontSize: 40, display: 'block', marginBottom: 12, opacity: 0.4 }} />
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No products found</div>
                <div style={{ fontSize: 12 }}>Try a different search term</div>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: 10,
                }}
              >
                {filteredProducts.map((p) => (
                  <ProductCard key={p.id} product={p} onAdd={addToCart} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ════ Right: Cart Panel ════ */}
        <div
          style={{
            width: 380,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(0,0,0,0.2)',
            overflow: 'hidden',
          }}
        >
          {/* Cart header */}
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="ti ti-shopping-cart" style={{ fontSize: 16, color: 'var(--brand)' }} />
              Cart
              {cart.length > 0 && (
                <span
                  style={{
                    fontSize: 11,
                    background: 'var(--brand)',
                    color: '#fff',
                    borderRadius: 100,
                    padding: '1px 7px',
                    fontWeight: 700,
                  }}
                >
                  {cart.reduce((s, it) => s + it.qty, 0)} items
                </span>
              )}
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                style={{
                  background: 'none',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 7,
                  color: '#ef4444',
                  cursor: 'pointer',
                  fontSize: 11,
                  padding: '4px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <i className="ti ti-trash" style={{ fontSize: 11 }} />
                Clear
              </button>
            )}
          </div>

          {/* Cart items */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px' }}>
            {cart.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 16px',
                  color: 'var(--text-secondary)',
                }}
              >
                <i className="ti ti-barcode" style={{ fontSize: 36, display: 'block', marginBottom: 10, opacity: 0.3 }} />
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Cart is empty</div>
                <div style={{ fontSize: 11 }}>Scan a barcode or tap a product to add</div>
              </div>
            ) : (
              cart.map((item) => (
                <CartItem
                  key={item.cartId}
                  item={item}
                  onQtyChange={updateQty}
                  onRemove={removeItem}
                />
              ))
            )}
          </div>

          {/* ── Totals + Checkout ── */}
          <div
            style={{
              borderTop: '1px solid rgba(255,255,255,0.08)',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              background: 'rgba(0,0,0,0.15)',
              flexShrink: 0,
            }}
          >
            {/* Customer */}
            <div>
              <label style={labelStyle}>Customer</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Walk-in Customer"
                style={inputStyle}
              />
            </div>

            {/* Discount row */}
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Discount</label>
                <div style={{ display: 'flex', gap: 0 }}>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value)}
                    style={{
                      ...inputStyle,
                      width: 64,
                      borderRadius: '8px 0 0 8px',
                      borderRight: 'none',
                      flexShrink: 0,
                    }}
                  >
                    <option value="flat">₹</option>
                    <option value="percent">%</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    value={discountVal}
                    onChange={(e) => setDiscountVal(e.target.value)}
                    placeholder="0"
                    style={{ ...inputStyle, borderRadius: '0 8px 8px 0', flex: 1 }}
                  />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>GST Rate</label>
                <select
                  value={gstRate}
                  onChange={(e) => setGstRate(Number(e.target.value))}
                  style={inputStyle}
                >
                  {GST_RATES.map((r) => (
                    <option key={r} value={r}>{r}%</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Totals summary */}
            <div
              style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 10,
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 5,
              }}
            >
              {[
                { label: 'Subtotal', value: subtotal },
                discountAmt > 0 && { label: `Discount (${discountType === 'percent' ? discountVal + '%' : '₹' + discountAmt.toFixed(0)})`, value: -discountAmt, red: true },
                gstRate > 0 && { label: `GST (${gstRate}%)`, value: gstAmt },
              ]
                .filter(Boolean)
                .map(({ label, value, red }) => (
                  <div
                    key={label}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 12,
                      color: red ? '#f87171' : 'var(--text-secondary)',
                    }}
                  >
                    <span>{label}</span>
                    <span>{red ? `- ${fmtCurrency(Math.abs(value))}` : fmtCurrency(value)}</span>
                  </div>
                ))}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 700,
                  fontSize: 16,
                  color: 'var(--text-primary)',
                  marginTop: 4,
                  paddingTop: 8,
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <span>Total</span>
                <span style={{ color: 'var(--brand)' }}>{fmtCurrency(grandTotal)}</span>
              </div>
            </div>

            {/* Payment method */}
            <div>
              <label style={labelStyle}>Payment</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setPayMethod(m.key)}
                    style={{
                      flex: 1,
                      padding: '7px 4px',
                      borderRadius: 9,
                      border:
                        payMethod === m.key
                          ? '1.5px solid var(--brand)'
                          : '1px solid rgba(255,255,255,0.1)',
                      background:
                        payMethod === m.key
                          ? 'rgba(99,102,241,0.18)'
                          : 'rgba(255,255,255,0.03)',
                      color: payMethod === m.key ? 'var(--brand)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: 10,
                      fontWeight: payMethod === m.key ? 700 : 500,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 3,
                      transition: 'all 0.15s',
                    }}
                  >
                    <i className={`ti ${m.icon}`} style={{ fontSize: 14 }} />
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cash calculator */}
            {payMethod === 'CASH' && (
              <div>
                <label style={labelStyle}>Cash Received</label>
                <input
                  type="number"
                  min="0"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  placeholder={fmtCurrency(grandTotal)}
                  style={{ ...inputStyle, fontSize: 15, fontWeight: 600 }}
                />
                {/* Quick presets */}
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  {cashPresets.map((v) => (
                    <button
                      key={v}
                      onClick={() => setCashReceived(String(v))}
                      style={{
                        flex: 1,
                        padding: '5px 2px',
                        borderRadius: 7,
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(255,255,255,0.04)',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: 11,
                        fontWeight: 500,
                      }}
                    >
                      ₹{v}
                    </button>
                  ))}
                </div>
                {parseFloat(cashReceived) > 0 && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: '8px 12px',
                      borderRadius: 9,
                      background: changeToReturn > 0 ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.1)',
                      border: `1px solid ${changeToReturn > 0 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {changeToReturn >= 0 ? 'Change to return' : 'Still needed'}
                    </span>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: 15,
                        color: changeToReturn >= 0 ? '#4ade80' : '#f87171',
                      }}
                    >
                      {fmtCurrency(Math.abs(changeToReturn))}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div>
              <label style={labelStyle}>Notes (optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add a note…"
                style={inputStyle}
              />
            </div>

            {/* Charge button */}
            <button
              onClick={handleCharge}
              disabled={charging || cart.length === 0}
              style={{
                padding: '14px',
                borderRadius: 12,
                border: 'none',
                background:
                  cart.length === 0
                    ? 'rgba(99,102,241,0.25)'
                    : 'linear-gradient(135deg, #6366f1, #a855f7)',
                color: '#fff',
                fontWeight: 700,
                fontSize: 15,
                cursor: cart.length === 0 || charging ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'opacity 0.15s, transform 0.1s',
                opacity: cart.length === 0 ? 0.5 : 1,
                boxShadow:
                  cart.length > 0 ? '0 4px 20px rgba(99,102,241,0.4)' : 'none',
              }}
              onMouseDown={(e) => {
                if (cart.length > 0) e.currentTarget.style.transform = 'scale(0.98)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {charging ? (
                <>
                  <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} />
                  Processing…
                </>
              ) : (
                <>
                  <i className="ti ti-credit-card" style={{ fontSize: 16 }} />
                  Charge {cart.length > 0 ? fmtCurrency(grandTotal) : ''}
                  <kbd style={{ ...kbdStyle, background: 'rgba(255,255,255,0.18)', color: '#fff', marginLeft: 4 }}>⌃↵</kbd>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Inline animations ── */}
      <style>{`
        @keyframes posSlideIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        /* Mobile layout: stack panels */
        @media (max-width: 768px) {
          .pos-body {
            flex-direction: column !important;
          }
          .pos-cart {
            width: 100% !important;
            height: 55vh;
            border-right: none !important;
            border-top: 1px solid rgba(255,255,255,0.07);
          }
        }
      `}</style>
    </div>
  );
}

// ── Shared micro-styles ──────────────────────────────────────────────────────
const labelStyle = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-secondary)',
  marginBottom: 4,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.04)',
  color: 'var(--text-primary)',
  fontSize: 13,
  outline: 'none',
  fontFamily: 'inherit',
};

const iconBtnStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 9,
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  padding: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.15s',
};

const kbdStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  fontSize: 10,
  fontFamily: 'monospace',
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 4,
  padding: '1px 5px',
  color: 'var(--text-secondary)',
};
