import axios from'axios';
const apiClient=axios.create({baseURL:import.meta.env.VITE_API_URL||'http://localhost:8080/api/v1',timeout:30000,headers:{'Content-Type':'application/json'}});
apiClient.interceptors.request.use(c=>{const t=localStorage.getItem('token');if(t)c.headers.Authorization=`Bearer ${t}`;return c;});
apiClient.interceptors.response.use(r=>r,e=>{if(e.response?.status===401){localStorage.clear();window.location.href='/login';}return Promise.reject(e);});
export default apiClient;
