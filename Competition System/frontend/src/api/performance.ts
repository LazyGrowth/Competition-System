import { get, put } from './request';

export interface PerformanceRule {
  id: number;
  competitionLevel: string;
  awardLevel: string;
  performanceScore: number;
  workload: number;
}

// 获取绩效规则
export const getPerformanceRules = () => {
  return get<{ data: PerformanceRule[] }>('/performance/rules');
};

// 更新绩效规则
export const updatePerformanceRules = (rules: Partial<PerformanceRule>[]) => {
  return put('/performance/rules', { rules });
};

// 获取我的绩效
export const getMyPerformance = () => {
  return get<{ data: any }>('/performance/my');
};

// 获取院级绩效统计
export const getDepartmentPerformance = (params?: { page?: number; pageSize?: number; departmentId?: number }) => {
  return get<{ data: any[]; pagination: any }>('/performance/department', { params });
};

// 获取校级绩效统计
export const getSchoolPerformance = () => {
  return get<{ data: any }>('/performance/school');
};
