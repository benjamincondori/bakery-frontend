import api from '@/lib/axios';
import type { ApiResponse } from '@/types';

const makeService = (base: string) => ({
  getAll: (params?: Record<string, any>) =>
    api.get<ApiResponse<any[]>>(base, { params }).then((r) => r.data),
  getOne: (id: string) =>
    api.get<ApiResponse<any>>(`${base}/${id}`).then((r) => r.data.data),
  create: (data: any) =>
    api.post<ApiResponse<any>>(base, data).then((r) => r.data.data),
  update: (id: string, data: any) =>
    api.patch<ApiResponse<any>>(`${base}/${id}`, data).then((r) => r.data.data),
  remove: (id: string) =>
    api.delete<ApiResponse<any>>(`${base}/${id}`).then((r) => r.data.data),
});

export const customersService = makeService('/customers');
export const usersService = makeService('/users');
export const inventoryService = {
  ...makeService('/inventory/ingredients'),
  getAll: (params?: Record<string, any>) =>
    api.get<ApiResponse<any[]>>('/inventory/ingredients', { params }).then((r) => r.data),
  getLowStock: () => api.get('/inventory/alerts/low-stock').then((r) => r.data.data),
  createMovement: (data: any) =>
    api.post('/inventory/movements', data).then((r) => r.data.data),
  getKardex: (id: string, params?: any) =>
    api.get(`/inventory/ingredients/${id}/kardex`, { params }).then((r) => r.data),
};

export const recipesService = {
  ...makeService('/recipes'),
  calculateCost: (id: string) =>
    api.get(`/recipes/${id}/cost`).then((r) => r.data.data),
};

export const ordersService = {
  ...makeService('/orders'),
  updateStatus: (id: string, status: string) =>
    api.patch(`/orders/${id}/status`, { status }).then((r) => r.data.data),
  cancel: (id: string) =>
    api.patch(`/orders/${id}/cancel`).then((r) => r.data.data),
};

export const productionService = {
  ...makeService('/production'),
  updateStatus: (id: string, data: any) =>
    api.patch(`/production/${id}/status`, data).then((r) => r.data.data),
  assignBaker: (id: string, assignedTo: string) =>
    api.patch(`/production/${id}/assign`, { assignedTo }).then((r) => r.data.data),
};

export const salesService = {
  ...makeService('/sales'),
  getDailySummary: (date?: string) =>
    api.get('/sales/summary/daily', { params: { date } }).then((r) => r.data.data),
  completeSale: (id: string) =>
    api.patch(`/sales/${id}/complete`).then((r) => r.data.data),
  openCashRegister: (data: any) =>
    api.post('/sales/cash-register/open', data).then((r) => r.data.data),
  closeCashRegister: (id: string, closingAmount: number) =>
    api.post(`/sales/cash-register/${id}/close`, { closingAmount }).then((r) => r.data.data),
};

export const invoicesService = {
  ...makeService('/invoices'),
  cancel: (id: string, reason: string) =>
    api.patch(`/invoices/${id}/cancel`, { reason }).then((r) => r.data.data),
  getData: (id: string) =>
    api.get(`/invoices/${id}/data`).then((r) => r.data.data),
  downloadPdf: (id: string) =>
    api.get(`/invoices/${id}/pdf`, { responseType: 'blob' }).then((r) => r.data as Blob),
};

export const deliveryService = {
  ...makeService('/delivery'),
  updateStatus: (id: string, data: any) =>
    api.patch(`/delivery/${id}/status`, data).then((r) => r.data.data),
  assignDriver: (id: string, driverId: string, deliveryCost?: number) =>
    api.patch(`/delivery/${id}/assign`, { driverId, deliveryCost }).then((r) => r.data.data),
  registerPayment: (id: string, data: { paymentMethod: string; amount: number; notes?: string }) =>
    api.post(`/delivery/${id}/register-payment`, data).then((r) => r.data.data),
};

export const reportsService = {
  getDashboard: () => api.get('/reports/dashboard').then((r) => r.data.data),
  getSalesChart: (days?: number) =>
    api.get('/reports/sales-chart', { params: { days } }).then((r) => r.data.data),
  getTopProducts: (limit?: number) =>
    api.get('/reports/top-products', { params: { limit } }).then((r) => r.data.data),
  getSalesByCategory: () =>
    api.get('/reports/sales-by-category').then((r) => r.data.data),
  getProductionSummary: (days?: number) =>
    api.get('/reports/production-summary', { params: { days } }).then((r) => r.data.data),
  getLowStock: () => api.get('/reports/low-stock').then((r) => r.data.data),
};
