import { get, put } from './request';
import request from './request';

export interface Award {
  id: number;
  applicationId: number;
  application: any;
  awardLevel: 'SPECIAL_PRIZE' | 'FIRST_PRIZE' | 'SECOND_PRIZE' | 'THIRD_PRIZE' | 'EXCELLENCE';
  certificateNo: string;
  summaryPdf?: string;
  performanceScore: number;
  workload: number;
  rewardAmount: number;
  status: 'PENDING_DEPARTMENT' | 'PENDING_SCHOOL' | 'APPROVED' | 'REJECTED';
  approvedAt?: string;
  createdAt: string;
}

export interface AwardQuery {
  page?: number;
  pageSize?: number;
  level?: string;
  status?: string;
  competitionLevel?: string;
  departmentId?: number;
}

// 获取最新获奖（公开）
export const getLatestAwards = () => {
  return get<{ data: Award[] }>('/awards/latest');
};

// 获取我的获奖记录
export const getMyAwards = (params?: AwardQuery) => {
  return get<{ data: Award[]; pagination: any }>('/awards/my', { params });
};

// 获取所有获奖记录（管理员）
export const getAwards = (params?: AwardQuery) => {
  return get<{ data: Award[]; pagination: any }>('/awards', { params });
};

// 获取单个获奖详情
export const getAward = (id: number) => {
  return get<{ data: Award }>(`/awards/${id}`);
};

// 提交获奖记录
export const createAward = (data: FormData) => {
  return request.post('/awards', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// 审批获奖记录
export const approveAward = (id: number, data: { action: 'APPROVE' | 'REJECT'; comment?: string }) => {
  return put(`/awards/${id}/approve`, data);
};

// 导出获奖证书PDF
export const exportAwardPdf = async (id: number) => {
  const response = await request.get(`/awards/${id}/export`, { responseType: 'blob' });
  return response;
};

// 下载获奖证书PDF
export const downloadAwardPdf = async (id: number, certificateNo: string) => {
  const response = await request.get(`/awards/${id}/export`, { responseType: 'blob' });
  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `award_${certificateNo.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
  link.click();
  window.URL.revokeObjectURL(url);
};

// 批量导出获奖证书PDF
export const batchExportAwardPdf = async (awardIds: number[]) => {
  const response = await request.post('/awards/export/batch', { awardIds }, { responseType: 'blob' });
  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  link.download = `awards_batch_${timestamp}.pdf`;
  link.click();
  window.URL.revokeObjectURL(url);
};
