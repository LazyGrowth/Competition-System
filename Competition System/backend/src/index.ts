import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
dotenv.config();

// 导入路由
import authRoutes from './routes/auth';
import competitionRoutes from './routes/competition';
import applicationRoutes from './routes/application';
import approvalRoutes from './routes/approval';
import awardRoutes from './routes/award';
import performanceRoutes from './routes/performance';
import rewardRoutes from './routes/reward';
import statisticsRoutes from './routes/statistics';
import systemRoutes from './routes/system';
import userRoutes from './routes/user';
import studentRoutes from './routes/student';
import departmentRoutes from './routes/department';

// 导入中间件
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

// 导入自动备份初始化
import { initAutoBackupScheduler } from './controllers/systemController';

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://your-production-domain.com' 
    : ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 请求日志
app.use(requestLogger);

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/competitions', competitionRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/awards', awardRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/users', userRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/departments', departmentRoutes);

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 错误处理中间件
app.use(errorHandler);

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
  console.log(`📝 环境: ${process.env.NODE_ENV || 'development'}`);
  
  // 初始化自动备份定时任务
  initAutoBackupScheduler().catch(err => {
    console.error('初始化自动备份失败:', err);
  });
});

export default app;
