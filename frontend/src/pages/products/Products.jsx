import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { productApi } from '../../api/productApi';
import { fmtCurrency, downloadBlob } from '../../utils/formatters';
import { useToast } from '../../context/ToastContext';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import Modal from '../../components/Modal';
import ProductQrModal from '../../components/ProductQrModal';
import ProgressBar from '../../components/ProgressBar';
import EmptyState from '../../components/EmptyState';
import ConfirmDialog from '../../components/ConfirmDialog';

const emptyForm = {
  sku: '',
  name: '',
  category: '',
  imageUrl: '',
  barcode: '',
  price: '',
  stockQuantity: '',
  reorderLevel: '',
  hsnSacCode: '',
};

function ProductModal({ product, onClose, onSaved }) {
  const isEdit = Boolean(product);
  const [form, setForm] = useState(
    product
      ? {
          sku: product.sku,
          name: product.name,
          category: product.categoryName || '',
          imageUrl: product.imageUrl || '',
          barcode: product.barcode || '',
          price: product.price,
          stockQuantity: product.stockQuantity,
          reorderLevel: product.reorderPoint,
          hsnSacCode: product.hsnSacCode || '',
        }
      : emptyForm
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      sku: form.sku,
      name: form.name,
      category: form.category || null,
      imageUrl: form.imageUrl || null,
      barcode: form.barcode || null,
      price: Number(form.price),
      stockQuantity: Number(form.stockQuantity || 0),
      reorderLevel: Number(form.reorderLevel || 10),
      hsnSacCode: form.hsnSacCode || null,
    };
    try {
      if (isEdit) {
        await productApi.update(product.id, payload);
        toast.success('Product updated');
      } else {
        await productApi.create(payload);
        toast.success('Product added');
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || (err.request ? 'Could not reach the server.' : 'Something went wrong'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? 'Edit product' : 'Add product'} onClose={onClose}>
      {error && (
        <div className="banner banner-error">
          <i className="ti ti-alert-circle" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={submit}>
        <div style={{ display: 'flex', gap: 14, marginBottom: 14, alignItems: 'flex-start' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 10,
              flexShrink: 0,
              overflow: 'hidden',
              background: 'var(--glass-bg-strong)',
              border: '1px solid var(--glass-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {form.imageUrl ? (
              <img src={form.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
            ) : (
              <i className="ti ti-package" style={{ fontSize: 22, color: 'var(--text-secondary)' }} />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <label className="field-label">Image URL (optional)</label>
            <input className="field-input" value={form.imageUrl} onChange={set('imageUrl')} placeholder="https://…" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }} className="field-grid">
          <div>
            <label className="field-label">SKU</label>
            <input className="field-input" value={form.sku} onChange={set('sku')} required />
          </div>
          <div>
            <label className="field-label">Category</label>
            <input className="field-input" value={form.category} onChange={set('category')} placeholder="Electronics" />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label className="field-label">Product name</label>
          <input className="field-input" value={form.name} onChange={set('name')} required />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }} className="field-grid">
          <div>
            <label className="field-label">Price (₹)</label>
            <input className="field-input" type="number" step="0.01" min="0" value={form.price} onChange={set('price')} required />
          </div>
          <div>
            <label className="field-label">Stock qty</label>
            <input className="field-input" type="number" min="0" value={form.stockQuantity} onChange={set('stockQuantity')} />
          </div>
          <div>
            <label className="field-label">Reorder at</label>
            <input className="field-input" type="number" min="0" value={form.reorderLevel} onChange={set('reorderLevel')} />
          </div>
        </div>

        <div style={{ marginBottom: 12 }} className="field-grid">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="field-label">HSN / SAC code (optional)</label>
              <input className="field-input" value={form.hsnSacCode} onChange={set('hsnSacCode')} placeholder="8471" />
            </div>
            <div>
              <label className="field-label">Barcode (optional)</label>
              <input className="field-input" value={form.barcode} onChange={set('barcode')} placeholder="Manufacturer UPC/EAN" />
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving && <span className="spinner" />}
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add product'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Products() {
  const nav = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 350);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [modal, setModal] = useState(null); // null | 'new' | product object
  const [qrProduct, setQrProduct] = useState(null);
  const [deleteProduct, setDeleteProduct] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    productApi
      .list({ page, size: 40, q: debouncedSearch || undefined })
      .then((r) => {
        setProducts(r.data.data.content || []);
        setTotalPages(r.data.data.totalPages || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  const categories = useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      if (p.categoryName) set.add(p.categoryName);
    });
    return Array.from(set);
  }, [products]);

  const filteredProducts = useMemo(() => {
    let list = [...products];
    if (categoryFilter) {
      list = list.filter((p) => p.categoryName === categoryFilter);
    }
    if (sortBy === 'name-asc') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'name-desc') {
      list.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortBy === 'price-asc') {
      list.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sortBy === 'price-desc') {
      list.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (sortBy === 'stock-asc') {
      list.sort((a, b) => Number(a.stockQuantity) - Number(b.stockQuantity));
    } else if (sortBy === 'stock-desc') {
      list.sort((a, b) => Number(b.stockQuantity) - Number(a.stockQuantity));
    }
    return list;
  }, [products, categoryFilter, sortBy]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const r = await productApi.export({ q: debouncedSearch || undefined });
      downloadBlob(r.data, 'products.csv');
      toast.success('Products exported');
    } catch (err) {
      toast.error('Could not export products');
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteProduct) return;
    setDeleting(true);
    try {
      await productApi.delete(deleteProduct.id);
      toast.success(`Deleted ${deleteProduct.name}`);
      setDeleteProduct(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete product');
    } finally {
      setDeleting(false);
    }
  };

  const onSaved = () => {
    setModal(null);
    load();
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Products Catalog</h1>
          <p className="page-subtitle">Manage catalog items, pricing, SKU barcodes, and live inventory levels.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={exportCsv} disabled={exporting}>
            {exporting && <span className="spinner" />}
            <i className="ti ti-download" /> Export CSV
          </button>
          <button className="btn btn-primary" onClick={() => setModal('new')}>
            <i className="ti ti-plus" /> Add product
          </button>
        </div>
      </div>

      {/* Filter and View Controls Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 18,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260, flexWrap: 'wrap' }}>
          <div className="search-wrap" style={{ minWidth: 220 }}>
            <i className="ti ti-search" />
            <input
              className="search-input"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Search by name, SKU or barcode…"
            />
          </div>

          {categories.length > 0 && (
            <select
              className="field-input"
              style={{ width: 'auto', minWidth: 150 }}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}

          <select
            className="field-input"
            style={{ width: 'auto', minWidth: 150 }}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="default">Sort: Default</option>
            <option value="name-asc">Name (A → Z)</option>
            <option value="name-desc">Name (Z → A)</option>
            <option value="price-asc">Price (Low → High)</option>
            <option value="price-desc">Price (High → Low)</option>
            <option value="stock-asc">Stock (Low → High)</option>
            <option value="stock-desc">Stock (High → Low)</option>
          </select>
        </div>

        {/* View Mode Toggle Buttons */}
        <div style={{ display: 'flex', background: 'var(--surface-3)', borderRadius: 10, padding: 3, gap: 2 }}>
          <button
            type="button"
            className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewMode('table')}
            aria-label="Table View"
            title="Table View"
            style={{ padding: '6px 12px' }}
          >
            <i className="ti ti-list" /> Table
          </button>
          <button
            type="button"
            className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewMode('grid')}
            aria-label="Grid View"
            title="Grid Cards View"
            style={{ padding: '6px 12px' }}
          >
            <i className="ti ti-layout-grid" /> Grid
          </button>
        </div>
      </div>

      {/* Grid or Table View */}
      {viewMode === 'grid' ? (
        loading ? (
          <div className="product-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="product-card" style={{ height: 260 }}>
                <div className="skeleton-bar" style={{ height: 130, borderRadius: 0 }} />
                <div style={{ padding: 14 }}>
                  <div className="skeleton-bar" style={{ width: '70%', height: 16, marginBottom: 8 }} />
                  <div className="skeleton-bar" style={{ width: '40%', height: 14 }} />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="card card-pad">
            <EmptyState
              icon="ti-package-off"
              title="No products found"
              description={search || categoryFilter ? 'Try clearing your filters or search terms.' : 'Add your first product to get started.'}
              actionText={!search && !categoryFilter ? 'Add product' : undefined}
              onAction={() => setModal('new')}
            />
          </div>
        ) : (
          <div className="product-grid">
            {filteredProducts.map((p) => {
              const maxStockEstimate = Math.max(Number(p.stockQuantity || 0) * 1.5, Number(p.reorderPoint || 10) * 3, 50);
              const low = p.stockQuantity <= p.reorderPoint;
              return (
                <div key={p.id} className="product-card" onClick={() => setModal(p)}>
                  <div className="product-card-thumb">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} onError={(e) => { e.target.style.display = 'none'; }} />
                    ) : (
                      <i className="ti ti-package" style={{ fontSize: 36, color: 'var(--text-secondary)', opacity: 0.5 }} />
                    )}
                    {low && (
                      <span className="badge badge-danger" style={{ position: 'absolute', top: 8, right: 8 }}>
                        Low Stock
                      </span>
                    )}
                    {p.categoryName && (
                      <span className="badge badge-neutral" style={{ position: 'absolute', bottom: 8, left: 8 }}>
                        {p.categoryName}
                      </span>
                    )}
                  </div>
                  <div className="product-card-body">
                    <div className="product-card-title" title={p.name}>{p.name}</div>
                    <div className="product-card-meta">
                      <span style={{ fontFamily: 'monospace' }}>{p.sku}</span>
                      <span className="product-card-price">{fmtCurrency(p.price)}</span>
                    </div>

                    <div className="product-card-stock">
                      <ProgressBar
                        value={p.stockQuantity}
                        max={maxStockEstimate}
                        reorderPoint={p.reorderPoint}
                        showLabel
                        height={6}
                      />
                    </div>

                    <div className="product-card-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon btn-sm"
                        title="Show QR Code"
                        onClick={() => setQrProduct(p)}
                      >
                        <i className="ti ti-qrcode" style={{ fontSize: 13 }} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon btn-sm"
                        title="Adjust Stock History"
                        onClick={() => nav(`/inventory?productId=${p.id}`)}
                      >
                        <i className="ti ti-arrows-exchange" style={{ fontSize: 13 }} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon btn-sm"
                        title="Edit product"
                        onClick={() => setModal(p)}
                      >
                        <i className="ti ti-edit" style={{ fontSize: 13 }} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>SKU</th>
                <th>Category</th>
                <th style={{ textAlign: 'right' }}>Price</th>
                <th style={{ width: 140 }}>Stock Status</th>
                <th>HSN / SAC</th>
                <th style={{ textAlign: 'right' }}>GST%</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="skeleton-row">
                    {[...Array(8)].map((__, j) => (
                      <td key={j}><div className="skeleton-bar" style={{ width: j === 0 ? '70%' : '50%' }} /></td>
                    ))}
                  </tr>
                ))
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      icon="ti-package-off"
                      title="No products found"
                      description={search || categoryFilter ? 'Try clearing your filters or search terms.' : 'Add your first product to get started.'}
                      actionText={!search && !categoryFilter ? 'Add product' : undefined}
                      onAction={() => setModal('new')}
                    />
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const maxStockEstimate = Math.max(Number(p.stockQuantity || 0) * 1.5, Number(p.reorderPoint || 10) * 3, 50);
                  const low = p.stockQuantity <= p.reorderPoint;
                  return (
                    <tr key={p.id} className="is-clickable" onClick={() => setModal(p)}>
                      <td style={{ fontWeight: 500 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              flexShrink: 0,
                              overflow: 'hidden',
                              background: 'var(--glass-bg-strong)',
                              border: '1px solid var(--glass-border)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                            ) : (
                              <i className="ti ti-package" style={{ fontSize: 15, color: 'var(--text-secondary)' }} />
                            )}
                          </div>
                          <div>
                            <div>{p.name}</div>
                            {p.barcode && <div style={{ fontSize: 10.5, color: 'var(--text-secondary)' }}>Barcode: {p.barcode}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 11.5, color: 'var(--text-secondary)' }}>{p.sku}</td>
                      <td>{p.categoryName || <span style={{ color: 'var(--text-secondary)' }}>—</span>}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtCurrency(p.price)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className={`badge ${low ? 'badge-danger' : 'badge-neutral'}`} style={{ minWidth: 28, textAlign: 'center' }}>
                            {p.stockQuantity}
                          </span>
                          <div style={{ flex: 1, minWidth: 60 }}>
                            <ProgressBar
                              value={p.stockQuantity}
                              max={maxStockEstimate}
                              reorderPoint={p.reorderPoint}
                              height={5}
                            />
                          </div>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 11.5, color: 'var(--text-secondary)' }}>{p.hsnSacCode || '—'}</td>
                      <td style={{ textAlign: 'right' }}>{p.igstRate || 0}%</td>
                      <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-icon btn-sm"
                          title="Show QR code"
                          onClick={() => setQrProduct(p)}
                        >
                          <i className="ti ti-qrcode" style={{ fontSize: 13 }} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-icon btn-sm"
                          title="View stock movements"
                          onClick={() => nav(`/inventory?productId=${p.id}`)}
                        >
                          <i className="ti ti-arrows-exchange" style={{ fontSize: 13 }} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-icon btn-sm"
                          title="Delete product"
                          style={{ color: '#ef4444' }}
                          onClick={() => setDeleteProduct(p)}
                        >
                          <i className="ti ti-trash" style={{ fontSize: 13 }} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && products.length > 0 && (
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

      {modal && (
        <ProductModal
          product={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}

      {qrProduct && <ProductQrModal product={qrProduct} onClose={() => setQrProduct(null)} />}

      {deleteProduct && (
        <ConfirmDialog
          isOpen={Boolean(deleteProduct)}
          title="Delete Product"
          message={`Are you sure you want to delete "${deleteProduct.name}" (SKU: ${deleteProduct.sku})? This cannot be undone.`}
          confirmText="Delete product"
          variant="danger"
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteProduct(null)}
        />
      )}
    </div>
  );
}