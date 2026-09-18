import apiClient from './axiosConfig';

export const purchaseApi = {
  list: (p) => apiClient.get('/purchases', { params: p }),
  get: (id) => apiClient.get(`/purchases/${id}`),
  create: (d) => apiClient.post('/purchases', d),
  cancel: (id) => apiClient.post(`/purchases/${id}/cancel`),
  receive: (id) => apiClient.post(`/purchases/${id}/receive`),
  export: (params) => apiClient.get('/purchases/export', { params, responseType: 'blob' }),
};

export default purchaseApi;
