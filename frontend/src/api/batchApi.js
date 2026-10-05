import apiClient from './axiosConfig';

export const batchApi = {
  list: (params) => apiClient.get('/batches', { params }),
  summary: () => apiClient.get('/batches/summary'),
  getFefoBatches: (productId) => apiClient.get(`/batches/product/${productId}/fefo`),
  create: (data) => apiClient.post('/batches', data),
  adjust: (id, data) => apiClient.post(`/batches/${id}/adjust`, data),
};

export default batchApi;
