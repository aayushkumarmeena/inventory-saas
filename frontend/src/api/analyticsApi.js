import apiClient from './axiosConfig';

export const analyticsApi = {
  overview: (days) => apiClient.get('/analytics/overview', { params: { days } }),
  profit: (days) => apiClient.get('/analytics/profit', { params: { days } }),
  inventoryIntel: () => apiClient.get('/analytics/inventory-intel'),
};

export default analyticsApi;
