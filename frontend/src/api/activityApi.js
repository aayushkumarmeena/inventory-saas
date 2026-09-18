import apiClient from './axiosConfig';

export const activityApi = {
  list: (p) => apiClient.get('/activity', { params: p }),
};

export default activityApi;
