import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // 服务器配置
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // JWT配置
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  
  // 文件上传配置
  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
  },
  
  // 超级管理员初始账号
  superAdmin: {
    employeeId: process.env.SUPER_ADMIN_ID || 'admin',
    password: process.env.SUPER_ADMIN_PASSWORD || 'admin123',
  },
  
  // 绩效扣分配置（默认值，可通过后台修改）
  performance: {
    infoModifyPenalty: 1, // 教师信息修改扣分
    competitionModifyPenalty: 2, // 竞赛信息修改扣分
  },
};

export default config;
