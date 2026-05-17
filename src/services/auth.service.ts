import api from '@/lib/axios';
import type { ApiResponse, AuthUser } from '@/types';

interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  login: (email: string, password: string) =>
    api.post<ApiResponse<LoginResponse>>('/auth/login', { email, password }).then((r) => r.data.data),

  logout: () =>
    api.post<ApiResponse<void>>('/auth/logout').then((r) => r.data),

  getProfile: () =>
    api.get<ApiResponse<AuthUser>>('/auth/profile').then((r) => r.data.data),

  updateProfile: (data: Partial<AuthUser>) =>
    api.patch<ApiResponse<AuthUser>>('/auth/profile', data).then((r) => r.data.data),

  changePassword: (data: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
    api.patch('/auth/profile/password', data).then((r) => r.data.data),
};
