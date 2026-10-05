import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { stockApi } from '../../api/stockApi';
import { productApi } from '../../api/productApi';
import { warehouseApi } from '../../api/warehouseApi';
import { batchApi } from '../../api/batchApi';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import ScanStockModal from '../../components/ScanStockModal';
import EmptyState from '../../components/EmptyState';
import { NewBatchModal, AdjustBatchModal } from '../../components/BatchModals';
import { fmtDate, fmtCurrency } from '../../utils/formatters';

function AdjustModal({ presetProductId, onClose, onSaved }) {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ productId: presetProductId || '', direction: 'IN', quantity: 1, reason: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    productApi.list({ page: 0, size: 200 }).then((r) => setProducts(r.data.data.content || [])).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.productId) {
      setError('Select a product');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await stockApi.adjust({ ...form, quantity: Number(form.quantity) });
      toast.success('Stock updated');
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || (err.request ? 'Could not reach the server.' : 'Something went wrong'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Adjust stock" onClose={onClose}>
      {error && <div className="banner banner-error"><i className="ti ti-alert-circle" /><span>{error}</span></div>}
      <form onSubmit={submit}>
        <div style={{ marginBottom: 12 }}>
          <label className="field-label">Product</label>
          <select className="field-input" value={form.productId} onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))} required>
            <option value="">Select product…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name} · {p.stockQuantity} in stock</option>
            ))}
          </select>
        </div>
        <div className="field-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label className="field-label">Direction</label>
            <select className="field-input" value={form.direction} onChange={(e) => setForm((f) => ({ ...f, direction: e.target.value }))}>
              <option value="IN">Stock in (+)</option>
              <option value="OUT">Stock out (−)</option>
            </select>
          </div>
          <div>
            <label className="field-label">Quantity</label>
            <input className="field-input" type="number" min="1" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} required />
          </div>
        </div>
        <div style={{ marginBottom: 4 }}>
          <label className="field-label">Reason (optional)</label>
          <input className="field-input" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} placeholder="Restock, damage, correction…" />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving && <span className="spinner" />}
            {saving ? 'Saving…' : 'Apply adjustment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function AddWarehouseModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '',
    code: '',
    type: 'WAREHOUSE',
    address: '',
    city: '',
    phone: '',
    isDefault: false,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.code) {
      setError('Name and Code are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await warehouseApi.createWarehouse(form);
      toast.success('Warehouse/Branch added');
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create warehouse');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Add Warehouse / Branch" onClose={onClose} maxWidth={520}>
      {error && <div className="banner banner-error"><i className="ti ti-alert-circle" /><span>{error}</span></div>}
      <form onSubmit={submit}>
        <div className="field-grid" style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label className="field-label">Location Name</label>
            <input className="field-input" value={form.name} onChange={set('name')} required placeholder="e.g. Downtown Outlet" />
          </div>
          <div>
            <label className="field-label">Location Code</label>
            <input className="field-input" value={form.code} onChange={set('code')} required placeholder="e.g. BR-DOWN" style={{ textTransform: 'uppercase' }} />
          </div>
        </div>

        <div className="field-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label className="field-label">Location Type</label>
            <select className="field-input" value={form.type} onChange={set('type')}>
              <option value="WAREHOUSE">Warehouse</option>
              <option value="STORE">Retail Store</option>
              <option value="GODOWN">Godown / Depot</option>
            </select>
          </div>
          <div>
            <label className="field-label">Contact Phone</label>
            <input className="field-input" value={form.phone} onChange={set('phone')} placeholder="+91 80 1234 5678" />
          </div>
        </div>

        <div className="field-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label className="field-label">Address</label>
            <input className="field-input" value={form.address} onChange={set('address')} placeholder="123 Market Rd" />
          </div>
          <div>
            <label className="field-label">City</label>
            <input className="field-input" value={form.city} onChange={set('city')} placeholder="Bangalore" />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
            />
            <span>Set as primary / default location</span>
          </label>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Creating…' : 'Save Location'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function WarehouseStockModal({ warehouse, onClose }) {
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!warehouse?.id) return;
    setLoading(true);
    warehouseApi.getWarehouseStock(warehouse.id)
      .then((r) => setStock(r.data?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [warehouse]);

  return (
    <Modal title={`Stock Inventory · ${warehouse?.name}`} onClose={onClose} maxWidth={650}>
      <div style={{ marginBottom: 14, fontSize: 12.5, color: 'var(--text-secondary)' }}>
        Location Code: <strong style={{ color: 'var(--brand)' }}>{warehouse?.code}</strong> · Type: <strong>{warehouse?.type}</strong>
        {warehouse?.city && ` · City: ${warehouse.city}`}
      </div>

      {loading ? (
        <div style={{ padding: '30px 0', textAlign: 'center' }}>
          <div className="skeleton-bar" style={{ width: '80%', height: 24, margin: '0 auto' }} />
        </div>
      ) : stock.length === 0 ? (
        <EmptyState
          icon="ti-box-off"
          title="No stock in this location"
          description="Use Stock Transfer to move items into this warehouse."
          compact
        />
      ) : (
        <div className="table-responsive" style={{ maxHeight: 380 }}>
          <table className="table" style={{ fontSize: 12.5 }}>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th style={{ textAlign: 'right' }}>Unit Price</th>
                <th style={{ textAlign: 'right' }}>In Stock</th>
                <th style={{ textAlign: 'right' }}>Min Level</th>
              </tr>
            </thead>
            <tbody>
              {stock.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 600 }}>{item.productName}</td>
                  <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{item.sku}</td>
                  <td style={{ textAlign: 'right' }}>{fmtCurrency(item.price)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: item.quantity <= item.reorderLevel ? '#ef4444' : 'var(--text-primary)' }}>
                    {item.quantity}
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{item.reorderLevel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="modal-actions" style={{ marginTop: 16 }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}

function NewTransferModal({ warehouses, onClose, onSaved }) {
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [notes, setNotes] = useState('');
  const [sourceStock, setSourceStock] = useState([]);
  const [lines, setLines] = useState([{ productId: '', quantity: 1 }]);
  const [loadingStock, setLoadingStock] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  useEffect(() => {
    if (!fromId) {
      setSourceStock([]);
      return;
    }
    setLoadingStock(true);
    warehouseApi.getWarehouseStock(fromId)
      .then((r) => setSourceStock(r.data?.data || []))
      .catch(() => {})
      .finally(() => setLoadingStock(false));
  }, [fromId]);

  const updateLine = (i, key, val) => setLines((p) => p.map((l, idx) => (idx === i ? { ...l, [key]: val } : l)));
  const addLine = () => setLines((p) => [...p, { productId: '', quantity: 1 }]);
  const removeLine = (i) => setLines((p) => p.filter((_, idx) => idx !== i));

  const submit = async (e) => {
    e.preventDefault();
    if (!fromId || !toId) {
      setError('Please select both source and destination locations');
      return;
    }
    if (fromId === toId) {
      setError('Source and destination locations cannot be the same');
      return;
    }
    const validLines = lines.filter((l) => l.productId && Number(l.quantity) > 0);
    if (validLines.length === 0) {
      setError('Please add at least one product line');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await warehouseApi.transferStock({
        fromWarehouseId: Number(fromId),
        toWarehouseId: Number(toId),
        notes,
        items: validLines.map((l) => ({ productId: Number(l.productId), quantity: Number(l.quantity) })),
      });
      toast.success('Stock transferred successfully');
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Transfer failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Create Inter-Location Stock Transfer" onClose={onClose} maxWidth={650}>
      {error && <div className="banner banner-error"><i className="ti ti-alert-circle" /><span>{error}</span></div>}
      <form onSubmit={submit}>
        <div className="field-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label className="field-label">Source Location (From)</label>
            <select className="field-input" value={fromId} onChange={(e) => setFromId(e.target.value)} required>
              <option value="">Select source warehouse…</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Destination Location (To)</label>
            <select className="field-input" value={toId} onChange={(e) => setToId(e.target.value)} required>
              <option value="">Select destination warehouse…</option>
              {warehouses.filter((w) => String(w.id) !== String(fromId)).map((w) => (
                <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label className="field-label">Transfer Notes / Reason</label>
          <input className="field-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Store replenishment, seasonal transfer…" />
        </div>

        <label className="field-label">Items to Transfer</label>
        {lines.map((line, i) => {
          const avail = sourceStock.find((s) => String(s.productId) === String(line.productId))?.quantity || 0;
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr 32px', gap: 8, marginBottom: 8 }}>
              <select className="field-input" value={line.productId} onChange={(e) => updateLine(i, 'productId', e.target.value)} required>
                <option value="">Select item to transfer…</option>
                {sourceStock.map((s) => (
                  <option key={s.productId} value={s.productId}>
                    {s.productName} ({s.quantity} available in source)
                  </option>
                ))}
              </select>
              <input
                className="field-input"
                type="number"
                min="1"
                max={avail || undefined}
                placeholder="Qty"
                value={line.quantity}
                onChange={(e) => updateLine(i, 'quantity', e.target.value)}
                required
              />
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => removeLine(i)} disabled={lines.length === 1}>
                <i className="ti ti-trash" style={{ fontSize: 14 }} />
              </button>
            </div>
          );
        })}

        <button type="button" className="btn btn-secondary btn-sm" onClick={addLine} style={{ marginBottom: 16 }}>
          <i className="ti ti-plus" /> Add line
        </button>

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving || !fromId || !toId}>
            {saving ? 'Processing…' : 'Execute Transfer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function TransferChallanModal({ transfer, onClose }) {
  if (!transfer) return null;

  const handlePrint = () => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    const itemsHtml = (transfer.items || []).map((itm, idx) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${idx + 1}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">${itm.productName}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">${itm.quantity}</td>
      </tr>
    `).join('');

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Stock Transfer Delivery Challan - ${transfer.transferNumber}</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 30px; color: #111; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
          th { text-align: left; padding: 8px; background: #f4f4f4; border-bottom: 2px solid #ccc; font-size: 12px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 12px; font-size: 13px; }
          .box { border: 1px solid #ddd; padding: 12px; border-radius: 6px; }
          .signs { margin-top: 60px; display: flex; justify-content: space-between; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">STOCK TRANSFER DELIVERY CHALLAN</div>
            <div style="font-size: 13px; color: #555; margin-top: 4px;">Challan #: <strong>${transfer.transferNumber}</strong></div>
            <div style="font-size: 13px; color: #555;">Date: ${fmtDate(transfer.transferDate)}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 12px; color: #555;">STATUS: <strong style="color: green;">${transfer.status}</strong></div>
            <div style="font-size: 12px; color: #555; margin-top: 4px;">Dispatched By: ${transfer.createdByName || 'Warehouse Manager'}</div>
          </div>
        </div>

        <div class="grid">
          <div class="box">
            <div style="font-weight: bold; margin-bottom: 4px; color: #444;">SOURCE LOCATION (FROM)</div>
            <div style="font-size: 15px; font-weight: bold;">${transfer.fromWarehouseName}</div>
          </div>
          <div class="box">
            <div style="font-weight: bold; margin-bottom: 4px; color: #444;">DESTINATION LOCATION (TO)</div>
            <div style="font-size: 15px; font-weight: bold;">${transfer.toWarehouseName}</div>
          </div>
        </div>

        ${transfer.notes ? `<div style="margin-top: 12px; font-size: 12px; color: #555;">Notes: <em>${transfer.notes}</em></div>` : ''}

        <table>
          <thead>
            <tr>
              <th style="width: 40px;">#</th>
              <th>Product Description</th>
              <th style="text-align: right; width: 100px;">Quantity</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="signs">
          <div>
            <div>Dispatched By (Driver / Handler):</div>
            <div style="margin-top: 30px;">Signature: ______________________</div>
          </div>
          <div>
            <div>Received & Verified By (Receiver):</div>
            <div style="margin-top: 30px;">Signature: ______________________</div>
          </div>
        </div>
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 1500);
    }, 400);
  };

  return (
    <Modal title={`Transfer Challan · ${transfer.transferNumber}`} onClose={onClose} maxWidth={560}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div className="card card-pad" style={{ padding: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Dispatched From</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>{transfer.fromWarehouseName}</div>
        </div>
        <div className="card card-pad" style={{ padding: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Delivered To</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--brand)', marginTop: 4 }}>{transfer.toWarehouseName}</div>
        </div>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
        Date: {fmtDate(transfer.transferDate)} · Handled By: <strong>{transfer.createdByName || 'Staff'}</strong>
      </div>

      <div className="table-responsive" style={{ maxHeight: 220, marginBottom: 16 }}>
        <table className="table" style={{ fontSize: 12 }}>
          <thead>
            <tr>
              <th>Item</th>
              <th style={{ textAlign: 'right' }}>Quantity</th>
            </tr>
          </thead>
          <tbody>
            {(transfer.items || []).map((itm) => (
              <tr key={itm.id}>
                <td style={{ fontWeight: 600 }}>{itm.productName}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{itm.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
        <button type="button" className="btn btn-primary" onClick={handlePrint}>
          <i className="ti ti-printer" /> Print Transfer Challan
        </button>
      </div>
    </Modal>
  );
}

export default function Inventory() {
  const [params, setParams] = useSearchParams();
  const productIdFilter = params.get('productId') || '';
  const tabParam = params.get('tab');

  const [activeTab, setActiveTab] = useState(tabParam === 'batches' ? 'batches' : 'movements'); // movements | warehouses | transfers | batches

  // Tab 1 state: Stock Movements
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [showScan, setShowScan] = useState(false);
  const [presetProductId, setPresetProductId] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [lowStock, setLowStock] = useState([]);

  // Tab 2 state: Warehouses
  const [warehouses, setWarehouses] = useState([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [showAddWarehouse, setShowAddWarehouse] = useState(false);
  const [viewStockWarehouse, setViewStockWarehouse] = useState(null);

  // Tab 3 state: Transfers
  const [transfers, setTransfers] = useState([]);
  const [loadingTransfers, setLoadingTransfers] = useState(false);
  const [transferPage, setTransferPage] = useState(0);
  const [totalTransferPages, setTotalTransferPages] = useState(0);
  const [showNewTransfer, setShowNewTransfer] = useState(false);
  const [viewChallan, setViewChallan] = useState(null);

  // Tab 4 state: Batches & Expiry (FEFO)
  const [batches, setBatches] = useState([]);
  const [batchSummary, setBatchSummary] = useState(null);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [batchFilter, setBatchFilter] = useState('ALL'); // ALL | EXPIRING_30 | EXPIRING_90 | EXPIRED | ACTIVE
  const [batchSearch, setBatchSearch] = useState('');
  const [batchPage, setBatchPage] = useState(0);
  const [batchTotalPages, setBatchTotalPages] = useState(0);
  const [showNewBatch, setShowNewBatch] = useState(false);
  const [adjustBatch, setAdjustBatch] = useState(null);

  const loadMovements = useCallback(() => {
    setLoading(true);
    stockApi
      .list({ page, size: 20, productId: productIdFilter || undefined })
      .then((r) => { setRows(r.data.data.content || []); setTotalPages(r.data.data.totalPages || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, productIdFilter]);

  const loadWarehouses = useCallback(() => {
    setLoadingWarehouses(true);
    warehouseApi.listWarehouses()
      .then((r) => setWarehouses(r.data?.data || []))
      .catch(() => {})
      .finally(() => setLoadingWarehouses(false));
  }, []);

  const loadTransfers = useCallback(() => {
    setLoadingTransfers(true);
    warehouseApi.listTransfers({ page: transferPage, size: 20 })
      .then((r) => {
        setTransfers(r.data?.data?.content || []);
        setTotalTransferPages(r.data?.data?.totalPages || 0);
      })
      .catch(() => {})
      .finally(() => setLoadingTransfers(false));
  }, [transferPage]);

  const loadBatches = useCallback(() => {
    setLoadingBatches(true);
    batchApi.list({
      page: batchPage,
      size: 20,
      filter: batchFilter === 'ALL' ? undefined : batchFilter,
      query: batchSearch.trim() || undefined,
      productId: productIdFilter || undefined,
    })
      .then((r) => {
        setBatches(r.data?.data?.content || []);
        setBatchTotalPages(r.data?.data?.totalPages || 0);
      })
      .catch(() => {})
      .finally(() => setLoadingBatches(false));

    batchApi.summary()
      .then((r) => setBatchSummary(r.data?.data || null))
      .catch(() => {});
  }, [batchPage, batchFilter, batchSearch, productIdFilter]);

  useEffect(() => {
    productApi.list({ page: 0, size: 200 }).then((r) => setAllProducts(r.data.data.content || [])).catch(() => {});
    productApi.lowStock().then((r) => setLowStock(r.data.data || [])).catch(() => {});
    batchApi.summary().then((r) => setBatchSummary(r.data?.data || null)).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === 'movements') loadMovements();
    if (activeTab === 'warehouses') loadWarehouses();
    if (activeTab === 'transfers') {
      loadTransfers();
      loadWarehouses();
    }
    if (activeTab === 'batches') loadBatches();
  }, [activeTab, loadMovements, loadWarehouses, loadTransfers, loadBatches]);

  const onSaved = () => {
    setShowModal(false);
    setPresetProductId(null);
    loadMovements();
    productApi.lowStock().then((r) => setLowStock(r.data.data || [])).catch(() => {});
  };

  const handleBarcodeScanned = (product) => {
    setPresetProductId(product.id);
    setShowModal(true);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Stock & Warehouses</h1>
          <p className="page-subtitle">Track multi-location inventory levels, record adjustments, and execute inter-branch transfers.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {activeTab === 'movements' && (
            <>
              <button className="btn btn-secondary" onClick={() => setShowScan(true)}>
                <i className="ti ti-scan" /> Scan barcode
              </button>
              <button className="btn btn-primary" onClick={() => { setPresetProductId(null); setShowModal(true); }}>
                <i className="ti ti-plus" /> Adjust stock
              </button>
            </>
          )}

          {activeTab === 'warehouses' && (
            <button className="btn btn-primary" onClick={() => setShowAddWarehouse(true)}>
              <i className="ti ti-plus" /> Add Location / Branch
            </button>
          )}

          {activeTab === 'transfers' && (
            <button className="btn btn-primary" onClick={() => setShowNewTransfer(true)}>
              <i className="ti ti-arrows-exchange" /> New Stock Transfer
            </button>
          )}

          {activeTab === 'batches' && (
            <button className="btn btn-primary" onClick={() => setShowNewBatch(true)}>
              <i className="ti ti-plus" /> Inward New Batch
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="intel-tabs" style={{ marginBottom: 16 }}>
        <button
          className={`intel-tab ${activeTab === 'movements' ? 'active' : ''}`}
          onClick={() => setActiveTab('movements')}
        >
          <i className="ti ti-history" /> Stock Movements & Adjustments
        </button>
        <button
          className={`intel-tab ${activeTab === 'warehouses' ? 'active' : ''}`}
          onClick={() => setActiveTab('warehouses')}
        >
          <i className="ti ti-building-warehouse" /> Warehouses & Outlets ({warehouses.length})
        </button>
        <button
          className={`intel-tab ${activeTab === 'transfers' ? 'active' : ''}`}
          onClick={() => setActiveTab('transfers')}
        >
          <i className="ti ti-truck" /> Inter-Location Transfers
        </button>
        <button
          className={`intel-tab ${activeTab === 'batches' ? 'active' : ''}`}
          onClick={() => setActiveTab('batches')}
        >
          <i className="ti ti-calendar-time" /> Batches & Expiry (FEFO)
          {batchSummary && (Number(batchSummary.expiringIn30Days || 0) + Number(batchSummary.expiredBatches || 0)) > 0 && (
            <span
              style={{
                marginLeft: 6,
                padding: '1px 6px',
                borderRadius: 10,
                fontSize: 10.5,
                fontWeight: 700,
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              {Number(batchSummary.expiringIn30Days || 0) + Number(batchSummary.expiredBatches || 0)}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: MOVEMENTS */}
      {activeTab === 'movements' && (
        <>
          {lowStock.length > 0 && (
            <div className="banner banner-error" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ti ti-alert-triangle" />
                <span><strong>{lowStock.length} product(s)</strong> are running low on stock.</span>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  const first = lowStock[0];
                  setParams({ productId: String(first.id) });
                }}
              >
                Filter low stock
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
            <label className="field-label" style={{ margin: 0 }}>Filter product:</label>
            <select
              className="field-input"
              style={{ width: 240 }}
              value={productIdFilter}
              onChange={(e) => {
                if (e.target.value) setParams({ productId: e.target.value });
                else setParams({});
                setPage(0);
              }}
            >
              <option value="">All products</option>
              {allProducts.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {productIdFilter && (
              <button className="btn btn-ghost btn-sm" onClick={() => { setParams({}); setPage(0); }}>
                Clear
              </button>
            )}
          </div>

          <div className="table-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Type</th>
                  <th style={{ textAlign: 'right' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Resulting</th>
                  <th>Reason</th>
                  <th>Recorded By</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="skeleton-row">{[...Array(8)].map((__, j) => <td key={j}><div className="skeleton-bar" style={{ width: '60%' }} /></td>)}</tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-secondary)' }}>
                      No stock movement records found.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{r.productName}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{r.productSku}</td>
                      <td>
                        <span className={`badge ${r.direction === 'IN' ? 'badge-success' : 'badge-danger'}`}>
                          {r.direction === 'IN' ? '+ Stock IN' : '− Stock OUT'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{r.quantity}</td>
                      <td style={{ textAlign: 'right' }}>{r.resultingStock}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 12.5 }}>{r.reason || '—'}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 12.5 }}>{r.createdByName || '—'}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 12.5 }}>{fmtDate(r.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && rows.length > 0 && (
            <div className="pagination">
              <button className="btn btn-secondary btn-sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}><i className="ti ti-chevron-left" /> Prev</button>
              <span>Page {page + 1} of {Math.max(1, totalPages)}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setPage((p) => p + 1)} disabled={page + 1 >= totalPages}>Next <i className="ti ti-chevron-right" /></button>
            </div>
          )}
        </>
      )}

      {/* TAB 2: WAREHOUSES & OUTLETS */}
      {activeTab === 'warehouses' && (
        <>
          {loadingWarehouses ? (
            <div className="stat-grid">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="stat-card">
                  <div className="skeleton-bar" style={{ width: '100%', height: 40 }} />
                </div>
              ))}
            </div>
          ) : warehouses.length === 0 ? (
            <EmptyState
              icon="ti-building-warehouse"
              title="No locations configured"
              description="Add your first store branch, depot, or warehouse."
              actionText="Add Location"
              onAction={() => setShowAddWarehouse(true)}
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {warehouses.map((w) => (
                <div key={w.id} className="card card-pad" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{w.name}</div>
                        <div style={{ fontSize: 11.5, fontFamily: 'monospace', color: 'var(--brand)', marginTop: 2 }}>{w.code}</div>
                      </div>
                      <span className={`badge ${w.type === 'STORE' ? 'badge-warning' : 'badge-neutral'}`} style={{ fontSize: 10.5 }}>
                        {w.type}
                      </span>
                    </div>

                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10 }}>
                      {w.address && <div><i className="ti ti-map-pin" style={{ marginRight: 6 }} />{w.address}{w.city ? `, ${w.city}` : ''}</div>}
                      {w.phone && <div><i className="ti ti-phone" style={{ marginRight: 6 }} />{w.phone}</div>}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14, background: 'var(--surface-3)', padding: 10, borderRadius: 8 }}>
                      <div>
                        <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>SKUs Stocked</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>{w.totalSkus || 0}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Units</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--brand)', marginTop: 2 }}>{w.totalQuantity || 0}</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                    {w.isDefault ? (
                      <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}><i className="ti ti-check" /> Primary Location</span>
                    ) : <span />}
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setViewStockWarehouse(w)}
                    >
                      <i className="ti ti-eye" /> View Stock
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* TAB 3: TRANSFERS */}
      {activeTab === 'transfers' && (
        <>
          <div className="table-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Transfer #</th>
                  <th>Date</th>
                  <th>Source (From)</th>
                  <th>Destination (To)</th>
                  <th style={{ textAlign: 'right' }}>Items</th>
                  <th>Dispatched By</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingTransfers ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i} className="skeleton-row">{[...Array(8)].map((__, j) => <td key={j}><div className="skeleton-bar" style={{ width: '60%' }} /></td>)}</tr>
                  ))
                ) : transfers.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <EmptyState
                        icon="ti-truck"
                        title="No inter-location transfers yet"
                        description="Transfer inventory between warehouses and store branches to balance stock."
                        actionText="Create Stock Transfer"
                        onAction={() => setShowNewTransfer(true)}
                        compact
                      />
                    </td>
                  </tr>
                ) : (
                  transfers.map((t) => (
                    <tr key={t.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--brand)' }}>{t.transferNumber}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{fmtDate(t.transferDate)}</td>
                      <td style={{ fontWeight: 600 }}>{t.fromWarehouseName}</td>
                      <td style={{ fontWeight: 600, color: 'var(--brand)' }}>{t.toWarehouseName}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{(t.items || []).length} item(s)</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t.createdByName || 'Staff'}</td>
                      <td>
                        <span className="badge badge-success">{t.status}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '3px 8px', fontSize: 11 }}
                          onClick={() => setViewChallan(t)}
                        >
                          <i className="ti ti-printer" /> Challan
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loadingTransfers && transfers.length > 0 && (
            <div className="pagination">
              <button className="btn btn-secondary btn-sm" onClick={() => setTransferPage((p) => Math.max(0, p - 1))} disabled={transferPage === 0}><i className="ti ti-chevron-left" /> Prev</button>
              <span>Page {transferPage + 1} of {Math.max(1, totalTransferPages)}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setTransferPage((p) => p + 1)} disabled={transferPage + 1 >= totalTransferPages}>Next <i className="ti ti-chevron-right" /></button>
            </div>
          )}
        </>
      )}

      {/* TAB 4: BATCHES & EXPIRY (FEFO) */}
      {activeTab === 'batches' && (
        <div>
          {/* Summary Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
            <div className="card" style={{ padding: '12px 16px', borderLeft: '4px solid var(--danger)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 8, background: 'rgba(239, 68, 68, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontSize: 18 }}>
                <i className="ti ti-alert-octagon" />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5 }}>Expired Batches</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--danger)' }}>
                  {batchSummary?.expiredBatches ?? 0}
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '12px 16px', borderLeft: '4px solid #f59e0b', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 8, background: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b', fontSize: 18 }}>
                <i className="ti ti-alarm" />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5 }}>Expires in ≤ 30 Days</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#f59e0b' }}>
                  {batchSummary?.expiringIn30Days ?? 0}
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '12px 16px', borderLeft: '4px solid #3b82f6', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 8, background: 'rgba(59, 130, 246, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', fontSize: 18 }}>
                <i className="ti ti-clock-hour-4" />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5 }}>Expires in ≤ 90 Days</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#3b82f6' }}>
                  {batchSummary?.expiringIn60Days ?? 0}
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '12px 16px', borderLeft: '4px solid var(--success)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 8, background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', fontSize: 18 }}>
                <i className="ti ti-shield-check" />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5 }}>Active Fresh Batches</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--success)' }}>
                  {batchSummary?.totalActiveBatches ?? 0}
                </div>
              </div>
            </div>
          </div>

          {/* Filter Bar & Search */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { id: 'ALL', label: 'All Batches' },
                { id: 'EXPIRING_30', label: 'Expiring ≤ 30 Days' },
                { id: 'EXPIRING_90', label: 'Expiring ≤ 90 Days' },
                { id: 'EXPIRED', label: 'Expired' },
                { id: 'ACTIVE', label: 'Active Fresh' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  className={`btn btn-sm ${batchFilter === pill.id ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: 11.5, padding: '4px 10px' }}
                  onClick={() => { setBatchFilter(pill.id); setBatchPage(0); }}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                className="field-input"
                style={{ width: 220, height: 32, fontSize: 12 }}
                placeholder="Search batch # (e.g. BAT-2026)..."
                value={batchSearch}
                onChange={(e) => { setBatchSearch(e.target.value); setBatchPage(0); }}
              />
            </div>
          </div>

          {/* Batches Table */}
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Product & SKU</th>
                  <th>Batch Number</th>
                  <th>Mfg Date</th>
                  <th>Expiry Date</th>
                  <th>Shelf-Life Status</th>
                  <th style={{ textAlign: 'right' }}>Stock (Avail / Inward)</th>
                  <th style={{ textAlign: 'right' }}>Cost / MRP</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingBatches ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: 32 }}>
                      <span className="spinner" />
                    </td>
                  </tr>
                ) : batches.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: 0 }}>
                      <EmptyState
                        icon="ti-calendar-off"
                        title="No batches found"
                        description="Record incoming product lots or click 'Inward New Batch' to start tracking expiry dates."
                        actionLabel="Inward New Batch"
                        onAction={() => setShowNewBatch(true)}
                        compact
                      />
                    </td>
                  </tr>
                ) : (
                  batches.map((b) => {
                    const days = b.daysUntilExpiry;
                    let shelfBadgeClass = 'badge-neutral';
                    let shelfLabel = `${days} days left`;
                    if (b.isExpired || days < 0) {
                      shelfBadgeClass = 'badge-danger';
                      shelfLabel = `Expired (${Math.abs(days)}d ago)`;
                    } else if (days <= 30) {
                      shelfBadgeClass = 'badge-danger';
                      shelfLabel = `Urgent · ${days}d left`;
                    } else if (days <= 90) {
                      shelfBadgeClass = 'badge-warning';
                      shelfLabel = `Expiring in ${days}d`;
                    } else {
                      shelfBadgeClass = 'badge-success';
                      shelfLabel = `Fresh · ${days}d left`;
                    }

                    return (
                      <tr key={b.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{b.productName}</div>
                          {b.productSku && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>SKU: {b.productSku}</div>}
                        </td>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, padding: '2px 7px', background: 'var(--surface-sunken)', borderRadius: 4, border: '1px solid var(--border)' }}>
                            {b.batchNumber}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                          {b.mfgDate ? fmtDate(b.mfgDate) : '—'}
                        </td>
                        <td style={{ fontWeight: 600, fontSize: 12.5 }}>
                          {fmtDate(b.expiryDate)}
                        </td>
                        <td>
                          <span className={`badge ${shelfBadgeClass}`} style={{ fontSize: 11 }}>
                            {shelfLabel}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span style={{ fontWeight: 700, color: b.quantity <= 0 ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                            {b.quantity}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}> / {b.initialQuantity}</span>
                        </td>
                        <td style={{ textAlign: 'right', fontSize: 12 }}>
                          {b.purchasePrice ? fmtCurrency(b.purchasePrice) : '—'}
                          {b.sellingPrice && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>MRP: {fmtCurrency(b.sellingPrice)}</div>}
                        </td>
                        <td>
                          <span className={`badge ${b.status === 'ACTIVE' ? 'badge-success' : b.status === 'EXPIRED' ? 'badge-danger' : 'badge-neutral'}`}>
                            {b.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '3px 8px', fontSize: 11 }}
                            onClick={() => setAdjustBatch(b)}
                          >
                            <i className="ti ti-adjustments" /> Adjust / Write-off
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {!loadingBatches && batches.length > 0 && (
            <div className="pagination">
              <button className="btn btn-secondary btn-sm" onClick={() => setBatchPage((p) => Math.max(0, p - 1))} disabled={batchPage === 0}><i className="ti ti-chevron-left" /> Prev</button>
              <span>Page {batchPage + 1} of {Math.max(1, batchTotalPages)}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setBatchPage((p) => p + 1)} disabled={batchPage + 1 >= batchTotalPages}>Next <i className="ti ti-chevron-right" /></button>
            </div>
          )}
        </div>
      )}

      {/* MODALS */}
      {showModal && <AdjustModal presetProductId={presetProductId} onClose={() => { setShowModal(false); setPresetProductId(null); }} onSaved={onSaved} />}
      {showScan && <ScanStockModal onClose={() => setShowScan(false)} onProductFound={handleBarcodeScanned} />}
      {showAddWarehouse && <AddWarehouseModal onClose={() => setShowAddWarehouse(false)} onSaved={() => { setShowAddWarehouse(false); loadWarehouses(); }} />}
      {viewStockWarehouse && <WarehouseStockModal warehouse={viewStockWarehouse} onClose={() => setViewStockWarehouse(null)} />}
      {showNewTransfer && <NewTransferModal warehouses={warehouses} onClose={() => setShowNewTransfer(false)} onSaved={() => { setShowNewTransfer(false); loadTransfers(); loadWarehouses(); }} />}
      {viewChallan && <TransferChallanModal transfer={viewChallan} onClose={() => setViewChallan(null)} />}
      {showNewBatch && <NewBatchModal products={allProducts} onClose={() => setShowNewBatch(false)} onSaved={() => { setShowNewBatch(false); loadBatches(); }} />}
      {adjustBatch && <AdjustBatchModal batch={adjustBatch} onClose={() => setAdjustBatch(null)} onSaved={() => { setAdjustBatch(null); loadBatches(); }} />}
    </div>
  );
}
