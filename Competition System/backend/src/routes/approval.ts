import { Router } from 'express';
import {
  getPendingApprovals,
  approveApplication,
  getApprovalHistory,
} from '../controllers/approvalController';
import { authenticate, requireDepartmentAdmin } from '../middleware/auth';
import { approvalValidation, paginationValidation, idParamValidation } from '../utils/validators';

const router = Router();

// 获取待审批列表
router.get('/pending', authenticate, requireDepartmentAdmin, paginationValidation, getPendingApprovals);

// 审批申报
router.put('/:id', authenticate, requireDepartmentAdmin, idParamValidation, approvalValidation, approveApplication);

// 获取审批历史
router.get('/:id/history', authenticate, idParamValidation, getApprovalHistory);

export default router;
