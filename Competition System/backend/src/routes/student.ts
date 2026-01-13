import { Router } from 'express';
import {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  searchStudents,
  syncStudent,
  getMyHistoryStudents,
  batchSyncStudents,
} from '../controllers/studentController';
import { authenticate, requireTeacher, requireDepartmentAdmin } from '../middleware/auth';
import { paginationValidation, idParamValidation } from '../utils/validators';

const router = Router();

// 搜索学生（用于申报时选择）
router.get('/search', authenticate, requireTeacher, searchStudents);

// 获取教师历史参赛学生列表
router.get('/my-history', authenticate, requireTeacher, getMyHistoryStudents);

// 获取学生列表
router.get('/', authenticate, requireTeacher, paginationValidation, getStudents);

// 获取单个学生详情
router.get('/:id', authenticate, requireTeacher, idParamValidation, getStudentById);

// 创建学生
router.post('/', authenticate, requireTeacher, createStudent);

// 更新学生信息
router.put('/:id', authenticate, requireTeacher, idParamValidation, updateStudent);

// 删除学生（管理员）
router.delete('/:id', authenticate, requireDepartmentAdmin, idParamValidation, deleteStudent);

// 同步学生信息（从其他教师的申报中）
router.post('/sync', authenticate, requireTeacher, syncStudent);

// 批量同步学生
router.post('/batch-sync', authenticate, requireTeacher, batchSyncStudents);

export default router;
