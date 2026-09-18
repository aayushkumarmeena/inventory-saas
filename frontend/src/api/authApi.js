import apiClient from'./axiosConfig';
export const authApi={login:(d)=>apiClient.post('/auth/login',d),register:(d)=>apiClient.post('/auth/register',d),me:()=>apiClient.get('/auth/me')};
export default authApi;
