import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import {
  getAwards,
  getAwardById,
  createAward,
  approveAward,
  getMyAwards,
  getLatestAwards,
  exportAwardPdf,
  batchExportAwardPdf,
} from '../controllers/awardController';
import { authenticate, requireTeacher, requireDepartmentAdmin } from '../middleware/auth';
import { awardValidation, paginationValidation, idParamValidation } from '../utils/validators';

const router = Router();

// 配置PDF文件上传
const storage = multer.diskStorage({
  destination: './uploads/summaries/',
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'summary-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('只支持PDF文件'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// 获取最新获奖信息（公开接口，用于首页滚动展示）
router.get('/latest', getLatestAwards);

// 获取我的获奖记录（教师）
router.get('/my', authenticate, requireTeacher, paginationValidation, getMyAwards);

// 获取所有获奖记录（管理员）
router.get('/', authenticate, requireDepartmentAdmin, paginationValidation, getAwards);

// 获取单个获奖详情
router.get('/:id', authenticate, idParamValidation, getAwardById);

// 提交获奖记录（教师上传总结）
router.post(
  '/',
  authenticate,
  requireTeacher,
  upload.single('summaryPdf'),
  awardValidation,
  createAward
);

// 审批获奖记录
router.put(
  '/:id/approve',
  authenticate,
  requireDepartmentAdmin,
  idParamValidation,
  approveAward
);

// 导出获奖证书PDF（带水印）- 管理员可导出任何，教师可导出自己的
router.get('/:id/export', authenticate, idParamValidation, exportAwardPdf);

// 批量导出获奖证书PDF（管理员）
router.post('/export/batch', authenticate, requireDepartmentAdmin, batchExportAwardPdf);

export default router;
