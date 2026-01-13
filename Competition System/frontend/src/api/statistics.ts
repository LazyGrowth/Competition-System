import { get } from './request';
import request from './request';

// 获取总览统计
export const getOverviewStats = (params?: { startDate?: string; endDate?: string }) => {
  return get<{ data: any }>('/statistics/overview', { params });
};

// 获取竞赛统计
export const getCompetitionStats = (params?: { year?: number }) => {
  return get<{ data: any }>('/statistics/competitions', { params });
};

// 获取学院对比统计
export const getDepartmentComparison = () => {
  return get<{ data: any[] }>('/statistics/departments');
};

// 获取教师排名
export const getTeacherRanking = (params?: { limit?: number; departmentId?: number }) => {
  return get<{ data: any[] }>('/statistics/teachers', { params });
};

// 导出统计报表
export const exportStatistics = async (params?: { type?: string; year?: number; semester?: string }) => {
  const response = await request.get('/statistics/export', {
    params,
    responseType: 'blob',
  });
  const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const semesterText = params?.semester === 'spring' ? '_春季' : params?.semester === 'autumn' ? '_秋季' : '';
  link.download = `统计报表_${params?.year || new Date().getFullYear()}${semesterText}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
};

// 导出个人获奖档案
export const exportMyAwards = async () => {
  const response = await request.get('/statistics/export/my-awards', {
    responseType: 'blob',
  });
  const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `我的获奖档案_${new Date().toISOString().split('T')[0]}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
};
