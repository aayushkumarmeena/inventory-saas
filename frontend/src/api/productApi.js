import apiClient from './axiosConfig';

export const productApi = {
  list: (p) => apiClient.get('/products', { params: p }),
  get: (id) => apiClient.get(`/products/${id}`),
  create: (d) => apiClient.post('/products', d),
  update: (id, d) => apiClient.put(`/products/${id}`, d),
  delete: (id) => apiClient.delete(`/products/${id}`),
  lowStock: () => apiClient.get('/products/low-stock'),
  lookupBySku: (sku) => apiClient.get(`/products/lookup/${encodeURIComponent(sku)}`),
  lookupByBarcode: (barcode) => apiClient.get(`/products/lookup-barcode/${encodeURIComponent(barcode)}`),
  export: (params) => apiClient.get('/products/export', { params, responseType: 'blob' }),
};

export default productApi;
