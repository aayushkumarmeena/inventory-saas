import apiClient from './axiosConfig';

export const customerApi = {
  list: (p) => apiClient.get('/customers', { params: p }),
  get: (id) => apiClient.get(`/customers/${id}`),
  create: (d) => apiClient.post('/customers', d),
  update: (id, d) => apiClient.put(`/customers/${id}`, d),
};

export default customerApi;
