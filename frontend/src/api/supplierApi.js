import apiClient from './axiosConfig';

export const supplierApi = {
  list: (p) => apiClient.get('/suppliers', { params: p }),
  get: (id) => apiClient.get(`/suppliers/${id}`),
  create: (d) => apiClient.post('/suppliers', d),
  update: (id, d) => apiClient.put(`/suppliers/${id}`, d),
};

export default supplierApi;
