import { Router } from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  updateMyProfile,
  getMyEditLogs,
} from '../controllers/userController';
import { authenticate, requireSuperAdmin, requireDepartmentAdmin, requireTeacher } from '../middleware/auth';
import { userUpdateValidation, paginationValidation, idParamValidation } from '../utils/validators';

const router = Router();

// 更新个人信息（教师自己）- 放在前面避免被 /:id 匹配
router.put('/profile/me', authenticate, requireTeacher, userUpdateValidation, updateMyProfile);

// 获取个人信息修改日志
router.get('/profile/logs', authenticate, requireTeacher, getMyEditLogs);

// 获取用户列表（管理员）
router.get('/', authenticate, requireDepartmentAdmin, paginationValidation, getUsers);

// 获取单个用户详情
router.get('/:id', authenticate, requireDepartmentAdmin, idParamValidation, getUserById);

// 创建用户（超级管理员）
router.post('/', authenticate, requireSuperAdmin, createUser);

// 更新用户（超级管理员）
router.put('/:id', authenticate, requireSuperAdmin, idParamValidation, updateUser);

// 重置用户密码（超级管理员）
router.put('/:id/reset-password', authenticate, requireSuperAdmin, idParamValidation, resetUserPassword);

// 删除用户（超级管理员）
router.delete('/:id', authenticate, requireSuperAdmin, idParamValidation, deleteUser);

export default router;
