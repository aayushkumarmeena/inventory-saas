import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { gstApi } from '../../api/gstApi';
import { salesApi } from '../../api/salesApi';
import { fmtCurrency } from '../../utils/formatters';

const SLABS = [0, 5, 12, 18, 28];

// All 37 Indian States & UTs with official 2-digit GST state codes
// Fixes Bug #1: VARCHAR(3) overflow when full state name was entered
const INDIA_STATES = [
  { code: '01', name: 'Jammu & Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '28', name: 'Andhra Pradesh (Old)' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman & Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh (New)' },
  { code: '38', name: 'Ladakh' },
];

export default function GenerateGstInvoice() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const preselectedSaleId = params.get('saleId');

  const [recentSales, setRecentSales] = useState([]);
  const [loadingSales, setLoadingSales] = useState(true);
  const [saleId, setSaleId] = useState(preselectedSaleId || '');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [buyer, setBuyer] = useState({ buyerName: '', buyerGstin: '', placeOfSupply: '', invoiceType: 'B2C', supplyType: 'INTRA' });
  const [items, setItems] = useState([{ productName: '', hsnSacCode: '', quantity: 1, unitPrice: 0, gstSlab: 18 }]);

  useEffect(() => {
    salesApi.list({ page: 0, size: 30, sort: 'createdAt,desc' })
      .then((r) => setRecentSales(r.data.data.content || []))
      .catch(() => {})
      .finally(() => setLoadingSales(false));
  }, []);

  // When a sale is picked, pull its customer name and line items across so
  // the invoice isn't built blind — HSN code and GST slab still need entry
  // per item since sales don't carry that tax metadata.
  const pickSale = (id) => {
    setSaleId(id);
    const sale = recentSales.find((s) => String(s.id) === String(id));
    if (!sale) return;
    setBuyer((b) => ({ ...b, buyerName: sale.customerName || b.buyerName }));
    if (sale.items?.length) {
      setItems(sale.items.map((it) => ({
        productName: it.productName,
        hsnSacCode: '',
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
        gstSlab: 18,
      })));
    }
  };

  const updBuyer = (k, v) => setBuyer((b) => {
    const n = { ...b, [k]: v };
    if (k === 'buyerGstin') n.invoiceType = v ? 'B2B' : 'B2C';
    return n;
  });
  const updItem = (i, k, v) => setItems((p) => p.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)));
  const addItem = () => setItems((p) => [...p, { productName: '', hsnSacCode: '', quantity: 1, unitPrice: 0, gstSlab: 18 }]);
  const removeItem = (i) => setItems((p) => p.filter((_, idx) => idx !== i));

  const total = items.reduce((sum, it) => sum + Number(it.quantity || 0) * Number(it.unitPrice || 0), 0);

  const submit = async () => {
    setLoading(true);
    setError('');
    const inter = buyer.supplyType !== 'INTRA';
    try {
      const r = await gstApi.generateInvoice({
        saleId: Number(saleId),
        ...buyer,
        invoiceDate: new Date().toISOString().slice(0, 10),
        items: items.map((it) => ({
          hsnSacCode: it.hsnSacCode, productName: it.productName, uom: 'PCS',
          quantity: Number(it.quantity), unitPrice: Number(it.unitPrice), discountAmount: 0, taxInclusive: false,
          cgstRate: inter ? 0 : it.gstSlab / 2, sgstRate: inter ? 0 : it.gstSlab / 2, igstRate: inter ? it.gstSlab : 0, cessRate: 0,
        })),
      });
      setResult(r.data.data);
      setStep(2);
    } catch (e) {
      setError(e.response?.data?.message || (e.request ? 'Could not reach the server.' : 'Failed to generate invoice.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ maxWidth: 820 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-ghost btn-icon" onClick={() => nav('/gst/invoices')}><i className="ti ti-arrow-left" /></button>
        <h1 className="page-title" style={{ margin: 0 }}>Generate GST invoice</h1>
      </div>

      {error && <div className="banner banner-error"><i className="ti ti-alert-circle" /><span>{error}</span></div>}

      {step === 1 && (
        <div className="card card-pad">
          <div style={{ marginBottom: 16 }}>
            <label className="field-label">Sale</label>
            {loadingSales ? (
              <div className="skeleton-bar" style={{ width: '100%', height: 36 }} />
            ) : recentSales.length === 0 ? (
              <div className="banner" style={{ background: 'var(--glass-bg-strong)', color: 'var(--text-secondary)', border: '1px solid var(--glass-border)' }}>
                <i className="ti ti-info-circle" />
                <span>No recorded sales found. You can still enter a Sale ID manually below.</span>
              </div>
            ) : (
              <select className="field-input" value={saleId} onChange={(e) => pickSale(e.target.value)}>
                <option value="">Select a sale…</option>
                {recentSales.map((s) => (
                  <option key={s.id} value={s.id}>{s.saleNumber} · {s.customerName || 'Walk-in'} · {fmtCurrency(s.totalAmount)}</option>
                ))}
              </select>
            )}
            {(recentSales.length === 0 || !saleId) && (
              <input
                className="field-input"
                style={{ marginTop: 8 }}
                value={saleId}
                onChange={(e) => setSaleId(e.target.value)}
                placeholder="Or enter Sale ID manually"
              />
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label className="field-label">Buyer name</label>
              <input className="field-input" value={buyer.buyerName} onChange={(e) => updBuyer('buyerName', e.target.value)} />
            </div>
            <div>
              <label className="field-label">Buyer GSTIN (blank = B2C)</label>
              <input className="field-input" value={buyer.buyerGstin} onChange={(e) => updBuyer('buyerGstin', e.target.value.toUpperCase())} />
            </div>
            <div>
              <label className="field-label">Place of supply *</label>
              <select
                className="field-input"
                value={buyer.placeOfSupply}
                onChange={(e) => {
                  const code = e.target.value;
                  const st = INDIA_STATES.find((s) => s.code === code);
                  setBuyer((b) => ({
                    ...b,
                    placeOfSupply: code,
                    buyerStateCode: code,
                    buyerState: st ? st.name : b.buyerState,
                  }));
                }}
              >
                <option value="">Select state/UT…</option>
                {INDIA_STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.code} – {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Supply type</label>
              <select className="field-input" value={buyer.supplyType} onChange={(e) => updBuyer('supplyType', e.target.value)}>
                <option value="INTRA">Intra-State</option>
                <option value="INTER">Inter-State</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Line items</div>
            <button className="btn btn-secondary btn-sm" onClick={addItem}><i className="ti ti-plus" /> Add item</button>
          </div>

          {items.map((it, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.7fr 1fr 1fr 32px', gap: 8, marginBottom: 8 }} className="item-row-grid">
              <input className="field-input" placeholder="Product" value={it.productName} onChange={(e) => updItem(i, 'productName', e.target.value)} />
              <input className="field-input" placeholder="HSN/SAC" value={it.hsnSacCode} onChange={(e) => updItem(i, 'hsnSacCode', e.target.value)} />
              <input className="field-input" type="number" value={it.quantity} onChange={(e) => updItem(i, 'quantity', e.target.value)} />
              <input className="field-input" type="number" value={it.unitPrice} onChange={(e) => updItem(i, 'unitPrice', e.target.value)} />
              <select className="field-input" value={it.gstSlab} onChange={(e) => updItem(i, 'gstSlab', Number(e.target.value))}>
                {SLABS.map((s) => <option key={s} value={s}>{s}%</option>)}
              </select>
              <button className="btn btn-ghost btn-icon" onClick={() => removeItem(i)} disabled={items.length === 1}><i className="ti ti-trash" style={{ fontSize: 13 }} /></button>
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid var(--border)', marginTop: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Estimated total (excl. tax)</span>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{fmtCurrency(total)}</span>
          </div>

          <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={submit} disabled={loading || !saleId || !buyer.placeOfSupply}>
            {loading && <span className="spinner" />}
            <i className="ti ti-bolt" /> {loading ? 'Generating…' : 'Generate invoice'}
          </button>
        </div>
      )}

      {step === 2 && result && (
        <div className="card card-pad" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <i className="ti ti-check" style={{ fontSize: 26, color: 'var(--success-text)' }} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>GST invoice generated</div>
          <div style={{ fontFamily: 'monospace', color: 'var(--brand)', fontSize: 14, marginBottom: 4 }}>{result.invoiceNumber}</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 22 }}>Total: <strong style={{ color: 'var(--text-primary)' }}>{fmtCurrency(result.totalAmount)}</strong></div>
          <button className="btn btn-primary" onClick={() => nav('/gst/invoices')}>View all invoices</button>
        </div>
      )}
    </div>
  );
}
