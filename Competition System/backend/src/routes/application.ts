import { Router } from 'express';
import {
  getApplications,
  getApplicationById,
  createApplication,
  updateApplication,
  submitApplication,
  deleteApplication,
  getMyApplications,
} from '../controllers/applicationController';
import { authenticate, requireTeacher, requireDepartmentAdmin } from '../middleware/auth';
import { applicationValidation, paginationValidation, idParamValidation } from '../utils/validators';

const router = Router();

// 获取我的申报列表（教师）
router.get('/my', authenticate, requireTeacher, paginationValidation, getMyApplications);

// 获取所有申报列表（管理员）
router.get('/', authenticate, requireDepartmentAdmin, paginationValidation, getApplications);

// 获取单个申报详情
router.get('/:id', authenticate, idParamValidation, getApplicationById);

// 创建申报（教师）
router.post('/', authenticate, requireTeacher, applicationValidation, createApplication);

// 更新申报（教师，仅限草稿或被驳回状态）
router.put('/:id', authenticate, requireTeacher, idParamValidation, updateApplication);

// 提交申报（教师）
router.post('/:id/submit', authenticate, requireTeacher, idParamValidation, submitApplication);

// 删除申报（教师，仅限草稿状态）
router.delete('/:id', authenticate, requireTeacher, idParamValidation, deleteApplication);

export default router;
