import apiClient from './axiosConfig';

export const teamApi = {
  list: () => apiClient.get('/team'),
  invite: (d) => apiClient.post('/team', d),
  updateRole: (id, role) => apiClient.put(`/team/${id}/role`, { role }),
  deactivate: (id) => apiClient.post(`/team/${id}/deactivate`),
  activate: (id) => apiClient.post(`/team/${id}/activate`),
  resetPassword: (id) => apiClient.post(`/team/${id}/reset-password`),
  changeOwnPassword: (d) => apiClient.post('/team/me/change-password', d),
};

export default teamApi;
