import { Router } from 'express';
import {
  getRewardRules,
  updateRewardRules,
  getAnnualRewards,
  exportAnnualRewards,
} from '../controllers/rewardController';
import { authenticate, requireSuperAdmin, requireSchoolAdmin } from '../middleware/auth';

const router = Router();

// 获取奖励规则
router.get('/rules', authenticate, requireSchoolAdmin, getRewardRules);

// 更新奖励规则（仅超级管理员）
router.put('/rules', authenticate, requireSuperAdmin, updateRewardRules);

// 获取年度奖励统计
router.get('/annual', authenticate, requireSchoolAdmin, getAnnualRewards);

// 导出年度奖励报表
router.get('/annual/export', authenticate, requireSchoolAdmin, exportAnnualRewards);

export default router;
