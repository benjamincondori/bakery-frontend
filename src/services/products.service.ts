import api from '@/lib/axios';
import type { ApiResponse, Product, Category } from '@/types';

export const productsService = {
  getAll: (params?: Record<string, any>) =>
    api.get<ApiResponse<Product[]>>('/products', { params }).then((r) => r.data),

  getOne: (id: string) =>
    api.get<ApiResponse<Product>>(`/products/${id}`).then((r) => r.data.data),

  create: (data: Partial<Product>) =>
    api.post<ApiResponse<Product>>('/products', data).then((r) => r.data.data),

  update: (id: string, data: Partial<Product>) =>
    api.patch<ApiResponse<Product>>(`/products/${id}`, data).then((r) => r.data.data),

  remove: (id: string) =>
    api.delete<ApiResponse<Product>>(`/products/${id}`).then((r) => r.data.data),

  getCategories: () =>
    api.get<ApiResponse<Category[]>>('/products/categories').then((r) => r.data.data),

  createCategory: (data: Partial<Category>) =>
    api.post<ApiResponse<Category>>('/products/categories', data).then((r) => r.data.data),

  updateCategory: (id: string, data: Partial<Category>) =>
    api.patch<ApiResponse<Category>>(`/products/categories/${id}`, data).then((r) => r.data.data),

  removeCategory: (id: string) =>
    api.delete<ApiResponse<Category>>(`/products/categories/${id}`).then((r) => r.data.data),
};
