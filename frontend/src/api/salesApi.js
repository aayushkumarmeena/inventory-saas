import apiClient from './axiosConfig';

export const salesApi = {
  list: (p) => apiClient.get('/sales', { params: p }),
  getSaleById: (id) => apiClient.get(`/sales/${id}`),
  create: (d) => apiClient.post('/sales', d),
  cancel: (id) => apiClient.post(`/sales/${id}/cancel`),
  recordPayment: (id, d) => apiClient.post(`/sales/${id}/payments`, d),
  createReturn: (id, d) => apiClient.post(`/sales/${id}/returns`, d),
  export: (params) => apiClient.get('/sales/export', { params, responseType: 'blob' }),
};

export default salesApi;
