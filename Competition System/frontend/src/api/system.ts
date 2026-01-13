import { get, post, put } from './request';
import request from './request';

export interface SystemConfig {
  id: number;
  key: string;
  value: string;
  comment?: string;
}

export interface BackupRecord {
  id: number;
  filename: string;
  filePath: string;
  fileSize: number;
  createdBy: number;
  createdAt: string;
}

export interface OperationLog {
  id: number;
  userId?: number;
  user?: any;
  action: string;
  details?: string;
  ip?: string;
  createdAt: string;
}

export interface HistoryImportConfig {
  enabled: boolean;
  deadline: string | null;
}

export interface HistoryImportResult {
  success: number;
  failed: number;
  errors: string[];
}

// 获取系统配置
export const getSystemConfigs = () => {
  return get<{ data: SystemConfig[] }>('/system/configs');
};

// 更新系统配置
export const updateSystemConfig = (key: string, value: string, comment?: string) => {
  return put<{ data: SystemConfig }>(`/system/configs/${key}`, { value, comment });
};

// 创建数据备份
export const createBackup = () => {
  return post<{ data: BackupRecord }>('/system/backup');
};

// 获取备份记录
export const getBackupRecords = (params?: { page?: number; pageSize?: number }) => {
  return get<{ data: BackupRecord[]; pagination: any }>('/system/backups', { params });
};

// 恢复数据
export const restoreBackup = (id: number) => {
  return post(`/system/restore/${id}`);
};

// 获取操作日志
export const getOperationLogs = (params?: { 
  page?: number; 
  pageSize?: number; 
  userId?: number; 
  action?: string;
  startDate?: string;
  endDate?: string;
}) => {
  return get<{ data: OperationLog[]; pagination: any }>('/system/logs', { params });
};

// 获取历史数据导入配置
export const getHistoryImportConfig = () => {
  return get<{ data: HistoryImportConfig }>('/system/history-import/config');
};

// 更新历史数据导入配置
export const updateHistoryImportConfig = (enabled: boolean, deadline?: string) => {
  return put<{ data: HistoryImportConfig }>('/system/history-import/config', { enabled, deadline });
};

// 下载历史数据导入模板
export const downloadHistoryTemplate = async () => {
  const response = await request.get('/system/history-import/template', {
    responseType: 'blob',
  });
  const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'history_import_template.xlsx';
  link.click();
  window.URL.revokeObjectURL(url);
};

// 导入历史数据
export const importHistoryData = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return post<{ data: HistoryImportResult; message: string }>('/system/history-import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};
