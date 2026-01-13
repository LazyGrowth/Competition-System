import { get, post, put, del } from './request';

export interface User {
  id: number;
  employeeId: string;
  name: string;
  gender?: string;
  role: string;
  departmentId?: number;
  department?: any;
  performanceScore?: number;
  createdAt: string;
}

export interface UserQuery {
  page?: number;
  pageSize?: number;
  role?: string;
  departmentId?: number;
  name?: string;
}

// 获取用户列表
export const getUsers = (params?: UserQuery) => {
  return get<{ data: User[]; pagination: any }>('/users', { params });
};

// 获取单个用户
export const getUser = (id: number) => {
  return get<{ data: User }>(`/users/${id}`);
};

// 创建用户
export const createUser = (data: Partial<User> & { password?: string }) => {
  return post<{ data: User }>('/users', data);
};

// 更新用户
export const updateUser = (id: number, data: Partial<User> & { password?: string }) => {
  return put<{ data: User }>(`/users/${id}`, data);
};

// 删除用户
export const deleteUser = (id: number) => {
  return del(`/users/${id}`);
};

// 重置用户密码
export const resetPassword = (id: number) => {
  return put(`/users/${id}/reset-password`);
};

// 更新个人信息
export const updateMyProfile = (data: { name?: string; gender?: string; bankAccount?: string; bankName?: string }) => {
  return put<{ data: User }>('/users/profile/me', data);
};

// 获取个人信息修改日志
export const getMyEditLogs = () => {
  return get<{ data: any[] }>('/users/profile/logs');
};
