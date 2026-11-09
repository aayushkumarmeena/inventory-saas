import apiClient from './axiosConfig';

export const expenseApi = {
  list: (p) => apiClient.get('/expenses', { params: p }),
  byRange: (from, to) => apiClient.get('/expenses/range', { params: { from, to } }),
  summary: (from, to) => apiClient.get('/expenses/summary', { params: { from, to } }),
  create: (d) => apiClient.post('/expenses', d),
  update: (id, d) => apiClient.put(`/expenses/${id}`, d),
  delete: (id) => apiClient.delete(`/expenses/${id}`),
};

export default expenseApi;
