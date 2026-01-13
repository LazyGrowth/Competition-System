import { Router } from 'express';
import {
  getOverviewStats,
  getCompetitionStats,
  getDepartmentComparison,
  getTeacherRanking,
  exportStatistics,
  exportMyAwards,
} from '../controllers/statisticsController';
import { authenticate, requireSchoolAdmin, requireDepartmentAdmin } from '../middleware/auth';

const router = Router();

// 获取总览统计（所有已登录用户可访问）
router.get('/overview', authenticate, getOverviewStats);

// 获取竞赛统计（所有已登录用户可访问）
router.get('/competitions', authenticate, getCompetitionStats);

// 获取学院对比统计（校级管理员）
router.get('/departments', authenticate, requireSchoolAdmin, getDepartmentComparison);

// 获取教师排名（院级管理员）
router.get('/teachers', authenticate, requireDepartmentAdmin, getTeacherRanking);

// 导出统计报表（校级管理员）
router.get('/export', authenticate, requireSchoolAdmin, exportStatistics);

// 导出个人获奖档案（教师）
router.get('/export/my-awards', authenticate, exportMyAwards);

export default router;
