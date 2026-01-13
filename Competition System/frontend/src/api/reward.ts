import { get, put } from './request';
import request from './request';

export interface RewardRule {
  id: number;
  competitionLevel: string;
  awardLevel: string;
  rewardAmount: number;
}

// 获取奖励规则
export const getRewardRules = () => {
  return get<{ data: RewardRule[] }>('/rewards/rules');
};

// 更新奖励规则
export const updateRewardRules = (rules: Partial<RewardRule>[]) => {
  return put('/rewards/rules', { rules });
};

// 获取年度奖励统计
export const getAnnualRewards = (year?: number) => {
  return get<{ data: any }>('/rewards/annual', { params: { year } });
};

// 导出年度奖励报表
export const exportAnnualRewards = (year?: number) => {
  return request.get('/rewards/annual/export', {
    params: { year },
    responseType: 'blob',
  });
};
