import apiClient from './axiosConfig';

export const analyticsApi = {
  overview: (days) => apiClient.get('/analytics/overview', { params: { days } }),
};

export default analyticsApi;
