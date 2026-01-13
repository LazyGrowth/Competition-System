import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import {
  getSystemConfigs,
  updateSystemConfig,
  createBackup,
  getBackupRecords,
  restoreBackup,
  getOperationLogs,
  getHistoryImportConfig,
  updateHistoryImportConfig,
  importHistoryData,
  downloadHistoryTemplate,
  getAutoBackupConfig,
  updateAutoBackupConfig,
} from '../controllers/systemController';
import { authenticate, requireSuperAdmin, requireSchoolAdmin } from '../middleware/auth';
import { paginationValidation } from '../utils/validators';

const router = Router();

// 文件上传配置
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/imports'));
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `history-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件格式'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// 获取系统配置
router.get('/configs', authenticate, requireSuperAdmin, getSystemConfigs);

// 更新系统配置
router.put('/configs/:key', authenticate, requireSuperAdmin, updateSystemConfig);

// 创建数据备份
router.post('/backup', authenticate, requireSuperAdmin, createBackup);

// 获取备份记录
router.get('/backups', authenticate, requireSuperAdmin, paginationValidation, getBackupRecords);

// 恢复数据
router.post('/restore/:id', authenticate, requireSuperAdmin, restoreBackup);

// 获取自动备份配置
router.get('/auto-backup/config', authenticate, requireSuperAdmin, getAutoBackupConfig);

// 更新自动备份配置
router.put('/auto-backup/config', authenticate, requireSuperAdmin, updateAutoBackupConfig);

// 获取操作日志
router.get('/logs', authenticate, requireSuperAdmin, paginationValidation, getOperationLogs);

// 历史数据导入相关路由
// 获取历史数据导入配置（所有已登录用户可查看）
router.get('/history-import/config', authenticate, getHistoryImportConfig);

// 更新历史数据导入配置（仅校级管理员）
router.put('/history-import/config', authenticate, requireSchoolAdmin, updateHistoryImportConfig);

// 下载历史数据导入模板
router.get('/history-import/template', authenticate, downloadHistoryTemplate);

// 导入历史数据
router.post('/history-import', authenticate, upload.single('file'), importHistoryData);

export default router;
