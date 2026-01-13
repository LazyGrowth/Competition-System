import { get, put } from './request';

export interface ApprovalQuery {
  page?: number;
  pageSize?: number;
}

// 获取待审批列表
export const getPendingApprovals = (params?: ApprovalQuery) => {
  return get<{ data: any[]; pagination: any }>('/approvals/pending', { params });
};

// 审批申报
export const approveApplication = (id: number, data: { action: 'APPROVE' | 'REJECT' | 'REQUEST_REVISION'; comment?: string }) => {
  return put(`/approvals/${id}`, data);
};

// 获取审批历史
export const getApprovalHistory = (id: number) => {
  return get(`/approvals/${id}/history`);
};
