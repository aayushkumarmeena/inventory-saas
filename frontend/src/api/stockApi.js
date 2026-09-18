import apiClient from './axiosConfig';

export const stockApi = {
  list: (params) => apiClient.get('/stock/adjustments', { params }),
  adjust: (data) => apiClient.post('/stock/adjustments', data),
};

export default stockApi;
