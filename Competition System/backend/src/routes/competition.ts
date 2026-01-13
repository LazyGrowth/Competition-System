import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import {
  getCompetitions,
  getCompetitionById,
  createCompetition,
  updateCompetition,
  deleteCompetition,
  importCompetitions,
  confirmImportCompetitions,
  getCompetitionEditLogs,
} from '../controllers/competitionController';
import { authenticate, requireDepartmentAdmin, requireSchoolAdmin } from '../middleware/auth';
import { competitionValidation, paginationValidation, idParamValidation } from '../utils/validators';

const router = Router();

// 配置文件上传
const storage = multer.diskStorage({
  destination: './uploads/imports/',
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'import-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只支持Excel和CSV文件'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// 获取竞赛列表（所有已认证用户可访问）
router.get('/', authenticate, paginationValidation, getCompetitions);

// 获取单个竞赛详情
router.get('/:id', authenticate, idParamValidation, getCompetitionById);

// 创建竞赛（院级及以上管理员）
router.post('/', authenticate, requireDepartmentAdmin, competitionValidation, createCompetition);

// 更新竞赛（院级及以上管理员）
router.put('/:id', authenticate, requireDepartmentAdmin, idParamValidation, updateCompetition);

// 删除竞赛（校级及以上管理员）
router.delete('/:id', authenticate, requireSchoolAdmin, idParamValidation, deleteCompetition);

// 批量导入竞赛（支持preview参数进行预览）
router.post(
  '/import',
  authenticate,
  requireDepartmentAdmin,
  upload.single('file'),
  importCompetitions
);

// 确认导入竞赛
router.post(
  '/import/confirm',
  authenticate,
  requireDepartmentAdmin,
  confirmImportCompetitions
);

// 获取竞赛修改日志
router.get('/:id/logs', authenticate, requireDepartmentAdmin, idParamValidation, getCompetitionEditLogs);

export default router;
