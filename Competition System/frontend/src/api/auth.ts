import { post, get, put } from './request';

export interface LoginParams {
  employeeId: string;
  password: string;
}

export interface LoginResult {
  token: string;
  user: any;
}

// 登录
export const login = (data: LoginParams) => {
  return post<{ data: LoginResult; message: string }>('/auth/login', data);
};

// 登出
export const logout = () => {
  return post('/auth/logout');
};

// 获取当前用户信息
export const getProfile = () => {
  return get<{ data: any }>('/auth/profile');
};

// 修改密码
export const changePassword = (data: { oldPassword: string; newPassword: string }) => {
  return put('/auth/password', data);
};
