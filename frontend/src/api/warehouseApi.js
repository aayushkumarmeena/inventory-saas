import apiClient from './axiosConfig';

export const warehouseApi = {
  listWarehouses: () => apiClient.get('/warehouses'),
  createWarehouse: (data) => apiClient.post('/warehouses', data),
  getWarehouseStock: (id) => apiClient.get(`/warehouses/${id}/stock`),
  listTransfers: (params) => apiClient.get('/warehouses/transfers', { params }),
  transferStock: (data) => apiClient.post('/warehouses/transfers', data),
};

export default warehouseApi;
