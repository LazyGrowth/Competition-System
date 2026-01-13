import { Router } from 'express';
import {
  getPerformanceRules,
  updatePerformanceRules,
  getMyPerformance,
  getDepartmentPerformance,
  getSchoolPerformance,
} from '../controllers/performanceController';
import { authenticate, requireSuperAdmin, requireDepartmentAdmin, requireSchoolAdmin, requireTeacher } from '../middleware/auth';
import { paginationValidation } from '../utils/validators';

const router = Router();

// 获取绩效规则
router.get('/rules', authenticate, requireDepartmentAdmin, getPerformanceRules);

// 更新绩效规则（仅超级管理员）
router.put('/rules', authenticate, requireSuperAdmin, updatePerformanceRules);

// 获取我的绩效（教师）
router.get('/my', authenticate, requireTeacher, getMyPerformance);

// 获取院级绩效统计（院级管理员）
router.get('/department', authenticate, requireDepartmentAdmin, paginationValidation, getDepartmentPerformance);

// 获取校级绩效统计（校级管理员）
router.get('/school', authenticate, requireSchoolAdmin, getSchoolPerformance);

export default router;
