import { get } from './request';

export interface Department {
  id: number;
  name: string;
  code: string;
}

// 获取学院列表
export const getDepartments = () => {
  return get<{ data: Department[] }>('/departments');
};
