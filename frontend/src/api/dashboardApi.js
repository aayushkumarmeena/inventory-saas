import apiClient from'./axiosConfig';
export const dashboardApi={getSummary:()=>apiClient.get('/dashboard/summary'),getAnalytics:(p)=>apiClient.get('/dashboard/analytics',{params:p})};
export default dashboardApi;
