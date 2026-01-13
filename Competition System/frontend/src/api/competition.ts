import { get, post, put, del } from './request';
import request from './request';

export interface Competition {
  id: number;
  name: string;
  track?: string;
  region: 'NATIONAL' | 'PROVINCIAL' | 'SCHOOL';
  level: 'A' | 'B' | 'C' | 'D' | 'E';
  ranking?: number;
  year: number;
  session?: string;
  leadDepartmentId?: number;
  leadDepartment?: {
    id: number;
    name: string;
    code: string;
  };
  validUntil?: string;
  requiresFunding: boolean;
  createdAt: string;
}

export interface CompetitionQuery {
  page?: number;
  pageSize?: number;
  name?: string;
  level?: string;
  region?: string;
  year?: number;
  departmentId?: number;
  valid?: boolean;
}

// 获取竞赛列表
export const getCompetitions = (params?: CompetitionQuery) => {
  return get<{ data: Competition[]; pagination: any }>('/competitions', { params });
};

// 获取单个竞赛
export const getCompetition = (id: number) => {
  return get<{ data: Competition }>(`/competitions/${id}`);
};

// 创建竞赛
export const createCompetition = (data: Partial<Competition>) => {
  return post<{ data: Competition }>('/competitions', data);
};

// 更新竞赛
export const updateCompetition = (id: number, data: Partial<Competition>) => {
  return put<{ data: Competition }>(`/competitions/${id}`, data);
};

// 删除竞赛
export const deleteCompetition = (id: number) => {
  return del(`/competitions/${id}`);
};

// 导入竞赛（直接导入）
export const importCompetitions = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return request.post('/competitions/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// 预览导入竞赛
export const previewImportCompetitions = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return request.post('/competitions/import?preview=true', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// 确认导入竞赛
export const confirmImportCompetitions = (competitions: any[]) => {
  return post('/competitions/import/confirm', { competitions });
};

// 获取竞赛修改日志
export const getCompetitionLogs = (id: number) => {
  return get(`/competitions/${id}/logs`);
};
