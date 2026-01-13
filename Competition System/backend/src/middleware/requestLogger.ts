import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const requestLogger = async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // 记录请求信息
  const logData = {
    method: req.method,
    path: req.path,
    ip: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.get('user-agent') || 'unknown',
    timestamp: new Date(),
  };

  // 在响应完成后记录
  res.on('finish', async () => {
    const duration = Date.now() - startTime;
    
    // 仅在开发环境打印日志
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${logData.timestamp.toISOString()}] ${logData.method} ${logData.path} - ${res.statusCode} (${duration}ms)`);
    }

    // 记录关键操作到数据库（POST, PUT, DELETE）
    if (['POST', 'PUT', 'DELETE'].includes(req.method) && req.path.startsWith('/api/')) {
      try {
        const userId = (req as any).userId;
        if (userId) {
          await prisma.operationLog.create({
            data: {
              userId,
              action: `${req.method} ${req.path}`,
              details: JSON.stringify({
                body: req.body,
                statusCode: res.statusCode,
                duration,
              }),
              ip: logData.ip,
            },
          });
        }
      } catch (error) {
        console.error('记录操作日志失败:', error);
      }
    }
  });

  next();
};
