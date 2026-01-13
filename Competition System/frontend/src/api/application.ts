import { get, post, put, del } from './request';

export interface Application {
  id: number;
  competitionId: number;
  competition: any;
  teacherId: number;
  teacher: any;
  coTeacherId?: number;
  coTeacher?: any;
  students: any[];
  status: 'DRAFT' | 'PENDING_DEPARTMENT' | 'PENDING_SCHOOL' | 'APPROVED' | 'REJECTED' | 'REVISION_REQUIRED';
  submittedAt?: string;
  approvalRecords: any[];
  createdAt: string;
}

export interface ApplicationQuery {
  page?: number;
  pageSize?: number;
  status?: string;
  competitionId?: number;
  teacherId?: number;
  departmentId?: number;
}

// 获取我的申报列表
export const getMyApplications = (params?: ApplicationQuery) => {
  return get<{ data: Application[]; pagination: any }>('/applications/my', { params });
};

// 获取所有申报列表（管理员）
export const getApplications = (params?: ApplicationQuery) => {
  return get<{ data: Application[]; pagination: any }>('/applications', { params });
};

// 获取单个申报
export const getApplication = (id: number) => {
  return get<{ data: Application }>(`/applications/${id}`);
};

// 创建申报
export const createApplication = (data: { competitionId: number; coTeacherId?: number; studentIds: number[] }) => {
  return post<{ data: Application }>('/applications', data);
};

// 更新申报
export const updateApplication = (id: number, data: { coTeacherId?: number; studentIds: number[] }) => {
  return put<{ data: Application }>(`/applications/${id}`, data);
};

// 提交申报
export const submitApplication = (id: number) => {
  return post<{ data: Application }>(`/applications/${id}/submit`);
};

// 删除申报
export const deleteApplication = (id: number) => {
  return del(`/applications/${id}`);
};
